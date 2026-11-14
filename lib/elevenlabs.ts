import type {InterviewConfig,HostState,TranscriptEntry} from './types';
import type {HostSettings} from './host-settings';
import {HostAudioBus,pcm16Base64} from './audio-bus';
export interface ElevenCallbacks {onState:(state:HostState)=>void;onTranscript:(entry:TranscriptEntry)=>void;onError:(message:string)=>void;onSession:(id:string)=>void;}
/** Private agent WebSocket. The backend returns a signed URL, never an API key. */
export class ElevenLabsInterview {
  private socket?:WebSocket;private context?:AudioContext;private capture?:AudioWorkletNode;private source?:MediaStreamAudioSourceNode;private silence?:GainNode;private cb?:ElevenCallbacks;private started=0;private outputRate=16000;private closed=true;private suppressUntil=-1;private muted=false;private ready=false;private lastAudioId=-1;private pendingTyped='';private abort?:AbortController;private sessionTimer?:ReturnType<typeof setTimeout>;private responseStart=0;private lastHostId='';private lastHostText='';private closing?:{resolve:(done:boolean)=>void;timer:ReturnType<typeof setTimeout>;responseSeen:boolean};
  constructor(private bus:HostAudioBus){}
  async connect(config:InterviewConfig,settings:HostSettings,mic:MediaStream,callbacks:ElevenCallbacks){
    this.close();this.closed=false;this.cb=callbacks;this.started=performance.now();this.lastAudioId=-1;this.suppressUntil=-1;callbacks.onState('thinking');
    try{
      this.context=new AudioContext({sampleRate:16000});await this.context.resume();if(this.context.sampleRate!==16000)throw new Error('This browser cannot supply 16 kHz agent audio. Try a desktop Chromium browser or OpenAI mode.');
      await this.context.audioWorklet.addModule('/noah/pcm-capture.js');if(this.closed)throw new Error('Connection cancelled.');
      this.source=this.context.createMediaStreamSource(mic);this.capture=new AudioWorkletNode(this.context,'podpilot-capture');this.silence=this.context.createGain();this.silence.gain.value=0;this.source.connect(this.capture);this.capture.connect(this.silence);this.silence.connect(this.context.destination);
      this.capture.port.onmessage=event=>{if(!this.closed&&this.ready&&!this.muted&&this.socket?.readyState===WebSocket.OPEN)this.send({user_audio_chunk:pcm16Base64(event.data as Float32Array)});};
      this.abort=new AbortController();const timeout=setTimeout(()=>this.abort?.abort(),20_000);let response:Response;try{response=await fetch('/api/elevenlabs/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({config,agentId:settings.elevenLabsAgentId,voiceId:settings.elevenLabsVoiceId,authorized:settings.voiceAuthorized}),signal:this.abort.signal});}finally{clearTimeout(timeout)}
      const data=await response.json();if(!response.ok)throw new Error(data.error||'ElevenLabs could not connect.');
      const endpoint=new URL(data.signedUrl);if(endpoint.protocol!=='wss:'||endpoint.hostname!=='api.elevenlabs.io')throw new Error('The agent returned an invalid connection address.');
      if(this.closed)throw new Error('Connection cancelled.');
      await new Promise<void>((resolve,reject)=>{const socket=new WebSocket(endpoint);this.socket=socket;let connected=false;const timer=setTimeout(()=>reject(new Error('ElevenLabs connection timed out.')),25_000);
        socket.onopen=()=>socket.send(JSON.stringify(data.initiation));
        socket.onerror=()=>{clearTimeout(timer);reject(new Error('ElevenLabs voice transport failed.'));};
        socket.onclose=()=>{clearTimeout(timer);if(!connected)reject(new Error('Agent rejected the session. Check its authorization, PCM audio formats, client events, and permitted prompt/voice overrides.'));else if(!this.closed){callbacks.onError('ElevenLabs disconnected. Stop and save this take; no demo engine has been substituted.');this.close();}};
        socket.onmessage=event=>{try{const message=JSON.parse(event.data);if(message.type==='conversation_initiation_metadata'){
          const m=message.conversation_initiation_metadata_event;if(m.user_input_audio_format!=='pcm_16000')throw new Error('Set the ElevenLabs agent input format to pcm_16000.');
          const match=/^pcm_(8000|16000|22050|24000|44100|48000)$/.exec(m.agent_output_audio_format);if(!match)throw new Error('Set the ElevenLabs agent output format to PCM.');this.outputRate=Number(match[1]);connected=true;this.ready=true;clearTimeout(timer);callbacks.onSession(m.conversation_id);callbacks.onState('listening');resolve();
        }else this.handle(message);}catch(e){const message=e instanceof Error?e.message:'Invalid ElevenLabs event.';clearTimeout(timer);if(!connected)reject(new Error(message));else{callbacks.onError(message);this.close();}}};
      });
      this.sessionTimer=setTimeout(()=>{callbacks.onError('Your selected interview duration has ended. Save the recording and transcript.');this.close();},config.duration*60_000);
    }catch(e){this.close();throw e;}
  }
  private elapsed(){return Math.max(0,(performance.now()-this.started)/1000);}
  private send(data:unknown){if(this.socket?.readyState===WebSocket.OPEN)this.socket.send(JSON.stringify(data));}
  private handle(message:any){
    if(this.closed)return;
    switch(message.type){
      case 'ping':this.send({type:'pong',event_id:message.ping_event.event_id});break;
      case 'audio':{const event=message.audio_event;if(event.event_id<=this.suppressUntil)return;this.lastAudioId=event.event_id;if(!this.bus.playing())this.responseStart=this.elapsed();this.cb?.onState('speaking');this.bus.enqueuePCM(event.audio_base_64,this.outputRate,()=>{this.cb?.onState('listening');if(this.closing?.responseSeen)this.resolveClosing(true)});break;}
      case 'user_transcript':if(this.pendingTyped===message.user_transcription_event.user_transcript){this.pendingTyped='';break;}this.cb?.onTranscript({id:`eleven-user-${message.user_transcription_event.event_id??crypto.randomUUID()}`,role:'guest',text:message.user_transcription_event.user_transcript,timestamp:this.elapsed(),input:'elevenlabs'});this.cb?.onState('thinking');break;
      case 'agent_response':{const e=message.agent_response_event;this.lastHostId=`eleven-host-${e.event_id??crypto.randomUUID()}`;this.lastHostText=e.agent_response;this.cb?.onTranscript({id:this.lastHostId,role:'host',text:e.agent_response,timestamp:this.responseStart||this.elapsed(),input:'elevenlabs'});if(this.closing)this.closing.responseSeen=true;break;}
      case 'agent_response_correction':{const text=message.agent_response_correction_event.corrected_agent_response;if(this.lastHostId&&text){this.cb?.onTranscript({id:this.lastHostId,role:'host',text,timestamp:this.responseStart||this.elapsed(),input:'elevenlabs'});this.lastHostText=text;}break;}
      case 'interruption':this.suppressUntil=Math.max(this.suppressUntil,message.interruption_event.event_id??-1);this.bus.stop();this.cb?.onState('listening');break;
      case 'vad_score':if(message.vad_score_event?.vad_score>.6){this.bus.stop();this.cb?.onState('listening');}break;
      case 'error':this.cb?.onError('ElevenLabs reported a session error. Check the agent configuration, then reconnect.');break;
      case 'queue_status':if(message.queue_status_event.status==='waiting')this.cb?.onState('thinking');break;
    }
  }
  sendText(text:string){this.pendingTyped=text.trim();this.interrupt();this.cb?.onTranscript({id:crypto.randomUUID(),role:'guest',text:text.trim(),timestamp:this.elapsed(),input:'typed'});this.send({type:'user_message',text:text.trim()});this.cb?.onState('thinking');}
  skip(){this.interrupt();this.send({type:'user_message',text:'Please skip this question and ask a different one.'});}
  interrupt(){this.suppressUntil=Math.max(this.suppressUntil,this.lastAudioId);this.bus.stop();this.send({type:'user_activity'});this.cb?.onState('listening');}
  setMuted(muted:boolean){this.muted=muted;}
  requestClosing():Promise<boolean>{if(this.socket?.readyState!==WebSocket.OPEN)return Promise.resolve(false);this.interrupt();return new Promise(resolve=>{this.closing={resolve,timer:setTimeout(()=>this.resolveClosing(false),15_000),responseSeen:false};this.send({type:'user_message',text:'Finish the interview now with a brief summary of what I actually said. Thank me and ask no more questions.'});});}
  private resolveClosing(done:boolean){if(this.closing){clearTimeout(this.closing.timer);this.closing.resolve(done);this.closing=undefined;}}
  close(){this.closed=true;this.ready=false;this.abort?.abort();this.resolveClosing(false);clearTimeout(this.sessionTimer);this.socket?.close();this.socket=undefined;this.capture?.disconnect();this.source?.disconnect();this.silence?.disconnect();void this.context?.close();this.context=undefined;this.bus.stop();this.cb?.onState('idle');}
}

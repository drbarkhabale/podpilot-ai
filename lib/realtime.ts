import type { HostState, InterviewConfig, TranscriptEntry } from './types';

export interface RealtimeCallbacks {onTranscript:(entry:TranscriptEntry)=>void;onState:(state:HostState)=>void;onError:(message:string)=>void;onUsage:(tokens:number)=>void;onRemoteStream?:(stream:MediaStream)=>void;}
type ServerEvent={type?:string;response_id?:string;item_id?:string;transcript?:string;text?:string;item?:{id?:string};response?:{id?:string;status?:string;usage?:{total_tokens?:number}};error?:{code?:string;message?:string}};

/** Browser WebRTC transport. The standard API key never leaves the backend. */
export class RealtimeInterview {
  private peer?:RTCPeerConnection;
  private channel?:RTCDataChannel;
  private microphone?:MediaStream;
  private ownsMicrophone=false;
  private remote?:MediaStream;
  private audio?:HTMLAudioElement;
  private callbacks?:RealtimeCallbacks;
  private started=0;
  private tokens=0;
  private activeResponse=false;
  private playing=false;
  private closed=true;
  private generated=new Set<string>();
  private itemTimes=new Map<string,number>();
  private abort?:AbortController;
  private responseStart=0;
  private voiceEnabled=true;
  private closingResponse?:string;
  private closingWait?:{resolve:(complete:boolean)=>void;timer:ReturnType<typeof setTimeout>};
  private timer?:ReturnType<typeof setTimeout>;

  async connect(config:InterviewConfig,callbacks:RealtimeCallbacks,microphone?:MediaStream):Promise<void>{
    this.close();this.callbacks=callbacks;this.closed=false;this.started=Date.now();this.tokens=0;this.voiceEnabled=config.voiceEnabled;this.generated.clear();this.itemTimes.clear();
    if(typeof RTCPeerConnection==='undefined')throw new Error('This browser does not support WebRTC. Use Demo Mode with text.');
    if(!navigator.mediaDevices?.getUserMedia)throw new Error('Microphone access requires HTTPS or localhost. Demo text mode remains available.');
    callbacks.onState('thinking');
    try{
      this.ownsMicrophone=!microphone;this.microphone=microphone||await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
      if(this.closed){if(this.ownsMicrophone)this.microphone.getTracks().forEach(t=>t.stop());throw new Error('Connection cancelled.');}
      const pc=new RTCPeerConnection();this.peer=pc;
      if(!callbacks.onRemoteStream){this.audio=new Audio();this.audio.autoplay=true;this.audio.muted=!config.voiceEnabled;}
      pc.ontrack=(event)=>{
        this.remote=event.streams[0]||new MediaStream([event.track]);
        callbacks.onRemoteStream?.(this.remote);
        if(this.audio){this.audio.srcObject=this.remote;void this.audio.play().catch(()=>callbacks.onError('Browser audio playback was blocked. Click Enable audio or use your browser site audio controls.'));}
      };
      pc.onconnectionstatechange=()=>{if(!this.closed&&['failed','disconnected'].includes(pc.connectionState)){callbacks.onError('The OpenAI voice connection was lost. End this session or reconnect in Demo Mode.');this.close();}};
      this.microphone.getTracks().forEach(track=>pc.addTrack(track,this.microphone!));
      const channel=pc.createDataChannel('oai-events');this.channel=channel;
      channel.onmessage=e=>{try{this.handleEvent(JSON.parse(e.data) as ServerEvent);}catch{/* Ignore malformed transport events. */}};
      channel.onerror=()=>callbacks.onError('The voice event channel encountered an error.');
      const ready=new Promise<void>((resolve,reject)=>{
        const timeout=setTimeout(()=>reject(new Error('OpenAI voice connection timed out. Try Demo Mode.')),35_000);
        channel.onopen=()=>{clearTimeout(timeout);if(!this.closed){callbacks.onState('listening');this.send({type:'response.create',response:{instructions:'Begin the interview now. Introduce yourself clearly as NOAH, an AI host, and ask one opening question.'}});resolve();}else reject(new Error('Connection cancelled.'));};
        channel.onclose=()=>{clearTimeout(timeout);if(!this.closed){callbacks.onError('The OpenAI session ended. Your transcript is still available.');callbacks.onState('idle');}reject(new Error('Voice event channel closed.'));};
      });
      // Avoid an unhandled rejection while the HTTP handshake is still in flight.
      void ready.catch(()=>{});
      await pc.setLocalDescription(await pc.createOffer());
      this.abort=new AbortController();
      const timeout=setTimeout(()=>this.abort?.abort(),30_000);
      let answer:Response;
      try{answer=await fetch('/api/realtime',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sdp:pc.localDescription?.sdp,config}),signal:this.abort.signal});}finally{clearTimeout(timeout);}
      if(!answer.ok){const error=await answer.json().catch(()=>({error:'OpenAI is unavailable. Use Demo Mode.'}));throw new Error(error.error||'OpenAI is unavailable. Use Demo Mode.');}
      await pc.setRemoteDescription({type:'answer',sdp:await answer.text()});
      await ready;
      // Stop the transport at the chosen interview duration to bound accidental usage.
      this.timer=setTimeout(()=>{callbacks.onError('The selected interview duration has ended. Finish the episode to save your transcript.');this.close();},config.duration*60_000);
    }catch(error){this.close();throw error instanceof Error?error:new Error('Could not start OpenAI voice. Use Demo Mode.');}
  }
  private elapsed(){return Math.max(0,(Date.now()-this.started)/1000);}
  private send(event:unknown){if(this.channel?.readyState==='open')this.channel.send(JSON.stringify(event));}
  private addTranscript(id:string,role:'host'|'guest',text:string,timestamp?:number){
    if(!text.trim()||this.generated.has(id))return;this.generated.add(id);
    this.callbacks?.onTranscript({id,role,text:text.trim(),timestamp:timestamp??this.itemTimes.get(id)??this.elapsed(),input:id.startsWith('item_local_')?'typed':'openai'});
  }
  private handleEvent(event:ServerEvent){
    if(this.closed)return;
    switch(event.type){
      case 'conversation.item.added': case 'conversation.item.created':
        if(event.item?.id&&!this.itemTimes.has(event.item.id))this.itemTimes.set(event.item.id,this.elapsed());break;
      case 'input_audio_buffer.speech_started':
        this.callbacks?.onState('listening');if(event.item_id)this.itemTimes.set(event.item_id,this.elapsed());break;
      case 'input_audio_buffer.speech_stopped':this.callbacks?.onState('thinking');break;
      case 'conversation.item.input_audio_transcription.completed':
        if(event.item_id&&event.transcript)this.addTranscript(event.item_id,'guest',event.transcript);break;
      case 'conversation.item.input_audio_transcription.failed':
        this.callbacks?.onError('An audio turn could not be transcribed. The conversation may continue; type important details if needed.');break;
      case 'response.created':this.activeResponse=true;this.responseStart=this.elapsed();if(this.closingWait&&!this.closingResponse)this.closingResponse=event.response?.id;this.callbacks?.onState('thinking');break;
      case 'response.output_audio_transcript.done':
        if(event.transcript)this.addTranscript(event.item_id||crypto.randomUUID(),'host',event.transcript,this.itemTimes.get(event.item_id||'')??this.responseStart);break;
      case 'response.output_text.done':
        if(event.text)this.addTranscript(event.item_id||crypto.randomUUID(),'host',event.text,this.itemTimes.get(event.item_id||'')??this.responseStart);break;
      case 'output_audio_buffer.started':this.playing=true;this.callbacks?.onState('speaking');break;
      case 'output_audio_buffer.stopped':case 'output_audio_buffer.cleared':this.playing=false;this.callbacks?.onState('listening');if(event.type==='output_audio_buffer.stopped'&&this.closingWait&&this.closingResponse&&event.response_id===this.closingResponse)this.resolveClosing(true);break;
      case 'response.done':
        this.activeResponse=false;
        if(this.closingWait&&this.closingResponse===event.response?.id){if(event.response?.status==='failed'||event.response?.status==='cancelled')this.resolveClosing(false);else if(!this.voiceEnabled)this.resolveClosing(true);}
        if(typeof event.response?.usage?.total_tokens==='number'){this.tokens+=event.response.usage.total_tokens;this.callbacks?.onUsage(this.tokens);}
        if(!this.playing)this.callbacks?.onState('listening');
        if(event.response?.status==='failed')this.callbacks?.onError('OpenAI could not complete that turn. You can try again or finish with the transcript so far.');break;
      case 'error':
        if(event.error?.code!=='response_cancel_not_active')this.callbacks?.onError('OpenAI reported a session error. Try another turn, or finish this session.');break;
    }
  }
  sendText(text:string){
    const clean=text.trim().slice(0,10000);if(!clean||this.channel?.readyState!=='open')return;
    this.interrupt();const id=`item_local_${crypto.randomUUID().replaceAll('-','')}`;
    this.addTranscript(id,'guest',clean);
    this.send({type:'conversation.item.create',item:{id,type:'message',role:'user',content:[{type:'input_text',text:clean}]}});
    this.send({type:'response.create'});this.callbacks?.onState('thinking');
  }
  skip(){this.sendText('Please skip that question and ask me a different one.');}
  async requestClosing(maxWaitMs=12_000):Promise<boolean>{
    if(this.channel?.readyState!=='open')return false;
    if(this.timer)clearTimeout(this.timer);this.timer=undefined;
    this.interrupt();
    // Allow a preceding cancelled response to settle before requesting a closing turn.
    await new Promise(resolve=>setTimeout(resolve,200));
    if(this.closed)return false;
    this.closingResponse=undefined;
    const complete=new Promise<boolean>(resolve=>{this.closingWait={resolve,timer:setTimeout(()=>this.resolveClosing(false),maxWaitMs)};});
    this.send({type:'response.create',response:{instructions:'The guest has pressed Finish episode. Give a concise, thoughtful closing summary of this actual conversation in two or three sentences. Acknowledge concrete details the guest shared. Thank the guest. Ask no further question. Do not invent details.'}});
    return complete;
  }
  private resolveClosing(complete:boolean){if(this.closingWait){clearTimeout(this.closingWait.timer);this.closingWait.resolve(complete);this.closingWait=undefined;}this.closingResponse=undefined;}
  interrupt(){
    if(this.activeResponse)this.send({type:'response.cancel'});
    if(this.playing)this.send({type:'output_audio_buffer.clear'});
    this.activeResponse=false;this.playing=false;this.callbacks?.onState('listening');
  }
  setMuted(muted:boolean){this.microphone?.getAudioTracks().forEach(t=>{t.enabled=!muted;});}
  async resumeAudio(){await this.audio?.play();}
  setOutputMuted(muted:boolean){if(this.audio)this.audio.muted=muted;}
  getRemoteStream(){return this.remote;}
  getMicrophoneStream(){return this.microphone;}
  close(){
    this.closed=true;this.resolveClosing(false);if(this.timer)clearTimeout(this.timer);this.timer=undefined;
    this.abort?.abort();this.abort=undefined;this.channel?.close();this.peer?.close();
    if(this.ownsMicrophone)this.microphone?.getTracks().forEach(t=>t.stop());this.ownsMicrophone=false;this.remote?.getTracks().forEach(t=>t.stop());
    if(this.audio){this.audio.pause();this.audio.srcObject=null;}
    this.peer=undefined;this.channel=undefined;this.microphone=undefined;this.remote=undefined;this.audio=undefined;this.playing=false;this.activeResponse=false;
    this.callbacks?.onState('idle');
  }
}

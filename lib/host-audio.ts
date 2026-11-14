import {THREE_QUESTIONS,CLOSING_PROMPT,type PromptId} from './three-questions';

/** The identical voice signal feeds both the recording bus and speaker monitor. */
export function connectHostAudioBus(bus:AudioNode,recording:AudioNode,monitor:AudioNode,output:AudioNode){
  bus.connect(recording);bus.connect(monitor);monitor.connect(output);
}

/** Included synthetic voice files; no speechSynthesis, external service or API key. */
export class HostAudio {
  private context?:AudioContext;
  private bus?:GainNode;
  private monitor?:GainNode;
  private destination?:MediaStreamAudioDestinationNode;
  private analyser?:AnalyserNode;
  private buffers=new Map<PromptId,AudioBuffer>();
  private source?:AudioBufferSourceNode;
  private active?:{id:PromptId;offset:number;began:number;resolve:()=>void};
  private loading?:Promise<void>;
  private sequence=0;
  private disposed=false;
  private samples?:Float32Array<ArrayBuffer>;
  async prepare(){
    if(this.disposed)throw new Error('Host audio has been closed. Reload the studio to start again.');
    if(!this.context){
      const Context=window.AudioContext||(window as typeof window&{webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
      if(!Context)throw new Error('This browser cannot mix host audio. Try a browser with Web Audio support.');
      this.context=new Context();this.bus=this.context.createGain();this.bus.gain.value=.86;
      this.monitor=this.context.createGain();this.destination=this.context.createMediaStreamDestination();
      connectHostAudioBus(this.bus,this.destination,this.monitor,this.context.destination);
      this.analyser=this.context.createAnalyser();this.analyser.fftSize=1024;this.bus.connect(this.analyser);this.samples=new Float32Array(1024);
    }
    await this.context.resume();
    if(this.context.state!=='running')throw new Error('Your browser paused audio. Click the start button again to enable it.');
    if(!this.loading){
      this.loading=Promise.all([...THREE_QUESTIONS,CLOSING_PROMPT].map(async prompt=>{
        const response=await fetch(`/audio/nova/${prompt.id}.wav`);if(!response.ok)throw new Error('The included host voice could not load. Check your connection and retry.');
        const buffer=await this.context!.decodeAudioData(await response.arrayBuffer());
        if(!this.disposed)this.buffers.set(prompt.id,buffer);
      })).then(()=>{}).catch(e=>{this.loading=undefined;throw e;});
    }
    await this.loading;
  }
  getStream(){return this.destination?.stream;}
  setMonitorMuted(muted:boolean){if(this.monitor)this.monitor.gain.value=muted?0:1;}
  level(){if(!this.analyser||!this.samples)return 0;this.analyser.getFloatTimeDomainData(this.samples);let sum=0;for(const sample of this.samples)sum+=sample*sample;return Math.min(1,Math.sqrt(sum/this.samples.length)*6);}
  duration(id:PromptId){return this.buffers.get(id)?.duration||0;}
  play(id:PromptId):Promise<void>{
    this.stop();if(!this.context||!this.bus||!this.buffers.has(id))return Promise.reject(new Error('Prepare the host audio before starting the interview.'));
    return new Promise(resolve=>{this.active={id,offset:0,began:this.context!.currentTime,resolve};this.startSource();});
  }
  private startSource(){
    if(!this.active||!this.context||!this.bus)return;
    const active=this.active,sequence=++this.sequence,buffer=this.buffers.get(active.id)!;
    if(active.offset>=buffer.duration){this.active=undefined;active.resolve();return;}
    const source=this.context.createBufferSource();source.buffer=buffer;source.connect(this.bus);this.source=source;active.began=this.context.currentTime;
    source.onended=()=>{source.disconnect();if(sequence!==this.sequence)return;this.source=undefined;this.active=undefined;active.resolve();};
    source.start(0,active.offset);
  }
  pause(){if(!this.active||!this.source||!this.context)return;this.active.offset+=this.context.currentTime-this.active.began;this.sequence++;this.source.onended=null;this.source.stop();this.source.disconnect();this.source=undefined;}
  resume(){if(this.active&&!this.source)this.startSource();}
  stop(){this.sequence++;if(this.source){this.source.onended=null;try{this.source.stop();}catch{}this.source.disconnect();this.source=undefined;}const previous=this.active;this.active=undefined;previous?.resolve();}
  dispose(){this.disposed=true;this.stop();this.destination?.stream.getTracks().forEach(t=>t.stop());this.bus?.disconnect();this.monitor?.disconnect();this.analyser?.disconnect();if(this.context&&this.context.state!=='closed')void this.context.close().catch(()=>{});}
}

export interface VoiceActivityReading { level:number; speaking:boolean; rms:number; noiseFloor:number }

/** Energy gate, not a semantic speech classifier. Requires sustained energy above a learned floor. */
export class VoiceActivityDetector {
  private floor=0.004;
  private level=0;
  private active=false;
  private aboveSince:number|undefined;
  private belowSince:number|undefined;
  private previous:number|undefined;

  reset():void{this.floor=0.004;this.level=0;this.active=false;this.aboveSince=undefined;this.belowSince=undefined;this.previous=undefined;}
  update(rms:number,now:number):VoiceActivityReading{
    const energy=Math.min(1,Math.max(0,Number.isFinite(rms)?rms:0));
    if(!Number.isFinite(now))return {level:this.level,speaking:this.active,rms:energy,noiseFloor:this.floor};
    const delta=this.previous===undefined?50:Math.min(200,Math.max(1,now-this.previous));this.previous=now;
    const threshold=Math.max(0.018,this.floor*3.2);
    const releaseThreshold=Math.max(0.011,this.floor*1.8);
    // Slowly learn quiet/background energy. Candidate speech never raises its own threshold.
    if(!this.active && energy<threshold && this.aboveSince===undefined){
      const alpha=1-Math.exp(-delta/1800);this.floor=Math.min(.05,Math.max(.001,this.floor+(energy-this.floor)*alpha));
    }
    const desiredLevel=Math.min(1,energy*7);
    const alpha=1-Math.exp(-delta/(desiredLevel>this.level?65:170));this.level+=alpha*(desiredLevel-this.level);
    if(!this.active){
      if(energy>=threshold){this.aboveSince??=now;if(now-this.aboveSince>=280){this.active=true;this.belowSince=undefined;}}
      else this.aboveSince=undefined;
    }else if(energy<releaseThreshold){
      this.belowSince??=now;if(now-this.belowSince>=650){this.active=false;this.aboveSince=undefined;this.belowSince=undefined;}
    }else this.belowSince=undefined;
    return {level:this.level,speaking:this.active,rms:energy,noiseFloor:this.floor};
  }
}

/** Reads only the supplied live stream. It neither requests permissions nor plays microphone audio. */
export class AudioLevelMonitor {
  private context?:AudioContext;
  private source?:MediaStreamAudioSourceNode;
  private highPass?:BiquadFilterNode;
  private lowPass?:BiquadFilterNode;
  private analyser?:AnalyserNode;
  private interval?:ReturnType<typeof setInterval>;
  private detector=new VoiceActivityDetector();
  private generation=0;
  private callback?: (level:number,speaking:boolean)=>void;

  async start(stream:MediaStream,onLevel:(level:number,speaking:boolean)=>void):Promise<void>{
    this.stop();const generation=++this.generation;
    if(typeof window==='undefined')throw new Error('Audio metering requires a browser.');
    if(!stream.getAudioTracks().some(track=>track.readyState==='live'))throw new Error('Enable a microphone before turning on audio metering.');
    const Context=window.AudioContext||(window as typeof window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
    if(!Context)throw new Error('This browser does not support microphone metering. Manual camera switching is available.');
    const context=new Context();this.context=context;this.callback=onLevel;
    try{
      await context.resume();
      if(generation!==this.generation){await context.close().catch(()=>{});return;}
      this.source=context.createMediaStreamSource(stream);
      this.highPass=context.createBiquadFilter();this.highPass.type='highpass';this.highPass.frequency.value=100;
      this.lowPass=context.createBiquadFilter();this.lowPass.type='lowpass';this.lowPass.frequency.value=4500;
      this.analyser=context.createAnalyser();this.analyser.fftSize=1024;this.analyser.smoothingTimeConstant=0;
      this.source.connect(this.highPass);this.highPass.connect(this.lowPass);this.lowPass.connect(this.analyser);
      const data=new Float32Array(this.analyser.fftSize);
      this.detector.reset();onLevel(0,false);
      const sample=()=>{
        if(generation!==this.generation||!this.analyser)return;
        this.analyser.getFloatTimeDomainData(data);
        let sum=0;for(const value of data)sum+=value*value;
        const live=stream.getAudioTracks().some(track=>track.readyState==='live'&&track.enabled&&!track.muted);
        const reading=this.detector.update(live?Math.sqrt(sum/data.length):0,performance.now());
        onLevel(reading.level,reading.speaking);
      };
      this.interval=setInterval(sample,50);sample();
    }catch(error){if(generation!==this.generation){if(context.state!=='closed')await context.close().catch(()=>{});return;}this.stop();throw error instanceof Error?error:new Error('Audio metering could not start.');}
  }
  stop():void{
    this.generation++;
    if(this.interval)clearInterval(this.interval);this.interval=undefined;
    for(const node of [this.source,this.highPass,this.lowPass,this.analyser]){try{node?.disconnect();}catch{/* Already disconnected. */}}
    this.source=undefined;this.highPass=undefined;this.lowPass=undefined;this.analyser=undefined;
    if(this.context&&this.context.state!=='closed')void this.context.close().catch(()=>{});this.context=undefined;
    this.detector.reset();this.callback?.(0,false);this.callback=undefined;
  }
}

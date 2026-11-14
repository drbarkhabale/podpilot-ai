/** A stable stream exists before the first host word. Monitor gain never mutes capture. */
export class HostAudioBus {
  context?:AudioContext; private bus?:GainNode; private monitor?:GainNode; private destination?:MediaStreamAudioDestinationNode; private analyser?:AnalyserNode;
  private sources=new Set<AudioBufferSourceNode>();private inputs:AudioNode[]=[];private nextAt=0;private frame=0;private muted=false;
  private mediaNodes=new WeakMap<HTMLMediaElement,MediaElementAudioSourceNode>();
  async prepare(onLevel?:(level:number)=>void){
    if(!this.context){this.context=new AudioContext();this.bus=this.context.createGain();this.monitor=this.context.createGain();this.destination=this.context.createMediaStreamDestination();this.analyser=this.context.createAnalyser();this.analyser.fftSize=512;this.bus.connect(this.analyser);this.analyser.connect(this.destination);this.bus.connect(this.monitor);this.monitor.connect(this.context.destination);this.monitor.gain.value=this.muted?0:1;}
    await this.context.resume();if(onLevel&&!this.frame){const data=new Uint8Array(this.analyser!.fftSize);const tick=()=>{this.analyser?.getByteTimeDomainData(data);let sum=0;for(const n of data)sum+=((n-128)/128)**2;onLevel(Math.min(1,Math.sqrt(sum/data.length)*5));this.frame=requestAnimationFrame(tick)};this.frame=requestAnimationFrame(tick);}
  }
  stream(){return this.destination?.stream;}
  attachStream(stream:MediaStream){if(!this.context||!this.bus)throw new Error('Host audio is not ready.');const node=this.context.createMediaStreamSource(stream);node.connect(this.bus);this.inputs.push(node);return()=>node.disconnect();}
  attachElement(element:HTMLMediaElement){if(!this.context||!this.bus)throw new Error('Host audio is not ready.');let node=this.mediaNodes.get(element);if(!node){node=this.context.createMediaElementSource(element);node.connect(this.bus);this.mediaNodes.set(element,node);this.inputs.push(node);}return node;}
  setMuted(muted:boolean){this.muted=muted;if(this.monitor)this.monitor.gain.value=muted?0:1;}
  async playBlob(blob:Blob,onEnd?:()=>void){if(!this.context||!this.bus)await this.prepare();const buffer=await this.context!.decodeAudioData(await blob.arrayBuffer());this.stop();this.enqueue(buffer,onEnd);}
  enqueuePCM(base64:string,rate:number,onEnd?:()=>void){if(!this.context)throw new Error('Host audio is not ready.');const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));if(bytes.length%2)throw new Error('Invalid host audio packet.');const buffer=this.context.createBuffer(1,bytes.length/2,rate),data=buffer.getChannelData(0),view=new DataView(bytes.buffer);for(let i=0;i<data.length;i++)data[i]=view.getInt16(i*2,true)/32768;this.enqueue(buffer,onEnd);}
  private enqueue(buffer:AudioBuffer,onEnd?:()=>void){const ctx=this.context!;const node=ctx.createBufferSource();node.buffer=buffer;node.connect(this.bus!);this.sources.add(node);const when=Math.max(ctx.currentTime+.015,this.nextAt);this.nextAt=when+buffer.duration;node.onended=()=>{this.sources.delete(node);node.disconnect();if(!this.sources.size)onEnd?.();};node.start(when);}
  stop(){for(const node of this.sources){node.onended=null;try{node.stop();node.disconnect()}catch{}}this.sources.clear();this.nextAt=0;}
  playing(){return this.sources.size>0;}
  dispose(){this.stop();cancelAnimationFrame(this.frame);this.frame=0;this.inputs.forEach(n=>{try{n.disconnect()}catch{}});this.inputs=[];this.destination?.stream.getTracks().forEach(t=>t.stop());void this.context?.close();this.context=undefined;this.bus=undefined;this.destination=undefined;this.mediaNodes=new WeakMap();}
}
export function pcm16Base64(samples:Float32Array):string{const data=new Uint8Array(samples.length*2);const view=new DataView(data.buffer);for(let i=0;i<samples.length;i++){const v=Math.max(-1,Math.min(1,samples[i]));view.setInt16(i*2,v<0?v*32768:v*32767,true)}let binary='';for(const b of data)binary+=String.fromCharCode(b);return btoa(binary);}

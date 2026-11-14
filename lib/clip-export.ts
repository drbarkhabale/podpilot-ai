import type { CameraCut, CaptionCue } from './types';

export type ClipLayout = 'smart' | 'center' | 'split';
export interface VerticalFrameOptions {
  time: number;
  sourceWidth: number;
  sourceHeight: number;
  layout: ClipLayout;
  captions: CaptionCue[];
  includeCaptions: boolean;
  title: string;
  includeTitle: boolean;
  cameraCuts?: CameraCut[];
  hostSide?: 'left'|'right';
}
export interface ClipRenderOptions extends Omit<VerticalFrameOptions,'time'|'sourceWidth'|'sourceHeight'> {
  blob: Blob;
  start: number;
  end: number;
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}
export interface CropRect { x:number; y:number; width:number; height:number }

export function validateClipRange(start:number,end:number,duration?:number):void {
  if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start) throw new Error('Choose a finite clip range with an end after its start.');
  if(end-start>300) throw new Error('Choose a clip of five minutes or less. Download the original recording for longer edits.');
  if(typeof duration==='number'&&Number.isFinite(duration)&&duration>0&&(start>=duration||end>duration+0.15)) throw new Error('The selected range is outside the actual recording.');
}

export function activeCaption(captions:CaptionCue[],time:number):CaptionCue|undefined {
  return captions.filter(c=>Number.isFinite(c.start)&&Number.isFinite(c.end)&&c.start<=time&&c.end>time&&c.text.trim()).sort((a,b)=>b.start-a.start)[0];
}

/** A deterministic crop of the recorded frame; this never invents a missing camera angle. */
export function verticalCrop(sourceWidth:number,sourceHeight:number,time:number,layout:ClipLayout,captions:CaptionCue[],cuts:CameraCut[]=[],hostSide:'left'|'right'='right'):CropRect {
  if(sourceWidth<=0||sourceHeight<=0||!Number.isFinite(sourceWidth)||!Number.isFinite(sourceHeight)) throw new Error('The source video has no usable frame dimensions.');
  const ratio=9/16;
  const width=Math.min(sourceWidth,sourceHeight*ratio);
  const height=Math.min(sourceHeight,sourceWidth/ratio);
  let focus=0.5;
  if(layout==='smart') {
    const shot=[...cuts].filter(c=>c.at<=time).sort((a,b)=>b.at-a.at)[0]?.shot;
    if(shot==='wide'){const isHost=activeCaption(captions,time)?.role==='host';focus=(isHost===(hostSide==='left'))?0.25:0.75;}
  }
  const x=Math.max(0,Math.min(sourceWidth-width,sourceWidth*focus-width/2));
  return {x,y:Math.max(0,(sourceHeight-height)/2),width,height};
}

function linesFor(ctx:CanvasRenderingContext2D,text:string,maxWidth:number,maxLines:number):string[] {
  const words=text.replace(/\s+/g,' ').trim().split(' ').filter(Boolean);const lines:string[]=[];let current='';
  for(let i=0;i<words.length;i++) {
    const word=words[i];const next=current?`${current} ${word}`:word;
    if(ctx.measureText(next).width<=maxWidth||!current){current=next;continue;}
    lines.push(current);current=word;
    if(lines.length===maxLines-1){current=[word,...words.slice(i+1)].join(' ');break;}
  }
  if(current)lines.push(current);
  const last=lines.length-1;
  if(last>=0&&ctx.measureText(lines[last]).width>maxWidth) {
    let shortened=lines[last];while(shortened.length&&ctx.measureText(shortened+'…').width>maxWidth)shortened=shortened.slice(0,-1);
    lines[last]=shortened.trimEnd()+'…';
  }
  return lines.slice(0,maxLines);
}

/** Shared compositor for the editor preview and exported frames. All imagery comes from source. */
export function drawVerticalFrame(ctx:CanvasRenderingContext2D,source:CanvasImageSource,width:number,height:number,options:VerticalFrameOptions):void {
  const {sourceWidth,sourceHeight}=options;
  if(width<=0||height<=0)return;
  ctx.save();ctx.clearRect(0,0,width,height);ctx.fillStyle='#0B1018';ctx.fillRect(0,0,width,height);
  const scale=width/720;
  if(options.layout==='split') {
    const targetHeight=width*sourceHeight/sourceWidth;const top=Math.max(170*scale,(height-targetHeight)/2-100*scale);
    ctx.drawImage(source,0,0,sourceWidth,sourceHeight,0,top,width,targetHeight);
    ctx.fillStyle='#FF9B45';ctx.fillRect(0,top-5*scale,width/2,5*scale);ctx.fillStyle='#399CFA';ctx.fillRect(width/2,top-5*scale,width/2,5*scale);
  }else{
    const crop=verticalCrop(sourceWidth,sourceHeight,options.time,options.layout,options.captions,options.cameraCuts,options.hostSide);
    ctx.drawImage(source,crop.x,crop.y,crop.width,crop.height,0,0,width,height);
    const topShade=ctx.createLinearGradient(0,0,0,260*scale);topShade.addColorStop(0,'#0b1018dd');topShade.addColorStop(1,'#0b101800');ctx.fillStyle=topShade;ctx.fillRect(0,0,width,260*scale);
    const bottomShade=ctx.createLinearGradient(0,height-440*scale,0,height);bottomShade.addColorStop(0,'#0b101800');bottomShade.addColorStop(1,'#0b1018ee');ctx.fillStyle=bottomShade;ctx.fillRect(0,height-440*scale,width,440*scale);
  }
  ctx.textAlign='left';ctx.textBaseline='top';ctx.font=`600 ${19*scale}px Arial, sans-serif`;ctx.fillStyle='#F5F2EC';ctx.fillText('PODPILOT',36*scale,35*scale);
  ctx.fillStyle='#FF9B45';ctx.fillRect(36*scale,65*scale,30*scale,3*scale);ctx.fillStyle='#399CFA';ctx.fillRect(70*scale,65*scale,30*scale,3*scale);
  if(options.includeTitle&&options.title.trim()) {
    ctx.fillStyle='#F5F2EC';ctx.font=`600 ${39*scale}px Arial, sans-serif`;
    linesFor(ctx,options.title,width-72*scale,2).forEach((line,i)=>ctx.fillText(line,36*scale,105*scale+i*47*scale));
  }
  const cue=options.includeCaptions?activeCaption(options.captions,options.time):undefined;
  if(cue) {
    const color=cue.role==='host'?'#399CFA':'#FF9B45';
    ctx.font=`700 ${38*scale}px Arial, sans-serif`;
    const lines=linesFor(ctx,cue.text,width-92*scale,4);const blockHeight=lines.length*49*scale+34*scale;
    const top=Math.min(height-150*scale-blockHeight,options.layout==='split'?height*0.69:height*0.71);
    ctx.fillStyle='#0b1018dc';ctx.beginPath();ctx.roundRect(24*scale,top-18*scale,width-48*scale,blockHeight+35*scale,12*scale);ctx.fill();
    ctx.fillStyle=color;ctx.fillRect(24*scale,top-18*scale,4*scale,blockHeight+35*scale);
    ctx.textAlign='center';ctx.fillStyle='#F5F2EC';lines.forEach((line,i)=>ctx.fillText(line,width/2,top+16*scale+i*49*scale));
  }
  ctx.textAlign='center';ctx.fillStyle='#d1d9e4';ctx.font=`500 ${17*scale}px Arial, sans-serif`;ctx.fillText('A CONVERSATION WORTH SHARING',width/2,height-62*scale);
  ctx.restore();
}

function abortError():Error {const error=new Error('Clip export cancelled.');error.name='AbortError';return error;}
function waitForMedia(video:HTMLVideoElement,event:'loadedmetadata'|'loadeddata'|'seeked',signal:AbortSignal|undefined,timeout=15_000):Promise<void> {
  return new Promise((resolve,reject)=>{
    let timer:ReturnType<typeof setTimeout>;
    const cleanup=()=>{clearTimeout(timer);video.removeEventListener(event,done);video.removeEventListener('error',failed);signal?.removeEventListener('abort',aborted);};
    const done=()=>{cleanup();resolve();};const failed=()=>{cleanup();reject(new Error('The browser cannot decode this recording. Download the original or export an audio clip instead.'));};const aborted=()=>{cleanup();reject(abortError());};
    video.addEventListener(event,done,{once:true});video.addEventListener('error',failed,{once:true});signal?.addEventListener('abort',aborted,{once:true});timer=setTimeout(()=>{cleanup();reject(new Error('The recording took too long to load or seek. Try a shorter clip or download the original.'));},timeout);
    if(signal?.aborted)aborted();
  });
}

/**
 * Replays and records actual source frames and audio, in real time. Browser-only,
 * format-dependent, with no server upload, model generation, or fake MP4 conversion.
 */
export async function renderClip(options:ClipRenderOptions):Promise<Blob> {
  validateClipRange(options.start,options.end);
  if(options.signal?.aborted)throw abortError();
  if(!options.blob.size)throw new Error('There is no captured media to export.');
  if(options.blob.type.startsWith('audio/'))throw new Error('This is an audio-only recording. Use Export WAV audio instead of a video clip.');
  if(typeof document==='undefined'||typeof MediaRecorder==='undefined'||typeof AudioContext==='undefined')throw new Error('Video clip rendering is unavailable in this browser. Download the original recording or export WAV audio.');
  if(document.visibilityState==='hidden')throw new Error('Keep PodPilot visible while exporting. Browser clip rendering happens in real time.');
  const canvas=document.createElement('canvas');canvas.width=720;canvas.height=1280;
  if(typeof canvas.captureStream!=='function')throw new Error('This browser cannot capture composed video. Download the original recording or export WAV audio.');
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas video rendering is unavailable in this browser.');
  const video=document.createElement('video');video.preload='auto';video.playsInline=true;video.muted=false;video.volume=1;video.playbackRate=1;
  const url=URL.createObjectURL(options.blob);let audio:AudioContext|undefined;let source:MediaElementAudioSourceNode|undefined;let destination:MediaStreamAudioDestinationNode|undefined;let stream:MediaStream|undefined;let recorder:MediaRecorder|undefined;let frame=0;let watchdog:ReturnType<typeof setInterval>|undefined;let timeout:ReturnType<typeof setTimeout>|undefined;let finalizeTimer:ReturnType<typeof setTimeout>|undefined;let abortListener:(()=>void)|undefined;let visibilityListener:(()=>void)|undefined;
  try {
    // Start the audio context within the initiating click, before metadata awaits.
    audio=new AudioContext();await audio.resume();
    if(audio.state!=='running')throw new Error('Audio export is blocked by the browser. Click Export again after enabling audio.');
    source=audio.createMediaElementSource(video);destination=audio.createMediaStreamDestination();source.connect(destination);
    // Intentionally no connection to audio.destination: the original audio is captured without speaker echo.
    const metadata=waitForMedia(video,'loadedmetadata',options.signal);video.src=url;video.load();await metadata;
    validateClipRange(options.start,options.end,video.duration);
    if(!video.videoWidth||!video.videoHeight)throw new Error('The source contains no playable video. Export the captured audio as WAV instead.');
    if(video.readyState<2)await waitForMedia(video,'loadeddata',options.signal);
    if(Math.abs(video.currentTime-options.start)>0.02) {
      const seeking=waitForMedia(video,'seeked',options.signal);video.currentTime=options.start;await seeking;
      if(Math.abs(video.currentTime-options.start)>0.3)throw new Error('This recording cannot seek to the selected start. Try an earlier range or download the original.');
    }
    const draw=()=>drawVerticalFrame(ctx,video,canvas.width,canvas.height,{...options,time:video.currentTime,sourceWidth:video.videoWidth,sourceHeight:video.videoHeight});
    draw();stream=canvas.captureStream(30);const videoTrack=stream.getVideoTracks()[0];if(!videoTrack)throw new Error('No video stream was produced by this browser.');
    destination.stream.getAudioTracks().forEach(track=>stream!.addTrack(track));
    const candidates=['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4;codecs=avc1.42001E,mp4a.40.2','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
    const mime=candidates.find(type=>MediaRecorder.isTypeSupported(type));
    recorder=new MediaRecorder(stream,mime?{mimeType:mime,videoBitsPerSecond:4_000_000}:undefined);
    const chunks:BlobPart[]=[];
    const result=new Promise<Blob>((resolve,reject)=>{
      let settled=false;let stopping=false;let failure:Error|undefined;let lastTime=options.start;let lastMoved=performance.now();
      const fail=(error:Error)=>{if(settled)return;failure=error;if(!stopping)stop();};
      const stop=()=>{if(stopping)return;stopping=true;video.pause();cancelAnimationFrame(frame);if(recorder!.state!=='inactive'){recorder!.stop();finalizeTimer=setTimeout(()=>{if(!settled){settled=true;reject(failure||new Error('The browser did not finalize the encoded clip. Try another format or download the original.'));}},8000);}else{settled=true;reject(failure||new Error('Clip recording stopped before any media was captured.'));}};
      recorder!.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
      recorder!.onerror=()=>fail(new Error('The browser could not encode this clip. Download the original or export WAV audio.'));
      recorder!.onstop=()=>{if(finalizeTimer)clearTimeout(finalizeTimer);if(settled)return;settled=true;if(failure){reject(failure);return;}const actualMime=recorder!.mimeType||mime||(chunks[0] instanceof Blob?chunks[0].type:'');if(!actualMime){reject(new Error('The browser did not identify the clip format. Download the original instead.'));return;}const blob=new Blob(chunks,{type:actualMime});if(!blob.size){reject(new Error('The browser produced an empty clip. No download was created.'));return;}options.onProgress?.(1);resolve(blob);};
      video.onerror=()=>fail(new Error('Playback failed while rendering. Your original recording is unchanged.'));
      video.onended=()=>{if(video.currentTime+0.25<options.end)fail(new Error('The recording ends before the selected clip range. Choose an earlier end.'));else stop();};
      abortListener=()=>fail(abortError());options.signal?.addEventListener('abort',abortListener,{once:true});
      visibilityListener=()=>{if(document.visibilityState==='hidden')fail(new Error('Export stopped because PodPilot became hidden. Keep this tab visible and try again.'));};document.addEventListener('visibilitychange',visibilityListener);
      const tick=()=>{if(stopping)return;try{draw();}catch{fail(new Error('A source frame could not be rendered. Your original recording is unchanged.'));return;}const current=video.currentTime;if(current>lastTime+0.01){lastTime=current;lastMoved=performance.now();}options.onProgress?.(Math.max(0,Math.min(1,(current-options.start)/(options.end-options.start))));if(current>=options.end-0.015){stop();return;}frame=requestAnimationFrame(tick);};
      watchdog=setInterval(()=>{if(!stopping&&performance.now()-lastMoved>10_000)fail(new Error('Video playback stalled. Keep the tab visible or try a shorter clip.'));},1000);
      timeout=setTimeout(()=>fail(new Error('Clip export exceeded its time limit. Try a shorter range.')),(options.end-options.start+30)*1000);
      recorder!.start(250);options.onProgress?.(0);
      void video.play().then(()=>{frame=requestAnimationFrame(tick);}).catch(()=>fail(new Error('Browser playback was blocked. Enable audio, then click Export clip again.')));
      if(options.signal?.aborted)fail(abortError());
    });
    return await result;
  }finally {
    cancelAnimationFrame(frame);if(watchdog)clearInterval(watchdog);if(timeout)clearTimeout(timeout);if(finalizeTimer)clearTimeout(finalizeTimer);
    if(abortListener)options.signal?.removeEventListener('abort',abortListener);if(visibilityListener)document.removeEventListener('visibilitychange',visibilityListener);
    if(recorder&&recorder.state!=='inactive'){try{recorder.stop();}catch{/* Already stopped. */}}
    video.pause();video.onerror=null;video.onended=null;video.removeAttribute('src');video.load();source?.disconnect();stream?.getTracks().forEach(track=>track.stop());destination?.stream.getTracks().forEach(track=>track.stop());if(audio&&audio.state!=='closed')await audio.close().catch(()=>{});URL.revokeObjectURL(url);
  }
}

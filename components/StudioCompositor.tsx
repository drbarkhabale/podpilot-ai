'use client';
import {forwardRef,useEffect,useImperativeHandle,useRef} from 'react';
import type {CameraShot,HostState} from '@/lib/types';
import {drawStudioFrame,STUDIO_WIDTH,STUDIO_HEIGHT} from '@/lib/studio-drawing';
import {NovaAvatar} from './NovaAvatar';

export interface StudioCompositorProps {
  guestStream:MediaStream|null;
  guestName:string;
  topic:string;
  shot:CameraShot;
  hostState:HostState;
  guestLevel:number;
  hostLevel:number;
  hostAudioMeasured?:boolean;
  theme?:string;
  introVideo?:HTMLVideoElement|null;
  onCameraError?:(message:string)=>void;
}

/** One live 16:9 canvas powers the on-screen preview and the captured recording. */
export const StudioCompositor=forwardRef<HTMLCanvasElement,StudioCompositorProps>(function StudioCompositor(props,ref){
  const canvas=useRef<HTMLCanvasElement>(null);
  const avatar=useRef<HTMLCanvasElement>(null);
  const guestVideo=useRef<HTMLVideoElement>(null);
  const current=useRef(props);current.current=props;
  useImperativeHandle(ref,()=>canvas.current!,[]);

  useEffect(()=>{
    const video=guestVideo.current;if(!video)return;
    let alive=true;
    video.srcObject=props.guestStream;
    if(props.guestStream){
      void video.play().catch(()=>{if(alive)current.current.onCameraError?.('Camera playback could not start. Try enabling the camera again, or continue audio-only.');});
    }
    return()=>{alive=false;video.pause();video.srcObject=null;};
  },[props.guestStream]);

  useEffect(()=>{
    const element=canvas.current;if(!element)return;
    element.width=STUDIO_WIDTH;element.height=STUDIO_HEIGHT;
    const context=element.getContext('2d',{alpha:false});if(!context){current.current.onCameraError?.('This browser cannot render the studio canvas. Try another browser.');return;}
    let animation=0,last=0;
    const tick=(now:number)=>{
      animation=requestAnimationFrame(tick);
      if(now-last<1000/30)return;last=now;
      const state=current.current;
      const liveTrack=state.guestStream?.getVideoTracks().some(track=>track.readyState==='live'&&track.enabled);
      if(state.introVideo&&state.introVideo.readyState>=2){const video=state.introVideo;context.fillStyle='#070b12';context.fillRect(0,0,1280,720);const scale=Math.min(1280/video.videoWidth,720/video.videoHeight),w=video.videoWidth*scale,h=video.videoHeight*scale;context.drawImage(video,(1280-w)/2,(720-h)/2,w,h);context.fillStyle='#070b12dd';context.fillRect(24,24,445,42);context.fillStyle='#fff';context.font='18px Arial';context.fillText('PRERECORDED INTRO · NOT A LIVE ANSWER',38,51);return;}
      drawStudioFrame(context,element.width,element.height,{guestVideo:guestVideo.current,hostCanvas:avatar.current,guestName:state.guestName,topic:state.topic,shot:state.shot,hostState:state.hostState,guestLevel:state.guestLevel,hostLevel:state.hostLevel,theme:state.theme,cameraAvailable:!!liveTrack});
    };
    animation=requestAnimationFrame(tick);
    return()=>cancelAnimationFrame(animation);
  },[]);

  return <div className="studio-compositor" style={{position:'relative',aspectRatio:'16 / 9',width:'100%',background:'#0B1018',overflow:'hidden'}}>
    <canvas ref={canvas} style={{display:'block',width:'100%',height:'100%',aspectRatio:'16 / 9'}} role="img" aria-label={`Live podcast preview: ${props.shot==='wide'?'guest and NOAH':props.shot==='guest'?'guest camera':'NOAH AI host'}. ${props.guestStream?'Camera enabled.':'Camera disabled; audio-only guest.'}`}/>
    <div aria-hidden="true" style={{position:'absolute',width:1,height:1,overflow:'hidden',clipPath:'inset(50%)',pointerEvents:'none'}}>
      <video ref={guestVideo} autoPlay playsInline muted tabIndex={-1}/>
      <NovaAvatar ref={avatar} state={props.hostState} theme={props.theme} audioLevel={props.hostAudioMeasured?props.hostLevel:props.hostLevel||undefined} transparent/>
    </div>
  </div>;
});

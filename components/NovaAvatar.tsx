'use client';
import {forwardRef,useEffect,useImperativeHandle,useRef} from 'react';
import type {HostState} from '@/lib/types';
import {useHostProfile} from './useHostProfile';
/** Compatibility export for existing pages. Approved NOAH portrait, no invented lip sync. */
export const NovaAvatar=forwardRef<HTMLCanvasElement,{state?:HostState;theme?:string;className?:string;audioLevel?:number;transparent?:boolean;imageUrl?:string}>(function NoahPortrait({state='idle',className,audioLevel,imageUrl},ref){
 const {urls}=useHostProfile();const source=imageUrl||urls.portrait;
 const canvas=useRef<HTMLCanvasElement>(null),current=useRef({state,audioLevel});current.current={state,audioLevel};
 useImperativeHandle(ref,()=>canvas.current!,[]);
 useEffect(()=>{
  const c=canvas.current!,ctx=c.getContext('2d');if(!ctx)return;c.width=800;c.height=800;
  const portrait=new Image();portrait.src=source;let frame=0,last=0,failed=false;portrait.onerror=()=>{failed=true};
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const draw=(now:number)=>{frame=requestAnimationFrame(draw);if(now-last<1000/30)return;last=now;ctx.fillStyle='#111821';ctx.fillRect(0,0,800,800);
   if(!portrait.complete||!portrait.naturalWidth){ctx.fillStyle='#e5eaf0';ctx.font='24px Arial';ctx.textAlign='center';ctx.fillText(failed?'Portrait unavailable':'Preparing NOAH…',400,400);return;}
   const t=now/1000;ctx.save();if(!reduced){ctx.translate(400,400+Math.sin(t*.7)*1.2);ctx.scale(1.008,1.008);ctx.translate(-400,-400);}
   const scale=Math.max(800/portrait.naturalWidth,800/portrait.naturalHeight),w=portrait.naturalWidth*scale,h=portrait.naturalHeight*scale;ctx.drawImage(portrait,(800-w)/2,(800-h)/2,w,h);ctx.restore();
   const level=Math.min(1,Math.max(0,current.current.audioLevel||0));
   if(level>.01){ctx.strokeStyle=`rgba(57,156,250,${.2+level*.7})`;ctx.lineWidth=3+level*7;ctx.strokeRect(6,6,788,788);}
  };frame=requestAnimationFrame(draw);return()=>cancelAnimationFrame(frame);
 },[source]);
 return <canvas ref={canvas} className={className||'nova-canvas'} role="img" aria-label={`NOAH, approved host portrait, ${state}. Stylized motion; not real-time lip sync.`}/>;
});

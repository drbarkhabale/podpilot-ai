'use client';
import {useEffect,useRef,useState} from 'react';
import {getMedia} from '@/lib/storage';
export function LandingVideo(){const [src,setSrc]=useState('/nova-video/part1.mp4'),[custom,setCustom]=useState(false),[error,setError]=useState('');const ref=useRef<HTMLVideoElement>(null);
 useEffect(()=>{let url='',alive=true;getMedia('podpilot-landing-video').then(blob=>{if(blob&&alive){url=URL.createObjectURL(blob);setSrc(url);setCustom(true)}}).catch(()=>{});return()=>{alive=false;if(url)URL.revokeObjectURL(url)}},[]);
 return <div className="landing-video"><div className="landing-video-label"><span className="live-dot"/>{custom?'YOUR DEMO VIDEO · LOCAL PREVIEW':'MEET NOVA · ORIGINAL VIDEO'}</div><video ref={ref} key={src} src={src} poster={custom?undefined:'/nova-video/poster.jpg'} controls playsInline preload="metadata" onError={()=>setError('This video could not play. Try the studio or choose a different MP4 in Host Settings.')} aria-label="PodPilot host video preview"/><p>{error||'Press play to hear the host. Your interview starts only when you enter the studio.'}</p></div>
}

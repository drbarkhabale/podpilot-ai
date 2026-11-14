'use client';
import {useEffect,useState} from 'react';
import {DEFAULT_HOST,HOST_DEFAULT_ASSETS,loadHostProfile,type HostProfile} from '@/lib/host-settings';
export function useHostProfile(){
  const [profile,setProfile]=useState<HostProfile>({settings:DEFAULT_HOST,assets:{}}),[urls,setUrls]=useState(HOST_DEFAULT_ASSETS),[loaded,setLoaded]=useState(false),[error,setError]=useState('');
  useEffect(()=>{let active=true,owned:string[]=[];let generation=0;const refresh=async()=>{const seq=++generation;try{const next=await loadHostProfile();if(!active||seq!==generation)return;owned.forEach(URL.revokeObjectURL);owned=[];const nextUrls={...HOST_DEFAULT_ASSETS};for(const kind of Object.keys(next.assets) as (keyof typeof next.assets)[]){const asset=next.assets[kind];if(asset){nextUrls[kind]=URL.createObjectURL(asset.blob);owned.push(nextUrls[kind]);}}setProfile(next);setUrls(nextUrls);setError('');}catch(e){if(active)setError(e instanceof Error?e.message:'Host settings could not load.');}finally{if(active)setLoaded(true)}};void refresh();window.addEventListener('podpilot-host-changed',refresh);return()=>{active=false;window.removeEventListener('podpilot-host-changed',refresh);owned.forEach(URL.revokeObjectURL)}},[]);
  return {...profile,urls,loaded,error};
}

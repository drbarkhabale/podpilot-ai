import {MODES,type EngineMode,type InterviewMode,type InterviewConfig} from './types';
/** Public IDs/preferences only. API secrets belong to the server environment. */
export interface HostSettings {
  version:1; name:'NOAH'; engine:EngineMode; browserVoice:string; openaiVoice:string;
  elevenLabsVoiceId:string; elevenLabsAgentId:string; voiceAuthorized:boolean;
  theme:InterviewConfig['theme']; mode:InterviewMode; duration:number; playIntro:boolean;
}
export type HostAssetKind='portrait'|'video'|'intro'|'sample';
export interface HostAsset {kind:HostAssetKind; name:string; blob:Blob}
export interface HostProfile {settings:HostSettings; assets:Partial<Record<HostAssetKind,HostAsset>>}
export const DEFAULT_HOST:HostSettings={version:1,name:'NOAH',engine:'demo',browserVoice:'',openaiVoice:'cedar',elevenLabsVoiceId:'',elevenLabsAgentId:'',voiceAuthorized:false,theme:'blue',mode:'Unpopular Opinions',duration:5,playIntro:false};
export const HOST_DEFAULT_ASSETS={portrait:'/noah/approved-portrait.png',video:'/noah/approved-sample.mp4',intro:'',sample:''};
export const ENGINE_LABELS:Record<EngineMode,string>={demo:'DEMO MODE · Browser speech',openai:'OpenAI Realtime',elevenlabs:'ElevenLabs Conversational AI'};
export function normalizeHostSettings(value:Partial<HostSettings>):HostSettings {
  const text=(v:unknown,max=100)=>typeof v==='string'?v.trim().slice(0,max):'';
  return {version:1,name:'NOAH',engine:['demo','openai','elevenlabs'].includes(value.engine||'')?value.engine!:DEFAULT_HOST.engine,
    browserVoice:text(value.browserVoice,200),openaiVoice:text(value.openaiVoice)||'cedar',elevenLabsAgentId:text(value.elevenLabsAgentId),elevenLabsVoiceId:text(value.elevenLabsVoiceId),
    voiceAuthorized:value.voiceAuthorized===true,theme:['blue','amber','violet','teal'].includes(value.theme||'')?value.theme!:'blue',mode:MODES.includes(value.mode!)?value.mode!:DEFAULT_HOST.mode,
    duration:Math.min(60,Math.max(1,Number(value.duration)||5)),playIntro:value.playIntro===true};
}
export function validateHostAsset(kind:HostAssetKind,file:Blob):void {
  const types=kind==='portrait'?['image/png','image/jpeg','image/webp']:kind==='sample'?['audio/mpeg','audio/wav','audio/x-wav','audio/mp4','audio/webm','audio/ogg']:['video/mp4','video/webm','video/quicktime'];
  if(!types.includes(file.type))throw new Error(kind==='portrait'?'Choose a PNG, JPEG, or WebP portrait.':kind==='sample'?'Choose an MP3, WAV, M4A, WebM, or OGG audio sample.':'Choose an MP4, WebM, or MOV video supported by your browser.');
  const limit=kind==='portrait'?10:kind==='sample'?25:100;
  if(file.size===0||file.size>limit*1024*1024)throw new Error(`Choose a nonempty file smaller than ${limit} MB.`);
}
function database():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{if(typeof indexedDB==='undefined'){reject(new Error('Host storage is unavailable. Allow browser storage for this site.'));return;}const request=indexedDB.open('podpilot-host',1);request.onupgradeneeded=()=>request.result.createObjectStore('profile');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(new Error('Could not open local host storage.'));});}
export async function loadHostProfile():Promise<HostProfile>{const db=await database();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('profile','readonly');const request=tx.objectStore('profile').get('noah');request.onsuccess=()=>{const profile=request.result as HostProfile|undefined;resolve({settings:normalizeHostSettings(profile?.settings||{}),assets:profile?.assets||{}})};request.onerror=()=>reject(new Error('Could not load your host settings.'));});}finally{db.close();}}
export async function saveHostProfile(profile:HostProfile):Promise<void>{
  const settings=normalizeHostSettings(profile.settings);
  if(!/^[a-zA-Z0-9_-]*$/.test(settings.elevenLabsAgentId)||!/^[a-zA-Z0-9_-]*$/.test(settings.elevenLabsVoiceId))throw new Error('Provider IDs may contain letters, numbers, underscores, or hyphens. Do not enter API keys here.');
  if([settings.elevenLabsAgentId,settings.elevenLabsVoiceId].some(v=>/^sk[-_]/.test(v)))throw new Error('Use a Voice ID or Agent ID here, never a secret API key.');
  if(settings.engine==='elevenlabs'&&!settings.voiceAuthorized)throw new Error('Confirm authorization to use the configured voice before selecting ElevenLabs.');
  for(const [kind,asset]of Object.entries(profile.assets))if(asset)validateHostAsset(kind as HostAssetKind,asset.blob);
  const db=await database();try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction('profile','readwrite');tx.objectStore('profile').put({settings,assets:profile.assets},'noah');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(new Error('Host settings could not be saved. Your browser may be out of storage.'));tx.onabort=()=>reject(new Error('Host settings were not saved.'));});}finally{db.close();}
  window.dispatchEvent(new Event('podpilot-host-changed'));
}
export async function resetHostProfile(){await saveHostProfile({settings:DEFAULT_HOST,assets:{}});}

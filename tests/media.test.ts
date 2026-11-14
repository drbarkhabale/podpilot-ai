import test from 'node:test';
import assert from 'node:assert/strict';
import {VoiceActivityDetector} from '../lib/audio-meter';
import {CameraDirector} from '../lib/director';
import {RecordingClock,StudioRecorder} from '../lib/recording';

test('audio gate rejects quiet noise and a brief loud click',()=>{
 const detector=new VoiceActivityDetector();
 for(let t=0;t<2000;t+=50)assert.equal(detector.update(.003+(.001*(t%3)),t).speaking,false);
 assert.equal(detector.update(.5,2000).speaking,false);
 for(let t=2050;t<3000;t+=50)assert.equal(detector.update(.003,t).speaking,false);
});
test('audio gate requires sustained energy and holds through short speech pauses',()=>{
 const detector=new VoiceActivityDetector();
 assert.equal(detector.update(.06,0).speaking,false);assert.equal(detector.update(.06,200).speaking,false);
 assert.equal(detector.update(.06,300).speaking,true);
 assert.equal(detector.update(0,400).speaking,true);assert.equal(detector.update(0,900).speaking,true);
 assert.equal(detector.update(.06,950).speaking,true);assert.equal(detector.update(0,1000).speaking,true);
 assert.equal(detector.update(0,1700).speaking,false);
 assert.equal(detector.update(Number.NaN,1800).rms,0);
});
test('auto director waits for a stable speaker and minimum shot duration',()=>{
 const director=new CameraDirector();
 assert.equal(director.update({now:0,guestSpeaking:false,hostSpeaking:false}),null);
 assert.equal(director.update({now:100,guestSpeaking:true,hostSpeaking:false}),null);
 assert.equal(director.update({now:400,guestSpeaking:true,hostSpeaking:false}),null);
 assert.equal(director.update({now:3000,guestSpeaking:true,hostSpeaking:false}),'guest');
 assert.equal(director.update({now:3100,guestSpeaking:false,hostSpeaking:true}),null);
 assert.equal(director.update({now:5999,guestSpeaking:false,hostSpeaking:true}),null);
 assert.equal(director.update({now:6000,guestSpeaking:false,hostSpeaking:true}),'host');
});
test('shared conversation or sustained silence selects wide, not arbitrary speaker',()=>{
 const director=new CameraDirector('guest');director.update({now:0,guestSpeaking:true,hostSpeaking:false});
 director.update({now:3000,guestSpeaking:true,hostSpeaking:true});
 assert.equal(director.update({now:3600,guestSpeaking:true,hostSpeaking:true}),'wide');
 director.update({now:7000,guestSpeaking:false,hostSpeaking:true});
 assert.equal(director.update({now:7400,guestSpeaking:false,hostSpeaking:true}),'host');
 director.update({now:11000,guestSpeaking:false,hostSpeaking:false});
 assert.equal(director.update({now:11600,guestSpeaking:false,hostSpeaking:false}),'wide');
});
test('manual camera choice disables automatic cuts until explicitly enabled',()=>{
 const director=new CameraDirector();director.manual('guest',100);
 assert.equal(director.isAuto(),false);assert.equal(director.getShot(),'guest');
 assert.equal(director.update({now:10000,guestSpeaking:false,hostSpeaking:true}),null);
 director.setAuto(true);director.update({now:11000,guestSpeaking:false,hostSpeaking:true});
 assert.equal(director.update({now:11400,guestSpeaking:false,hostSpeaking:true}),'host');
});
test('recording duration excludes paused gaps and is stable after stop',()=>{
 let now=0;const clock=new RecordingClock(()=>now);clock.start();now=2500;assert.equal(clock.seconds(),2.5);
 clock.pause();now=102500;assert.equal(clock.seconds(),2.5);clock.resume();now=105000;assert.equal(clock.seconds(),5);
 clock.stop();now=999999;assert.equal(clock.seconds(),5);clock.start();assert.equal(clock.seconds(),0);
});
test('recorder pause and stop fail safely without an active take',async()=>{
 const recorder=new StudioRecorder();assert.equal(recorder.isPaused(),false);assert.equal(recorder.isRecording(),false);assert.equal(recorder.getDuration(),0);
 assert.throws(()=>recorder.pause(),/Start a recording/);assert.throws(()=>recorder.resume(),/no paused recording/);await assert.rejects(()=>recorder.stop(),/no recording/);
});

test('recorder preserves muted borrowed devices and records the compositor through pause/resume',async()=>{
 const names=['window','navigator','MediaRecorder','MediaStream'] as const;
 const originals=new Map(names.map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]));
 class Track {kind:string;readyState='live';enabled=true;muted=false;id:string;stops=0;constructor(kind:string,id:string){this.kind=kind;this.id=id;}stop(){this.stops++;this.readyState='ended';}}
 class Stream {constructor(public tracks:Track[]=[]){ }getTracks(){return this.tracks;}getAudioTracks(){return this.tracks.filter(t=>t.kind==='audio');}getVideoTracks(){return this.tracks.filter(t=>t.kind==='video');}}
 const mic=new Track('audio','mic');mic.enabled=false;const host=new Track('audio','host');const screen=new Track('video','composite');const mix=new Track('audio','mixed');let permissionRequests=0;
 class Node {threshold={value:0};knee={value:0};ratio={value:0};attack={value:0};release={value:0};connect(){}disconnect(){}}
 class Context {state='running';async resume(){}async close(){this.state='closed';}createMediaStreamSource(){return new Node();}createMediaStreamDestination(){return {stream:new Stream([mix])};}createDynamicsCompressor(){return new Node();}}
 class Recorder {
   static isTypeSupported(type:string){return type.includes('webm');}
   state='inactive';mimeType:string;onstop?:()=>void;onerror?:()=>void;ondataavailable?:(event:{data:Blob})=>void;
   constructor(public stream:Stream,options:{mimeType?:string}={}){this.mimeType=options.mimeType||'video/webm';}
   start(){this.state='recording';}pause(){this.state='paused';}resume(){this.state='recording';}
   stop(){this.state='inactive';queueMicrotask(()=>{this.ondataavailable?.({data:new Blob(['mock captured bytes'])});this.onstop?.();});}
 }
 try{
  Object.defineProperty(globalThis,'window',{configurable:true,value:{AudioContext:Context}});
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{getUserMedia:async()=>{permissionRequests++;return new Stream([mic]);}}}});
  Object.defineProperty(globalThis,'MediaRecorder',{configurable:true,value:Recorder});
  Object.defineProperty(globalThis,'MediaStream',{configurable:true,value:Stream});
  const recorder=new StudioRecorder();
  const info=await recorder.start({microphone:new Stream([mic]) as unknown as MediaStream,remoteAudio:new Stream([host]) as unknown as MediaStream,guestCamera:true,canvas:{captureStream:()=>new Stream([screen])} as unknown as HTMLCanvasElement});
  assert.equal(permissionRequests,0);assert.equal(mic.enabled,false);assert.match(info.label,/live guest camera/);assert.match(info.label,/OpenAI host audio/);
  assert.equal(recorder.canPause(),true);recorder.pause();assert.equal(recorder.isPaused(),true);recorder.resume();assert.equal(recorder.isPaused(),false);
  const blob=await recorder.stop();assert.ok(blob.size>0);assert.equal(recorder.isRecording(),false);
  assert.equal(mic.stops,0);assert.equal(host.stops,0);assert.equal(screen.stops,1);assert.equal(mix.stops,1);
  const preview=new StudioRecorder();const previewInfo=await preview.start({hostAudio:new Stream([host]) as unknown as MediaStream,microphoneRequired:false});
  assert.equal(permissionRequests,0);assert.match(previewInfo.label,/no guest microphone/);assert.match(previewInfo.label,/captured host audio/);assert.doesNotMatch(previewInfo.label,/not included/);await preview.stop();assert.equal(host.stops,0);
  await assert.rejects(()=>new StudioRecorder().start({microphoneRequired:false}),/No audio source/);
 }finally{
  for(const name of names){const descriptor=originals.get(name);if(descriptor)Object.defineProperty(globalThis,name,descriptor);else Reflect.deleteProperty(globalThis,name);}
 }
});

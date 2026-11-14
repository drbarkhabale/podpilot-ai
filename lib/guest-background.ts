import type {ImageSegmenter} from '@mediapipe/tasks-vision';
export type GuestBackground='normal'|'warm'|'blue';
export function featherAlpha(confidence:number):number{const t=Math.max(0,Math.min(1,(confidence-.2)/.6));return Math.round(255*t*t*(3-2*t));}
/** Local inference only. The CDN serves model/runtime files; camera pixels are never uploaded. */
export class GuestBackgroundRenderer {
 readonly output=document.createElement('canvas');
 private input=document.createElement('canvas');private mask=document.createElement('canvas');private person=document.createElement('canvas');private set=document.createElement('canvas');
 private model?:ImageSegmenter;private mode:GuestBackground='warm';private last=0;private lastVideo=-1;private disposed=false;private hasFrame=false;
 constructor(){for(const c of [this.output,this.input,this.person,this.set]){c.width=960;c.height=540;}this.paintSet();}
 async prepare(){const {FilesetResolver,ImageSegmenter}=await import('@mediapipe/tasks-vision');const vision=await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm');const model=await ImageSegmenter.createFromOptions(vision,{baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite',delegate:'CPU'},runningMode:'VIDEO',outputCategoryMask:false,outputConfidenceMasks:true});if(this.disposed){model.close();return;}this.model=model;}
 setMode(mode:GuestBackground){this.mode=mode;this.hasFrame=false;this.paintSet();}
 get ready(){return !!this.model;}
 frame(video:HTMLVideoElement,now:number){if(!this.model||this.disposed||video.readyState<2)return null;if(this.hasFrame&&(now-this.last<85||video.currentTime===this.lastVideo))return this.output;this.last=now;this.lastVideo=video.currentTime;
 const ic=this.input.getContext('2d')!;const scale=Math.max(960/video.videoWidth,540/video.videoHeight);ic.drawImage(video,(960-video.videoWidth*scale)/2,(540-video.videoHeight*scale)/2,video.videoWidth*scale,video.videoHeight*scale);
 this.model.segmentForVideo(this.input,now,result=>{const masks=result.confidenceMasks;if(!masks?.length)throw new Error('No person mask was returned.');const mask=masks.length===1?masks[0]:masks[1];this.mask.width=mask.width;this.mask.height=mask.height;const mc=this.mask.getContext('2d')!;const pixels=mc.createImageData(mask.width,mask.height),values=mask.getAsFloat32Array();for(let i=0;i<values.length;i++){pixels.data[i*4]=255;pixels.data[i*4+1]=255;pixels.data[i*4+2]=255;pixels.data[i*4+3]=featherAlpha(values[i]);}mc.putImageData(pixels,0,0);
 const pc=this.person.getContext('2d')!;pc.globalCompositeOperation='source-over';pc.clearRect(0,0,960,540);pc.drawImage(this.input,0,0);pc.globalCompositeOperation='destination-in';pc.filter='blur(1px)';pc.drawImage(this.mask,0,0,960,540);pc.filter='none';pc.globalCompositeOperation='source-over';const oc=this.output.getContext('2d')!;oc.drawImage(this.set,0,0);oc.drawImage(this.person,0,0);this.hasFrame=true;});return this.hasFrame?this.output:null;}
 private paintSet(){const c=this.set.getContext('2d')!;const bg=c.createLinearGradient(0,0,960,540);bg.addColorStop(0,this.mode==='blue'?'#112636':'#3b271b');bg.addColorStop(.65,'#171717');bg.addColorStop(1,'#071a2a');c.fillStyle=bg;c.fillRect(0,0,960,540);
 // Acoustic slats echo the supplied host set. An original canvas set, not a stock office.
 for(let x=0;x<690;x+=25){const g=c.createLinearGradient(x,0,x+16,0);g.addColorStop(0,'#17110d');g.addColorStop(.3,this.mode==='blue'?'#303636':'#725039');g.addColorStop(.8,this.mode==='blue'?'#202a30':'#443023');g.addColorStop(1,'#120f0c');c.fillStyle=g;c.fillRect(x,0,16,510);}
 const warm=c.createRadialGradient(150,290,5,150,290,300);warm.addColorStop(0,'rgba(255,176,70,.28)');warm.addColorStop(1,'rgba(255,176,70,0)');c.fillStyle=warm;c.fillRect(0,0,600,540);
 c.fillStyle='#171715';c.fillRect(735,65,170,12);c.fillRect(735,200,170,12);c.fillRect(735,335,170,12);for(let i=0;i<8;i++){c.fillStyle=['#51443b','#252e38','#805b3d'][i%3];c.fillRect(750+i*14,120+(i%3)*8,10,78-(i%3)*8);}
 const blue=c.createLinearGradient(910,0,960,0);blue.addColorStop(0,'rgba(45,139,220,0)');blue.addColorStop(.65,'rgba(45,139,220,.45)');blue.addColorStop(1,'rgba(45,139,220,.05)');c.fillStyle=blue;c.fillRect(900,0,60,540);c.fillStyle='#5ba4d0';c.fillRect(941,12,3,480);
 c.fillStyle='#443226';c.fillRect(70,378,170,10);c.fillStyle='#1b1917';c.fillRect(147,295,7,82);c.fillRect(125,374,50,5);const lamp=c.createLinearGradient(110,210,190,300);lamp.addColorStop(0,'#ceae78');lamp.addColorStop(.5,'#f7d599');lamp.addColorStop(1,'#a88a58');c.fillStyle=lamp;c.beginPath();c.moveTo(120,210);c.lineTo(180,210);c.lineTo(198,295);c.lineTo(102,295);c.closePath();c.fill();
 const desk=c.createLinearGradient(0,510,0,540);desk.addColorStop(0,'#866045');desk.addColorStop(1,'#3a2418');c.fillStyle=desk;c.fillRect(0,510,960,30);c.fillStyle='rgba(0,0,0,.25)';c.fillRect(0,0,960,22);
 }
 dispose(){this.disposed=true;this.model?.close();this.model=undefined;}
}

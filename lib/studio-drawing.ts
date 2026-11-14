import type { CameraShot, HostState } from './types';

export interface StudioRect { x:number; y:number; width:number; height:number }
export interface StudioFrame {
  guestVideo: HTMLVideoElement | null;
  hostCanvas: HTMLCanvasElement | null;
  guestName: string;
  topic: string;
  shot: CameraShot;
  hostState: HostState;
  guestLevel: number;
  hostLevel: number;
  cameraAvailable?: boolean;
  theme?: string;
}
export const STUDIO_WIDTH = 1280;
export const STUDIO_HEIGHT = 720;
const AMBER = '#FF9B45';
const BLUE = '#399CFA';
const IVORY = '#F5F2EC';

/** Coordinates of the actual speaker image in the recorded 1280x720 composition. */
export function getSpeakerFrame(shot:CameraShot, role:'guest'|'host', width=STUDIO_WIDTH, height=STUDIO_HEIGHT):StudioRect {
  const scaleX=width/STUDIO_WIDTH, scaleY=height/STUDIO_HEIGHT;
  const base:StudioRect = shot==='wide'
    ? role==='host' ? {x:58,y:110,width:568,height:476} : {x:654,y:110,width:568,height:476}
    : (shot===role ? {x:126,y:72,width:1028,height:552} : {x:0,y:0,width:0,height:0});
  return {x:base.x*scaleX,y:base.y*scaleY,width:base.width*scaleX,height:base.height*scaleY};
}

function rounded(ctx:CanvasRenderingContext2D,r:StudioRect,radius=16){ctx.beginPath();ctx.roundRect(r.x,r.y,r.width,r.height,radius);}
function clipped(ctx:CanvasRenderingContext2D,r:StudioRect,draw:()=>void){ctx.save();rounded(ctx,r);ctx.clip();draw();ctx.restore();}
function safeLevel(value:number){return Number.isFinite(value)?Math.min(1,Math.max(0,value)):0;}
function ellipsis(ctx:CanvasRenderingContext2D,text:string,max:number){let value=text.trim();if(ctx.measureText(value).width<=max)return value;while(value.length&&ctx.measureText(value+'…').width>max)value=value.slice(0,-1);return value+'…';}
function cover(ctx:CanvasRenderingContext2D,source:CanvasImageSource,sourceWidth:number,sourceHeight:number,rect:StudioRect){
  if(sourceWidth<=0||sourceHeight<=0||rect.width<=0||rect.height<=0)return;
  const scale=Math.max(rect.width/sourceWidth,rect.height/sourceHeight),sw=rect.width/scale,sh=rect.height/scale;
  ctx.drawImage(source,(sourceWidth-sw)/2,(sourceHeight-sh)/2,sw,sh,rect.x,rect.y,rect.width,rect.height);
}
function ambient(ctx:CanvasRenderingContext2D,theme?:string){
  const background=ctx.createLinearGradient(0,0,0,720);background.addColorStop(0,theme==='violet'?'#241d33':theme==='teal'?'#112c30':theme==='amber'?'#30231c':'#131D2B');background.addColorStop(.65,'#0B111B');background.addColorStop(1,'#080D14');ctx.fillStyle=background;ctx.fillRect(0,0,1280,720);
  // The same acoustic wall and lighting remain behind every camera angle.
  for(let i=0;i<46;i++){ctx.fillStyle=i%2?'#23324740':'#050A1070';ctx.fillRect(i*29,0,13,585);}
  const lights:[[number,string],[number,string]]=[[220,'#399CFA24'],[1050,'#FF9B4524']];
  for(const [x,color] of lights){const light=ctx.createRadialGradient(x,180,0,x,280,570);light.addColorStop(0,color);light.addColorStop(1,'#00000000');ctx.fillStyle=light;ctx.fillRect(0,0,1280,720);}
  ctx.strokeStyle='#66809B18';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,585);ctx.lineTo(1280,585);ctx.stroke();
  ctx.fillStyle='#F5F2EC';ctx.font='600 17px Arial, sans-serif';ctx.textAlign='left';ctx.fillText('PODPILOT',54,48);
  ctx.fillStyle='#7E91A7';ctx.font='12px Arial, sans-serif';ctx.fillText('THE CONVERSATION ROOM',177,48);
  ctx.textAlign='right';ctx.fillStyle='#B6C2D1';ctx.font='13px Arial, sans-serif';ctx.fillText('NOAH IS AN AI HOST',1226,48);ctx.textAlign='left';
}
function emptyGuest(ctx:CanvasRenderingContext2D,r:StudioRect,name:string){
  const gradient=ctx.createLinearGradient(r.x,r.y,r.x+r.width,r.y+r.height);gradient.addColorStop(0,'#26313E');gradient.addColorStop(1,'#151D29');ctx.fillStyle=gradient;ctx.fillRect(r.x,r.y,r.width,r.height);
  const centerX=r.x+r.width/2,centerY=r.y+r.height*.43;
  ctx.strokeStyle='#FF9B4540';ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(centerX,centerY,54,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle='#FF9B45';ctx.font='400 42px Georgia, serif';ctx.textAlign='center';ctx.fillText((name.trim()||'G').slice(0,1).toUpperCase(),centerX,centerY+14);
  ctx.fillStyle='#F5F2EC';ctx.font='18px Arial, sans-serif';ctx.fillText('Audio-only guest',centerX,centerY+94);
  ctx.fillStyle='#94A5B7';ctx.font='14px Arial, sans-serif';ctx.fillText('Enable your camera to appear here',centerX,centerY+121);ctx.textAlign='left';
}
function mic(ctx:CanvasRenderingContext2D,x:number,y:number,scale:number,color:string,flip=false){
  ctx.save();ctx.translate(x,y);ctx.scale(flip?-scale:scale,scale);ctx.rotate(-.08);
  ctx.lineCap='round';ctx.strokeStyle='#05080D';ctx.lineWidth=15;ctx.beginPath();ctx.moveTo(0,68);ctx.lineTo(-73,112);ctx.lineTo(-142,105);ctx.stroke();ctx.strokeStyle='#516174';ctx.lineWidth=2;ctx.stroke();
  const shell=ctx.createLinearGradient(-30,0,30,0);shell.addColorStop(0,'#101923');shell.addColorStop(.45,'#536375');shell.addColorStop(.7,'#2E3D4D');shell.addColorStop(1,'#111923');ctx.fillStyle=shell;ctx.beginPath();ctx.roundRect(-30,-55,60,120,25);ctx.fill();ctx.strokeStyle='#A8B6C342';ctx.lineWidth=1;ctx.stroke();
  for(let i=0;i<11;i++){ctx.strokeStyle='#0A1019';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-23,-39+i*7);ctx.lineTo(23,-39+i*7);ctx.stroke();}
  ctx.fillStyle=color;ctx.fillRect(-7,47,14,3);ctx.restore();
}
function meter(ctx:CanvasRenderingContext2D,x:number,y:number,level:number,color:string){
  const value=safeLevel(level);ctx.fillStyle='#94A5B72B';ctx.fillRect(x,y+8,70,2);
  if(value<.001)return;
  ctx.fillStyle=color;for(let i=0;i<14;i++){const envelope=.28+.72*(1-Math.abs(i-6.5)/7);const h=Math.max(2,value*26*envelope);ctx.fillRect(x+i*5,y+9-h/2,3,h);}
}
function label(ctx:CanvasRenderingContext2D,r:StudioRect,name:string,role:string,color:string,level:number){
  const wide=r.width<700,x=r.x+22,y=r.y+r.height-69;
  const fade=ctx.createLinearGradient(0,y-50,0,r.y+r.height);fade.addColorStop(0,'#08101A00');fade.addColorStop(1,'#060B13EF');ctx.fillStyle=fade;ctx.fillRect(r.x,y-50,r.width,119);
  ctx.fillStyle=color;ctx.fillRect(x,y+3,3,42);ctx.fillStyle=IVORY;ctx.font=`600 ${wide?22:25}px Arial, sans-serif`;ctx.fillText(ellipsis(ctx,name,r.width-275),x+14,y+20);
  ctx.font='11px Arial, sans-serif';ctx.fillStyle='#C0CDDC';ctx.fillText(role,x+14,y+42);meter(ctx,r.x+r.width-208,y+16,level,color);
}
function guest(ctx:CanvasRenderingContext2D,r:StudioRect,frame:StudioFrame){
  clipped(ctx,r,()=>{
    const video=frame.guestVideo;
    const videoReady=frame.cameraAvailable!==false&&!!video&&video.readyState>=2&&video.videoWidth>0;
    if(videoReady&&video){cover(ctx,video,video.videoWidth,video.videoHeight,r);const tint=ctx.createLinearGradient(0,r.y,0,r.y+r.height);tint.addColorStop(0,'#18233208');tint.addColorStop(1,'#080F1920');ctx.fillStyle=tint;ctx.fillRect(r.x,r.y,r.width,r.height);}
    else emptyGuest(ctx,r,frame.guestName);
    label(ctx,r,frame.guestName||'Your seat',videoReady?'GUEST · REAL CAMERA':'GUEST · AUDIO ONLY',AMBER,frame.guestLevel);
  });
  rounded(ctx,r);ctx.strokeStyle='#FF9B4550';ctx.lineWidth=1.6;ctx.stroke();
}
function nova(ctx:CanvasRenderingContext2D,r:StudioRect,frame:StudioFrame){
  clipped(ctx,r,()=>{
    const light=ctx.createRadialGradient(r.x+r.width*.5,r.y+r.height*.35,0,r.x+r.width*.5,r.y+r.height*.6,r.width*.7);light.addColorStop(0,'#399CFA18');light.addColorStop(1,'#050B1200');ctx.fillStyle=light;ctx.fillRect(r.x,r.y,r.width,r.height);
    if(frame.hostCanvas){const source=frame.hostCanvas;if(r.width>700){const backdrop=ctx.createLinearGradient(r.x,0,r.x+r.width,0);backdrop.addColorStop(0,'#291f19');backdrop.addColorStop(1,'#122337');ctx.fillStyle=backdrop;ctx.fillRect(r.x,r.y,r.width,r.height);const size=r.height*1.14;ctx.drawImage(source,r.x+(r.width-size)/2,r.y-8,size,size);}else cover(ctx,source,source.width,source.height,r);}
    label(ctx,r,'NOAH',`AI HOST · ${frame.hostState.toUpperCase()}`,BLUE,frame.hostLevel);
  });
  rounded(ctx,r);ctx.strokeStyle='#399CFA40';ctx.lineWidth=1.6;ctx.stroke();
}

/** Draws live browser media. This exact canvas is both preview and MediaRecorder video source. */
export function drawStudioFrame(ctx:CanvasRenderingContext2D,width:number,height:number,frame:StudioFrame){
  ctx.save();ctx.setTransform(width/STUDIO_WIDTH,0,0,height/STUDIO_HEIGHT,0,0);ctx.clearRect(0,0,1280,720);ambient(ctx,frame.theme);
  const guestRect=getSpeakerFrame(frame.shot,'guest'),hostRect=getSpeakerFrame(frame.shot,'host');
  if(guestRect.width)guest(ctx,guestRect,frame);
  if(hostRect.width)nova(ctx,hostRect,frame);
  // Physical boom microphone accents sit in the foreground of the composed studio.
  if(frame.shot==='wide'){mic(ctx,guestRect.x+guestRect.width-65,guestRect.y+guestRect.height-48,.66,AMBER);}
  if(frame.shot==='guest')mic(ctx,1055,549,.92,AMBER);

  ctx.fillStyle='#070C13';ctx.fillRect(0,648,1280,72);ctx.fillStyle='#FF9B45';ctx.fillRect(54,674,5,5);ctx.fillStyle='#B4C1D1';ctx.font='15px Arial, sans-serif';ctx.fillText(ellipsis(ctx,frame.topic||'A story worth telling',935),71,682);
  ctx.textAlign='right';ctx.fillStyle='#8B9EB4';ctx.font='12px Arial, sans-serif';ctx.fillText(frame.shot==='wide'?'CAM 1 / WIDE':frame.shot==='guest'?'CAM 2 / GUEST':'CAM 3 / NOAH',1226,682);ctx.textAlign='left';ctx.restore();
}

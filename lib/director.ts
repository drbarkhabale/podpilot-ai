import type { CameraShot } from './types';

export interface DirectorInput { now:number; guestSpeaking:boolean; hostSpeaking:boolean }

/** A deterministic camera switcher. Input speech gates come from measured audio / host playback. */
export class CameraDirector {
  private shot:CameraShot;
  private automatic=true;
  private lastCut:number|undefined;
  private pending:CameraShot|undefined;
  private pendingSince=0;
  private readonly minimumShot:number;

  constructor(initialShot:CameraShot='wide',minShotMs=3000){
    this.shot=initialShot;
    this.minimumShot=Math.min(4000,Math.max(2000,Number.isFinite(minShotMs)?minShotMs:3000));
  }
  getShot():CameraShot{return this.shot;}
  isAuto():boolean{return this.automatic;}
  setAuto(enabled:boolean):void{this.automatic=enabled;this.pending=undefined;}
  manual(shot:CameraShot,now:number):void{
    this.shot=shot;this.lastCut=Number.isFinite(now)?now:0;this.pending=undefined;this.automatic=false;
  }
  update({now,guestSpeaking,hostSpeaking}:DirectorInput):CameraShot|null{
    if(!Number.isFinite(now))return null;
    if(this.lastCut===undefined)this.lastCut=now;
    if(!this.automatic)return null;
    const desired:CameraShot=guestSpeaking===hostSpeaking?'wide':guestSpeaking?'guest':'host';
    if(desired===this.shot){this.pending=undefined;return null;}
    if(desired!==this.pending){this.pending=desired;this.pendingSince=now;return null;}
    // Silence/shared turns return to the wide shot. Short spikes never become a cut.
    const settledFor=desired==='wide'?550:300;
    if(now-this.pendingSince<settledFor||now-this.lastCut<this.minimumShot)return null;
    this.shot=desired;this.lastCut=now;this.pending=undefined;return desired;
  }
}

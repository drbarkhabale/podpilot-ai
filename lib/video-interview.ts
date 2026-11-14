export const NOVA_CLIPS=[
 {src:'/nova-video/part1.mp4',question:"What's your most unpopular opinion?"},
 {src:'/nova-video/part2.mp4',question:"What's your hottest take?"},
 {src:'/nova-video/part3.mp4',question:"What's something you strongly believe in that most people disagree with?"}
] as const;
export const ANSWER_DURATIONS=[10,20,30,60] as const;
/** Active-time countdown; question playback never consumes guest answer time. */
export class AnswerClock {
 private remaining=0; private at:number|null=null;
 start(seconds:number,now:number){this.remaining=seconds*1000;this.at=now;}
 pause(now:number){this.remaining=this.milliseconds(now);this.at=null;}
 resume(now:number){this.at=now;}
 milliseconds(now:number){return Math.max(0,this.remaining-(this.at===null?0:Math.max(0,now-this.at)));}
 seconds(now:number){return Math.ceil(this.milliseconds(now)/1000);}
}

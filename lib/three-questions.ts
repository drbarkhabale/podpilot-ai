export const THREE_QUESTIONS = [
  {id:'question-1',text:'What is your unpopular opinion?'},
  {id:'question-2',text:'What is your hot take?'},
  {id:'question-3',text:'What is something that you believe in?'},
] as const;
export const CLOSING_PROMPT={id:'closing',text:'Thank you for sharing your point of view. Your episode is ready to review.'} as const;
export type PromptId=typeof THREE_QUESTIONS[number]['id']|'closing';

/** Call with an active-time clock so a paused take cannot consume the answer window. */
export class AnswerWindow {
  private started=0;
  private lastSpeech=0;
  private heardSpeech=false;
  start(now:number){this.started=now;this.lastSpeech=now;this.heardSpeech=false;}
  read(now:number,speaking:boolean){
    const elapsed=Math.max(0,now-this.started);
    if(speaking){this.heardSpeech=true;this.lastSpeech=now;}
    return {elapsed,remaining:Math.max(0,45-elapsed),advance:elapsed>=45||(elapsed>=30&&this.heardSpeech&&!speaking&&now-this.lastSpeech>=2)};
  }
}

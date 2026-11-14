import type {Episode,EpisodeContent} from './types';
export interface QuestionChapter {question:string;start:number;questionEnd?:number;end:number}
/** Uses only actual guest text or explicitly supplied editorial notes. No invented testimony. */
export function createContentKit(episode:Episode,notes=episode.creatorNotes||''):EpisodeContent {
 const answers=notes.trim()?notes.split(/\n+/).map(s=>s.trim()).filter(Boolean):episode.transcript.filter(t=>t.role==='guest'&&t.text.trim()&&!/please skip/i.test(t.text)).map(t=>t.text.trim());
 const first=answers[0]||'';const topic=episode.config.topic||'A different perspective';const tags=episode.config.mode==='Startup Founder'?'#Founders #StartupJourney #BuildInPublic':'#CreatorStories #UnpopularOpinion #Podcast';
 const excerpt=(s:string,n:number)=>s.length>n?s.slice(0,n-1).trimEnd()+'…':s;
 const title=first?excerpt(first.replace(/[.!?].*$/s,''),85):episode.content.title||`Three perspectives with ${episode.config.guest||'Guest'}`;
 const summary=answers.length?answers.slice(0,3).map(s=>excerpt(s,350)).join('\n\n'):'Add your key message below to create captions grounded in what you actually said.';
 return {...episode.content,title,summary,takeaways:answers.slice(0,3),quotes:notes.trim()?[]:answers.slice(0,3),
 linkedin:first?`One idea I wanted to put into words:\n\n${excerpt(first,900)}${answers[1]?`\n\nAnother perspective from the conversation:\n${excerpt(answers[1],700)}`:''}\n\nI explored this on PodPilot. What is your perspective?\n\n${tags} #PodPilot`:'',
 instagram:first?`${excerpt(first,500)}\n\nA conversation worth having. Agree, disagree, or somewhere in between? Tell me below.\n\n#PodPilot #Reels #CreatorStories #HotTake #PodcastClips`:'',
 tiktok:first?`${excerpt(first,220)}\n\nWhat’s your take? 👇\n\n#PodPilot #HotTake #UnpopularOpinion #CreatorTok`:'',
 youtube:`${title}\n\n${summary}\n\nRecorded with PodPilot AI.`,captions:first?[excerpt(first,280),...answers.slice(1,3).map(s=>excerpt(s,280))]:[],
 showNotes:`${title}\nGuest: ${episode.config.guest||'Guest'}\nTopic: ${topic}\n\n${summary}\n\n${(episode.chapters||[]).map((c,i)=>`${i+1}. ${c.question}`).join('\n')}\n\n${episode.config.format==='three-questions'?'Prerecorded NOVA questions with guest answers.':''}`,
 source:'demo'};
}
export function reelSections(episode:Episode):QuestionChapter[]{
 const duration=episode.recordingDuration||0;if(!episode.mediaType||episode.sample||duration<=0)return [];
 return (episode.chapters||[]).filter(c=>Number.isFinite(c.start)&&Number.isFinite(c.end)&&c.end>c.start&&c.start>=0&&c.start<duration).map(c=>({...c,end:Math.min(c.end,c.start+60,duration)})).filter(c=>c.end-c.start>=1);
}
export function kitText(episode:Episode):string{return `${episode.content.title}\n\nEDITORIAL DRAFTS — review before posting. ${episode.creatorNotes?'Based on your supplied notes.':'Based on available guest transcript; may contain recognition errors.'}\n\nLINKEDIN\n${episode.content.linkedin||'No draft yet.'}\n\nINSTAGRAM\n${episode.content.instagram||'No draft yet.'}\n\nTIKTOK\n${episode.content.tiktok||'No draft yet.'}\n\nSHOW NOTES\n${episode.content.showNotes}`;}

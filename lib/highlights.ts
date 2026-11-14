import type { Episode, HighlightCandidate, RecordingSegment, TranscriptEntry } from './types';
import { mediaTimeForSession, recordingSegmentsForEpisode } from './media-timing';

const STOP=new Set(['about','with','this','that','from','have','what','when','where','your','their','they','were','will','into','first','would','could','there','these','those']);
const words=(text:string)=>text.toLowerCase().match(/[a-z0-9']+/g)||[];
const clamp=(n:number)=>Math.max(0,Math.min(100,Math.round(n)));

/** Explainable editorial heuristics, not a model prediction or promise of popularity. */
export function scoreHighlight(text:string,topic:string):HighlightCandidate['scores'] {
  const tokens=words(text);const clean=text.trim();
  const hookHits=(text.match(/\b(surpris\w*|unexpected|wrong|never|biggest|learned|fail\w*|realis\w*|realiz\w*|mistake|changed|believe|secret|actually|afraid|proud|laughed|funny)\b/gi)||[]).length;
  const topicTokens=new Set(words(topic).filter(w=>w.length>3&&!STOP.has(w)));
  const shared=new Set(tokens.filter(w=>topicTokens.has(w))).size;
  const hook=clamp(30+Math.min(hookHits,4)*14+(/\b(but|instead|until)\b/i.test(text)?9:0));
  const clarity=clamp(35+(tokens.length>=10?20:0)+(tokens.length<=100?15:0)+(/\b(because|for example|means|learned|so that)\b/i.test(text)?18:0)-Math.max(0,tokens.length-140)/4);
  const standalone=clamp(38+(tokens.length>=14?22:0)+(/[.!?]$/.test(clean)?14:0)-(/^(it|that|this|they|yes|no|exactly|right)\b/i.test(clean)?20:0)+(/\b(I|we|my|our)\b/.test(text)?10:0));
  const relevance=topicTokens.size?clamp(25+65*Math.min(1,shared/Math.min(3,topicTokens.size))):50;
  return {hook,clarity,standalone,relevance};
}

function windowFor(at:number,next:number|undefined,duration:number):{start:number;end:number} {
  const wanted=duration<20?duration:Math.min(45,Math.max(20,(next??at+30)-at+4));
  let start=Math.max(0,at-3);let end=Math.min(duration,start+wanted);
  if(end-start<Math.min(20,duration))start=Math.max(0,end-Math.min(20,duration));
  return {start:Math.round(start*10)/10,end:Math.round(end*10)/10};
}
function meaningful(entry:TranscriptEntry):boolean {return entry.role==='guest'&&entry.input!=='typed'&&entry.input!=='generated'&&words(entry.text).length>=6&&!/^please skip that question/i.test(entry.text);}
function titleFor(text:string):string {
  if(/\b(surpris\w*|unexpected|actually|instead)\b/i.test(text))return 'An unexpected turn';
  if(/\b(fail\w*|mistake|learned|changed)\b/i.test(text))return 'A lesson worth sharing';
  if(/\b(afraid|proud|cried|laugh\w*|funny)\b/i.test(text))return 'A personal moment';
  if(/\b(because|for example|means|explain)\b/i.test(text))return 'An idea made clear';
  return 'A standalone reflection';
}
function excerpt(text:string):string {const clean=text.replace(/\s+/g,' ').trim();return clean.length>220?clean.slice(0,217).trimEnd()+'…':clean;}

/** Returns media-relative ranges only where there is a real saved recording. */
export function suggestHighlights(episode:Episode):HighlightCandidate[] {
  if(!episode.mediaType||episode.sample)return [];
  const segments:RecordingSegment[]=recordingSegmentsForEpisode(episode);
  const duration=episode.recordingDuration??segments.at(-1)?.mediaEnd??0;
  if(!Number.isFinite(duration)||duration<=0||!segments.length)return [];
  const mapped=episode.transcript.filter(meaningful).map(entry=>({entry,at:mediaTimeForSession(entry.timestamp,segments)})).filter((item):item is {entry:TranscriptEntry;at:number}=>item.at!==null&&item.at<duration).sort((a,b)=>a.at-b.at);
  const candidates=mapped.map(({entry,at},index)=>{
    const range=windowFor(at,mapped[index+1]?.at,duration);const scores=scoreHighlight(entry.text,episode.config.topic);
    const score=clamp(scores.hook*.3+scores.clarity*.25+scores.standalone*.3+scores.relevance*.15);
    const strongest=Object.entries(scores).sort((a,b)=>b[1]-a[1]).slice(0,2).map(([key,value])=>`${key==='standalone'?'self-contained meaning':key} ${value}/100`).join(', ');
    const short=range.end-range.start<20?' Short source: this selection is under 20 seconds.':'';
    return {id:`local-${entry.id}`,title:titleFor(entry.text),...range,quote:excerpt(entry.text),reason:`Local transcript heuristic: ${strongest}. Timing is approximate; preview and adjust against the recording.${short}`,scores,score,source:'local' as const};
  }).filter(c=>c.end>c.start).sort((a,b)=>b.score-a.score||a.start-b.start);
  const selected:HighlightCandidate[]=[];
  for(const candidate of candidates){
    const overlaps=selected.some(other=>Math.max(0,Math.min(candidate.end,other.end)-Math.max(candidate.start,other.start))>Math.min(candidate.end-candidate.start,other.end-other.start)*0.35);
    if(!overlaps)selected.push(candidate);if(selected.length===5)break;
  }
  return selected;
}

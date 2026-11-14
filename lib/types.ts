export type InterviewMode = 'Deep Dive' | 'Startup Founder' | 'Debate Mode' | 'Personal Story' | 'Expert Interview' | 'Unpopular Opinions' | 'Hot Takes';
export type HostState = 'idle' | 'listening' | 'thinking' | 'speaking';
export type EngineMode = 'demo' | 'openai' | 'elevenlabs';
export interface InterviewConfig {launch?:'hackathon';format?:'three-questions'|'conversation';guest:string;topic:string;duration:number;mode:InterviewMode;personality:'Curious'|'Warm'|'Challenging';theme:'blue'|'amber'|'violet'|'teal';voice:string;voiceEnabled:boolean;engine:EngineMode;expertise:'Beginner'|'Intermediate'|'Expert'}
export interface TranscriptEntry {id:string;role:'host'|'guest';text:string;timestamp:number;endTimestamp?:number;input?:'typed'|'speech'|'generated'|'openai'|'elevenlabs'}
export interface EpisodeContent {title:string;summary:string;takeaways:string[];showNotes:string;linkedin:string;captions:string[];highlights:{title:string;start:number;end:number;reason:string}[];source:'demo'|'openai';tiktok?:string;instagram?:string;youtube?:string;quotes?:string[]}
export interface Episode {creatorNotes?:string;chapters?:{question:string;start:number;questionEnd?:number;end:number}[];id:string;createdAt:string;config:InterviewConfig;duration:number;transcript:TranscriptEntry[];content:EpisodeContent;mediaType?:string;recordingStartedAt?:number;recordingDuration?:number;mediaLabel?:string;engine:EngineMode;recordingSegments?:RecordingSegment[];cameraCuts?:CameraCut[];captions?:CaptionCue[];sample?:boolean;hostSide?:'left'|'right';hostName?:string}
export const DEFAULT_CONFIG:InterviewConfig={guest:'',topic:'',duration:10,mode:'Deep Dive',personality:'Curious',theme:'blue',voice:'',voiceEnabled:true,engine:'demo',expertise:'Intermediate',format:'conversation'};
export const MODES:InterviewMode[]=['Deep Dive','Startup Founder','Debate Mode','Personal Story','Expert Interview','Unpopular Opinions','Hot Takes'];

export type CameraShot = 'wide' | 'guest' | 'host';
export interface RecordingSegment { sessionStart:number; sessionEnd:number; mediaStart:number; mediaEnd:number }
export interface CameraCut { at:number; shot:CameraShot }
export interface CaptionCue { id:string; start:number; end:number; text:string; role:'guest'|'host'; timing:'approximate'|'edited' }
export interface HighlightCandidate { id:string; title:string; start:number; end:number; quote:string; reason:string; scores:{hook:number;clarity:number;standalone:number;relevance:number}; score:number; source:'local' }

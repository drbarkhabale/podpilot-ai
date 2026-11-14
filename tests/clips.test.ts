import test from 'node:test';
import assert from 'node:assert/strict';
import { activeCaption, validateClipRange, verticalCrop } from '../lib/clip-export';
import { scoreHighlight, suggestHighlights } from '../lib/highlights';
import { DEFAULT_CONFIG, type Episode, type CaptionCue } from '../lib/types';
const captions:CaptionCue[]=[{id:'g',start:0,end:20,text:'Guest answer',role:'guest',timing:'approximate'},{id:'h',start:20,end:30,text:'Host question',role:'host',timing:'edited'}];
const episode:Episode={id:'test',createdAt:'2026-01-01',config:{...DEFAULT_CONFIG,guest:'Test guest',topic:'Building a startup'},duration:200,transcript:[],content:{title:'Test',summary:'',takeaways:[],showNotes:'',linkedin:'',captions:[],highlights:[],source:'demo'},engine:'demo',mediaType:'video/webm',recordingDuration:140,recordingSegments:[{sessionStart:10,sessionEnd:70,mediaStart:0,mediaEnd:60},{sessionStart:100,sessionEnd:180,mediaStart:60,mediaEnd:140}]};

test('clip range rejects nonfinite, negative, inverted, too long and outside-source bounds',()=>{
 for(const [start,end] of [[NaN,2],[0,Infinity],[-1,5],[5,2],[0,301]])assert.throws(()=>validateClipRange(start,end));
 assert.throws(()=>validateClipRange(4,20,10));assert.doesNotThrow(()=>validateClipRange(0,20,20));
});
test('smart crop follows actual wide-shot speaker and recent camera cut',()=>{
 const guest=verticalCrop(1280,720,10,'smart',captions,[{at:0,shot:'wide'}]);
 const host=verticalCrop(1280,720,25,'smart',captions,[{at:0,shot:'wide'}]);
 const close=verticalCrop(1280,720,25,'smart',captions,[{at:0,shot:'wide'},{at:22,shot:'host'}]);
 assert.ok(guest.x<host.x);assert.equal(close.x,(1280-close.width)/2);assert.equal(guest.width/guest.height,9/16);
 assert.ok(guest.x>=0&&host.x+host.width<=1280);
});
test('caption selection uses explicit media bounds and returns no cue in gaps',()=>{
 assert.equal(activeCaption(captions,19.9)?.id,'g');assert.equal(activeCaption(captions,20)?.id,'h');assert.equal(activeCaption(captions,35),undefined);
});
test('highlights exclude missing media, sample data and transcript in recording pause gaps',()=>{
 const transcript=[{id:'before',role:'guest' as const,text:'I learned something about building a startup before recording began.',timestamp:4},{id:'gap',role:'guest' as const,text:'This surprising statement happened during the recording pause gap.',timestamp:80},{id:'good',role:'guest' as const,text:'I learned that building a startup starts with listening because customers understand the problem.',timestamp:120}];
 const result=suggestHighlights({...episode,transcript});assert.equal(result.length,1);assert.equal(result[0].id,'local-good');assert.ok(result[0].start>=60&&result[0].end<=140);
 assert.deepEqual(suggestHighlights({...episode,transcript,mediaType:undefined}),[]);assert.deepEqual(suggestHighlights({...episode,transcript,sample:true}),[]);
});
test('sufficient transcript moments produce 3–5 bounded explainable highlights',()=>{
 const transcript=[15,48,110,145,175].map((timestamp,i)=>({id:`answer-${i}`,role:'guest' as const,timestamp,text:`My startup taught me an unexpected lesson number ${i}. I changed the product because customers explained their actual problem.`}));
 const result=suggestHighlights({...episode,transcript});assert.ok(result.length>=3&&result.length<=5);
 for(const item of result){assert.ok(item.start>=0&&item.end<=140);assert.ok(item.end-item.start>=20&&item.end-item.start<=60);assert.match(item.reason,/heuristic/);assert.match(item.reason,/approximate/);assert.equal(item.source,'local');}
});
test('short real recordings yield at most one honest shorter selection',()=>{
 const short={...episode,recordingDuration:12,recordingSegments:[{sessionStart:0,sessionEnd:12,mediaStart:0,mediaEnd:12}],transcript:[{id:'short',role:'guest' as const,timestamp:3,text:'My first startup failed because I never asked customers what they needed.'}]};
 const result=suggestHighlights(short);assert.equal(result.length,1);assert.equal(result[0].end,12);assert.match(result[0].reason,/under 20 seconds/);
});
test('editorial scores reward relevant concrete explanation but stay bounded',()=>{
 const scores=scoreHighlight('I learned that my startup failed because customers needed a different product.','startup product');
 const vague=scoreHighlight('Yes that.','startup product');assert.ok(scores.clarity>vague.clarity);assert.ok(scores.relevance>vague.relevance);assert.ok(Object.values(scores).every(n=>n>=0&&n<=100));
});


test('typed and generated guest turns are not treated as audible highlight candidates',()=>{
 const text='My first startup failed because I never asked customers what they needed.';
 const transcript=[{id:'typed',role:'guest' as const,input:'typed' as const,timestamp:15,text},{id:'generated',role:'guest' as const,input:'generated' as const,timestamp:45,text},{id:'spoken',role:'guest' as const,input:'speech' as const,timestamp:120,text}];
 const result=suggestHighlights({...episode,transcript});assert.equal(result.length,1);assert.equal(result[0].id,'local-spoken');
});
test('legacy recordings without camera-cut metadata keep a centered crop',()=>{
 const crop=verticalCrop(1280,720,10,'smart',captions,[]);assert.equal(crop.x,(1280-crop.width)/2);
});

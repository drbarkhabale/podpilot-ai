import { createServer } from 'node:http';
import { handleApi } from './api';
const port=8788;
createServer(async(req,res)=>{
  try{
    const chunks:Buffer[]=[];let size=0;
    for await(const part of req){size+=part.length;if(size>300_000){res.writeHead(413,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Request is too large.'}));return;}chunks.push(part);}
    const headers=new Headers();for(const [key,value]of Object.entries(req.headers))if(value)headers.set(key,Array.isArray(value)?value.join(','):value);
    // Next's local reverse proxy preserves the original browser origin/host.
    // The API itself only listens on loopback and is not a production auth server.
    const host=String(req.headers['x-forwarded-host']||req.headers.host||'localhost:3000');
    const proto=String(req.headers['x-forwarded-proto']||'http').split(',')[0];
    const request=new Request(`${proto}://${host}${req.url}`,{method:req.method,headers,body:req.method==='GET'||req.method==='HEAD'?undefined:Buffer.concat(chunks)});
    const response=await handleApi(request,{OPENAI_API_KEY:process.env.OPENAI_API_KEY,OPENAI_REALTIME_MODEL:process.env.OPENAI_REALTIME_MODEL,OPENAI_TEXT_MODEL:process.env.OPENAI_TEXT_MODEL,OPENAI_TRANSCRIBE_MODEL:process.env.OPENAI_TRANSCRIBE_MODEL,NOVA_SYSTEM_PROMPT:process.env.NOVA_SYSTEM_PROMPT,NOAH_SYSTEM_PROMPT:process.env.NOAH_SYSTEM_PROMPT,ELEVENLABS_API_KEY:process.env.ELEVENLABS_API_KEY,ELEVENLABS_AGENT_ID:process.env.ELEVENLABS_AGENT_ID,ELEVENLABS_VOICE_ID:process.env.ELEVENLABS_VOICE_ID,PODPILOT_ALLOWED_ORIGIN:process.env.PODPILOT_ALLOWED_ORIGIN});
    res.writeHead(response.status,Object.fromEntries(response.headers.entries()));res.end(Buffer.from(await response.arrayBuffer()));
  }catch{res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Request could not be processed.'}));}
}).listen(port,'127.0.0.1',()=>console.log(`PodPilot optional API server listening on loopback port ${port}.`));

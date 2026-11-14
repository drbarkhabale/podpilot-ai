/** Real MP3 encoding from decoded recorded samples. Nothing is renamed to fake a format. */
export function pcm16(samples:Float32Array):Int16Array{const out=new Int16Array(samples.length);for(let i=0;i<samples.length;i++){const n=Math.max(-1,Math.min(1,samples[i]));out[i]=Math.round(n<0?n*32768:n*32767);}return out;}
export async function encodeMp3(channels:Float32Array[],sampleRate:number,onProgress?:(n:number)=>void):Promise<Blob>{
 if(!channels.length||!channels[0].length||!channels.every(c=>c.length===channels[0].length))throw new Error('No valid audio samples to encode.');
 if(![32000,44100,48000].includes(sampleRate))throw new Error('Unsupported sample rate. Export WAV instead.');
 const {Mp3Encoder}=await import('@breezystack/lamejs');const encoder=new Mp3Encoder(Math.min(2,channels.length),sampleRate,192);const chunks:BlobPart[]=[];const block=1152;
 for(let i=0;i<channels[0].length;i+=block){const left=pcm16(channels[0].subarray(i,i+block));const right=channels[1]?pcm16(channels[1].subarray(i,i+block)):undefined;const encoded=encoder.encodeBuffer(left,right);if(encoded.length)chunks.push(new Uint8Array(encoded));if(i%(block*60)===0){onProgress?.(i/channels[0].length);await new Promise(resolve=>setTimeout(resolve,0));}}
 const tail=encoder.flush();if(tail.length)chunks.push(new Uint8Array(tail));const blob=new Blob(chunks,{type:'audio/mpeg'});if(!blob.size)throw new Error('Audio encoder produced no output.');onProgress?.(1);return blob;
}
export async function exportMp3(blob:Blob,onProgress?:(n:number)=>void):Promise<Blob>{
 if(!blob.size)throw new Error('No recorded media is available.');
 const context=new AudioContext({sampleRate:44100});try{const decoded=await context.decodeAudioData(await blob.arrayBuffer());if(decoded.duration>3600)throw new Error('For recordings over one hour, download the original and convert audio outside the browser.');return await encodeMp3(Array.from({length:Math.min(2,decoded.numberOfChannels)},(_,i)=>decoded.getChannelData(i)),decoded.sampleRate,onProgress);}catch(e){throw new Error(`${e instanceof Error?e.message:'Audio decoding failed.'} The original recording is still available.`);}finally{await context.close();}
}

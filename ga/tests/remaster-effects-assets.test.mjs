import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {SND_BYTE_LENGTHS} from '../dist/js/speaker-clock.js';

const original=JSON.parse(await readFile(new URL('../dist/assets/audio/manifest.json',import.meta.url)));
const root=new URL('../dist/assets/audio/remaster-effects/',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('manifest.json',root)));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
function wav(bytes){
 assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WAVE');
 let fmt,data;
 for(let offset=12;offset+8<=bytes.length;){const kind=bytes.toString('ascii',offset,offset+4),size=bytes.readUInt32LE(offset+4);assert(offset+8+size<=bytes.length,'truncated WAV chunk');const body=bytes.subarray(offset+8,offset+8+size);if(kind==='fmt ')fmt=body;if(kind==='data')data=body;offset+=8+size+(size&1);}
 assert(fmt&&data,'WAV needs format and sample data');
 const encoding=fmt.readUInt16LE(0),channels=fmt.readUInt16LE(2),rate=fmt.readUInt32LE(4),alignment=fmt.readUInt16LE(12),bits=fmt.readUInt16LE(14);
 assert([1,3].includes(encoding),'linear PCM or IEEE float WAV');assert([1,2].includes(channels));assert([16,24,32].includes(bits));assert.equal(data.length%alignment,0);
 const samples=[];for(let p=0;p<data.length;p+=bits/8){let n;if(encoding===3){assert.equal(bits,32);n=data.readFloatLE(p);}else if(bits===16)n=data.readInt16LE(p)/32768;else if(bits===24)n=data.readIntLE(p,3)/8388608;else n=data.readInt32LE(p)/2147483648;assert(Number.isFinite(n));samples.push(n);}
 return{channels,rate,frames:data.length/alignment,samples};
}

test('all fifteen remastered effects retain original source identity and native time',async()=>{
 assert.equal(manifest.version,1);assert.deepEqual(Object.keys(manifest.effects).sort((a,b)=>a-b),Object.keys(original.effects).sort((a,b)=>a-b));
 for(let id=0;id<15;id++){
  const r=manifest.effects[id],source=original.effects[id];assert.equal(source.bytes,SND_BYTE_LENGTHS[id]);assert.equal(r.sourceSHA256,source.sha256);
  assert.equal(sha(await readFile(new URL('../dist/assets/audio/'+source.file,import.meta.url))),source.sha256,'original effect remains untouched');
  assert(Math.abs(r.nativeDurationSeconds-source.nativeDurationSeconds)<1e-12,'native event time remains exact');
  assert.equal(r.loopStart,0);assert.equal(r.loopEnd,source.nativeDurationSeconds);
  assert.equal(r.sampleRate,48000);assert(Math.abs(r.frames-r.nativeDurationSeconds*r.sampleRate)<=1,'one nearest-frame quantization at most');
  assert(Math.abs(r.duration-r.frames/r.sampleRate)<1e-12);
 }
});
test('delivered effects match content hashes, real PCM and safe playback/loop boundaries',async()=>{
 const expected=new Set();
 for(let id=0;id<15;id++){
  const r=manifest.effects[id];assert.match(r.file,new RegExp(`^effect-${id}-[a-f0-9]{16}\\.wav$`));assert.match(r.sha256,/^[a-f0-9]{64}$/);assert(r.file.includes(r.sha256.slice(0,16)));expected.add(r.file);
  const bytes=await readFile(new URL(r.file,root));assert.equal(sha(bytes),r.sha256);const decoded=wav(bytes);assert.equal(decoded.rate,r.sampleRate);assert.equal(decoded.frames,r.frames);
  const peak=Math.max(...decoded.samples.map(Math.abs));assert(peak>1e-4&&peak<.999,'non-silent PCM with clipping headroom');
  assert(new Set(decoded.samples).size>64,'reconstructed waveform is not unchanged binary speaker PCM');
  if(id===10){for(let ch=0;ch<decoded.channels;ch++)assert(Math.abs(decoded.samples[ch]-decoded.samples.at(-decoded.channels+ch))<.01,'magic loop wraps without a sample discontinuity');}
 }
 assert.deepEqual((await readdir(root)).filter(f=>f.endsWith('.wav')).sort(),[...expected].sort(),'no stale alternative effect WAVs');
});

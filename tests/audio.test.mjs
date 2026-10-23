import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
const source=await readFile(new URL('../dist/js/audio.js',import.meta.url),'utf8');
const {OriginalMixer,parseModule,PHASE_STEPS,PERIODS,SAMPLE_LENGTHS}=await import('../dist/js/audio.js');
const fixture=()=>({length:1,orders:[0,0],events:new Array(1024).fill(0),samples:new Array(4096).fill(32),instruments:[{start:0,length:4096,volume:64,loopStart:0,loopLength:4096}]});
function voices(mixer){for(const v of mixer.voices)Object.assign(v,{position:0,end:4096,volume:64,step:0});}

test('four original voices add unsigned six-bit samples and keep integer phase',()=>{
 const m=new OriginalMixer();m.setSong(fixture());voices(m);
 assert.deepEqual([...new Set(m.block())],[128]);
 assert.equal(m.voices[0].position,168);
 m.voices[0].step=PHASE_STEPS[0];m.voices[0].position=0;m.voices[0].phase=0;
 m.block();assert.equal(m.voices[0].position,83);assert.equal(m.voices[0].phase,88);
});
test('SFX reserves fourth voice except on its final block',()=>{
 const m=new OriginalMixer();m.setSong(fixture());voices(m);m.setEffect(new Uint8Array(336).fill(32));
 assert.deepEqual([...new Set(m.block())],[128]);assert.equal(m.voices[3].position,0);
 assert.deepEqual([...new Set(m.block())],[160]);assert.equal(m.voices[3].position,168);
});
test('A slide clamps, F00 countdown underflows and D uses raw row parameter',()=>{
 const s=fixture();s.events[2]=10;s.events[3]=0xf0;
 const m=new OriginalMixer();m.setSong(s);m.voices[0].volume=60;m.block();m.block();
 assert.equal(m.voices[0].volume,64);
 s.events[2]=15;s.events[3]=0;m.setSong(s);m.block();assert.equal(m.speed,0);assert.equal(m.row,1);
 for(let i=0;i<6;i++)m.block();assert.equal(m.countdown,0);assert.equal(m.row,2);
 m.block();assert.equal(m.countdown,255);assert.equal(m.row,2);
 s.events[2]=13;s.events[3]=0x12;m.setSong(s);m.block();assert.equal(m.row,18);assert.equal(m.order,1);
});
test('MOD parser validates boundaries, converts signed PCM, and maps notes',()=>{
 const b=new Uint8Array(1084+1024+4),v=new DataView(b.buffer);
 b.set([77,46,75,46],1080);b[950]=1;v.setUint16(42,2);b[45]=64;
 b.set([0x03,0x58,0x10,0],1084);b.set([128,255,0,127],2108);
 const song=parseModule(b.buffer);assert.deepEqual(song.samples,[0,31,32,63]);
 const m=new OriginalMixer();m.setSong(song);m.block();assert.equal(m.voices[0].step,PHASE_STEPS[PERIODS.indexOf(856)]);
 assert.throws(()=>parseModule(b.buffer.slice(0,-1)),/Truncated/);
 assert.equal(SAMPLE_LENGTHS.reduce((a,b)=>a+b,0),60768);
});

test('all twelve recovered tracks parse and render through the original kernel',async()=>{
 const directory=new URL('../dist/assets/music/',import.meta.url);
 const names=(await readdir(directory)).filter(x=>x.endsWith('.mod'));
 assert.equal(names.length,12);
 for(const name of names){
   const b=await readFile(new URL(name,directory));
   const song=parseModule(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));
   for(let o=0;o<song.events.length;o+=4){
     const period=((song.events[o]&15)<<8)|song.events[o+1];
     assert.ok(!period||PERIODS.includes(period),`${name}: unsupported period ${period}`);
   }
   const mixer=new OriginalMixer();mixer.setSong(song);
   let heard=false;
   for(let i=0;i<3000;i++){const block=mixer.block();assert.equal(block.length,168);heard ||= block.some(x=>x!==0);}
   assert.ok(heard,`${name} remained silent`);
 }
});

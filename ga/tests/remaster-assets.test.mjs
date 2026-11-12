import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const root=new URL('../dist/assets/audio/',import.meta.url);
const json=async path=>JSON.parse(await readFile(new URL(path,root),'utf8'));

test('complete sampled catalog retains every original program and native playlist period',async()=>{
  const original=await json('opl/catalog.json'),remaster=await json('remaster/manifest.json');
  assert.equal(remaster.version,1);
  assert.deepEqual(Object.keys(remaster.tracks).sort(),Object.keys(original.programs).sort());
  for(const [id,program] of Object.entries(original.programs)){
    const r=remaster.tracks[id],sr=r.sampleRate;
    assert.equal(sr,48000,id);
    const ticks=names=>names.reduce((n,name)=>n+original.scores[name].endTick+1,0);
    const prefixTicks=ticks(program.sequence.slice(0,program.loopStart));
    const loopTicks=ticks(program.sequence.slice(program.loopStart));
    const seconds=n=>n*original.tickPITCounts/original.pitHz;
    assert(Math.abs(r.logicalLoopStart-seconds(prefixTicks))<=1/sr,id+' prefix');
    assert(Math.abs(r.sourceLoopDuration-seconds(loopTicks))<=.501/sr,id+' period');
    assert(Math.abs(r.firstCycleEnd-seconds(prefixTicks+loopTicks))<=2/sr,id+' first pass');
    assert(Math.abs(r.startupEnd-r.logicalLoopStart-r.steadySkipAtStartup)<=1/sr,id+' cold head');
    assert(Math.abs(r.loopStart-r.startupEnd)<=1/sr,id+' physical loop start');
    assert(Math.abs(r.loopEnd-r.loopStart-r.sourceLoopDuration)<=1/sr,id+' physical loop length');
    assert(r.steadySkipAtStartup>0&&r.steadySkipAtStartup<r.sourceLoopDuration,id+' compact steady head');
    assert(r.frames*2*4<=64*1024*1024,id+' maximum decoded stereo float buffer');
  }
});

test('all packaged FLAC bytes, content-addressed filenames and STREAMINFO match the manifest',async()=>{
  const {tracks}=await json('remaster/manifest.json');
  const expected=[];
  for(const [id,r] of Object.entries(tracks)){
    assert.equal(r.file,`${id}-${r.sha256.slice(0,16)}.flac`);
    expected.push(r.file);
    const b=await readFile(new URL('remaster/'+r.file,root));
    assert.equal(createHash('sha256').update(b).digest('hex'),r.sha256,id);
    assert.equal(b.subarray(0,4).toString(),'fLaC',id);
    assert.equal(b[4]&127,0,id+' first metadata block is STREAMINFO');
    assert.equal(b.readUIntBE(5,3),34,id+' STREAMINFO size');
    const info=b.readBigUInt64BE(18),rate=Number(info>>44n),channels=Number((info>>41n)&7n)+1,bits=Number((info>>36n)&31n)+1,frames=Number(info&0xfffffffffn);
    assert.equal(rate,r.sampleRate,id);assert.equal(channels,2,id);assert.equal(bits,16,id);assert.equal(frames,r.frames,id);
    assert(Math.abs(frames/rate-r.duration)<1e-9,id+' decoded duration');
    assert(Math.abs(r.loopEnd-r.duration)<=1/rate,id+' complete steady loop ending');
  }
  const actual=(await readdir(new URL('remaster/',root))).filter(n=>n.endsWith('.flac')).sort();
  assert.deepEqual(actual,expected.sort(),'No stale or missing compressed tracks');
});

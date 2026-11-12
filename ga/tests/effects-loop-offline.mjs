// Real browser WAV decoding and OfflineAudioContext renders at both output rates.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const {chromium}=await import(process.env.GA_PLAYWRIGHT_MODULE||'playwright');
const base=process.env.GA_TEST_URL||'http://127.0.0.1:5943/',out=resolve(process.env.GA_QA_OUTPUT||'/tmp/ga-effects-loop');await mkdir(out,{recursive:true});
const report={scope:'Actual Chrome WAV decode and offline rendered signal at48000/44100Hz; all fifteen reconstructed effects, three loop periods and native one-shot stop. No subjective listening or device timing claim.',cases:[]};
const browser=await chromium.launch({headless:true,...(process.env.GA_CHROME_PATH?{executablePath:process.env.GA_CHROME_PATH}:{}),args:['--mute-audio']});
try{
 const page=await browser.newPage();await page.goto(base+'assets/audio/remaster-effects/manifest.json');
 report.cases=await page.evaluate(async()=>{
  const root=new URL('./',location.href),manifest=await(await fetch(location.href)).json(),results=[];
  for(const rate of[48000,44100])for(const[id,record]of Object.entries(manifest.effects)){
   const bytes=await(await fetch(new URL(record.file,root))).arrayBuffer(),count=Math.ceil((record.nativeDurationSeconds*3+.02)*rate),context=new OfflineAudioContext(1,count,rate),buffer=await context.decodeAudioData(bytes.slice(0));
   const source=context.createBufferSource();source.buffer=buffer;source.loop=true;source.loopStart=0;source.loopEnd=Math.min(record.loopEnd,buffer.duration);source.connect(context.destination);source.start();const rendered=await context.startRendering(),data=rendered.getChannelData(0);
   let peak=0,maximumSeamDelta=0;for(const n of data){if(!Number.isFinite(n))throw Error('Invalid PCM');peak=Math.max(peak,Math.abs(n));}
   for(const cycle of[1,2,3]){const at=Math.round(source.loopEnd*cycle*rate);for(let i=at-3;i<=at+3&&i<data.length;i++)maximumSeamDelta=Math.max(maximumSeamDelta,Math.abs(data[i]-data[i-1]));}
   const one=new OfflineAudioContext(1,Math.ceil((record.nativeDurationSeconds+.03)*rate),rate),decoded=await one.decodeAudioData(bytes.slice(0)),once=one.createBufferSource();once.buffer=decoded;once.connect(one.destination);once.start();once.stop(record.nativeDurationSeconds);const onceData=(await one.startRendering()).getChannelData(0);let stoppedTailPeak=0;for(let i=Math.ceil(record.nativeDurationSeconds*rate)+1;i<onceData.length;i++)stoppedTailPeak=Math.max(stoppedTailPeak,Math.abs(onceData[i]));
   results.push({id:Number(id),sampleRate:rate,decodedFrames:buffer.length,decodedDuration:buffer.duration,nativeDuration:record.nativeDurationSeconds,loopEnd:source.loopEnd,peak,maximumSeamDelta,stoppedTailPeak});
  }
  return results;
 });
 assert.equal(report.cases.length,30);for(const c of report.cases){assert(c.peak>1e-4,'silent effect '+c.id);assert(c.maximumSeamDelta<.02,JSON.stringify(c));assert.equal(c.stoppedTailPeak,0);assert(Math.abs(c.decodedDuration-c.nativeDuration)<=2/c.sampleRate,JSON.stringify(c));}report.pass=true;
}catch(error){report.failure=String(error.stack||error);throw error;}finally{await browser.close();report.browserClosed=true;report.audioClosed=true;await writeFile(resolve(out,'checks.json'),JSON.stringify(report,null,2)+'\n');}
console.log('PASS',report.cases.length,'actual WAV loop and native stop cases');

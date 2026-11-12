// Regression derived from the independent review oracle; actual OfflineAudioContext, not a mock.
const {chromium}=await import(process.env.GA_PLAYWRIGHT_MODULE||'playwright');
import {writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
const base=process.env.GA_TEST_URL||process.env.GA_MUSIC_QA_URL||'http://127.0.0.1:5790/';
const out=resolve(process.env.GA_QA_OUTPUT||'/tmp/ga-music-handoff');await mkdir(out,{recursive:true});const output=resolve(out,'handoff-grid-proof.json');
const browser=await chromium.launch({...(process.env.GA_CHROME_PATH?{executablePath:process.env.GA_CHROME_PATH}:{}),headless:true,args:['--mute-audio']});
const errors=[];
try{
 const page=await browser.newPage();page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(base+'assets/audio/remaster/manifest.json');
 const results=await page.evaluate(async(base)=>{
  const {RemasterMusic}=await import(base+'js/remaster-music.js');const results=[];
  for(const rate of[48000,44100])for(const I of[0,.1234375]){
   const H=.2,P=.3,prefix=I+H;
   const record={file:'fixture.flac',sha256:'0'.repeat(64),sampleRate:48000,duration:prefix+P,loopStart:prefix,loopEnd:prefix+P,startupEnd:prefix,logicalLoopStart:I,sourceLoopDuration:P,firstCycleEnd:I+P,steadySkipAtStartup:H};
   const buffer=new AudioBuffer({numberOfChannels:2,length:Math.ceil(record.duration*rate),sampleRate:rate});for(let ch=0;ch<2;ch++)buffer.getChannelData(ch).fill(.25);
   for(const remaining of[1/rate,.0001,.001,.003,.017,.02,.029,.037,.1,.123456789]){
    const frames=Math.ceil(remaining*rate)+64,context=new OfflineAudioContext(2,frames,rate),player=new RemasterMusic({context,destination:context.destination});
    player.manifest={version:1,tracks:{fixture:record}};player.buffer=buffer;player.bufferId='fixture';
    const ok=await player.select('fixture',{startedAt:-(prefix-remaining),loop:true});if(!ok)throw Error(player.error);
    const audio=await context.startRendering();let bad=0,max=0,first=null;
    for(let ch=0;ch<2;ch++)for(let f=0;f<frames;f++){const value=audio.getChannelData(ch)[f],err=Math.abs(value-.25);if(err>1e-7){bad++;if(!first)first={channel:ch,frame:f,value};}max=Math.max(max,err);}
    player.dispose();results.push({rate,logicalPrefix:I,remaining,frames,badFrames:bad,maxAbsoluteError:max,firstMismatch:first});
   }
  }
  return results;
 },base);
 const allPass=results.every(r=>r.badFrames===0)&&errors.length===0;
 await writeFile(output,JSON.stringify({scope:'Actual Chrome OfflineAudioContext production scheduler with constant0.25 cached buffer fixture. Isolates head/tail gap or overlap from valid fractional resampling and loop interpolation. Ten remaining durations, two prefix layouts,48k/44.1k. Not delivered music PCM or Safari listening.',baseURL:base,build:await(await page.request.get(base+'build.json')).json(),results,errors,allPass,audioClosed:true,browserClosed:true},null,2)+'\n');
 console.log(JSON.stringify({allPass,cases:results.length,failed:results.filter(r=>r.badFrames).length,maxAbsoluteError:Math.max(...results.map(r=>r.maxAbsoluteError)),errors}));if(!allPass)process.exitCode=1;
}finally{await browser.close();}

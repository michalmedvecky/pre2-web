import {LOGIC} from './logic-data.js';
// AXE19ef/1a4b/1a8e (hero),1b19/1b5c/1bbb (dwarf),1ca9/1cd1/1d61 (amazon).
// Coordinates are original screen-pixel tables, never newly authored artwork.
export function beginMagic(actor){return {casterID:actor.id,type:actor.typeId,timer:90,phase:0,
  timer3:0,shake:0,heroFrames:[-3,-2,-1,-1,-3,-2],x:actor.typeId===0?164:-32,y:-96,right:0,toggle:0};}
export function advanceMagic(m,ticks,random,{speakerIdle=true}={}){m.shake^=2;const visual=[],events=[];let done=false;const priorPhase=m.phase;
  const startSound=()=>{if(!m.audioStarted&&(m.type===0||speakerIdle)){m.audioStarted=true;events.push({kind:'sfx-loop-start',id:10,authority:'AXE1a34/1b53/1cfb→1f4d'});}};
  const stopSound=()=>{if(!m.audioStopped){m.audioStopped=true;events.push({kind:'sfx-stop',authority:'AXE1a3c/1b99/1d26'});}};
  if(m.type===1||m.type===2)startSound();
  const add=(x,y,index)=>{visual.push({x,y:y+m.shake,frame:index>>1,mirrored:!!(index&1)});};
  if(m.type===1){m.timer=Math.max(0,m.timer-ticks);m.timer3=Math.max(0,m.timer3-ticks);
    if(m.timer3===0){m.timer3=3;m.heroFrames=m.heroFrames.map((n,i)=>n+1>(i<4?2:3)?0:n+1);}
    m.heroFrames.forEach((f,i)=>{if(f>=0)add(LOGIC.magicHeroCoords[i*3],LOGIC.magicHeroCoords[i*3+1],(f+(i<4?4:0))*2);});done=m.timer===0;
  }else if(m.type===2){
    if(m.phase===0){if(m.right>319)m.phase=1;else {m.right+=16;if(m.x<320)m.x+=16;}}
    else if(m.phase===1){if(m.x<1){m.phase=2;done=true;}else {if(m.right<257)m.x-=16;m.right-=16;}}
    if(!done){for(let row=0;row<2;row++){for(let i=0;i<5;i++){
      const jitter=i===0?0:(random()&15)-7,idx=i+(m.toggle>>1);
      add((row===0?m.x:m.right)+jitter+(LOGIC.magicDwarfX[m.phase*8+i]||0),
        (row===0?110:140)+(LOGIC.magicDwarfY[m.phase*8+i]||0),(LOGIC.magicDwarfFrames[idx]||0)+m.phase);
    }if(row===0)m.toggle^=16;}}
  }else if(m.type===0){let count=3;m.toggle=0;
    if(m.phase===0){m.x+=4;m.y+=8;if(m.y>=0)m.phase=1;}
    else if(m.phase===1){count=6;m.toggle=m.previousToggle^16;m.previousToggle=m.toggle;m.x-=8;if(m.x<73)m.phase=2;}
    else {m.x-=4;m.y-=8;if(m.y< -95){m.phase=3;done=true;}}
    if(!done)for(let i=0;i<count;i++)add(m.x+(LOGIC.magicAmazonX[i]||0),m.y+(LOGIC.magicAmazonY[i]||0),LOGIC.magicAmazonFrames[i+(m.toggle>>1)]||0);
  }else done=true;
  if(m.type===0&&priorPhase===0&&m.phase===1)startSound();if(m.type===0&&priorPhase===1&&m.phase===2||done)stopSound();
  return {done,visual,events};
}

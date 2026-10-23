import {AWARDS,TICK_HZ,s16,u16} from './compat.js';

// 0x14e5d: a separate presentation, never gameplay physics or a guessed flat bonus.
export const RETRACE_HZ=70;
export function ledgerScore(w){return w.foodCounts.reduce((sum,n,i)=>(sum+n*(AWARDS[w.byte(0xa371+i)]||0))>>>0,0);}
export function pendingTallyScore(w){return (ledgerScore(w)+(w.transition?.tally?.falling||[]).reduce((sum,o)=>sum+(AWARDS[w.byte(0xa371+o.sprite-110)]||0),0))>>>0;}
export function createTally(w){
 const x=Math.round(w.player.x-w.camera.x),y=Math.round(w.player.y-w.camera.y);
 return {phase:'iris',clock:0,frame:w.frame,score:w.score,percent:w.transition.percent,player:{x,y,sprite:w.player.sprite},props:[],falling:[],cursor:0,anim:0x7ba3,vx:64,iris:{cx:x,cy:y-16,radius:230,step:4,frames:0},settled:false};
}
function animate(w,t){let word=w.word(t.anim);if(s16(word)<0){t.anim=u16(t.anim+s16(word));word=w.word(t.anim);}t.player.sprite=word&8191;t.anim=u16(t.anim+2);}
function phase(t,name,anim){t.phase=name;if(anim!==undefined)t.anim=anim;}
function toward(value,target){return Math.abs(value-target)<2?target:value+Math.sign(target-value)*2;}
function machine(t){if(!(t.frame&3))t.props[2].sprite=t.props[2].sprite===109?104:t.props[2].sprite+1;}
function nativeFrame(w,t){
 t.score=w.score;
 if(t.phase==='iris'){
  const i=t.iris;i.frames++;if(!(i.frames%20))i.step++;i.radius-=i.step;t.frame=u16(t.frame+1);
  if(i.radius<=0){phase(t,'approach',0x7ba3);t.player.sprite=0;w.emit('tallyStart');}
  return;
 }
 if(t.phase==='approach'){
  animate(w,t);t.player.x=toward(t.player.x,60);t.player.y=toward(t.player.y,175);t.frame=u16(t.frame+1);
  if(t.player.x===60&&t.player.y===175){t.props=[{x:360,y:175,sprite:100},{x:360,y:148,sprite:98},{x:360,y:155,sprite:104}];phase(t,'arrive');}
  return;
 }
 if(t.phase==='arrive'){
  animate(w,t);machine(t);t.frame=u16(t.frame+1);for(const p of t.props)p.x-=3;
  if(t.props[0].x<=155){if(w.foodCounts.some(n=>n))phase(t,'brake',0x7c67);else phase(t,'leave',0x7ba3);}
  return;
 }
 if(t.phase==='brake'){
  animate(w,t);machine(t);t.frame=u16(t.frame+1);t.vx=Math.max(0,t.vx-3);t.player.x+=t.vx>>4;
  if(!(t.vx>>4))phase(t,'tally',0x7cab);
  return;
 }
 if(t.phase==='tally'){
  animate(w,t);machine(t);t.frame=u16(t.frame+1);
  for(const o of t.falling){o.vy=Math.min(128,o.vy+8);o.y+=o.vy>>4;if(o.y>=145){w.score=(w.score+(AWARDS[w.byte(0xa371+o.sprite-110)]||0))>>>0;o.active=false;w.emit('sfx',{index:8});}}
  t.falling=t.falling.filter(o=>o.active!==false);
  if(!(t.frame&7)){
   let found=-1;for(let i=0;i<113;i++){const index=(t.cursor+i)%113;if(w.foodCounts[index]){found=index;break;}}
   if(found<0){if(!t.falling.length){phase(t,'settle');t.settleFrames=2;}}
   else if(t.falling.length<20){w.foodCounts[found]--;t.falling.push({x:155,y:0,sprite:110+found,vy:0,active:true});t.cursor=(found+1)%113;}
  }
  return;
 }
 if(t.phase==='settle'){if(--t.settleFrames===0){phase(t,'leave',0x7ba3);t.settled=true;}return;}
 if(t.phase==='leave'){
  animate(w,t);machine(t);t.frame=u16(t.frame+1);for(const p of t.props)p.x-=2;t.player.x+=t.props[2].x<0?3:2;
  if(t.props[0].x<=-52){t.score=w.score;phase(t,'done');t.settled=true;w.foodCounts.fill(0);}
 }
}
export function advanceTally(w,seconds=1/TICK_HZ){
 const t=w.transition?.tally;if(!t||t.phase==='done')return;
 t.clock+=seconds;
 // Entry/exit use three PIT ticks; iris and item counting use VGA retraces.
 while(t.phase!=='done'){
  const hz=['iris','tally','settle'].includes(t.phase)?RETRACE_HZ:TICK_HZ;
  if(t.clock+1e-10<1/hz)break;t.clock-=1/hz;nativeFrame(w,t);
 }
}

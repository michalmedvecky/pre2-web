import {INTERLUDE_DATA} from './interlude-data.js';
import {OriginalSequence} from './ending.js';
import {LOGIC} from './logic-data.js';
import {TIMER_RATE,TICK_RATE} from './simulation.js';

/** AXE0bc9, between Arcade stageIndex5 and 6. Presentation copies only. */
export class OriginalInterlude {
  constructor(sim){
    this.sim=sim;this.assets=sim.assets;this.kind='interlude';this.phase='walk-a';this.events=[{kind:'music-stop'}];this.done=false;this.tick=0;this.fraction=0;this.page=0;this.typed=0;this.wait=0;this.patchIndex=0;this.revision=0;this.previousAction=false;
    this.map={...sim.map(),id:'interlude-0',cells:sim.map().cells.slice()};this.camera={...sim.state.camera};this.message=INTERLUDE_DATA.message;
    this.players=sim.state.players.filter(p=>!p.eliminated&&!p.removed&&p.health>0).map(p=>({...p,z:0,state:1,transition:0,visible:true,reveal:-1,revealDraw:-1}));
    this.decor=[];
  }
  move(...args){return OriginalSequence.prototype.move.apply(this,args);}
  patch(offset){return OriginalSequence.prototype.patch.call(this,offset);}
  spawnKing(){this.decor=INTERLUDE_DATA.actors.map(([state,direction,x,y,frame],i)=>({id:9100+i,sprite:'king',type:'king',state,direction,x,y,z:0,frame,animationSlot:LOGIC.animationSlots[state*8+direction],reveal:-1}));}
  kingStep(){const a=this.decor[0],b=this.decor[1];if(b.y<144){for(const p of this.decor)p.y+=2;}
    else if(b.y<166){a.y+=3;b.y+=3;a.frame=1;}
    else {b.frame=1;if(b.y<218)b.y+=52;if(a.y<172){a.y+=3;b.x-=2;}else {a.y=224;a.frame=2;if(b.x<229)b.frame=2;else b.x-=2;}}
    if(b.frame===2)this.phase='message';
  }
  advance(){if(this.phase!=='message')return;const text=this.message.pages[this.page]||'';if(this.typed<text.length){this.typed=text.length;this.wait=72;}else this.nextPage();}
  nextPage(){this.page++;this.typed=0;this.wait=0;if(this.page>=this.message.pages.length)this.phase='walk-b';}
  step(input={},nativeTicks){this.events=[];if(this.done)return;this.tick++;this.fraction+=TIMER_RATE/TICK_RATE;const ticks=nativeTicks??Math.floor(this.fraction);if(nativeTicks===undefined)this.fraction-=ticks;
    const action=!!(input.confirm||input.attack||input.jump||input.players?.some(p=>p.attack||p.jump));if(action&&!this.previousAction)this.advance();this.previousAction=action;
    if(this.phase==='walk-a'){if(this.move([[152,216],[376,216]],[3,5],4,ticks)){this.spawnKing();this.phase='king';}}
    else if(this.phase==='king')this.kingStep();
    else if(this.phase==='message'){const text=this.message.pages[this.page]||'';if(this.typed<text.length){this.typed++;if(this.typed===text.length)this.wait=72;}else if((this.wait-=ticks)<=0)this.nextPage();}
    else if(this.phase==='walk-b'){if(this.move([[240,216],[288,216]],[1,7],1,ticks))this.phase='walk-c';}
    else if(this.phase==='walk-c'){if(this.move([[256,184],[272,184]],[0,0],1,ticks))this.phase='open';}
    else if(this.phase==='open'){if(this.patchIndex===0)this.events.push({kind:'sfx',id:11});this.patch(this.assets.ending.openPatches[this.patchIndex++]);if(this.patchIndex===this.assets.ending.openPatches.length)this.phase='walk-d';}
    else if(this.phase==='walk-d'){if(this.move([[256,168],[272,168]],[0,0],1,ticks)){this.done=true;this.next='advance-stage';}}
  }
  render(renderer){const hidden=this.phase==='message';renderer.render({stage:this.sim.state.stage,mapOverride:this.map,camera:this.camera,hideHUD:true,entities:[...(hidden?this.decor.slice(0,4):this.decor),...this.players],paletteRecords:[56]});if(hidden){const text=this.message.pages[Math.min(this.page,this.message.pages.length-1)]||'';renderer.dialogue(this.message,text.slice(0,this.typed),this.camera,renderer.palette([this.map.paletteRecord,56]));}}
}
export {INTERLUDE_DATA};
export function interludeReady(sim){return sim.mode==='arcade'&&sim.state.stageIndex===5&&sim.state.status==='stage-complete';}

import {INTRO_DATA} from './intro-data.js';
import {TIMER_RATE,TICK_RATE} from './simulation.js';

// The caller suspends Simulation.step while this sequence is active. No actor,
// HP, camera, script PC or lifecycle mutation is performed by this presenter.
export class OriginalIntro {
  constructor(sim,kind='title'){
    if(!['title','opening'].includes(kind))throw new RangeError('Unknown original intro sequence.');
    this.sim=sim;this.kind=kind;this.done=false;this.events=[];this.tick=0;this.fraction=0;this.page=0;this.typed=0;this.wait=0;
    this.phase=kind==='title'?'title':'message';this.previousAction=false;this.promptHidden=false;this.promptTimer=16;
    this.message=INTRO_DATA.opening.message;this.authority=kind==='title'?INTRO_DATA.title.authority:INTRO_DATA.opening.authority;
  }
  advance(){if(this.done)return;
    if(this.kind==='title'){this.done=true;this.next='menu';return;}
    const text=this.message.pages[this.page]||'';
    if(this.typed<text.length){this.typed=text.length;this.wait=72;}else this.nextPage();
  }
  nextPage(){this.page++;this.typed=0;this.wait=0;if(this.page>=this.message.pages.length){this.done=true;this.next='resume-game';}}
  step(input={},nativeTicks){this.events=[];if(this.done)return;this.tick++;
    this.fraction+=TIMER_RATE/TICK_RATE;const ticks=nativeTicks??Math.floor(this.fraction);if(nativeTicks===undefined)this.fraction-=ticks;
    // Space is the native title scan39. Enter/attack can be passed explicitly by
    // the browser adapter as an accessibility alias, without claiming native keys.
    const action=!!(input.start||input.confirm||input.attack||input.jump||input.players?.some(p=>p.attack||p.jump));
    if(action&&!this.previousAction)this.advance();this.previousAction=action;if(this.done)return;
    if(this.kind==='title'){this.promptTimer=Math.max(0,this.promptTimer-ticks);if(this.promptTimer===0){this.promptHidden=!this.promptHidden;this.promptTimer=16;}return;}
    const text=this.message.pages[this.page]||'';
    if(this.typed<text.length){this.typed++;if(this.typed===text.length)this.wait=72;}
    else{this.wait=Math.max(0,this.wait-ticks);if(this.wait===0)this.nextPage();}
  }
  render(renderer){
    if(this.kind==='title'){
      const camera=this.sim.assets.maps.a.initialCamera;
      const entities=INTRO_DATA.title.actors.map((a,i)=>({...a,id:20000+i,type:a.sprite,animationSlot:0,x:a.x+camera.x,y:a.y+camera.y,z:0,direction:0,reveal:-1,blinkHidden:i===15&&this.promptHidden}));
      renderer.render({stage:'a',camera,entities,hideHUD:true});return;
    }
    renderer.render({...this.sim.state,mode:this.sim.mode});
    const text=this.message.pages[Math.min(this.page,this.message.pages.length-1)]||'';
    renderer.dialogue(this.message,text.slice(0,this.typed),this.sim.state.camera,renderer.palette([this.sim.map()?.paletteRecord,56].filter(Number.isInteger)));
  }
}
export {INTRO_DATA};

export function openingReady(sim){return sim.state.stageIndex===0&&sim.mode!=='duel'&&sim.scriptWait?.op===5&&sim.state.players.every(p=>p.removed||p.x>=(p.playerIndex===1?INTRO_DATA.opening.entryX2:INTRO_DATA.opening.entryX));}

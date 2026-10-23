import {LevelOne} from './level-one.js';
import {createTally,advanceTally,pendingTallyScore} from './stage-tally.js';

// The feast uses the recovered 0x14e5d state machine. VR fades replace the VGA
// iris; only the actor runs, never the tracked camera. Supported stages: 1, 2.
export class Campaign extends LevelOne {
 reset(options={}){super.reset(options);this.stage='playing';this.stageTime=0;this.transitionAlpha=0;this.tally=null;this.entryLock=false;this.pendingLevel=null;this.emit('campaign-reset');}
 strike(sweep){return this.stage==='playing'&&super.strike(sweep);}
 step(dt,input={}){
  if(this.stage==='playing'){
   if(this.entryLock){if(Math.hypot(input.x||0,input.z||0)>.22||input.jump||input.interact)return;this.entryLock=false;}
   super.step(dt,input);
   if(this.complete){const w=this.world;if(w.transition.kind==='bonus'){this.stage='slice-complete';this.pendingLevel=w.transition.next;this.interactHeld=!!input.interact;return;}w.transition.percent=Math.floor((((w.brokenBlocks+w.collectedAuthoredFood)&255)*100)/Math.max(1,(w.totalBlocks+w.totalFood)&65535));w.transition.tally=this.tally=createTally(w);this.stage='feast';this.stageTime=0;this.pendingLevel=w.transition.next;this.emit('feast-start');}
   return;
  }
  this.time+=dt;this.stageTime+=dt;this.portalFade=Math.max(0,this.portalFade-dt);
  if(this.stage==='feast'){
   const before=this.tally.phase;advanceTally(this.world,dt);this.score=this.world.score*10;
   const quotient=Math.floor(this.world.score/25000);while(this.world.extraLifeQuotient<quotient){this.world.extraLifeQuotient++;this.world.lives=Math.min(99,this.world.lives+1);this.emit('bonus-life');}
   // Suppress gameplay SFX buildup while retaining the native counting cadence.
   for(const event of this.world.events.splice(0))if(event.type==='sfx')this.emit('bonus-count');
   this.transitionAlpha=this.tally.phase==='iris'?Math.min(1,this.stageTime/.55):before==='iris'?1:Math.max(0,this.transitionAlpha-dt/.45);
   if(this.tally.phase==='done'){this.stage=this.pendingLevel===1?'depart':'slice-complete';this.stageTime=0;}
   return;
  }
  if(this.stage==='depart'){
   this.transitionAlpha=Math.min(1,this.stageTime/.55);
   if(this.stageTime>=.6){const world=this.world;world.advance();super.reset({world});this.player.x-=input.headX||0;this.player.z-=input.headZ||0;this.tally=null;this.stage='enter';this.stageTime=0;this.transitionAlpha=1;this.entryLock=true;this.emit('level-change',{index:world.levelIndex});}
   return;
  }
  if(this.stage==='enter'){this.transitionAlpha=Math.max(0,1-this.stageTime/.65);if(this.stageTime>=.65){this.stage='playing';this.stageTime=0;}return;}
  if(this.stage==='slice-complete'){this.transitionAlpha=0;if(!input.interact)this.interactHeld=false;else if(!this.interactHeld)this.reset();}
 }
 snapshot(){return {...super.snapshot(),campaign:{stage:this.stage,fade:this.transitionAlpha,pendingLevel:this.pendingLevel,inputLocked:this.entryLock,tally:this.tally?{phase:this.tally.phase,percent:this.tally.percent,pendingScore:pendingTallyScore(this.world)*10,player:{...this.tally.player},falling:this.tally.falling.length}:null}};}
}

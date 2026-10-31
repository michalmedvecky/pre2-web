import {LOGIC} from './logic-data.js';
import {nativeScale,TIMER_RATE,TICK_RATE} from './simulation.js';

/** Original rescue and results sequencing. Source offsets are in assets.ending. */
export class OriginalSequence {
  constructor(sim,kind,plan=null){
    this.sim=sim;this.assets=sim.assets;this.kind=kind;this.plan=plan;this.tick=0;this.nativeTicks=0;this.fraction=0;this.wait=0;this.done=false;this.events=[];this.page=0;this.typed=0;this.previousAttack=false;
    this.phase=kind==='rescue'?'open':kind==='gameover'?'gameover':kind==='results'?'results':'message';
    this.map=kind==='rescue'?{...this.assets.maps['6'],id:'rescue-0',cells:this.assets.maps['6'].cells.slice()}:this.assets.maps[kind==='travel'?'b':'9'];
    this.camera=kind==='rescue'?{x:104,y:64}:this.map.initialCamera;
    this.revision=0;this.patchIndex=0;
    this.message=kind==='rescue'?this.assets.ending.rescueMessage:kind==='beginner'?this.assets.ending.beginnerMessage:this.assets.ending.duelMessage;
    if(kind==='travel')this.message=this.assets.ending.travelMessages[String(plan.sourceStageIndex)];
    this.players=(sim.state.players||[sim.state.player]).filter(p=>p&&!p.eliminated&&p.health>0).map(p=>({...p,state:1,nativeState:1,action:'walk',direction:4,x:p.playerIndex===1?272:256,y:168,z:0,frame:0,transition:0,removed:false,visible:false,reveal:-1,revealDraw:-1}));
    this.decor=[];
    if(kind==='rescue'){
      [[0,0,192,224,2],[1,5,228,218,2],[1,0,208,144,0],[1,0,320,144,0],[1,0,208,144,1],[1,0,320,144,1]].forEach(([state,direction,x,y,frame],i)=>{
        this.decor.push({id:9000+i,type:'king',sprite:'king',state,direction,x,y,z:0,animationSlot:LOGIC.animationSlots[state*8+direction],frame,reveal:-1});
      });
      for(const player of this.players)sim.refresh(player);
    }
    this.wait=kind==='gameover'?150:kind==='results'?360:0;
    sim.state.status=kind==='results'?'results':'ending';sim.state.ending={kind,phase:this.phase,tick:0,complete:false};
  }
  patch(offset){
    const p=this.assets.ending.doorPatches[String(offset)];
    for(let y=0;y<p.height;y++)for(let x=0;x<p.width;x++){const i=(p.y+y)*this.map.width+p.x+x;this.map.cells[i]=(this.map.cells[i]&0xf801)|((p.tiles[y*p.width+x]&1023)<<1);}
    this.map.id=`rescue-${++this.revision}`;
  }
  move(targets,directions,endState,ticks){
    let complete=true;
    for(const p of this.players){
      p.visible=true;const n=p.playerIndex===1?1:0,[x,y]=targets[n],dx=x-p.x,dy=y-p.y;
      if(Math.abs(dx)<=8&&Math.abs(dy)<=8){p.x=x;p.y=y;p.z=0;p.state=endState;p.direction=directions[n];this.sim.refresh(p);continue;}
      complete=false;let bits=0;if(Math.abs(dx)>8)bits|=dx>0?4:8;if(Math.abs(dy)>8)bits|=dy>0?1:2;
      const direction=LOGIC.directionLookup[bits];
      if(p.state!==1||p.direction!==direction){p.state=1;p.direction=direction;this.sim.refresh(p);}
      p.frameTimer=Math.max(0,p.frameTimer-ticks);this.sim.animate(p);
      p.x+=nativeScale(LOGIC.vx[8+direction],ticks);p.y+=nativeScale(LOGIC.vy[8+direction],ticks);
    }
    return complete;
  }
  advance(){
    if(this.phase==='message'){
      const page=this.message.pages[this.page]||'';
      if(this.typed<page.length){this.typed=page.length;this.wait=72;}
      else {this.wait=0;this.nextPage();}
    }else if(this.kind==='results'){if(this.phase==='results'&&this.plan?.scoreAfter){this.phase='score';this.wait=360;this.events.push({kind:'music',id:'score'});}else this.finish('menu');}
  }
  nextPage(){
    this.page++;this.typed=0;
    if(this.page>=this.message.pages.length){
      if(this.kind==='beginner'){this.phase='message-wait';this.wait=180;}
      else if(this.kind==='duel-message'){this.phase='message-wait';this.wait=180;}
      else if(this.kind==='travel'){this.phase='message-wait';this.wait=90;}
      else this.finish('results');
    }
  }
  finish(next){this.done=true;this.next=next;this.sim.state.ending.complete=true;}
  step(input={}){
    this.events=[];if(this.done)return;this.tick++;this.fraction+=TIMER_RATE/TICK_RATE;const ticks=Math.floor(this.fraction);this.fraction-=ticks;this.nativeTicks+=ticks;
    const attacks=input.players?input.players.some(i=>i.attack||i.jump):input.attack||input.jump;
    if(attacks&&!this.previousAttack)this.advance();this.previousAttack=!!attacks;
    if(this.kind==='gameover'){this.wait-=ticks;if(this.wait<=0)this.finish(this.sim.mode==='arcade'?'results':this.sim.mode==='beginner'?'beginner':this.sim.playerCount===1?'duel-message':'menu');}
    else if(this.kind==='results'){
      // 137c uses timed6932; main00f5's score phase uses untimed696e.
      if(this.phase==='results'){this.wait-=ticks;if(this.wait<=0)this.advance();}
    }else if(this.phase==='open'||this.phase==='close'){
      const list=this.phase==='open'?this.assets.ending.openPatches:this.assets.ending.closePatches;
      if(this.patchIndex===0)this.events.push({kind:'sfx',id:11});this.patch(list[this.patchIndex++]);
      if(this.patchIndex>=list.length){this.patchIndex=0;this.phase=this.phase==='open'?'walk-a':'walk-b';}
    }else if(this.phase==='walk-a'){if(this.move([[256,192],[272,192]],[4,4],1,ticks))this.phase='close';}
    else if(this.phase==='walk-b'){if(this.move([[240,216],[288,216]],[4,4],1,ticks))this.phase='walk-c';}
    else if(this.phase==='walk-c'){if(this.move([[152,216],[376,216]],[3,5],4,ticks)){this.decor=this.decor.slice(0,4);this.phase='message';}}
    else if(this.phase==='message'){
      const page=this.message.pages[this.page]||'';
      if(this.typed<page.length){this.typed++;if(this.typed===page.length)this.wait=72;}
      else {this.wait-=ticks;if(this.wait<=0)this.nextPage();}
    }else if(this.phase==='message-wait'){this.wait-=ticks;if(this.wait<=0)this.finish(this.kind==='beginner'?'menu':this.kind==='travel'?(this.plan.sourceStageIndex===7?'results':'advance-stage'):'results');}
    this.sim.state.ending.phase=this.phase;this.sim.state.ending.tick=this.tick;
  }
  render(renderer){
    if(this.kind==='results'){renderer.renderResults(this.sim.state);return;}
    if(this.kind==='gameover'){
      renderer.ctx.fillStyle='#000';renderer.ctx.fillRect(0,0,320,200);
      renderer.screenSprite('gameover',0,Math.floor(this.nativeTicks/2)%3,160,96,renderer.palette([this.assets.sprites.gameover.defaultPaletteRecord]));return;
    }
    const scene={stage:this.kind==='rescue'?'6':this.kind==='travel'?'b':'9',mapOverride:this.map,camera:this.camera,hideHUD:true,entities:this.kind==='rescue'?[...this.decor,...this.players]:this.kind==='travel'?this.plan.actors.map((a,i)=>({...a,id:9500+i,sprite:'oldmap',z:0,direction:0,reveal:-1})):[],paletteRecords:this.kind==='rescue'?[56]:this.kind==='travel'?[57]:[]};
    renderer.render(scene);
    if(this.phase==='message'||this.phase==='message-wait'){
      const page=this.message.pages[Math.min(this.page,this.message.pages.length-1)]||'';
      renderer.dialogue(this.message,this.phase==='message-wait'?page:page.slice(0,this.typed),this.camera,renderer.palette(this.kind==='rescue'?[this.map.paletteRecord,56]:this.kind==='travel'?[this.map.paletteRecord,57]:[56,this.map.paletteRecord]));
    }
  }
}

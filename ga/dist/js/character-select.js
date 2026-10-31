import{CHARACTER_SELECT_DATA as D}from'./character-select-data.js';
// Faithful presentation/input state only; no world actors or gameplay simulation.
export class OriginalCharacterSelect{
 constructor({assets,players=1}={}){this.assets=assets;this.players=players===2?2:1;this.phase=[D.initialPhase,D.initialPhase];this.velocity=[0,0];this.locked=[null,null];this.queued=[{},{}];this.previous=[{},{}];this.events=[{kind:'music-stop',authority:'AXE3a48→01ee'}];this.tick=0;this.done=false;this.cancelled=false;this.state=this.view();}
 get selected(){return this.locked.slice(0,this.players).map(id=>id===null?null:D.characters.find(c=>c.id===id).name);}
 get ready(){return this.locked.slice(0,this.players).every(id=>id!==null);}
 get current(){const out={};for(let n=0;n<this.players;n++){const c=D.characters.find(c=>c.detent===this.phase[n]);out[n?'p2':'p1']={character:c?.name??null,confirmed:this.locked[n]!==null,phase:this.phase[n],rotating:this.velocity[n]!==0};}return out;}
 rotate(player,delta){if(!this.valid(player)||this.locked[player]!==null)return{ok:false,reason:'locked-or-invalid-player'};this.queued[player][delta<0?'left':'right']=true;return{ok:true};}
 confirm(player){if(!this.valid(player)||this.locked[player]!==null)return{ok:false,reason:'locked-or-invalid-player'};this.queued[player].attack=true;return{ok:true};}
 select(player,name){if(!this.valid(player)||this.locked[player]!==null)return{ok:false,reason:'locked-or-invalid-player'};if(this.velocity[player]!==0)return{ok:false,reason:'rotating'};const c=D.characters.find(c=>c.name===name);if(!c)return{ok:false,reason:'invalid-character'};if(this.locked[1-player]===c.id)return{ok:false,reason:'character-already-selected'};const distance=(c.detent-this.phase[player]+D.phaseCount)%D.phaseCount;if(distance===0)return{ok:true};return this.rotate(player,distance<=60?-1:1);}
 valid(player){return Number.isInteger(player)&&player>=0&&player<this.players;}
 step(input={}){if(this.done||this.cancelled)return this.state;this.events=[];if(input.cancel){this.cancelled=true;return this.state;}if(this.ready){this.done=true;return this.state;}this.tick++;
  //3c10 visits P1 thenP2 before3ced advances either phase.
  for(let p=0;p<this.players;p++){const i=input.players?.[p]||(p===0?input:{}),q=this.queued[p],left=!!(i.left||i.pressed?.left||q.left),right=!!(i.right||i.pressed?.right||q.right),attack=!!(q.attack||(i.pressed?i.pressed.attack:i.attack&&!this.previous[p].attack));this.queued[p]={};this.previous[p]={...i};if(this.locked[p]!==null)continue;if(left)this.velocity[p]=D.step;if(right)this.velocity[p]=-D.step;if(this.velocity[p]===0&&attack){const c=D.characters.find(c=>c.detent===this.phase[p]);if(c&&this.locked[1-p]!==c.id){this.locked[p]=c.id;this.events.push({kind:'sfx',id:D.selectSound,player:p,authority:'AXE3c63/3cbb'});}}}
  for(let p=0;p<this.players;p++){this.phase[p]=(this.phase[p]+this.velocity[p]+D.phaseCount)%D.phaseCount;if(D.detents.includes(this.phase[p]))this.velocity[p]=this.locked[1-p]!==null&&this.phase[p]===this.phase[1-p]?D.step:0;}
  this.state=this.view();return this.state;
 }
 view(){const entities=[];for(let p=0;p<this.players;p++)for(const c of D.characters){const phase=(this.phase[p]+c.phaseOffset)%D.phaseCount;let x=D.centerX[p]+D.x[phase],y=D.centerY+D.y[phase];if(this.locked[1-p]===c.id)x=1000+D.x[phase];if(this.locked[p]!==null&&y<=150)y=1000;entities.push({id:100+p*3+c.id,type:c.sprite,sprite:c.sprite,typeId:24+c.id,animationSlot:0,frame:0,direction:0,mirrored:false,x,y,z:0,cachedScreenX:x,cachedScreenY:y,lifecycle:0,reveal:-1,revealDraw:-1});}return{stage:D.map,stageIndex:D.mapNativeIndex,camera:{...D.camera},entities,hideHUD:true,paletteRecords:[],characterSelect:true};}
 render(renderer){renderer.render(this.state);}
 drainEvents(){const events=this.events;this.events=[];return events;}
}

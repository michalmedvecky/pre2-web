// Source XY, spawn families, pickups, gates and secret counters stay in the recovered World.
// Depth, continuous locomotion and headset comfort are authored VR adaptations.
import {World} from '../native/engine.js';
import {segmentDistance,RULES} from './simulation.js';
export const NATIVE_HZ=24.275;
export const LEVEL_RULES=Object.freeze({...RULES,height:1.05,jump:8,bodyDepth:1.8,fallY:-5.5});
export const nativeY=y=>(672-y)/32;
export const areaForY=(y,levelIndex=0)=>levelIndex===0?(y<256?'caves':'outdoors'):'world';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function levelOneLayout(world){
 const boxes=[],columns=Array.from({length:256},()=>[]),level=world.level;
 for(let row=0;row<level.height;row++)for(let x=0;x<256;x++){
  const tile=world.map[row*256+x],c=level.tilePropertiesY[tile],wall=level.tilePropertiesX[tile],ceiling=(level.tilePropertiesMisc[tile]||0)&15;
  if(!(c>=1&&c<=5)&&!wall)continue;
  const offset=(level.tileSlopes[tile]||0)/32,top=nativeY(row*16+offset*32);
  const box={minX:x*.5,maxX:(x+1)*.5,minY:top-.5,maxY:top,minZ:-1.8,maxZ:1.8,tile,row,column:x,area:areaForY(row*16,world.levelIndex),floor:c>=1&&c<=5,dropThrough:c===5,hazard:c===6,wall:!!wall,ceiling:ceiling===1,ceilingHazard:ceiling===2,oneWay:!wall&&ceiling!==1&&ceiling!==2,source:'level-'+level.id};
  boxes.push(box);columns[x].push(box);
 }
 return {boxes,columns,length:128,width:3.6,start:{x:world.level.start.x/32,y:nativeY(world.level.start.y),z:0},sourceSHA256:level.sourceSHA256};
}
export function bearPresentation(a,time=0){
 const id=a.sprite&0x1fff,buried=a.type===10;
 let visibility=1,state=a.state===255?'defeat':'walk';
 if(buried&&id>=379&&id<=381){visibility=({379:.62,380:.36,381:.16})[id];state=a.state>=3?'retreat':'emerge';}
 return {x:a.x/32,y:nativeY(a.y),z:a.z||0,face:a.face,alive:a.state!==255,phase:(a.age||0)/NATIVE_HZ+(time*NATIVE_HZ%1)/NATIVE_HZ,hurt:a.hitFlash?.12:0,defeat:a.vrDefeat||0,visibility,state};
}
export const isBear=a=>a.type===9||(a.type===10&&(a.def.sprite&0x1fff)===381);
export class LevelOne {
 constructor(assets,{levelIndex=0}={}){this.assets=assets;this.levelIndex=levelIndex;this.reset();}
 reset({world=null}={}){
  const cheats={godMode:this.world?.godMode||false,secretHints:this.world?.secretHints||false};this.world=world||new World(this.assets);if(!world&&this.levelIndex)this.world.loadLevel(this.levelIndex);this.levelIndex=this.world.levelIndex;Object.assign(this.world,cheats);for(const o of [...this.world.items,...this.world.platforms])o.vrArea=this.areaAt(o.y);this.layout=levelOneLayout(this.world);this.area=this.areaAt(this.world.level.start.y);this.player={...this.layout.start,vy:0,grounded:true,health:3,invulnerable:0};this.checkpoint={...this.layout.start,area:this.area};
  this.time=0;this.clock=0;this.portalFade=0;this.events=[];this.complete=false;this.gameOver=false;this.rescue=0;this.rescueMoved=false;this.jumpHeld=false;this.interactHeld=false;this.gateWalkReady=true;this.gatesVisited=[];this.revision=0;this.score=this.world.score*10;this.bones=[];this.bear={alive:false};this.platformBoxes=[];this.lastInput={};this.nearGate=null;this.dropTimer=0;
 }
 areaAt(y){return areaForY(y,this.world.levelIndex);}
 toggleCheat(code){if(code==='IDDQD'){this.world.godMode=!this.world.godMode;if(this.world.godMode){this.world.health=this.player.health=3;this.player.invulnerable=0;}}else if(code==='IDKFA')this.world.secretHints=!this.world.secretHints;else return null;this.emit('cheat',{code,enabled:code==='IDDQD'?this.world.godMode:this.world.secretHints});return code==='IDDQD'?this.world.godMode:this.world.secretHints;}
 nearby(x){const out=[];for(let col=Math.max(0,Math.floor(x*2)-2);col<=Math.min(255,Math.floor(x*2)+2);col++)for(const b of this.layout.columns[col])if(b.area===this.area)out.push(b);return out.concat(this.platformBoxes);}
 support(x,z,above=Infinity){let y=-Infinity;for(const b of this.nearby(x))if(!(this.dropTimer>0&&b.dropThrough)&&(b.floor!==false||(b.hazard&&this.world.godMode))&&x>=b.minX&&x<=b.maxX&&z>=b.minZ&&z<=b.maxZ&&b.maxY<=above+.02)y=Math.max(y,b.maxY);return y;}
 emit(type,data={}){this.events.push({type,...data});}
 project(input={}){const p=this.player,n=this.world.player;n.x=Math.round((p.x+(input.headX||0))*32);n.y=Math.round(672-p.y*32);n.vy=Math.round(-p.vy*32/NATIVE_HZ*16);n.grounded=p.grounded;n.face=this.face||1;n.sprite=9;n.invulnerable=Math.ceil(p.invulnerable*NATIVE_HZ);}
 startRescue(reason){if(this.rescue)return;this.rescue=.9;this.rescueMoved=false;if(!this.world.godMode){if(this.world.lives===0)this.gameOver=true;else this.world.lives--;this.world.health=3;}this.emit('fall',{reason});}
 teleport(x,y,{headX=0,headZ=0}={}){this.portalFade=.18;this.gateWalkReady=false;this.area=this.areaAt(y);Object.assign(this.player,{x:x/32-headX,y:nativeY(y),z:-headZ,vy:0,grounded:false});this.platformBoxes=[];this.emit('passage',{x,y,area:this.area});}
 interact(input){
  const w=this.world,p=this.player,px=(p.x+(input.headX||0))*32,py=672-p.y*32;
  const candidates=w.gates.filter(g=>g.active&&this.areaAt((g.triggerTile>>8)*16)===this.area).map(g=>({g,x:(g.triggerTile&255)*16,y:(g.triggerTile>>8)*16}));
  const near=candidates.filter(g=>Math.abs(px-(g.x+8))<27&&Math.abs(py-g.y)<30&&Math.abs(p.z+(input.headZ||0))<1.25).sort((a,b)=>Math.hypot(px-a.x-8,py-a.y)-Math.hypot(px-b.x-8,py-b.y))[0];
  this.nearGate=near?.g.index??null;
  const depth=p.z+(input.headZ||0),toward=this.area==='caves'?1:-1,mx=input.x||0,mz=input.z||0,yaw=input.yaw||0,worldZ=-mx*Math.sin(yaw)+mz*Math.cos(yaw);
  if((Math.hypot(mx,mz)<.22&&Math.abs(depth)<.65)||depth*toward<-.3)this.gateWalkReady=true;
  const walking=near&&this.gateWalkReady&&depth*toward>.85&&worldZ*toward>.3;
  if(!input.interact){this.interactHeld=false;w.gateDownConsumed=false;if(!walking)return;}
  else {if(this.interactHeld)return;this.interactHeld=true;}
  if(!near)return;

  const old={x:w.player.x,y:w.player.y};w.player.x=near.x+1;w.player.y=near.y+1;w.player.downTimer=1;w.checkGates();
  if(w.gateDownConsumed){this.gatesVisited.push(near.g.index);this.teleport(w.player.x,w.player.y,input);}else Object.assign(w.player,old);
 }
 step(dt,input={}){
  this.time+=dt;this.dropTimer=Math.max(0,this.dropTimer-dt);this.portalFade=Math.max(0,this.portalFade-dt);this.lastInput=input;const p=this.player;p.invulnerable=Math.max(0,p.invulnerable-dt);
  if(this.complete||this.gameOver){if(input.interact&&!this.interactHeld&&!this.rescue){this.reset();return;}this.interactHeld=!!input.interact;if(!this.rescue)return;}
  if(this.rescue){this.rescue=Math.max(0,this.rescue-dt);if(this.rescue<.45&&!this.rescueMoved){this.area=this.checkpoint.area;Object.assign(p,this.checkpoint,{x:this.checkpoint.x-(input.headX||0),z:this.checkpoint.z-(input.headZ||0),vy:0,grounded:true,invulnerable:2});p.health=this.world.health;this.rescueMoved=true;this.emit('checkpoint-return');}this.jumpHeld=!!input.jump;return;}
  const dropping=input.interact&&!this.interactHeld&&this.nearGate===null&&p.grounded&&this.nearby(p.x+(input.headX||0)).some(b=>b.dropThrough&&Math.abs(b.maxY-p.y)<.05&&p.x>=b.minX&&p.x<=b.maxX);if(dropping){this.dropTimer=.3;p.grounded=false;p.y-=.05;this.emit('drop-through');}
  const ox=input.headX||0,oz=input.headZ||0,oldY=p.y,r=LEVEL_RULES.radius;
  let mx=input.x||0,mz=input.z||0,len=Math.hypot(mx,mz);if(len>1){mx/=len;mz/=len;}
  const yaw=input.yaw||0,dx=(mx*Math.cos(yaw)+mz*Math.sin(yaw))*LEVEL_RULES.speed*dt,dz=(-mx*Math.sin(yaw)+mz*Math.cos(yaw))*LEVEL_RULES.speed*dt;
  if(Math.abs(dx)>.00001)this.face=Math.sign(dx);
  const resolve=(axis,delta)=>{
   let x=p.x+ox+(axis==='x'?delta:0),z=p.z+oz+(axis==='z'?delta:0);x=clamp(x,r,128-r);z=clamp(z,-1.8+r,1.8-r);
   if(axis==='z'){p.z=z-oz;return;} // Source walls span the strip; never eject a stationary player sideways.
   // The recovered collision probes only the lowest 16px wall row. Stage 2's
   // narrow passages require this source foot band; ceiling hits stay separate.
   for(const b of this.nearby(x)){if(b.platform||!b.wall||p.y>=b.maxY-.001||p.y+(this.world.levelIndex===1?.5:LEVEL_RULES.height)<=b.minY+.01)continue;
    if(x+r>b.minX&&x-r<b.maxX&&z+r>b.minZ&&z-r<b.maxZ){if(p.grounded&&b.maxY-p.y<=LEVEL_RULES.step){p.y=b.maxY;continue;}if(axis==='x')x=x<(b.minX+b.maxX)/2?b.minX-r:b.maxX+r;else z=z<0?b.minZ-r:b.maxZ+r;}
   }p[axis]=axis==='x'?x-ox:z-oz;
  };resolve('x',dx);resolve('z',dz);
  if(input.jump&&!this.jumpHeld&&p.grounded){p.vy=LEVEL_RULES.jump;p.grounded=false;this.emit('jump');}this.jumpHeld=!!input.jump;
  p.vy-=LEVEL_RULES.gravity*dt;const next=p.y+p.vy*dt,floor=this.support(p.x+ox,p.z+oz,p.y+.04);
  if(p.vy<=0&&next<=floor&&p.y>=floor-.03){p.y=floor;p.vy=0;p.grounded=true;}else{p.y=next;p.grounded=false;}
  for(const b of this.nearby(p.x+ox))if(!b.platform&&(b.ceiling||(b.ceilingHazard&&!this.world.godMode))&&p.vy>0&&p.x+ox+r>b.minX&&p.x+ox-r<b.maxX&&p.z+oz+r>b.minZ&&p.z+oz-r<b.maxZ&&oldY+LEVEL_RULES.height<=b.minY&&p.y+LEVEL_RULES.height>=b.minY){this.emit('head-hit');if(b.ceilingHazard){this.startRescue('ceiling-hazard');return;}p.y=b.minY-LEVEL_RULES.height;p.vy=0;}
  if(p.y<(this.world.levelIndex===0?(this.area==='caves'?12.5:LEVEL_RULES.fallY):nativeY(this.world.level.height*16)-4)){this.startRescue('pit');return;}
  this.project(input);this.interact(input);
  this.clock+=dt;while(this.clock>=1/NATIVE_HZ){this.nativeTick(input);this.clock-=1/NATIVE_HZ;}
  const w=this.world;
  // Spatial contact is continuous (90Hz), source consequences remain native.
  for(const a of w.actors){if(!a.active||a.state===255||a.def.flags&16||(a.vrArea??this.areaAt(a.y))!==this.area)continue;
   const bounds=w.spriteBounds(a),top=nativeY(bounds.top),bottom=nativeY(bounds.bottom),near=Math.abs(p.x+ox-a.x/32)<Math.max(.36,bounds.width/64)&&Math.abs(p.z+oz-(a.z||0))<.58;
   if(!near)continue;
   if(p.vy<0&&oldY>=top-.1&&p.y<=top+.04){p.y=top+.01;p.vy=input.jump?9.6:2.95;p.grounded=false;this.emit('bounce');}
   else if(p.y<top-.08&&p.y+LEVEL_RULES.height>bottom+.08&&!p.invulnerable&&!w.godMode){a.def.flags&=~1;w.player.invulnerable=0;w.damage();p.invulnerable=44/NATIVE_HZ;p.vy=2.5;this.emit('hurt');if(w.deathTimer){w.deathTimer=0;this.startRescue('health');}}
  }
  const tile=w.tile((p.x+ox)*32,672-p.y*32+2);if(p.grounded&&!w.godMode&&w.level.tilePropertiesY[tile]===6)this.startRescue('hazard');
  this.collect(input);if(w.deathTimer){w.deathTimer=0;this.startRescue('health');}this.score=w.score*10;p.health=w.health;this.complete=w.transition?.type==='complete';if(this.complete)this.emit('complete');
  this.bear=this.bears()[0]||{alive:false};
 }
 nativeTick(input){
  const w=this.world,p=this.player;this.project(input);w.input={up:!!input.jump};w.frame=(w.frame+1)&65535;w.presentationTicks=(w.presentationTicks+3)&65535;
  w.camera.x=clamp(w.player.x-160,0,w.maxCameraX());w.camera.y=clamp(w.player.y-120,0,w.maxCameraY());
  for(const name of ['blockCooldown','collectionFlash','enemyPowerTimer','weaponPower'])if(w[name])w[name]--;
  for(const a of w.actors){a.hitFlash=false;if(a.state===255)a.vrDefeat=(a.vrDefeat||0)+1/NATIVE_HZ;}
  w.updateActors();w.spawnActors();for(const a of w.actors)a.vrArea??=this.areaAt(a.y);
  const riding=this.platformBoxes.find(b=>p.grounded&&Math.abs(p.y-b.maxY)<.07&&p.x>b.minX-.15&&p.x<b.maxX+.15&&Math.abs(p.z)<1.8);
  w.player.platformGrip=!!riding;w.player.platformId=riding?.index;w.updatePlatforms();
  if(riding){const q=w.platforms.find(q=>q.index===riding.index);if(q){p.x+=q.dx/32;p.y-=q.dy/32;}}
  this.platformBoxes=w.platforms.filter(q=>q.active&&q.vrArea===this.area).map(q=>{const b=w.spriteBounds(q),top=nativeY(b.top);return {minX:b.left/32,maxX:b.right/32,minY:top-.12,maxY:top,minZ:-1.8,maxZ:1.8,floor:true,platform:true,index:q.index};});
  for(const i of w.items)if(i.active&&!(w.frame&1)){i.bob=(i.bob||0)+1;if(i.bob>=4)i.bob=-i.bob+1;i.y+=i.bob;}
  w.updateEffects();this.tagEffects();w.events=[];w.updateTileAnimation();w.updatePalette();
  const q=Math.floor(w.score/25000);while(w.extraLifeQuotient<q){w.extraLifeQuotient++;w.lives=Math.min(99,w.lives+1);}
 }
 tagEffects(){for(const e of this.world.effects)e.vrArea??=this.area;}
 collect(input){
  const w=this.world,p=this.player;this.project(input);
  const candidates=[...w.items.filter(i=>i.active),...w.effects.filter(e=>e.nativeObject&&e.collectible&&e.ttl<=188&&e.ttl>0)];
  for(const i of candidates){if((i.vrArea??this.areaAt(i.baseY??i.y))!==this.area||Math.abs(p.z+(input.headZ||0)-(i.z||0))>.9)continue;const b=w.spriteBounds(i),x=(p.x+(input.headX||0))*32,y=672-p.y*32;
   if(x+8<b.left||x-8>b.right||y<b.top||y-34>b.bottom)continue;
   const checkpoint=w.checkpoint,wasCheckpoint=(i.sprite&0x1fff)===280,health=w.health,score=w.score;
   const exitKind=(i.sprite&0x1fff)===311?'bonus':(i.sprite&0x1fff)===279?'special':null;const picked=w.pickup(i);if(exitKind&&w.transition?.type==='complete')w.transition.kind=exitKind;this.tagEffects();if(picked){if(i.ttl)i.ttl=0;this.emit(health<w.health?'heart':'bone');}
   if(w.checkpoint!==checkpoint&&!wasCheckpoint){const floor=this.support(p.x+(input.headX||0),p.z+(input.headZ||0),p.y+.1);this.checkpoint={x:p.x+(input.headX||0),y:Number.isFinite(floor)?floor:p.y,z:0,area:this.area};this.emit('checkpoint');}
   if(w.health<health){p.invulnerable=44/NATIVE_HZ;this.emit('hurt');}
   if(score!==w.score)this.score=w.score*10;
  }
 }
 strike(sweep){
  if(!sweep||this.rescue||this.complete)return false;const w=this.world;
  const distance=p=>Math.min(segmentDistance(sweep.from,sweep.to,p),sweep.base?segmentDistance(sweep.base,sweep.to,p):Infinity);
  for(const a of w.actors){if(!a.active||a.state===255||a.def.flags&16||(a.vrArea??this.areaAt(a.y))!==this.area)continue;const b=w.spriteBounds(a);
   if(distance({x:a.x/32,y:nativeY((b.top+b.bottom)/2),z:a.z||0})>Math.max(.42,b.height/64))continue;
   const damage=[25,30,20,30][w.weapon]||25,hp=a.hp;a.hp=(hp-damage)&255;a.hitFlash=true;if(hp<damage)w.killActor(a,{damage,face:this.face||1});this.tagEffects();this.emit('hit',{x:a.x/32,y:nativeY(a.y)+.5,z:0});return true;
  }
  const block=w.blocks.filter(b=>b.active&&this.areaAt((b.pos>>8)*16)===this.area).find(b=>distance({x:((b.pos&255)*16+8)/32,y:nativeY((b.pos>>8)*16+8),z:0})<.55);
  if(block){const before=w.brokenBlocks;w.hitBlock(block,{face:this.face||1});this.tagEffects();if(before!==w.brokenBlocks){this.layout=levelOneLayout(w);this.revision++;}this.emit('hit',{x:sweep.to.x,y:sweep.to.y,z:sweep.to.z});return true;}return false;
 }
 bears(){return this.world.actors.filter(a=>a.active&&isBear(a)&&(a.vrArea??this.areaAt(a.y))===this.area).map(a=>bearPresentation(a,this.time));}
 snapshot(){return {player:{...this.player},checkpoint:{...this.checkpoint},area:this.area,score:this.score,lives:this.world.lives,complete:this.complete,gameOver:this.gameOver,cheats:{iddqd:this.world.godMode,idkfa:this.world.secretHints},rescue:this.rescue,bear:{...this.bear},bones:[],key:!!(this.world.inventory2&2),gatesVisited:[...this.gatesVisited],nearGate:this.nearGate,level:{index:this.world.levelIndex,id:this.world.level.id},source:{columns:256,items:this.world.items.length,secrets:this.world.blocks.length,platforms:this.world.platforms.length,enemies:this.world.definitions.length},native:this.world.snapshot()};}
}

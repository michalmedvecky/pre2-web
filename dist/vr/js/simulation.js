// New 3D rules for the Quest pilot. Native game rules remain in ../.. /js/engine.js.
import {AWARDS} from '../../js/compat.js';
export const RULES=Object.freeze({radius:.23,height:1.45,speed:2.6,gravity:14,jump:6.9,step:.16,clubDamage:25,bearHP:15,swingSpeed:1.35,swingTravel:.12,respawnSeconds:.9});
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function segmentDistance(a,b,p){const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,den=dx*dx+dy*dy+dz*dz,t=den?clamp(((p.x-a.x)*dx+(p.y-a.y)*dy+(p.z-a.z)*dz)/den,0,1):0;return Math.hypot(a.x+t*dx-p.x,a.y+t*dy-p.y,a.z+t*dz-p.z);}
export class SwingTracker {
 constructor(){this.reset();}
 reset(){this.previous=null;this.travel=0;this.spent=false;}
 sample(relative,world,time){
  const prev=this.previous;this.previous={relative:{...relative},world:{...world},time};
  if(!prev)return null;const dt=time-prev.time,d=Math.hypot(relative.x-prev.relative.x,relative.y-prev.relative.y,relative.z-prev.relative.z),speed=d/dt;
  if(dt<=0||dt>.1||speed>18){this.travel=0;this.spent=false;return null;}
  if(speed<.55){this.spent=false;this.travel=0;return null;}
  this.travel+=d;
  if(this.spent||speed<RULES.swingSpeed||this.travel<RULES.swingTravel)return null;
  return {from:prev.world,to:{...world},speed};
 }
 consume(){this.spent=true;}
}
/** Native first-level cross-section; Z depth and practice gap are authored additions. */
export function openingLayout(game,rawMap){
 const level=game.levels[0],map=rawMap.slice(),boxes=[],columns=64;
 for(const secret of level.secrets||[]){const pos=secret.raw[3]|secret.raw[4]<<8;if(secret.active&&pos<map.length)map[pos]=secret.raw[0];}
 for(let x=0;x<columns;x++)for(let row=28;row<level.height;row++){
  const id=map[row*256+x],c=level.tilePropertiesY[id];if(c<1||c>5)continue;
  // Pilot-only two-metre gap. Its location does not claim original level fidelity.
  if(x>=50&&x<54)continue;
  const top=(672-row*16)/32;
  boxes.push({minX:x*.5,maxX:(x+1)*.5,minY:top-.5,maxY:top,minZ:top>0?-1.1:-3.2,maxZ:top>0?1.1:3.2,tile:id,row,column:x,source:'level-1'});
 }
 return {boxes,length:columns*.5,width:6.4,gap:{from:25,to:27},start:{x:level.start.x/32,y:(672-level.start.y)/32,z:0},bearSource:level.enemies.find(e=>e.type===9&&!e.expert_flag),sourceSHA256:level.sourceSHA256};
}
export class Pilot {
 constructor(layout){this.layout=layout;this.time=0;this.events=[];this.reset();}
 reset(){this.time=0;this.player={...this.layout.start,vy:0,grounded:true,health:3,invulnerable:0};this.checkpoint={...this.layout.start};this.bear={x:12,y:0,z:0,hp:RULES.bearHP,alive:true,face:1,hurt:0,stoleHeart:false,phase:0,defeat:0};this.bones=[];this.bonesCollected=0;this.score=0;this.complete=false;this.rescue=0;this.rescueMoved=false;this.jumpHeld=false;this.events=[];}
 emit(type,extra={}){this.events.push({type,...extra});}
 support(x,z,above=Infinity){let y=-Infinity;for(const b of this.layout.boxes)if(x>=b.minX&&x<=b.maxX&&z>=b.minZ&&z<=b.maxZ&&b.maxY<=above+.02)y=Math.max(y,b.maxY);return y;}
 startRescue(reason){if(this.rescue)return;this.rescue=RULES.respawnSeconds;this.rescueMoved=false;this.player.health=Math.max(0,this.player.health-(reason==='pit'?1:0));this.emit('fall',{reason});}
 step(dt,input={}){
  this.time+=dt;const p=this.player;p.invulnerable=Math.max(0,p.invulnerable-dt);this.bear.hurt=Math.max(0,this.bear.hurt-dt);
  if(this.rescue){this.rescue=Math.max(0,this.rescue-dt);if(this.rescue<RULES.respawnSeconds*.5&&!this.rescueMoved){Object.assign(p,this.checkpoint,{x:this.checkpoint.x-(input.headX||0),z:this.checkpoint.z-(input.headZ||0),vy:0,grounded:true,invulnerable:2});if(p.health<=0)p.health=3;this.rescueMoved=true;this.emit('checkpoint-return');}this.jumpHeld=!!input.jump;return;}
  const ox=input.headX||0,oz=input.headZ||0,oldY=p.y;
  let mx=input.x||0,mz=input.z||0,len=Math.hypot(mx,mz);if(len>1){mx/=len;mz/=len;}
  const yaw=input.yaw||0,dx=(mx*Math.cos(yaw)+mz*Math.sin(yaw))*RULES.speed*dt,dz=(-mx*Math.sin(yaw)+mz*Math.cos(yaw))*RULES.speed*dt;
  const resolve=(axis,delta)=>{let x=p.x+ox,z=p.z+oz;x+=axis==='x'?delta:0;z+=axis==='z'?delta:0;
   x=clamp(x,RULES.radius,this.layout.length-RULES.radius);z=clamp(z,-4.5,4.5);
   for(const b of this.layout.boxes){if(p.y>=b.maxY-.001||p.y+RULES.height<=b.minY+.01)continue;
    if(x+RULES.radius>b.minX&&x-RULES.radius<b.maxX&&z+RULES.radius>b.minZ&&z-RULES.radius<b.maxZ){
     if(p.grounded&&b.maxY-p.y<=RULES.step){p.y=b.maxY;continue;}
     if(axis==='x')x=(x<(b.minX+b.maxX)*.5?b.minX-RULES.radius:b.maxX+RULES.radius);else z=(z<(b.minZ+b.maxZ)*.5?b.minZ-RULES.radius:b.maxZ+RULES.radius);
    }
   }p[axis]=axis==='x'?x-ox:z-oz;
  };
  resolve('x',dx);resolve('z',dz);
  if(input.jump&&!this.jumpHeld&&p.grounded){p.vy=RULES.jump;p.grounded=false;this.emit('jump');}this.jumpHeld=!!input.jump;
  p.vy-=RULES.gravity*dt;const next=p.y+p.vy*dt;
  const floor=this.support(p.x+ox,p.z+oz,p.y+.03);
  if(p.vy<=0&&next<=floor&&p.y>=floor-.02){p.y=floor;p.vy=0;p.grounded=true;}else{p.y=next;p.grounded=false;}
  for(const b of this.layout.boxes)if(p.vy>0&&p.x+ox+RULES.radius>b.minX&&p.x+ox-RULES.radius<b.maxX&&p.z+oz+RULES.radius>b.minZ&&p.z+oz-RULES.radius<b.maxZ&&oldY+RULES.height<=b.minY&&p.y+RULES.height>=b.minY){p.y=b.minY-RULES.height;p.vy=0;}
  if(p.y< -2.8){this.startRescue('pit');return;}
  if(p.x>20&&p.x<24&&p.grounded&&this.checkpoint.x<20){this.checkpoint={x:22,y:this.support(22,0),z:0};this.emit('checkpoint');}
  const b=this.bear;if(b.alive){b.phase+=dt;b.x+=b.face*.52*dt;if(b.x>14)b.face=-1;if(b.x<10)b.face=1;b.y=this.support(b.x,b.z,1);
   const near=Math.hypot(p.x+ox-b.x,p.z+oz-b.z)<.82;
   if(near&&p.vy<0&&oldY>=b.y+1.1&&p.y<=b.y+1.15){p.y=b.y+1.16;p.vy=input.jump?6.8:3;p.grounded=false;this.emit('bounce');}
   else if(near&&p.y<b.y+1.1&&p.y+RULES.height>b.y+.2&&p.invulnerable===0){p.health--;p.invulnerable=1.5;b.stoleHeart=true;this.emit('hurt');if(p.health<=0)this.startRescue('health');}
  }else b.defeat+=dt;
  for(const bone of this.bones)if(!bone.collected){bone.age+=dt;if(Math.hypot(p.x+ox-bone.x,p.z+oz-bone.z)<.6&&Math.abs(p.y-bone.y)<1.5){bone.collected=true;this.bonesCollected++;this.emit('bone');if(this.bonesCollected===6){p.health=Math.min(3,p.health+1);this.emit('heart');}}}
  if(p.x>30.8&&p.grounded&&!this.bear.alive&&!this.complete){this.complete=true;this.emit('complete');}
 }
 strike(sweep){const b=this.bear;if(!sweep||!b.alive||this.rescue||b.hurt>0)return false;
  const head={x:b.x,y:b.y+.78,z:b.z},body={x:b.x,y:b.y+.4,z:b.z};
  if(Math.min(segmentDistance(sweep.from,sweep.to,head),segmentDistance(sweep.from,sweep.to,body),sweep.base?segmentDistance(sweep.base,sweep.to,head):Infinity,sweep.base?segmentDistance(sweep.base,sweep.to,body):Infinity)>.68)return false;
  b.hp-=RULES.clubDamage;b.hurt=.4;this.emit('hit',{x:b.x,y:b.y+.8,z:b.z});
  if(b.hp<0){b.alive=false;b.defeat=0;this.score+=AWARDS[this.layout.bearSource?.score_candidate??3]*10;this.emit('defeat');
   if(b.stoleHeart)for(let n=0;n<6;n++){const a=n*Math.PI/3;this.bones.push({x:b.x+Math.cos(a)*.7,y:b.y+.25,z:b.z+Math.sin(a)*.7,age:0,collected:false});}
  }return true;
 }
 snapshot(){return {player:{...this.player},checkpoint:{...this.checkpoint},bear:{...this.bear},score:this.score,complete:this.complete,rescue:this.rescue,bones:this.bones.map(b=>({...b}))};}
}

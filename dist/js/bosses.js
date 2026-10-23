// Boss controllers translated from retained Ghidra assembly. No DOS code is executed.
import {u8,u16,s8,s16,sar4} from './compat.js';

export function initBosses(w){
  w.boss=null;w.specialBoss=null;w.finalBoss=null;w.bossParts=[];w.bossStatus=[];w.hazards=[];w.bossLevelFlags=w.level.scrollFlags||0;w.bossRocks=[];
  const rules=w.assets.rules?.bosses,record=rules?.levels?.find(l=>l.level===w.level.id)?.genericBoss;
  if(record)w.boss={...record,vx:0,vy:0,stateAge:0,active:true,lastHit:0,anger:0,scriptStart:rules.generic.scriptPointers.idle,script:rules.generic.scriptPointers.idle,parts:[],drawn:[]};
  if(w.levelIndex===5&&!(w.bossLevelFlags&0xfe))activateSpecialBoss(w);
  if(w.levelIndex===9){w.finalBoss={hp:24,pose:0,active:true,schedule:0xa4f5,repeat:0,script:0,hitCount:3,dead:false};w.camera.x=w.camera.y=0;w.weapon=3;}
}
export function activateSpecialBoss(w){w.bossLevelFlags&=1;w.specialBoss={hp:5,stage:0,active:true,hitTimer:0,bodyFrame:0,leftFrame:0,rightFrame:1,attackDelay:110,burst:8,parts:[]};}
export function energyHit(w,count=1){if(w.godMode)return;for(let n=0;n<count;n++){
    if(w.foodHealth)w.foodHealth=u8(w.foodHealth-1);else{w.foodHealth=5;if(w.health)w.health--;else w.loseLife();}
    w.spawnFragments(w.player.x,w.player.y-48,0x2046,(w.foodHealth&1)?-48:48,-128,1,{collectible:true});
  }}
function knockback(w,vx,vy,clearGlide=false){const p=w.player;p.invulnerable=44;p.attackActive=false;p.attackTimer=0;p.action=3;p.animationVariant=-1;p.vx=vx;p.vy=vy;p.speedShift=3;if(clearGlide)p.glideMode=0;w.playerWeapon=null;}
function meter(w,count){for(let i=0;i<Math.min(8,Math.max(0,count));i++)w.bossStatus.push({x:8+i*5,y:170,sprite:309,active:true});}
function foodBurst(w,x,y){for(const [vx,vy]of [[32,-160],[-32,-160],[16,-176],[-16,-176]])w.randomFood(x,y,vx,vy);}
function victory(w,x,y){for(const [dx,dy]of [[0,0],[32,32],[-32,32],[-64,-32]])foodBurst(w,x+dx,y+dy);w.spawnFragments(x-64,y-32,99,0,0,1,{collectible:true});w.emit('bossDefeated');}
function attacks(w,contact=true){return [...(contact?w.projectiles.filter(p=>p.contact&&p.ttl>0).slice(-1):[]),...w.projectiles.filter(p=>p.ranged&&p.ttl>0).slice(0,4)];}
function select(b,ptr){if(b.scriptStart!==ptr){b.scriptStart=ptr;b.script=ptr;}}
export function bossPose(w,b){
  const data=w.assets.rules?.bosses?.generic;if(!data)return;
  let ptr=b.script,v=w.byte(ptr),guard=0;while(s8(v)<0&&guard++<64){ptr=u16(ptr+s8(v));v=w.byte(ptr);}if(guard>=64)return;
  b.script=u16(ptr+1);b.pose=v&~64;const pose=data.poseTable[b.pose];if(!pose)return;
  const parts=[{x:b.x,y:b.y,sprite:pose.sprites[0],active:true}];
  for(let i=1;i<5;i++){const parent=i===1?0:1,attachment=data.attachments.find(a=>a.parentSprite===pose.sprites[parent]&&a.childSprite===pose.sprites[i]);parts.push({x:parts[parent].x+(b.mirror?-1:1)*(attachment?.x||0),y:parts[parent].y+(attachment?.y||0),sprite:pose.sprites[i],active:true});}
  if(v&64){parts[1].y+=2;for(let i=2;i<5;i++)parts[i].y++;}
  for(const p of parts)if(b.mirror)p.sprite^=0x8000;
  b.parts=parts;b.drawn=pose.drawOrder.map(i=>parts[i]);w.bossParts.push(...b.drawn.slice().reverse());
}
function genericContact(w,b){if(w.deathTimer||w.transition)return;for(const index of [4,3]){const p=b.parts[index];if(w.godMode||!p||!w.visibleActor(p)||!w.overlap(w.player,p))continue;
    b.anger=Math.max(0,b.anger-(4-b.speed));energyHit(w);knockback(w,w.player.x>=b.x?128:-128,-128,true);w.emit('sfx',{index:1});}
  const head=b.parts[2];if(head){const hit=w.collisionDetails(w.player,head);if(hit?.topContact){w.player.vy=w.input.up?-128:-64;if(w.input.up)w.emit('sfx',{index:3});}}
}
function genericHits(w,b){for(const shot of attacks(w)){
    const shield=b.parts[3],head=b.parts[2];if(shield&&[412,413].includes(shield.sprite&0x1fff)&&w.overlap(shot,shield,true)){shot.ttl=0;continue;}
    if(!head||!w.overlap(shot,head,true))continue;
    if(Math.abs(s16(w.frame-b.lastHit))<=22)return;
    if(shot.oravaStar)w.consumeAttack(shot);b.lastHit=w.frame;w.emit('sfx',{index:8});for(const p of b.parts)p.hitFlash=true;w.alternate=false;b.anger=Math.min(255,b.anger+1);b.hp=s16(b.hp-shot.damage);
    if(b.hp<0){b.state=6;b.vy=-128;return;}
    if(shot.damage>20){b.vx=b.x>=w.player.x?48:-48;b.vy=b.vy>0?-128:-64;b.state=5;}
    b.stateAge=0;shot.ttl=0;return;
  }}
function generic(w,b){
  if(b.drawn?.some(p=>w.visibleActor(p))&&b.state!==6)meter(w,b.hp>>3);
  const x=s16(b.x+sar4(b.vx));if(x>=0&&x>=b.minX&&x<=b.maxX)b.x=x;b.y=s16(b.y+sar4(b.vy));
  if(b.vy>=0&&w.floorClass(b.x,b.y)){b.y&=~15;if(b.vy)w.player.landingShake=7;b.vx=b.vy=0;}else if(b.vy<224)b.vy+=16;
  b.mirror=b.x<w.player.x;const dx=Math.abs(w.player.x-b.x),dy=Math.abs(w.player.y-b.y);if(dx>400||dy>250)return;
  const scripts=w.assets.rules.bosses.generic.scriptPointers,toward=w.player.x>b.x?1:-1;
  switch(b.state){
    case 0:if(dx<250){b.state=1;b.stateAge=0;}else{b.anger=0;select(b,scripts.idle);}break;
    case 1:
      if(dx>=250){b.state=0;break;}b.stateAge++;
      if(b.hp<60){b.state=2;break;}select(b,scripts.ready);
      if(b.stateAge>=110){b.state=2;b.stateAge=0;b.anger=Math.min(255,b.anger+1);}
      else if(w.player.attackActive&&!(w.frame&7))b.anger=Math.min(255,b.anger+1);
      else if(b.anger>=10){b.state=3;b.stateAge=0;}else if(b.anger>3){b.state=2;b.stateAge=0;}break;
    case 2:
      b.stateAge++;
      if(b.stateAge<44){genericContact(w,b);if(dx<75){b.state=3;b.stateAge=0;}else select(b,scripts.crouch);}
      else if(b.stateAge===44){genericContact(w,b);b.vy=-224;if(b.hp<40&&dx<80){b.state=4;b.stateAge=0;}select(b,scripts.rise);}
      else {
        if(b.vy>0)select(b,b.hp>=100?scripts.fallA:scripts.fallB);
        if(dx<=80){b.state=3;b.stateAge=0;b.anger=11;}
        else if(b.stateAge===88){select(b,scripts.rise);if(dx>b.speed*80){b.vy=-96;b.vx=toward*48;}else{const q=Math.floor(dx/14);b.vy=-16*q;b.vx=toward*8*q;}}
        else if(b.stateAge>88&&b.vy===0){b.anger=3;b.stateAge=0;b.state=1;}
      }break;
    case 3:{genericContact(w,b);b.stateAge++;const duration=Math.abs(b.hp-50)<=25?154:66;
      if(b.stateAge>duration){b.stateAge=0;b.state=2;}
      else if(b.vy<0)select(b,scripts.rise);else if(b.vy>0)select(b,scripts.fallC);
      else if(dx>=100){b.vy=-81;b.vx=toward*80;}
      else if(dx<=25)select(b,scripts.veryNear);
      else if(dx<=35){b.state=4;b.stateAge=0;}
      else{if(!b.anger){b.state=7;b.stateAge=0;}select(b,scripts.near);}break;}
    case 4:genericContact(w,b);if(++b.stateAge>66){b.state=3;b.stateAge=0;}else{select(b,scripts.attack);if(!b.vy)w.player.landingShake=4;}break;
    case 5:if(++b.stateAge>19){b.state=1;b.stateAge=0;}else select(b,scripts.hurt);break;
    case 6:select(b,scripts.dead);if(b.vy>=0){const p=b.drawn[0]||b;b.active=false;b.state=255;victory(w,p.x,p.y);b.parts=[];return;}break;
    case 7:if(++b.stateAge>44)b.state=1;else{select(b,scripts.rise);if(b.vy>0)select(b,scripts.fallA);else if(!b.vy){b.vy=-97;b.vx=-toward*48;}}break;
  }
  bossPose(w,b);genericHits(w,b);
}
function specialParts(w,m){
  const t=w.assets.rules.bosses.level6,entry=(rows,frame,address,length)=>{if(rows[frame])return rows[frame];m.unmappedPoseFrames??=[];if(!m.unmappedPoseFrames.includes(frame))m.unmappedPoseFrames.push(frame);return Array.from({length},(_,i)=>w.word(u16(address+u8(frame)*length*2+i*2)));};
  const body=entry(t.bodyFrames,m.bodyFrame,0xa4e1,3),left=entry(t.leftPartsFrames,m.leftFrame,0xa4b1,6),right=entry(t.rightPartsFrames,m.rightFrame,0xa481,6),part=(a,n=0)=>({x:a[n],y:a[n+1],sprite:a[n+2],active:a[n+2]!==65535&&(a[n+2]&0x1fff)<w.assets.game.sprites.length});
  const parts=[part(body),part(left,3),part(left),part(right,3),part(right)];if(m.stage)parts[0].active=false;if(m.stage>=2)parts[1].active=parts[2].active=false;m.parts=parts;w.bossParts.push(...parts.filter(p=>p.active).reverse());return parts;
}
function spawnRock(w){if(w.bossRocks.length>=5)return;const slot=[0,1,2,3,4].find(i=>!w.bossRocks.some(r=>r.slot===i));const value=w.rng.next(),offset=(value&4)?-(value&124):(value&124);w.bossRocks.push({slot,x:w.player.x+offset,y:w.player.y-150,sprite:435,vy:16*(1+(value&3)),wobble:0,acceleration:4,active:true});}
function rocks(w){for(const r of w.bossRocks){if(!r.active)continue;if(!w.godMode&&!w.deathTimer&&!w.transition&&w.overlap(w.player,r)){knockback(w,-128,-128);energyHit(w);r.active=false;continue;}
    r.y+=sar4(r.vy);r.wobble+=s8(r.acceleration);if(r.wobble>=32||r.wobble< -32)r.acceleration=-r.acceleration;const dx=sar4(r.wobble);r.sprite=435+(dx>0?1:dx<0?2:0);r.x+=dx;if(r.y>2008)r.active=false;
  }w.bossRocks=w.bossRocks.filter(r=>r.active);}
function special(w,m){meter(w,(2-m.stage)*2);rocks(w);const parts=specialParts(w,m),body=parts[0];w.bossParts.push(...w.bossRocks.slice().sort((a,b)=>(b.slot||0)-(a.slot||0)));if(!(w.frame&3))m.bodyFrame=(m.bodyFrame+1)%3;let advancing=false;
  if(m.hitTimer){if(m.hitTimer===1){m.leftFrame=2;m.rightFrame=u8(m.rightFrame-1);m.attackDelay=u8(m.attackDelay+5);}m.hitTimer--;}
  else if(!m.attackDelay){m.leftFrame=u8(m.leftFrame+1);if(m.leftFrame>2)m.leftFrame=0;m.rightFrame=u8(m.rightFrame+1);if(m.rightFrame>2)m.rightFrame=0;advancing=true;
    let delay=1;if(m.rightFrame!==1){delay=3;w.player.landingShake=4;w.player.x+=2;spawnRock(w);}m.attackDelay=delay;m.burst=u8(m.burst-1);
    if(!m.burst){m.burst=(w.rng.next()&15)*8;m.attackDelay=(w.rng.next()&15)*8+64;m.leftFrame=0;}
  }
  if(!w.deathTimer&&!w.transition){
    if(advancing){if(parts.slice(3).some(p=>p.active&&w.overlap(w.player,p))){if(w.player.y<=1979)w.player.vy=-160;else if(!w.godMode){knockback(w,-128,-160);energyHit(w,3);}}}
    else {const hit=w.collisionDetails(w.player,parts[4]);if(hit?.topContact)w.player.vy=w.input.up?-128:-64;}
    const target=parts[m.stage*2];for(const shot of attacks(w)){if(!target?.active||!w.overlap(shot,target,true))continue;if(shot.oravaStar)w.consumeAttack(shot);shot.ttl=0;target.hitFlash=true;if(m.stage)parts[m.stage*2-1].hitFlash=true;m.hitTimer=6;if(m.stage<2)m.leftFrame=m.rightFrame=3;m.hp--;
      if(!m.hp){m.stage++;m.hp=7;if(m.stage===3){m.active=false;w.bossRocks=[];w.bossParts=[];w.bossStatus=[];victory(w,body.x-200,body.y);}}break;
    }
    if(w.player.x>984&&!w.godMode){knockback(w,-160,-144);energyHit(w);}
  }
  if(m.attackDelay)m.attackDelay--;
}
function finalHazard(w,kind){const x=kind===458?200:(w.rng.next()&127)-16,y=kind===458?88:0,vx=kind===458?s16(-(w.rng.next()&15)*8):0;const before=w.effects.length;w.spawnFragments(x,y,kind,vx,0,1,{collectible:true});if(w.effects.length>before)w.effects.at(-1).ttl=kind===458?132:66;}
export function finalBossReward(w){for(const [vx,vy]of [[32,-160],[-32,-160],[16,-176],[-16,-176]])w.spawnFragments(185,30,0x2137,vx,vy,1,{collectible:true});w.emit('bossDefeated',{final:true});}
function final(w,f){meter(w,f.hp>>2);if(f.hp<=0){f.pose=2;return;}
  if(!f.repeat){let p=f.schedule;if(w.word(p)===65535)p=u16(p+w.signedWord(p+2));f.script=w.word(p);f.repeat=w.word(p+2)&255;f.schedule=p+4;}
  for(const shot of attacks(w,false)){if(u16(shot.x-185)>=50||u16(shot.y-30)>=50)continue;if(shot.oravaStar)w.consumeAttack(shot);f.hp--;f.script=0xa530;f.hitCount=(f.hitCount+1)&3;if(!f.hitCount)f.script=0xa53c;if(!f.hp)finalBossReward(w);break;}
  let p=f.script;for(let guard=0;guard<128;guard++){
    const c=w.byte(p);if(c===255||c===254){finalHazard(w,c===255?458:459);p++;continue;}if(c===253){w.emit('sfx',{index:2});p++;continue;}
    if(s8(c)<0){f.repeat=Math.max(0,f.repeat-1);f.script=u16(p+s8(c));p=f.script;continue;}
    f.pose=c;f.script=u16(f.script+1);return;
  }
}
export function updateBosses(w){w.bossParts=[];w.bossStatus=[];if(w.boss?.active)generic(w,w.boss);if(w.specialBoss?.active&&!(w.bossLevelFlags&0xfe))special(w,w.specialBoss);if(w.finalBoss?.active)final(w,w.finalBoss);}
export function snapshot(w){const b=w.boss,m=w.specialBoss,f=w.finalBoss;return [
  b?1:0,...(b?[b.x,b.y,b.vx,b.vy,b.hp,b.state,b.stateAge,b.script,b.scriptStart,b.lastHit,b.anger,+b.active]:[]),
  m?1:0,...(m?[m.hp,m.stage,m.bodyFrame,m.leftFrame,m.rightFrame,m.attackDelay,m.burst,m.hitTimer,+m.active]:[]),
  f?1:0,...(f?[f.hp,f.pose,f.schedule,f.script,f.repeat,f.hitCount]:[]),
  ...w.bossRocks.flatMap(r=>[r.slot||0,r.x,r.y,r.sprite,r.vy,r.wobble,r.acceleration])
];}

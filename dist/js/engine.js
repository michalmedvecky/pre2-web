import {u8,u16,s8,s16,sar4,clamp,Random,ACTIONS,JUMP,AWARDS,actionIndex,inputMask,fnv1a} from './compat.js';

const BONUS = [255,12,11,10,255,255,255,255,255,14];
const RESPAWN_ITEM_CLASSES = new Set([13,44,65,169,170,182,224]);
const NON_PICKUPS = new Set([0xe5,0x12c,0x132,0x134,0x136,0x118]);
const WEAPON = [{damage:25,cooldown:2,flags:0},{damage:30,cooldown:6,flags:0},{damage:20,cooldown:6,flags:1},{damage:30,cooldown:12,flags:3}];
export function slopeOffset(encoded,x){const b=u8(encoded);if(!(b&0x30))return s8(b);const k=Math.floor((x&15)/3);return s8((b&15)+((b&0x10)?k:-k));}
export function completionPercent(blocks,food,totalBlocks,totalFood){const d=u16(totalBlocks+totalFood);return d?Math.floor((u16(blocks+food)*100)/d):100;}
export function exitDestination(index,kind){
  if(kind==='special'){if(index===2)return 13;if(index===13)return 3;if(index===6)return 15;if(index===15)return 7;return index+1;}
  if(index<10)return BONUS[index]===255?index+1:BONUS[index];
  const back=BONUS.indexOf(index);return back>=0?back+1:index+1;
}

export class World {
  constructor(assets,{onEvent=()=>{},expert=false}={}){
    this.assets=assets;this.onEvent=onEvent;this.expert=expert;this.score=0;this.lives=2;this.health=3;this.extraLifeQuotient=0;
    this.presentationTicks=0;this.frame=0;this.inventory=0;this.inventory2=0;this.weapon=0;this.foodHealth=0;this.weaponPower=0;this.transition=null;this.events=[];this.recorded=[];this.loadLevel(0);
  }
  emit(type,data={}){const e={type,...data};this.events.push(e);this.onEvent(e);}
  word(p){return(this.mem[p&65535]||0)|((this.mem[(p+1)&65535]||0)<<8);}
  signedWord(p){return s16(this.word(p));}
  byte(p){return this.mem[p&65535]||0;}
  loadLevel(index,{restart=false}={}){
    index=clamp(index,0,this.assets.game.levels.length-1);const prior=restart?this.capturePersistence():null;
    this.levelIndex=index;this.level=this.assets.game.levels[index];this.map=this.assets.maps[this.level.id].slice();this.mem=new Uint8Array(65536);this.mem.set(this.assets.tables.subarray(0,65536));this.mem.set(this.assets.footers[this.level.id],0x7e5a);
    this.rng=new Random(5,0x22,0x86,0xe58d,this.word(0x28bd));this.frame=0;this.transition=null;this.transitionTimer=0;this.deathTimer=0;this.effects=[];this.projectiles=[];this.playerWeapon=null;this.actors=[];this.items=[];this.platforms=[];this.gates=this.level.gates;this.gateCameraFlag=0;this.spawnCursor=0;this.spawnSide=0;
    this.inventory=0;this.inventory2=0;this.foodHealth=0;this.health=3;this.power=0;this.weather=0;this.collectedFood=0;this.brokenBlocks=0;this.foodCounts=new Uint16Array(110);this.alternate=false;this.wind=0;this.sceneFlash=0;this.blockCooldown=0;
    this.definitions=this.level.enemies.filter(d=>!d.expert_flag||this.expert).map((d,index)=>({...d,index,active:false,destroyed:false,timer:d.unknown7||0,flags:d.unknown4||0,extra:Uint8Array.from((d.extra_hex||'').match(/../g)||[],x=>parseInt(x,16))}));
    this.items=this.level.items.filter(d=>d.active).map(d=>({...d,sprite:d.sprite,active:true,originalSprite:d.sprite,bob:s8(d.flags||0),baseY:d.y,permanent:false}));
    this.platforms=this.level.platforms.filter(d=>d.active).map(d=>this.makePlatform(d));
    const footer=this.assets.footers[this.level.id];this.blocks=this.level.secrets.filter(d=>d.active && (d.raw[3]!==255 || d.raw[4]!==255)).map(d=>({index:d.index,content:d.raw[0],replacement:d.raw[1],durability:d.raw[2],pos:d.raw[3]|d.raw[4]<<8,active:true,hitAt:-999}));
    this.totalBlocks=this.blocks.length;this.totalFood=this.items.filter(d=>{const c=(d.sprite&0x1fff)-0x35;return c>=75&&c<=166}).length;
    this.player={x:this.level.start.x,y:this.level.start.y,vx:0,vy:0,face:1,sprite:9,action:-1,animationVariant:-1,walkHistory:0,runTimer:0,glideMode:0,glideEnergy:0,formAngle:this.formAngle??this.byte(0x7b16),lastGroundY:this.level.start.y,landingShake:0,platformGrip:false,attackActive:false,attackAction:3,anim:0,jumpFrame:0,jumpLock:0,fallFrames:0,grounded:false,speedShift:0,invulnerable:0,attackTimer:0,attackCooldown:0,downTimer:0,powerTimer:0,look:false};
    this.checkpoint={x:this.player.x,y:this.player.y};this.camera={x:clamp((Math.floor(this.player.x/16)-10)*16,0,this.maxCameraX()),y:clamp(this.word(0x815a)*16,0,this.maxCameraY())};
    if(prior){this.restorePersistence(prior);Object.assign(this.player,this.checkpoint,{vx:0,vy:0,invulnerable:24});this.camera.y=clamp((Math.floor(this.player.y/16)-8)*16,0,this.maxCameraY());this.camera.x=clamp((Math.floor(this.player.x/16)-10)*16,0,this.maxCameraX());}
    this.initBosses();this.animatePlayer(0);this.emit('level',{index,id:this.level.id,restart});
  }
  maxCameraX(){return Math.max(0,Math.min(this.level.scrollLimit||236,236)*16);}
  maxCameraY(){return Math.max(0,this.level.height*16-176);}
  capturePersistence(){return {checkpoint:{...this.checkpoint},items:this.items.filter(i=>!i.active).map(i=>i.index),blocks:this.blocks.filter(b=>!b.active).map(b=>b.index),weapon:this.weapon};}
  restorePersistence(s){this.checkpoint=s.checkpoint;this.weapon=s.weapon;for(const i of this.items){const c=(i.originalSprite&0x1fff)-0x35;if(s.items.includes(i.index)&&!RESPAWN_ITEM_CLASSES.has(c))i.active=false;}for(const b of this.blocks)if(s.blocks.includes(b.index)){b.active=false;this.map[b.pos]=b.replacement;}}
  tile(x,y){const tx=Math.floor(x/16),ty=Math.floor(y/16);if(tx<0||tx>=256||ty<0||ty>=this.level.height)return 0;return this.map[(ty<<8)|tx];}
  tilePos(x,y){return((Math.floor(y/16)&255)<<8)|(Math.floor(x/16)&255);}
  prop(kind,tile){return this.level[kind][tile]||0;}
  surface(x,y){const tile=this.tile(x,y);return Math.floor(y/16)*16+slopeOffset(this.level.tileSlopes[tile]||0,x);}
  // A floor class is a callback, not a generic "nonzero map tile".
  floorClass(x,y){return this.prop('tilePropertiesY',this.tile(x,y));}
  solidSupport(x,y,down=false){const c=this.floorClass(x,y);return c>=1&&c<=5&&!(c===5&&down);}
  spriteBounds(a){const sp=this.assets.game.sprites[(a.sprite||0)&0x1fff]||this.assets.game.sprites[0];const flip=a.flip??(a.face<0||!!(a.sprite&0x8000));const ox=flip?sp.width-sp.originX:sp.originX;return {left:a.x-ox,right:a.x-ox+sp.width,top:a.y+sp.originY-sp.height,bottom:a.y+sp.originY,width:sp.width,height:sp.height};}
  overlap(a,b){if(Math.abs(a.x-b.x)>=64||Math.abs(a.y-b.y)>=70)return false;const A=this.spriteBounds(a),B=this.spriteBounds(b);const w=Math.min(A.width,B.width)>>1;return Math.max(A.top,B.top)<Math.min(A.bottom,B.bottom)&&Math.abs((A.left+A.width/2)-(B.left+B.width/2))<w;}
  setAnimation(a,p){if(a.animStart!==p){a.animStart=p;a.anim=p;}}
  nextAnimation(a,base=0){let ptr=a.anim||a.animStart;if(!ptr)return;let word=this.signedWord(ptr);let guard=0;while(word<0&&guard++<8){ptr=u16(ptr+word);word=this.signedWord(ptr);}if(guard>=8||word===0x7d01)return;a.sprite=(word&0x1fff)+base;a.marker=word&0xe000;a.anim=u16(ptr+2);}
  animatePlayer(action,variant=action){const p=this.player;const ptr=this.word(0x7cdb+variant*2);if(p.animationVariant!==variant){p.animationVariant=variant;p.animStart=0;this.setAnimation(p,ptr||this.word(0x7cdb));}p.action=action;this.nextAnimation(p);p.sprite=(p.sprite&0x1fff)|(p.face<0?0x8000:0);}
  // Original idle dispatcher 0x15eeb: secondary animations use DS:7cdb[16..19].
  idleAnimation(input){const p=this.player;if(Math.abs(p.vx)>=8)return Math.sign(p.vx)===p.face?18:0;
    if(p.vx!==0)return 0;
    const looking=input.look||(input.left&&input.right);
    if(p.walkHistory>=30&&!looking){p.walkHistory-=3;return 16;}
    if(looking)return 19;
    // IRQ0 0x119a3 advances DS:27ec once per four slow ticks; a game update uses three.
    const time=(this.presentationTicks>>>2)&511;
    for(let address=0x79dc;address<0x79e8;address+=4){if(time<this.word(address))return 0;if(time<this.word(address+2))return 17;}
    return 0;
  }
  attackDuration(action){const ptr=this.word(0x7cdb+action*2);for(let i=0;i<32;i++){const word=this.word(ptr+i*2);if(word&0x8000)break;if(word&0x4000)return i+1;}return 7;}
  // Original weapon overlay records: body frame, weapon sprite, signed X/Y offsets.
  // 0x16291..0x162ee subtracts offsets and mirrors X with the player's facing.
  updatePlayerWeapon(predict=false){this.playerWeapon=null;const p=this.player;if(this.deathTimer||this.transition)return;
    if((p.marker&0x4000)&&((WEAPON[this.weapon].flags&1)||p.fallFrames>0))return;
    const table=this.word(0x7b00+this.weapon*5),body=p.sprite&0x1fff;
    for(let n=0;n<64;n++){const ptr=table+n*8,frame=this.word(ptr);if(frame===0x55aa)return;if(frame!==body)continue;
      this.playerWeapon={sprite:this.word(ptr+2)|(p.face<0?0x8000:0),x:p.x+(predict?sar4(p.vx):0)-p.face*this.signedWord(ptr+4),y:p.y+(predict?sar4(p.vy):0)-this.signedWord(ptr+6),active:true};return;
    }
  }
  secondaryAnimationFor(sprite,type){let ptr=0xa86b,limit=Math.min(this.mem.length-2,this.assets.tables.length);for(;ptr<limit-4;ptr+=2){if(this.word(ptr)!==0x7d01||this.word(ptr+2)!==type)continue;let p=ptr+4;for(let count=0;count<250&&p<limit-2;count++,p+=2){const w=this.word(p);if(w===0x7d01)break;if((w&0x1fff)===sprite-0x138)return p;}}return 0;}
  // 0x164b8 clamps even without horizontal input; both keys preserve the current facing.
  accelerate(cap=80){const p=this.player,delta=(this.input.left||this.input.right)?(p.face*16)>>p.speedShift:0;p.vx=clamp(s16(p.vx+delta),-cap,cap);}
  friction(){const p=this.player;const a=12>>p.speedShift;p.vx=Math.sign(p.vx)*Math.max(0,Math.abs(p.vx)-a);}
  applyWind(){this.player.vx=Math.max(-96,s16(this.player.vx-(u16(this.wind)>>>3)));}
  gravity(){const p=this.player,slow=p.glideMode===1;p.vy=Math.min(s16(p.vy+(slow?4:16)),slow?24:192);}
  step(input={}){
    this.presentationTicks=u16(this.presentationTicks+3);this.events=[];this.input=input;this.recorded.push(inputMask(input));if(this.recorded.length>60000)this.recorded.shift();this.frame=u16(this.frame+1);
    if(this.transition){if(++this.transitionTimer>=this.transition.delay)this.emit('transitionReady',{transition:this.transition});return;}
    if(this.deathTimer){this.updateEffects();this.player.vy+=8;this.player.y+=sar4(this.player.vy);if(--this.deathTimer===0){if(this.lives>0){this.lives--;this.loadLevel(this.levelIndex,{restart:true});}else{this.transition={type:'gameover',delay:1};this.transitionTimer=0;}}return;}
    if(this.blockCooldown)this.blockCooldown--;if(this.sceneFlash)this.sceneFlash--;if(this.weaponPower)this.weaponPower--;
    // Original broad update order: actors, effects, player, interactions, world changes, presentation counter.
    this.checkBlocks();this.updateActors();this.spawnActors();this.updatePlatforms();this.updateEffects();this.updateProjectiles();this.stepPlayer(input);this.checkActorDamage();this.checkPickups();this.checkGates();this.updateBosses();this.updateCamera();
    if(this.levelIndex===14&&this.player.y>=this.level.height*16-8)this.finish('ending');else if(this.player.y>this.level.height*16+32||this.player.y< -320)this.loseLife();
    for(const i of this.items)if(i.active&&!(this.frame&1)){i.bob=(i.bob||0)+1;if(i.bob>=4)i.bob=-i.bob+1;i.y+=i.bob;}
    if(this.player.invulnerable)this.player.invulnerable--;if(this.power)this.power--;if(this.player.landingShake)this.player.landingShake--;
    const q=Math.floor((this.score>>>0)/25000);while(this.extraLifeQuotient<q){this.extraLifeQuotient++;this.lives=Math.min(99,this.lives+1);this.emit('sfx',{index:4});this.floatText('1UP',this.player.x,this.player.y-38,0xe3);}
  }
  stepPlayer(input){
    const p=this.player;p.attackFrame=false;this.input=input;const oldX=p.x,oldY=p.y;
    if(input.right&&!input.left)p.face=1;else if(input.left&&!input.right)p.face=-1;
    const hurt=p.invulnerable>=22;
    let action=p.attackCooldown?0:ACTIONS[actionIndex(input)];if(hurt)action=8;
    const alternate=this.alternate;
    if(alternate)p.glideMode&=1;
    if(alternate&&p.glideMode){this.steerGlider(input);}
    else {
      if(alternate&&p.vy>160)p.glideMode=1;
      if(!alternate&&p.attackActive&&!hurt){this.advanceAttack();}
      else if(!alternate&&[3,6,7].includes(action)&&!hurt){this.attack(action);this.advanceAttack();}
      else if(hurt&&!alternate){this.applyWind();this.friction();this.animatePlayer(8);}
      else if(action===1){
        if(alternate&&Math.abs(p.vx)>=64){p.runTimer=Math.min(255,p.runTimer+1);if(p.runTimer===23)this.playerDust();}
        p.walkHistory=Math.min(255,p.walkHistory+1);this.accelerate(80);this.applyWind();this.animatePlayer(1,alternate?33:1);
      }else if(action===2&&(alternate||p.jumpLock===0)){
        if(alternate&&p.runTimer>=24){p.glideMode=1;p.glideEnergy=24;p.y=s16(p.y-3);p.runTimer=0;}
        else {p.platformGrip=false;const i=p.jumpFrame;p.jumpFrame=u8(i+1);if(i<9)p.vy=s16(p.vy+(alternate?(JUMP[i]>>1):JUMP[i]));else this.gravity();if(u16(p.vx)>=48)this.friction();else this.accelerate(48);this.animatePlayer(2);}
        this.applyWind();this.applyWind();
      }else if(!alternate&&(action===4||action===5)){
        if(action===4){p.walkHistory=0;if(Math.abs(p.vx)>32)this.friction();else this.accelerate(32);}else this.friction();
        p.runTimer=0;p.downTimer=4;if(this.power<=48)this.power+=2;this.animatePlayer(action);
      }else if(alternate){p.runTimer=0;p.downTimer=4;if(this.power<=48)this.power+=2;this.animatePlayer(action,32+action);this.friction();}
      else {this.idlePlayer(input,action);}
    }
    // Original handlers animate before integrating signed velocities; unsupported terrain
    // then applies its own acceleration/gravity and may replace the falling sprite.
    const nextX=s16(p.x+sar4(p.vx)),limit=(this.level.scrollLimit+20)*16;
    if(nextX>=8&&nextX<4088&&nextX<limit)p.x=nextX;
    p.y=s16(p.y+sar4(p.vy));
    this.collidePlayer(oldX,oldY);
    if(this.deathTimer){this.playerWeapon=null;return;}
    if(!p.grounded){
      this.accelerate(80);this.gravity();
      if(alternate){p.sprite=(p.vy<0?45:46)|(p.face<0?0x8000:0);}
      else if(p.vy>0){p.jumpLock=6;if(!p.attackActive)p.sprite=(p.fallFrames<12?12:13)|(p.face<0?0x8000:0);}
      if(p.vy>0)p.fallFrames=u8(p.fallFrames+1);
    }else if(!p.landingBounce){p.jumpFrame=0;p.jumpLock=Math.max(0,p.jumpLock-1);p.fallFrames=0;p.lastGroundY=p.y;}
    p.landingBounce=false;
    if(alternate)this.updateFormSprite(input);else if(!p.attackFrame)this.playerWeapon=null;
    this.syncContactWeapon();
    p.look=!!input.look;
    for(const field of ['attackCooldown','downTimer','powerTimer'])if(p[field]>0)p[field]--;
  }
  idlePlayer(input,baseAction=0){const p=this.player;p.runTimer=0;this.applyWind();this.friction();
    // Releasing jump preserves the rising pose; the fall callback selects a new
    // frame only after vertical velocity becomes positive (0x15f03 / 0x165dd).
    if(p.vy!==0&&!p.platformGrip)return;
    const variant=this.idleAnimation(input);if(variant===0){p.animationVariant=-1;this.animatePlayer(0,baseAction);}else this.animatePlayer(0,variant);
  }
  steerGlider(input){const p=this.player;
    if(input.up){if(p.formAngle<6)p.formAngle++;else if(p.vy>16)p.glideMode|=2;
      if(p.glideEnergy){p.glideEnergy--;if(p.formAngle>=4)p.vy=-64;return;}
      if(!input.down)return;
    }
    if(input.down){p.formAngle=Math.max(0,p.formAngle-1);p.glideMode|=2;
      if(p.formAngle<=1){const speed=Math.abs(sar4(p.vx));if(p.glideEnergy<speed*5)p.glideEnergy=u8(p.glideEnergy+speed);}
    }else p.glideEnergy=Math.max(0,p.glideEnergy-1);
  }
  updateFormSprite(input){const p=this.player;
    if(p.glideMode){let sprite=Math.abs(p.vx)>64?48:Math.abs(p.vx)>32?49:50;if(p.formAngle<3)sprite=51-p.formAngle;p.sprite=sprite|(p.face<0?0x8000:0);}
    if(!input.up&&!input.down)p.formAngle+=Math.sign(3-p.formAngle);
    this.formAngle=p.formAngle;this.playerWeapon=null;
    for(let ptr=0x7b25;ptr<0x7b7b;ptr+=6){const body=this.word(ptr);if(body===0)return;if(body!==(p.sprite&0x1fff))continue;
      let sprite=this.word(ptr+2);if(sprite>=121)sprite=this.word(0x7b17+p.formAngle*2);if(p.runTimer>24&&sprite<121)sprite++;
      this.playerWeapon={sprite:sprite|(p.face<0?0x8000:0),x:p.x+p.face*s8(this.byte(ptr+4)),y:p.y+s8(this.byte(ptr+5)),active:true};return;
    }
  }
  playerDust(){const existing=this.effects.filter(e=>e.dust);if(existing.length>=5)this.effects.splice(this.effects.indexOf(existing[0]),1);this.effects.push({x:this.player.x,y:this.player.y,sprite:53,vy:-16,ttl:5,dust:true,active:true});}
  landPlatform(surface){const p=this.player;p.y=surface;p.vy=0;p.grounded=true;p.speedShift=0;p.platformGrip=true;}
  landPlayer(surface,speedShift=0){const p=this.player,vy=p.vy,fall=p.fallFrames;
    p.y=surface;p.grounded=true;p.speedShift=speedShift;p.glideMode=0;p.landingBounce=false;
    if(fall>4)this.playerDust();
    if(fall>4&&p.y-p.lastGroundY>=32&&vy>=80){
      p.lastGroundY=p.y;if(fall>=20&&vy>160)p.landingShake=8;
      if(fall>10){p.vy=(this.level.scrollFlags&1)?vy:-32;p.sprite=(p.sprite&0xe000)|12;p.fallFrames=0;p.landingBounce=true;return;}
    }
    p.vy=0;
  }
  collidePlayer(oldX,oldY){
    const p=this.player;const dx=p.x-oldX;const sideX=p.x+(dx>0?9:dx<0?-9:0);let hitSide=false;
    if(dx){const height=this.byte(0x718d+(p.sprite&0x1fff)*2)||36;for(let row=0;row<Math.ceil(height/16);row++){const y=(p.y&0xfff0)-16-row*16,c=this.prop('tilePropertiesX',this.tile(sideX,y));if(c===2){this.loseLife();return;}if(row===0&&c===1){hitSide=true;break;}}}
    if(hitSide){p.x=oldX;p.vx=0;}
    if(p.vy<=0){const top=(p.y&0xfff0)-32;const c=this.prop('tilePropertiesMisc',this.tile(p.x,top))&15;if(c===2){this.loseLife();return;}if(c===1&&p.vy!==0){p.y=(p.y&0xfff0)+16;p.vy=0;}this.hitTileBlocks(this.tilePos(p.x,top),false);}
    p.grounded=false;p.platformGrip=false;p.speedShift=0;
    const c=this.floorClass(p.x,p.y);if(c===6){this.loseLife();return;}
    if(c>=1&&c<=5&&p.vy>=0&&!(c===5&&p.downTimer)){
      const surface=this.surface(p.x,p.y);if(p.y>=surface-12&&oldY<=surface+16){this.landPlayer(surface,c>=2&&c<=4?c-1:0);}
    }
    if(!p.grounded&&p.vy>=0){const nextC=this.floorClass(p.x,p.y+16),nextSlope=this.level.tileSlopes[this.tile(p.x,p.y+16)];if(nextC>=1&&nextC<=5&&nextSlope&&!(nextC===5&&p.downTimer)){let sy=this.surface(p.x,p.y+16);if(sy<=p.y+5){this.landPlayer(sy);}}}
    for(const q of this.platforms){if(!q.active)continue;const bounds=this.spriteBounds(q);if(p.vy>=0&&p.x>bounds.left-3&&p.x<bounds.right+3&&oldY<=bounds.top+8&&p.y>=bounds.top){this.landPlatform(bounds.top);p.x+=q.dx||0;}}
  }
  attack(action=3){const p=this.player;p.attackAction=action===6||action===7?action:3;p.attackActive=true;p.attackTimer=this.attackDuration(p.attackAction);}
  advanceAttack(){const p=this.player,w=WEAPON[this.weapon];p.attackFrame=true;this.animatePlayer(p.attackAction);this.friction();p.walkHistory=Math.min(255,p.walkHistory+1);p.attackTimer=Math.max(0,p.attackTimer-1);p.attackActive=!(p.marker&0x4000);
    if(p.attackActive){this.updatePlayerWeapon(true);return;}
    p.attackTimer=0;p.attackCooldown=w.cooldown;this.emit('sfx',{index:this.weapon===0?5:this.weapon===1?0:10});
    if(!p.platformGrip)p.vy=s16(p.vy+(p.attackAction===6?0:p.attackAction===3?-32:-48));
    if(w.flags&1)this.throwWeapon();this.updatePlayerWeapon(true);
  }
  throwWeapon(){const p=this.player,w=WEAPON[this.weapon];if(this.projectiles.filter(a=>a.ranged&&a.ttl>0).length>=4)return;
    let ptr=this.word(0x7b00+this.weapon*5);for(let n=0;n<256&&this.word(ptr)!==0x55aa;n++)ptr+=2;if(this.word(ptr)!==0x55aa)return;
    const vx=p.face*this.signedWord(ptr+2),vy=this.signedWord(ptr+4),origin=this.playerWeapon||p;
    this.projectiles.push({x:origin.x+sar4(vx),y:origin.y+sar4(vy),sprite:this.word(ptr+6)|(p.face<0?0x8000:0),face:p.face,vx,vy,anim:ptr+6,animStart:ptr+6,mode:(w.flags>>>1)&3,ttl:1,damage:w.damage*(this.power?4:1),ranged:true});
  }
  consumeAttack(shot){shot.ttl=0;if(shot.contact&&this.player.vy!==0)this.player.vy=-80;}
  syncContactWeapon(){const a=this.playerWeapon;if(!a||this.alternate)return;const w=WEAPON[this.weapon];if(w.flags&1)return;
    this.projectiles.push({...a,face:this.player.face,vx:0,vy:0,ttl:1,damage:w.damage*(this.power?4:1),contact:true,hidden:true});
  }
  updateProjectiles(){for(const a of this.projectiles){
      if(a.contact){a.ttl=0;continue;}
      const bounds=this.spriteBounds(a);if(bounds.right<=this.camera.x||bounds.left>=this.camera.x+320||bounds.bottom<=this.camera.y||bounds.top>=this.camera.y+176){a.ttl=0;continue;}
      a.x=s16(a.x+sar4(a.vx));a.y=s16(a.y+sar4(a.vy));this.nextAnimation(a);a.sprite|=a.face<0?0x8000:0;
      a.vy=s16(a.vy+(a.mode===1?-16:32));
    }this.projectiles=this.projectiles.filter(a=>a.ttl>0);}
  damage(){const p=this.player;if(p.invulnerable||this.deathTimer||this.transition)return;this.emit('sfx',{index:1});
    p.invulnerable=44;p.attackActive=false;p.attackTimer=0;p.vx=s16(-4*p.vx);p.vy=-128;p.glideMode=0;p.jumpFrame=9;p.animationVariant=-1;
    this.playerWeapon=null;this.projectiles=this.projectiles.filter(a=>!a.contact);
    if(this.alternate){this.alternate=false;return;}
    if(this.health>0)this.health--;else this.loseLife();
  }
  loseLife(){if(this.deathTimer||this.transition)return;this.deathTimer=38;this.playerWeapon=null;this.player.sprite=33;this.player.vy=-160;this.emit('sfx',{index:7});this.emit('lifeLost');}
  scoreAward(index,x=this.player.x,y=this.player.y){index=clamp(index,0,16);this.score=(this.score+AWARDS[index])>>>0;this.effects.push({x,y:y-10,sprite:0x4a+index,vy:-8,ttl:44,active:true});}
  floatText(text,x,y,sprite){this.effects.push({x,y,text,sprite:sprite??0xffff,vy:-8,ttl:44,active:true});}
  updateEffects(){for(const e of this.effects){if(e.dust)e.sprite++;e.ttl--;e.y+=(e.vy||0)>>4;if(e.physics){e.x+=(e.vx||0)>>4;e.vy=Math.min(256,(e.vy||0)+9);if(this.solidSupport(e.x,e.y)&&e.vy>0){e.vy=-(e.vy>>1);e.y&=~15;}}}this.effects=this.effects.filter(e=>e.ttl>0);}
  checkPickups(){for(const i of this.items){if(!i.active)continue;const sp=i.sprite&0x1fff;if(sp===0x116||NON_PICKUPS.has(sp))continue;if(!this.overlap(this.player,i))continue;this.pickup(i);}}
  pickup(i){const sprite=i.sprite&0x1fff;const c=sprite-0x35;if(sprite===0x1ca||sprite===0x1cb){i.active=false;this.damage();return;}
    if(c===258){i.active=false;this.complete('bonus');return;}if(c===226){i.active=false;this.complete('special');return;}
    if(c===228){this.checkpoint={x:this.player.x,y:this.player.y};for(const j of this.items)if((j.sprite&0x1fff)===0x118)j.sprite=(j.sprite&0xe000)|0x119;i.sprite=(i.sprite&0xe000)|0x118;this.emit('sfx',{index:4});this.floatText('CHECKPOINT',i.x,i.y-20);return;}
    const weaponMap={13:0,182:1,44:2,224:3};
    if(c in weaponMap){this.weapon=weaponMap[c];this.emit('weapon',{weapon:this.weapon});}
    else if(c>=0&&c<=20){this.foodHealth=u8(this.foodHealth+1);if(this.foodHealth>=6&&this.health<3){this.health++;this.foodHealth=0;this.floatText('ENERGY',i.x,i.y-20,0xe2);}}
    else if(c>=39&&c<=43){this.inventory|=1<<(c-39);if(this.inventory===31){this.power=160;this.player.powerTimer=160;this.floatText('BONUS!',i.x,i.y-24,0xe0);}}
    else if(c>=45&&c<=50){this.inventory2|=1<<(c-45);if(c===46)this.unlockExits();}
    else if(c>=65&&c<=74){if(!this.alternate){this.alternate=true;this.player.action=-1;this.player.animationVariant=-1;}this.floatText('GO!',i.x,i.y-18);}
    else if(c>=75&&c<=166){const index=c-57;this.foodCounts[index]=u16(this.foodCounts[index]+1);this.collectedFood++;this.scoreAward(this.byte(0xa371+index),i.x,i.y);}
    else if(c===173)this.health=Math.min(3,this.health+1);
    else if(c===174)this.lives=Math.min(99,this.lives+1);
    else if(c===167||c===168){this.player.invulnerable=44;this.player.powerTimer=44;}
    else if(c===169){for(const a of this.actors)if(a.active&&!(a.def.flags&0x10)&&this.onScreen(a))this.killActor(a);}
    else if(c===170){for(const a of this.actors)if(a.active&&!(a.def.flags&0x10)&&this.onScreen(a)){a.sprite=0x91;a.hp=0;}}
    else if(c===180||c===181)this.sceneFlash=8;
    else if(c===145)this.player.powerTimer=44;
    i.active=false;this.emit('sfx',{index:c===174?4:8});
  }
  unlockExits(){for(const i of this.items)if((i.sprite&0x1fff)===0x116)i.sprite=(i.sprite&0xe000)|0x117;this.floatText('EXIT OPEN',this.player.x,this.player.y-42);this.emit('exitOpen');}
  onScreen(a){return a.x>this.camera.x-32&&a.x<this.camera.x+352&&a.y>this.camera.y-32&&a.y<this.camera.y+208;}
  // Native spawn dispatch 0x17fa1..0x18253: activation is specific to each family.
  enemyDelay(d){d.timer=Math.min(255,d.timer+1);return (d.timer>>2)>=(d.pause_candidate||0);}
  enemyOnCamera(x,y){const dx=(x>>4)-(this.camera.x>>4),dy=(y>>4)-(this.camera.y>>4);return dx>=-2&&dx<=22&&dy>=-2&&dy<=13;}
  inEnemyRegion(d){const x=(this.player.x>>4)-(d.x_raw&255),y=(this.player.y>>4)-(d.x_raw>>8);return x>=0&&x<=(d.y_raw&255)&&y>=0&&y<=(d.y_raw>>8);}
  advanceEnemySegment(a){for(let n=0;n<512;n++,a.anim=u16(a.anim+2))if(this.signedWord(a.anim)<0){a.anim=u16(a.anim+2);return;}}
  rewindEnemySegment(a){for(let n=0;n<512;n++){a.anim=u16(a.anim-2);if(this.signedWord(a.anim)<0)return;}}
  spawnActors(){for(const d of this.definitions){if(d.active||d.destroyed)continue;
      let x=d.x,y=d.y,vx=0;
      if(d.type===9)d.extra[4]=0;
      if(d.type===0||d.type===10){
        if(d.type===10&&this.levelIndex===5&&(this.player.landingShake||this.specialBoss?.stage===3))continue;
        if(d.type===10&&!this.enemyDelay(d))continue;
        if(!this.inEnemyRegion(d))continue;
        if(d.type===0){x=this.player.x+(this.spawnSide++%2?192:-192);y=this.player.y-176;}
        else {
          if(this.actors.filter(a=>a.active).length>=12)break;
          this.spawnCursor=(this.spawnCursor+2)&15;x=this.player.x+this.signedWord(0xa33f+this.spawnCursor);
          let row=(this.player.y>>4)+4,found=false;
          for(let n=0;n<10&&row>=3;n++,row--){if(row>=this.level.height)continue;const yy=row*16;if(this.floorClass(x,yy)&&!this.floorClass(x,yy-16)&&!this.floorClass(x,yy-32)){y=yy;found=true;break;}}
          if(!found)continue;vx=x>this.player.x?-1:0;
        }
      }else if(d.type===12){const dx=Math.abs(x-this.player.x),dy=this.player.y-y;if(dy<=0||dx>=640||(dx<320&&(dy<=180||dy>=360))||!this.enemyDelay(d))continue;}
      else {if(d.type===11&&!this.enemyDelay(d))continue;if(!this.enemyOnCamera(x,y))continue;}
      if(this.actors.filter(a=>a.active).length>=12)break;
      const flags=[0x07,0x17,0x05,0x37,0x05,0x05,0x05,0x05,0x05,0,0x17,0x37,0x8f];
      d.flags=d.type===9?(d.flags|5|(this.levelIndex===6?128:0)):flags[d.type];
      const a={x,y,sprite:d.sprite,face:this.player.x<x?-1:1,vx,vy:0,state:0,age:0,hp:d.hitpoint_candidate??1,def:d,active:true,type:d.type,animStart:0,anim:0,ttl:0};
      a.animStart=this.secondaryAnimationFor(d.sprite&0x1fff,d.type);a.anim=a.animStart;
      if(d.type===4){d.extra[2]=0;d.extra[3]=0;}
      if(d.type===11)a.y-=this.rng.next()&63;
      if(d.type===12)d.timer=0;
      d.active=true;d.actor=a;this.actors.push(a);
    }}
  defByte(d,p){if(p===13)return d.extra[0]||0;return d.extra[p-13]||0;}
  defWord(d,p){return this.defByte(d,p)|(this.defByte(d,p+1)<<8);}
  updateActors(){for(const a of this.actors){if(!a.active)continue;const d=a.def,e=d.extra,b=n=>this.defByte(d,n),w=n=>this.defWord(d,n);a.age++;const dx=this.player.x-a.x,dy=this.player.y-a.y,dir=dx>=0?1:-1;
      if(a.state!==255&&!(a.marker&0x2000)){
        const outside=a.type===9?(Math.abs(dy)>=190||this.player.x<w(13)-480||this.player.x>=w(15)+480):(Math.abs(dx)>=320||Math.abs(dy)>=300);
        if(outside){const timer=d.timer;this.removeActor(a,a.state>=10&&!(d.flags&2));if(a.type===9)d.timer=timer;continue;}
      }
      const previous={x:a.x,y:a.y};if(a.vx!==-1)a.x+=sar4(a.vx);a.y+=sar4(a.vy);
      if(d.flags&8)this.actorPhysics(a,previous);if(a.anim)this.nextAnimation(a,0x138);
      const nearX=r=>Math.abs(this.player.x-d.x)<=r*16,nearY=r=>Math.abs(this.player.y-d.y)<=r*16;
      switch(a.type){
        case 0: if(a.age>4&&a.state===0){d.flags|=8;a.state=1;}if(a.state===1&&a.grounded){a.vx=dir*32;a.state=2;}break;
        case 1:break;
        case 2: if(!a.state){a.vy=s8(b(14))*16;if(Math.abs(a.y-d.y)>s8(b(13))){a.vy=-a.vy;a.state=1;}}else if(a.y<=d.y){a.state=0;a.vy=Math.abs(a.vy);}break;
        case 3:if(!a.state&&nearX(b(13))){a.vy=32;a.state=1;}if(a.state===1&&this.solidSupport(a.x,a.y)){a.y&=~15;a.vy=0;a.vx=dir*48;a.state=2;}break;
        case 4:{if(a.state===0){if(a.age>=4){a.y+=2;if(a.y>=d.y+Math.max(2,b(14)))a.state=1;}}else{a.phase=u8((a.phase||0)+4);const amp=b(13);a.x=d.x+((s8(this.byte(0x6f8c+a.phase))*amp)>>7);a.y=d.y+((s8(this.byte(0x708c+a.phase))*amp)>>7);}break;}
        case 5:if(!a.state&&nearX(b(13))&&nearY(b(14))){a.vx=dir*b(15)*16;a.vy=(dy>=0?1:-1)*b(15)*16;a.state=10;}if(a.state===10&&Math.abs(dy)<=8){a.vy=0;a.state=11;}break;
        case 6:if(nearX(b(13)||12)){if(!(a.age&7)){const r=this.rng.word();a.vx=dir*(8+(r&31));a.vy=(dy+50>=0?1:-1)*(8+((r>>5)&31));if(this.player.attackTimer&&dx*dx+dy*dy<10000){a.vx=-dir*64;a.vy=-64;}}}break;
        case 7:if(!a.state&&nearX(b(13))){const s=s8(b(14))*16;a.vx=dir*Math.abs(s);a.vy=s;a.state=10;}break;
        case 8:{
          if(!a.vx)a.vx=dir;
          const jump=()=>{a.vy=-s8(b(14))*16;a.vx=dir*s8(b(15))*16;a.state=10;d.flags=(d.flags&0xd3)|0x2c;this.advanceEnemySegment(a);};
          if(a.state===0||a.state===12){if(this.enemyDelay(d)&&(Math.abs(dx)>>4)<=b(13)&&(Math.abs(dy)>>4)<=b(16))jump();}
          else if(a.state===10&&a.vy>=0){a.state=11;this.advanceEnemySegment(a);}
          else if(a.state===11&&a.vy<=0){a.state=12;this.rewindEnemySegment(a);this.rewindEnemySegment(a);a.vx=0;d.timer=0;}break;}
        // 0x1796e patrol acceleration is already in sixteenths of a pixel.
        case 9:{a.vx=s8(e[4]);const next=a.vx+(a.state===0?3:-3),cap=b(18);if(next<=cap&&next>=-cap)e[4]=u8(next);if(a.state===0&&a.x>w(15))a.state=1;else if(a.state===1&&a.x<=w(13))a.state=0;break;}
        // 0x17896 advances buried/emerging/running/retreating animation segments.
        case 10:
          if(a.state===0){d.flags|=0x18;if(a.vy===0)a.state=1;}
          else if(a.state===1){if(a.vy!==0)a.state=0;else{d.timer=30;a.state=2;this.advanceEnemySegment(a);}}
          else if(a.state===2){
            if(Math.abs(a.vx)<16&&a.marker){d.flags=0x0f;a.vx=b(13)*(a.x>=this.player.x?-1:1);}
            if(!(this.frame&3)&&--d.timer===0){a.state=3;a.vy=0;a.vx=a.vx<0?-1:0;d.flags=0x36;this.advanceEnemySegment(a);}
          }else if(a.state===3&&a.marker)this.removeActor(a,!(d.flags&2));break;
        case 11:if(a.age===8){a.vx=dir*Math.abs(s8(b(13)))*16;a.vy=-Math.abs(s8(b(14)))*16;}if(a.age>=8)a.vy=Math.min(Math.abs(s8(b(15)))*16||192,a.vy+8);break;
        case 12:if(a.age===1)a.vx=dir*Math.abs(s8(b(13)))*16;a.vy=Math.min(240,a.vy+15);if(a.age>154)this.removeActor(a,!(d.flags&2));break;
      }
      if(a.vx)a.face=a.vx<0?-1:1;
      for(const shot of this.projectiles){if(shot.ttl<=0||a.invulnerable||d.flags&0x10)continue;if(this.overlap(shot,a)){this.consumeAttack(shot);const hp=a.hp;a.hp=u8(a.hp-shot.damage);if(hp<shot.damage)this.killActor(a);else{a.invulnerable=5;a.x-=sar4(a.vx<<2);}this.emit('sfx',{index:2});break;}}
      if(a.invulnerable)a.invulnerable--;
    }this.actors=this.actors.filter(a=>a.active);}
  actorPhysics(a,previous){if(a.vx){const side=this.prop('tilePropertiesX',this.tile(a.x+(a.vx>0?8:-8),a.y-8));if(side===1){a.x=previous.x;a.vx=-a.vx;}}
    a.grounded=false;if(a.vy>=0&&this.solidSupport(a.x,a.y)){a.y=this.surface(a.x,a.y);a.grounded=true;if(a.def.flags&32)a.vy=0;else{a.vy=-(a.vy>>1);if(Math.abs(a.vy)<33)a.vy=0;}}else a.vy=Math.min(256,a.vy+16);}
  removeActor(a,destroy){a.active=false;a.def.active=false;a.def.flags&=~4;a.def.timer=0;if(destroy)a.def.destroyed=true;}
  killActor(a){this.removeActor(a,!(a.def.flags&2));this.scoreAward(clamp(a.def.score_candidate||0,0,16),a.x,a.y);for(let i=0;i<3;i++)this.effects.push({x:a.x,y:a.y,sprite:0x35+(this.rng.next()%20),vx:(this.rng.next()%65)-32,vy:-80-(this.rng.next()&63),ttl:40,physics:true,active:true});}
  checkActorDamage(){if(this.player.invulnerable)return;for(const a of this.actors){if(!a.active||a.def.flags&0x10)continue;if(this.overlap(this.player,a)){this.damage();break;}}}
  makePlatform(d){const raw=d.raw;const word=p=>raw[p]|raw[p+1]<<8;return {...d,x:d.x,y:d.y,sprite:d.sprite,originX:d.x,originY:d.y,active:true,raw,dx:0,phase:0,mode:raw[14]||0,animation:word(8),min:word(6),max:word(10),speed:s8(raw[12])||1};}
  updatePlatforms(){for(const p of this.platforms){if(!p.active)continue;const old=p.x;p.phase=u8(p.phase+1);const raw=p.raw;const min=p.min,max=p.max;
      if(min<4096&&max<4096&&max>min){p.dir??=1;if(p.x>=max)p.dir=-1;if(p.x<=min)p.dir=1;p.x+=p.dir*Math.max(1,Math.abs(p.speed));}
      else{const sy=s8(raw[13]||0);if(sy)p.y=p.originY+((s8(this.byte(0x6f8c+p.phase))*Math.abs(sy))>>3);}
      p.dx=p.x-old;}
  }
  checkBlocks(){if(!this.projectiles.some(s=>s.ttl>0))return;for(const shot of this.projectiles){if(shot.ttl<=0)continue;const tx=shot.x>>4,sy=shot.y-16;for(const b of this.blocks){if(!b.active)continue;const bx=b.pos&255,by=(b.pos>>8)*16;if(Math.abs(bx-tx)<=1&&Math.abs(by-sy)<20){this.hitBlock(b);this.consumeAttack(shot);break;}}}}
  hitTileBlocks(pos,fromAttack){const b=this.blocks.find(b=>b.active&&b.pos===pos);if(b&&fromAttack)this.hitBlock(b);}
  hitBlock(b){if(this.blockCooldown||!b.active)return;this.blockCooldown=6;this.emit('sfx',{index:2});b.hitAt=this.frame;const durability=b.durability&63;if(durability){b.durability=(b.durability&0xc0)|(durability-1);return;}this.breakBlock(b);}
  breakBlock(b){if(!b.active)return;b.active=false;this.brokenBlocks++;this.map[b.pos]=b.replacement;const x=(b.pos&255)*16+8,y=(b.pos>>8)*16;
    for(let j=0;j<4;j++)this.effects.push({x,y:y+8,sprite:0x35+(j%4),vx:(j-2)*20,vy:-80-j*12,ttl:28,physics:true,active:true});
    const content=b.content;if(content!==255){let sprite=content>=0x35?content:content+0x35;sprite&=0x1fff;if(sprite<this.assets.game.sprites.length)this.items.push({index:1000+b.index,x,y,sprite:sprite|0x2000,originalSprite:sprite|0x2000,active:true,bob:0,baseY:y});}
  }
  // 0x1550e: twenty seven-byte gate records at DS:8363; DS:6bdd buffers Down.
  checkGates(){if(!this.player.downTimer||this.alternate)return;const pos=this.tilePos(this.player.x,this.player.y);for(const g of this.gates){if(!g.active||g.triggerTile!==pos)continue;
      const dest=g.destinationTile,camera=g.cameraTile;this.player.x=(dest&255)*16;this.player.y=(dest>>8)*16;this.player.vx=this.player.vy=0;
      this.camera.x=(camera&255)*16;this.camera.y=(camera>>8)*16;this.gateCameraFlag=g.cameraFlag;this.player.downTimer=0;
      this.emit('sfx',{index:3});this.sceneFlash=4;if(this.levelIndex===5)this.activateSpecialBoss();break;
    }}
  initBosses(){
    this.boss=null;this.specialBoss=null;this.finalBoss=null;this.bossParts=[];this.hazards=[];
    const rules=this.assets.rules?.bosses;const record=rules?.levels?.find(l=>l.level===this.level.id)?.genericBoss;
    if(record)this.boss={...record,vx:0,vy:0,age:0,stateAge:0,active:true,lastHit:-99,face:-1,pose:0,script:rules.generic.scriptPointers.idle};
    if(this.levelIndex===9){this.finalBoss={hp:24,pose:0,active:true,schedule:0xa4f5,repeat:0,script:0,hitCount:3,dead:false};this.camera.x=0;this.camera.y=0;this.weapon=3;}
  }
  activateSpecialBoss(){if(!this.specialBoss)this.specialBoss={hp:5,stage:0,hitAt:-99,active:true,age:0};}
  bossReward(x,y){this.items.push({index:3000+this.frame,x,y,sprite:0x2063,originalSprite:0x2063,active:true,bob:0});this.emit('sfx',{index:4});}
  bossPose(b){const data=this.assets.rules?.bosses?.generic;if(!data)return;let ptr=b.script||data.scriptPointers.idle;let v=this.byte(ptr),g=0;while(s8(v)<0&&g++<8){ptr=u16(ptr+s8(v));v=this.byte(ptr);}b.script=u16(ptr+1);b.pose=v&63;
    const pose=data.poseTable[b.pose%data.poseTable.length];if(!pose)return;const parts=[];for(let i=0;i<5;i++){let x=b.x,y=b.y;const sprite=pose.sprites[i];if(i){const parent=i===1?pose.sprites[0]:pose.sprites[1];const anchor=i===1?parts[0]:parts[1];const attachment=data.attachments.find(t=>t.parentSprite===parent&&t.childSprite===sprite);x=anchor.x+(b.face<0?-(attachment?.x||0):(attachment?.x||0));y=anchor.y+(attachment?.y||0)+((v&64)?i===1?2:1:0);}
      parts.push({x,y,sprite:sprite^(b.face<0?0x8000:0),active:true});}
    this.bossParts.push(...pose.drawOrder.map(i=>parts[i]));b.parts=parts;
  }
  updateBosses(){
    this.bossParts=[];const b=this.boss,data=this.assets.rules?.bosses?.generic;
    if(b?.active&&data){const dx=this.player.x-b.x,dy=this.player.y-b.y;const dir=dx>=0?1:-1;b.face=dir;b.age++;b.stateAge++;
      if(b.state===0&&Math.abs(dx)<250&&Math.abs(dy)<250){b.state=1;b.stateAge=0;b.script=data.scriptPointers.ready;}
      if(b.state>0&&b.state!==6){
        if(b.state===1&&b.stateAge>36){b.state=2;b.stateAge=0;b.script=data.scriptPointers.rise;const distance=Math.abs(dx);b.vx=dir*clamp(Math.floor(distance/14)*8,32,80);b.vy=-clamp(Math.floor(distance/14)*16,96,224);}
        if(b.state===2&&b.stateAge>5&&b.grounded){b.state=Math.abs(dx)<100?3:1;b.stateAge=0;b.vx=0;b.script=b.state===3?data.scriptPointers.attack:data.scriptPointers.ready;}
        if(b.state===3){if(b.stateAge===20){this.hazards.push({x:b.x-dir*20,y:b.y-36,sprite:0x1ca,vx:dir*48,vy:-32,ttl:50,active:true});this.emit('sfx',{index:2});}if(b.stateAge>66){b.state=7;b.stateAge=0;b.vx=-dir*48;b.vy=-97;b.script=data.scriptPointers.fallB;}}
        if(b.state===7&&b.stateAge>8&&b.grounded){b.state=1;b.stateAge=0;b.script=data.scriptPointers.ready;}
        if(b.state===5&&b.stateAge>22){b.state=1;b.stateAge=0;b.script=data.scriptPointers.ready;}
      }
      b.x=clamp(b.x+sar4(b.vx),b.minX,b.maxX);b.y+=sar4(b.vy);b.vy=Math.min(224,b.vy+16);b.grounded=false;if(b.vy>=0&&this.solidSupport(b.x,b.y)){b.y=this.surface(b.x,b.y);b.vy=0;b.grounded=true;}
      this.bossPose(b);
      if(b.state===6){if(b.vy>=0){b.active=false;const p=b.parts?.[4]||b;this.bossReward(p.x,p.y);}}
      else if(this.frame-b.lastHit>22){for(const shot of this.projectiles){if(shot.ttl<=0)continue;const body=b.parts?.[1]||{...b,sprite:410};if(this.overlap(shot,body)){shot.ttl=0;b.hp-=shot.damage;b.lastHit=this.frame;b.state=b.hp<0?6:5;b.stateAge=0;b.vx=0;b.vy=b.hp<0?-128:b.vy;b.script=b.hp<0?data.scriptPointers.dead:data.scriptPointers.hurt;this.emit('sfx',{index:2});break;}}}
      if(b.active&&b.state!==6&&b.parts?.some(p=>this.overlap(this.player,p)))this.damage();
    }
    const m=this.specialBoss,table=this.assets.rules?.bosses?.level6;
    if(m?.active&&table){m.age++;const idx=(m.age>>2)%3;const parts=[];
      if(m.stage===0){const f=table.bodyFrames[idx];parts.push({x:f[0],y:f[1],sprite:f[2],active:true});}
      if(m.stage<2){const f=table.leftPartsFrames[(m.age>>3)%4];parts.push({x:f[0],y:f[1],sprite:f[2],active:true});if(f[5]!==65535)parts.push({x:f[3],y:f[4],sprite:f[5],active:true});}
      if(m.stage<3){const f=table.rightPartsFrames[(m.age>>3)%4];parts.push({x:f[0],y:f[1],sprite:f[2],active:true});if(f[5]!==65535)parts.push({x:f[3],y:f[4],sprite:f[5],active:true});}
      this.bossParts.push(...parts);
      if(this.frame-m.hitAt>=6)for(const shot of this.projectiles){if(shot.ttl>0&&parts.some(p=>this.overlap(shot,p))){shot.ttl=0;m.hitAt=this.frame;m.hp=Math.max(0,m.hp-1);this.emit('sfx',{index:2});if(m.hp===0){m.stage++;if(m.stage===3){m.active=false;this.bossReward(795,1907);}else m.hp=7;}break;}}
      if(m.age%32===0)this.hazards.push({x:this.player.x,y:this.player.y-150,sprite:435,vx:0,vy:16*(1+(this.rng.next()&3)),ttl:55,active:true});
      if(this.player.x>984&&Math.abs(this.player.y-1940)<100){this.player.x=984;this.player.vx=-48;this.damage();}
      if(parts.some(p=>this.overlap(this.player,p)))this.damage();
    }
    const f=this.finalBoss;
    if(f?.active){
      if(f.hp>0){if(!f.repeat){let p=f.schedule;if(this.word(p)===0xffff)p=u16(p+this.signedWord(p+2));f.script=this.word(p);f.repeat=this.word(p+2)&255;f.schedule=p+4;}
        for(const shot of this.projectiles){if(shot.ttl>0&&u16(shot.x-185)<50&&u16(shot.y-30)<50){f.hp=Math.max(0,f.hp-1);f.script=0xa530;f.hitCount=(f.hitCount+1)&3;if(!f.hitCount)f.script=0xa53c;this.emit('sfx',{index:2});if(f.hp===0)this.finalBossReward();break;}}
        let guard=0;while(guard++<20){const c=this.byte(f.script);if(c===255){this.hazards.push({x:200,y:88,sprite:0x1ca,vx:-(16+(this.rng.next()&63)),vy:0,ttl:80,active:true});f.script++;continue;}if(c===254){this.hazards.push({x:(this.rng.next()&127)-16,y:0,sprite:0x1cb,vx:0,vy:16,ttl:80,active:true});f.script++;continue;}if(c===253){this.emit('sfx',{index:2});f.script++;continue;}if(s8(c)<0){f.repeat=Math.max(0,f.repeat-1);f.script=u16(f.script+s8(c));continue;}f.pose=c%5;f.script++;break;}
      }else f.pose=2;
    }
    for(const h of this.hazards){h.x+=sar4(h.vx);h.y+=sar4(h.vy);h.vy=Math.min(192,h.vy+8);h.ttl--;if(this.overlap(this.player,h)){this.damage();h.ttl=0;}}
    this.hazards=this.hazards.filter(h=>h.ttl>0);this.bossParts.push(...this.hazards);
    for(const i of this.items)if(i.active&&i.physics){i.x+=sar4(i.vx);i.y+=sar4(i.vy);i.vy=Math.min(192,i.vy+16);if(i.vy>=0&&this.solidSupport(i.x,i.y)){i.y=this.surface(i.x,i.y);i.vy=0;}}
  }
  finalBossReward(){for(const [vx,vy] of [[32,-160],[-32,-160],[16,-176],[-16,-176]])this.items.push({index:4000+this.items.length,x:185,y:30,sprite:0x2137,originalSprite:0x2137,active:true,physics:true,vx,vy,bob:0});this.emit('bossDefeated',{final:true});}
  updateCamera(){if(this.gateCameraFlag)return;if(this.levelIndex===9){this.camera.x=0;this.camera.y=0;return;}const p=this.player,c=this.camera;
    let tx=c.x,ty=c.y;if(p.x-c.x>192)tx=Math.floor((p.x-192)/16)*16;else if(p.x-c.x<96)tx=Math.floor((p.x-96)/16)*16;
    if(p.y-c.y>144)ty=Math.floor((p.y-144)/16)*16;else if(p.y-c.y<48)ty=Math.floor((p.y-48)/16)*16;
    if(this.input.look){tx+=p.face*16;}
    c.x=clamp(c.x+clamp(tx-c.x,-16,16),0,this.maxCameraX());c.y=clamp(c.y+clamp(ty-c.y,-16,16),0,this.maxCameraY());
  }
  complete(kind){if(this.transition)return;if(this.levelIndex===9&&this.finalBoss?.hp===0){this.finish('ending');return;}const next=exitDestination(this.levelIndex,kind);const pct=completionPercent(this.brokenBlocks,this.collectedFood,this.totalBlocks,this.totalFood);this.transition={type:'complete',next,percent:pct,delay:58,bonus:this.collectedFood};this.transitionTimer=0;this.emit('complete',{next,percent:pct});}
  finish(type){if(this.transition)return;this.transition={type,delay:36};this.transitionTimer=0;this.emit(type);}
  advance(){if(!this.transition)return;const t=this.transition;if(t.type==='complete'){if(t.next>=this.assets.game.levels.length){this.transition=null;this.finish('ending');return;}this.score=(this.score+this.collectedFood*100)>>>0;this.loadLevel(t.next);}else this.emit('finish',{type:t.type});}
  snapshot(){const p=this.player;return {level:this.levelIndex,frame:this.frame,x:p.x,y:p.y,vx:p.vx,vy:p.vy,sprite:p.sprite,grounded:p.grounded,playerState:[p.action,p.animationVariant,p.anim,p.marker||0,p.jumpFrame,p.jumpLock,p.fallFrames,p.lastGroundY,p.attackActive?1:0,p.attackCooldown,p.invulnerable,p.glideMode,p.glideEnergy,p.formAngle,p.runTimer,this.alternate?1:0,this.power,this.presentationTicks],projectiles:this.projectiles.map(a=>[a.x,a.y,a.vx,a.vy,a.sprite,a.anim||0,a.ttl]),score:this.score,health:this.health,lives:this.lives,actors:this.actors.map(a=>[a.x,a.y,a.sprite,a.hp,a.state]),rng:[this.rng.a,this.rng.b,this.rng.c,this.rng.w,this.rng.secondary],camera:[this.camera.x,this.camera.y],collected:this.items.filter(i=>!i.active).map(i=>i.index),blocks:this.blocks.filter(b=>!b.active).map(b=>b.index),transition:this.transition?.type||null};}
  stateHash(){const s=this.snapshot();return fnv1a([s.level,s.frame,s.x,s.y,s.vx,s.vy,s.sprite,s.score,s.health,s.lives,...s.rng,...s.camera,...s.playerState,...s.projectiles.flat(),...s.actors.flat(),...s.collected,...s.blocks]);}
}

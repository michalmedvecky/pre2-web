import{bonusProfile}from'./bonus-support.js';
import {createTally,advanceTally} from './stage-tally.js';
import {initEnvironment,updateMovingBlocks,updateWeather,updateScreenShake} from './environment.js';
import {tileAnimation} from './tile-animation.js';
import * as platforms from './platforms.js';
import * as bosses from './bosses.js';
import {u8,u16,s8,s16,sar4,clamp,Random,ACTIONS,JUMP,AWARDS,actionIndex,inputMask,fnv1a} from './compat.js';

const BONUS = [255,12,11,10,255,255,255,255,255,14];
const RESPAWN_ITEM_CLASSES = new Set([13,44,65,169,170,182,224]);
const NON_PICKUPS = new Set([0xe5,0x12c,0x132,0x134,0x136,0x118]);
export const isScorePickup = sprite => {const id=sprite&0x1fff;return (id>=110&&id<=117)||(id>=128&&id<=219);};
const WEAPON = [{damage:25,cooldown:2,flags:0},{damage:30,cooldown:6,flags:0},{damage:20,cooldown:6,flags:1},{damage:30,cooldown:12,flags:3}];
export function slopeOffset(encoded,x){const b=u8(encoded);if(!(b&0x30))return s8(b);const k=Math.floor((x&15)/3);return s8((b&15)+((b&0x10)?k:-k));}
export function completionPercent(blocks,food,totalBlocks,totalFood){const d=u16(totalBlocks+totalFood);return d?Math.floor(((u16(blocks+food)&255)*100)/d):100;}
export function exitDestination(index,kind){
  if(kind==='special'){if(index===2)return 13;if(index===13)return 3;if(index===6)return 15;if(index===15)return 7;return index+1;}
  if(index<10)return BONUS[index]===255?index+1:BONUS[index];
  const back=BONUS.indexOf(index);return back>=0?back+1:index+1;
}

export class World {
  constructor(assets,{onEvent=()=>{},expert=false}={}){
    this.assets=assets;this.onEvent=onEvent;this.expert=expert;this.godMode=false;this.secretHints=false;this.score=0;this.lives=2;this.health=3;this.extraLifeQuotient=0;
    this.presentationTicks=0;this.frame=0;this.inventory=0;this.inventory2=0;this.weapon=0;this.foodHealth=0;this.weaponPower=0;this.transition=null;this.events=[];this.recorded=[];this.loadLevel(0);
  }
  emit(type,data={}){const e={type,...data};this.events.push(e);this.onEvent(e);}
  word(p){return(this.mem[p&65535]||0)|((this.mem[(p+1)&65535]||0)<<8);}
  signedWord(p){return s16(this.word(p));}
  byte(p){return this.mem[p&65535]||0;}
  loadLevel(index,{restart=false}={}){
    index=clamp(index,0,this.assets.game.levels.length-1);const prior=restart?this.capturePersistence():null;
    this.levelIndex=index;this.level=this.assets.game.levels[index];this.map=this.assets.maps[this.level.id].slice();this.mem=new Uint8Array(65536);this.mem.set(this.assets.tables.subarray(0,65536));this.mem.set(this.assets.footers[this.level.id],0x7e5a);
    this.environmentSetupRng=this.rng?new Random(this.rng.a,this.rng.b,this.rng.c,this.rng.w,this.rng.secondary):null;this.rng=new Random(5,0x22,0x86,0xe58d,this.word(0x28bd));this.frame=0;this.transition=null;this.transitionTimer=0;this.deathTimer=0;this.effects=[];this.projectiles=[];this.playerWeapon=null;this.actors=[];this.items=[];this.platforms=[];this.gates=this.level.gates;this.gateCameraFlag=0;this.gateDownConsumed=false;this.spawnCursor=0;this.spawnSide=0;this.enemyPowerTimer=0;this.ropePoints=[];
    this.inventory=0;this.inventory2=0;this.foodHealth=0;this.health=3;this.power=0;this.weather=0;this.tileAnimationTick=0;this.tileAnimationPhase=0;this.collectedFood=0;this.collectedAuthoredFood=0;this.brokenBlocks=0;this.foodCounts=new Uint8Array(113);this.paletteMode=0;this.paletteTransition=null;this.paletteOverride=null;this.particleRepel=new Uint8Array(20);this.followParticles=Array(20).fill(null);this.collectionFlash=0;this.alternate=false;this.wind=0;this.sceneFlash=0;this.blockCooldown=0;
    this.definitions=this.level.enemies.filter(d=>!d.expert_flag||this.expert).map((d,index)=>({...d,index,active:false,destroyed:false,timer:d.unknown7||0,flags:d.unknown4||0,extra:Uint8Array.from((d.extra_hex||'').match(/../g)||[],x=>parseInt(x,16))}));
    this.items=this.level.items.filter(d=>d.active).map(d=>({...d,sprite:d.sprite,active:true,originalSprite:d.sprite,bob:s8(d.flags||0),baseY:d.y,permanent:false,authored:true}));
    this.platforms=this.level.platforms.filter(d=>d.active).map(d=>this.makePlatform(d));
    initEnvironment(this);
    const footer=this.assets.footers[this.level.id];this.blocks=this.level.secrets.filter(d=>d.active && (d.raw[3]!==255 || d.raw[4]!==255)).map(d=>{const pos=d.raw[3]|d.raw[4]<<8,replacement=this.map[pos];this.map[pos]=d.raw[0];return {index:d.index,concealedTile:d.raw[0],replacement,durability:d.raw[2],pos,active:true,hitAt:-999};});
    this.totalBlocks=this.blocks.length;this.totalFood=this.items.filter(d=>isScorePickup(d.sprite)).length;
    this.player={x:this.level.start.x,y:this.level.start.y,vx:0,vy:0,face:1,sprite:9,action:-1,animationVariant:-1,walkHistory:0,runTimer:0,glideMode:0,glideEnergy:0,formAngle:this.formAngle??this.byte(0x7b16),lastGroundY:this.level.start.y,landingShake:0,platformGrip:false,attackActive:false,attackAction:3,anim:0,jumpFrame:0,jumpLock:0,fallFrames:0,grounded:false,speedShift:0,invulnerable:0,attackTimer:0,attackCooldown:0,downTimer:0,powerTimer:0,look:false};
    this.checkpoint={x:this.player.x,y:this.player.y};this.camera={x:clamp((Math.floor(this.player.x/16)-10)*16,0,this.maxCameraX()),y:clamp(this.word(0x815a)*16,0,this.maxCameraY())};
    if(prior){this.restorePersistence(prior);Object.assign(this.player,this.checkpoint,{vx:0,vy:0,invulnerable:24});this.camera.y=clamp((Math.floor(this.player.y/16)-8)*16,0,this.maxCameraY());this.camera.x=clamp((Math.floor(this.player.x/16)-10)*16,0,this.maxCameraX());}
    this.initBosses();this.animatePlayer(0);this.emit('level',{index,id:this.level.id,restart});
  }
  // 0x13849: advance only while animated tiles are in the 20x11 cache view.
  updateTileAnimation(){const {animated}=tileAnimation(this.level);const tx=this.camera.x>>4,ty=this.camera.y>>4;let visible=false;
    for(let y=Math.max(0,ty);y<Math.min(this.level.height,ty+11)&&!visible;y++)for(let x=Math.max(0,tx);x<Math.min(256,tx+20);x++)if(animated[this.map[y*256+x]]){visible=true;break;}
    if(visible){this.tileAnimationTick=u8(this.tileAnimationTick+1);if(!(this.tileAnimationTick&(this.weather>=20?1:3)))this.tileAnimationPhase=(this.tileAnimationPhase+1)%3;}
  }
  maxCameraX(){return Math.max(0,Math.min(this.level.scrollLimit||236,236)*16);}
  maxCameraY(){return Math.max(0,this.level.height*16-176);}
  capturePersistence(){return {checkpoint:{...this.checkpoint},items:this.items.filter(i=>!i.active).map(i=>i.index),blocks:this.blocks.filter(b=>!b.active).map(b=>b.index),weapon:this.weapon};}
  restorePersistence(s){this.checkpoint=s.checkpoint;this.weapon=s.weapon;for(const i of this.items){const c=(i.originalSprite&0x1fff)-0x35;if(s.items.includes(i.index)&&!RESPAWN_ITEM_CLASSES.has(c))i.active=false;}for(const b of this.blocks)if(s.blocks.includes(b.index)){b.active=false;this.map[b.pos]=b.replacement;}}
  tile(x,y){const tx=Math.floor(x/16),ty=Math.floor(y/16);if(tx<0||tx>=256||ty<0||ty>=this.level.height)return 0;return this.map[(ty<<8)|tx];}
  tilePos(x,y){return((Math.floor(y/16)&255)<<8)|(Math.floor(x/16)&255);}
  prop(kind,tile){return this.level[kind][tile]||0;}
  surface(x,y){const tile=this.tile(x,y);const profile=bonusProfile(this.level,tile),offset=profile?profile[((Math.floor(x)%16)+16)%16]:slopeOffset(this.level.tileSlopes[tile]||0,x);return offset===null?null:Math.floor(y/16)*16+offset;}
  // A floor class is a callback, not a generic "nonzero map tile".
  floorClass(x,y){return this.prop('tilePropertiesY',this.tile(x,y));}
  solidSupport(x,y,down=false){const c=this.floorClass(x,y);return c>=1&&c<=5&&!(c===5&&down);}
  spriteBounds(a){const sp=this.assets.game.sprites[(a.sprite||0)&0x1fff]||this.assets.game.sprites[0];const flip=a.flip??(a.face<0||!!(a.sprite&0x8000));const ox=flip?sp.width-sp.originX:sp.originX;return {left:a.x-ox,right:a.x-ox+sp.width,top:a.y+sp.originY-sp.height,bottom:a.y+sp.originY,width:sp.width,height:sp.height};}
  // 0x18fa5 uses feet/height and half-width overlap; attacks use full width.
  collisionDetails(a,b,{attack=false}={}){
    if(Math.abs(a.x-b.x)>=64||Math.abs(a.y-b.y)>=70)return null;
    const sprite=o=>this.assets.game.sprites[o.sprite&0x1fff];if(!sprite(a)||!sprite(b))return null;
    const lower=a.y>=b.y?a:b,upper=lower===a?b:a,h=sprite(lower).height,penetration=upper.y-(lower.y-h);
    if(penetration<=0)return null;
    let left=a.x-(sprite(a).originX&255),right=b.x-(sprite(b).originX&255),width=sprite(a).width;
    if(left>right){[left,right]=[right,left];width=sprite(b).width;}
    if(left+(attack?width:width>>1)<=right)return null;
    return {penetration,topContact:!attack&&(this.player.vy>=128||(penetration<=(h>>1)&&upper===this.player))};
  }
  overlap(a,b,attack=false){return !!this.collisionDetails(a,b,{attack});}
  visibleActor(a){const b=this.spriteBounds(a),c=this.camera;return b.left<c.x+320&&b.right>=c.x&&b.bottom>c.y&&b.top<c.y+176;}
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
    this.screenShake=this.nextScreenShake;this.shakePlayerNudge=0;
    if(this.gateDownConsumed&&!input.down){this.gateDownConsumed=false;this.player.downTimer=0;}
    if(this.transition){this.transitionTimer++;if(this.transition.tally)this.stepTally();else if(!this.transition.ready&&this.transitionTimer>=this.transition.delay){this.transition.ready=true;this.emit('transitionReady',{transition:this.transition});}return;}
    if(this.deathTimer){this.updateEffects();updateWeather(this);this.player.vy+=8;this.player.y+=sar4(this.player.vy);if(--this.deathTimer===0){if(this.lives>0){this.lives--;this.loadLevel(this.levelIndex,{restart:true});}else{this.transition={type:'gameover',delay:1};this.transitionTimer=0;}}return;}
    if(this.collectionFlash)this.collectionFlash--;if(this.blockCooldown)this.blockCooldown--;if(this.sceneFlash)this.sceneFlash--;if(this.weaponPower)this.weaponPower--;
    // Original broad update order: actors, effects, player, interactions, world changes, presentation counter.
    for(const a of this.actors)a.hitFlash=false;this.checkEnemyAttacks();this.checkBlocks();this.updateBosses();this.updateActors();this.spawnActors();this.updatePlatforms();this.updateEffects();this.updateProjectiles();this.stepPlayer(input);if(this.enemyPowerTimer)this.enemyPowerTimer--;this.checkActorDamage();this.checkPickups();this.updateFollowParticles();this.updatePalette();this.checkGates();updateMovingBlocks(this);this.updateCamera();this.updateTileAnimation();updateWeather(this);
    if(this.levelIndex===14&&this.player.y>(this.level.height+1)*16)this.finish('ending');
    else if(this.player.y>this.level.height*16+32||this.player.y< -320||
      // Fixed cave views may have more map below them. IDDQD must rescue a
      // fallen, fully hidden player there too, even if a lower floor stops them.
      (this.godMode&&(this.gateCameraFlag||this.levelIndex===9)&&this.player.vy>=0&&this.spriteBounds(this.player).top>=this.camera.y+176))this.loseLife();
    for(const i of this.items)if(i.active&&!(this.frame&1)){i.bob=(i.bob||0)+1;if(i.bob>=4)i.bob=-i.bob+1;i.y+=i.bob;}
    if(this.player.invulnerable)this.player.invulnerable--;if(this.power)this.power--;updateScreenShake(this);
    const q=Math.floor((this.score>>>0)/25000);while(this.extraLifeQuotient<q){this.extraLifeQuotient++;this.lives=Math.min(99,this.lives+1);this.emit('sfx',{index:4});this.floatText('1UP',this.player.x,this.player.y-38,0xe3);}
    // Pickups request completion before the last camera update of this frame.
    if(this.transition?.tally&&this.transitionTimer===0)this.transition.tally=createTally(this);
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
    if(this.prop('tilePropertiesMisc',this.tile(p.x,p.y-16))&16)this.spawnFollowParticle();
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
    for(const field of ['attackCooldown','downTimer','powerTimer','landingShake'])if(p[field]>0)p[field]--;
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
  landPlatform(surface,id=null,vy=0){const p=this.player;p.y=surface;p.vy=vy;p.grounded=true;p.speedShift=0;p.platformGrip=true;p.platformId=id;}
  landPlayer(surface,speedShift=0){const p=this.player,vy=p.vy,fall=p.fallFrames;
    p.y=surface;p.grounded=true;p.speedShift=speedShift;p.glideMode=0;p.landingBounce=false;
    if(fall>4)this.playerDust();
    if(fall>4&&p.y-p.lastGroundY>=32&&vy>=80){
      p.lastGroundY=p.y;if(fall>=20&&vy>160)p.landingShake=8;
      if(fall>10){p.vy=(this.level.scrollFlags&1)?vy:-32;p.sprite=(p.sprite&0xe000)|12;p.fallFrames=0;p.landingBounce=true;return;}
    }
    p.vy=0;
  }
  resolveBonusSupport(oldY,wasGrounded){
    const p=this.player;if(p.vy<0||!['B','C','D'].includes(this.level.id))return;
    const min=Math.max(0,Math.floor((Math.min(oldY,p.y)-16)/16)),max=Math.min(this.level.height-1,Math.floor((Math.max(oldY,p.y)+16)/16)),candidates=[];
    for(let ty=min;ty<=max;ty++){const y=ty*16,tile=this.tile(p.x,y),profile=bonusProfile(this.level,tile),c=this.prop('tilePropertiesY',tile);if(!profile||c<1||c>5||c===5&&p.downTimer)continue;const offset=profile[p.x&15];if(offset===null)continue;const surface=y+offset,crossed=oldY<=surface+1&&p.y>=surface,following=wasGrounded&&Math.abs(oldY-surface)<=6&&Math.abs(p.y-oldY)<=6;if(crossed||following)candidates.push({surface,c});}
    candidates.sort((a,b)=>a.surface-b.surface);if(candidates.length){const{surface,c}=candidates[0];this.landPlayer(surface,c>=2&&c<=4?c-1:0);}
  }
  collidePlayer(oldX,oldY){
    const p=this.player;const dx=p.x-oldX;const sideX=p.x+(dx>0?9:dx<0?-9:0);let hitSide=false;
    if(dx){const height=this.byte(0x718d+(p.sprite&0x1fff)*2)||36;for(let row=0;row<Math.ceil(height/16);row++){const y=(p.y&0xfff0)-16-row*16,c=this.prop('tilePropertiesX',this.tile(sideX,y));if(c===2&&!this.godMode){this.loseLife();return;}if(row===0&&c===1){hitSide=true;break;}}}
    if(hitSide){p.x=oldX;p.vx=0;}
    if(p.vy<=0){const top=(p.y&0xfff0)-32;const c=this.prop('tilePropertiesMisc',this.tile(p.x,top))&15;if(c===2&&!this.godMode){this.loseLife();return;}if(c===1&&p.vy!==0){p.y=(p.y&0xfff0)+16;p.vy=0;}this.hitTileBlocks(this.tilePos(p.x,top),false);}
    const wasGrounded=p.grounded&&!p.platformGrip;p.grounded=false;p.platformGrip=false;p.speedShift=0;this.resolveBonusSupport(oldY,wasGrounded);
    const floor=this.floorClass(p.x,p.y),c=floor===6&&this.godMode?1:floor;if(c===6){this.loseLife();return;}
    if(!p.grounded&&!bonusProfile(this.level,this.tile(p.x,p.y))&&c>=1&&c<=5&&p.vy>=0&&!(c===5&&p.downTimer)){
      const surface=this.surface(p.x,p.y);if(p.y>=surface-12&&oldY<=surface+16){this.landPlayer(surface,c>=2&&c<=4?c-1:0);}
    }
    if(!p.grounded&&p.vy>=0){const nextC=this.floorClass(p.x,p.y+16),nextSlope=this.level.tileSlopes[this.tile(p.x,p.y+16)];if(nextC>=1&&nextC<=5&&nextSlope&&!(nextC===5&&p.downTimer)){let sy=this.surface(p.x,p.y+16);if(sy!==null&&sy<=p.y+5&&!bonusProfile(this.level,this.tile(p.x,p.y+16))){this.landPlayer(sy);}}}
    for(const q of this.platforms){if(!q.active)continue;const bounds=this.spriteBounds(q);if((p.vy>=0||this.carriedPlatform===q.index)&&p.x>bounds.left-3&&p.x<bounds.right+3&&oldY<=bounds.top+8&&p.y>=bounds.top){const support=this.platformSupport?.index===q.index?this.platformSupport:{y:p.y>bounds.top?bounds.top+1:bounds.top,vy:p.y>bounds.top?1:(q.dy||0)*16};this.landPlatform(support.y,q.index,support.vy);q.raw[6]|=64;if(this.carriedPlatform!==q.index)p.x+=q.dx||0;}}
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
  toggleGodMode(){this.godMode=!this.godMode;if(this.godMode){this.player.invulnerable=0;if(this.deathTimer){this.deathTimer=0;this.rescuePlayer();}}this.emit('cheat',{code:'IDDQD',enabled:this.godMode});return this.godMode;}
  toggleSecretHints(){this.secretHints=!this.secretHints;this.emit('cheat',{code:'IDKFA',enabled:this.secretHints});return this.secretHints;}
  // IDDQD rescue is a fresh player/controller pose within the existing world.
  // A cave camera lock and a platform/glider/attack must not survive the fall.
  rescuePlayer(destination=this.checkpoint){
    const p=this.player;Object.assign(p,destination,{vx:0,vy:0,jumpFrame:0,jumpLock:0,fallFrames:0,lastGroundY:destination.y,grounded:false,platformGrip:false,platformId:null,speedShift:0,glideMode:0,glideEnergy:0,formAngle:3,runTimer:0,walkHistory:0,landingShake:0,landingBounce:false,attackActive:false,attackFrame:false,attackTimer:0,attackCooldown:0,downTimer:0,powerTimer:0,invulnerable:0,look:false,animationVariant:-1});
    this.deathTimer=0;this.formAngle=3;this.gateCameraFlag=0;this.gateDownConsumed=!!this.input?.down;
    this.carriedPlatform=null;this.platformSupport=null;for(const platform of this.platforms)platform.raw[6]&=~64;
    this.screenShake=this.nextScreenShake=this.shakePlayerNudge=0;this.playerWeapon=null;this.projectiles=this.projectiles.filter(shot=>!shot.contact);
    this.animatePlayer(0,this.alternate?32:0);if(this.alternate)this.updateFormSprite({});else this.updatePlayerWeapon();
    this.camera.x=clamp((Math.floor(p.x/16)-9)*16,0,this.maxCameraX());this.camera.y=clamp((Math.floor(p.y/16)-8)*16,0,this.maxCameraY());
    if(this.levelIndex===9)this.camera.x=this.camera.y=0;
    this.sceneFlash=4;this.emit('rescue');
  }
  teleportPlayer(x,y){if(!Number.isFinite(x)||!Number.isFinite(y))return false;this.rescuePlayer({x:clamp(Math.round(x),8,4087),y:clamp(Math.round(y),0,this.level.height*16-1)});return true;}
  damage(){const p=this.player;if(this.godMode||p.invulnerable||this.deathTimer||this.transition)return;this.emit('sfx',{index:1});
    p.invulnerable=44;p.attackActive=false;p.attackTimer=0;p.vx=s16(-4*p.vx);p.vy=-128;p.glideMode=0;p.jumpFrame=9;p.animationVariant=-1;
    this.playerWeapon=null;this.projectiles=this.projectiles.filter(a=>!a.contact);
    if(this.alternate){this.alternate=false;return;}
    if(this.health>0)this.health--;else this.loseLife();
  }
  loseLife(){if(this.godMode){this.rescuePlayer();return;}if(this.deathTimer||this.transition)return;this.deathTimer=38;this.playerWeapon=null;this.player.sprite=33;this.player.vy=-160;this.emit('sfx',{index:7});this.emit('lifeLost');}
  scoreAward(index,x=this.player.x,y=this.player.y){index=clamp(index,0,16);this.score=(this.score+AWARDS[index])>>>0;this.effects.push({x,y:y-10,sprite:0x4a+index,vy:-8,ttl:44,active:true});}
  floatText(text,x,y,sprite){this.effects.push({x,y,text,sprite:sprite??0xffff,vy:-8,ttl:44,active:true});}
  updateEffects(){for(const e of this.effects){
      if(e.nativeObject){
        if(--e.ttl<=0)continue;
        e.x=s16(e.x+sar4(e.vx));if(e.x<0){e.x=0;e.vx=-e.vx;}
        const motion=sar4(e.vy);e.y=s16(e.y+motion);if(e.vy+9<256)e.vy+=9;
        const sprite=e.sprite&0x1fff;
        if([300,306,308,310].includes(sprite)){e.ttl=Math.min(e.ttl,50);continue;}
        if(sprite===229)continue;
        if(motion>0&&this.floorClass(e.x,e.y)){e.vy=(-e.vy)>>1;const old=e.vx;e.vx-=Math.sign(e.vx)*8;if(Math.sign(e.vx)!==Math.sign(old))e.vx=0;}
        else if(motion<=0&&this.prop('tilePropertiesX',this.tile(e.x,e.y-16))){e.vx=-e.vx;e.x+=sar4(e.vx);}
        if(!(this.frame&1)&&e.vx&&sprite>=70&&sprite<=73)e.sprite=(e.sprite&0xe000)|(sprite===73?70:sprite+1);
        continue;
      }
      if(e.dust)e.sprite++;e.ttl--;e.y+=(e.vy||0)>>4;if(e.physics){e.x+=(e.vx||0)>>4;e.vy=Math.min(256,(e.vy||0)+9);if(this.solidSupport(e.x,e.y)&&e.vy>0){e.vy=-(e.vy>>1);e.y&=~15;}}
    }this.effects=this.effects.filter(e=>e.ttl>0);}
  checkPickups(){for(const e of [...this.effects]){if(e.nativeObject&&e.collectible&&e.ttl<=188&&e.ttl>0&&this.visibleActor(e)&&this.overlap(this.player,e)){if(this.pickup(e))e.ttl=0;}}for(const i of this.items){if(!i.active)continue;const sp=i.sprite&0x1fff;if(sp===0x116||NON_PICKUPS.has(sp))continue;if(!this.overlap(this.player,i))continue;this.pickup(i);}}
  popup(sprite,x=this.player.x,y=this.player.y){this.effects.push({x,y,sprite,vy:-8,ttl:44,active:true});}
  scorePickup(i){const c=(i.sprite&0x1fff)-0x35,index=c-57;if(index<0||index>=this.foodCounts.length)return false;
    this.foodCounts[index]=u8(this.foodCounts[index]+1);this.collectedFood=u16(this.collectedFood+1);if(i.authored)this.collectedAuthoredFood=u16(this.collectedAuthoredFood+1);
    this.scoreAward(this.byte(0xa371+index),i.x,i.y);this.emit('sfx',{index:8});return true;
  }
  scatterHealth(count=6*this.health+this.foodHealth){if(this.godMode)return;this.health=0;this.foodHealth=0;if(count)this.spawnFragments(this.player.x,this.player.y-48,0x2046,48,-128,count,{collectible:true});}
  randomFood(x,y,vx,vy){let n;do{n=this.rng.next()&127;}while(n>=95);this.spawnFragments(x,y,0x2080+n,vx,vy,1,{collectible:true});}
  discardRuntimePickup(i){if(i.authored)return false;i.active=false;return true;}
  pickup(i){const sprite=i.sprite&0x1fff,c=sprite-0x35;let sound=null;
    if(this.godMode&&[458,459,220,221].includes(sprite)){i.active=false;return true;}
    if(sprite===0x1ca||sprite===0x1cb){if(this.health===0)this.loseLife();else{const remaining=this.health-1;this.scatterHealth(6+this.foodHealth);this.health=remaining;this.player.invulnerable=44;this.player.attackActive=false;this.player.animationVariant=-1;this.emit('sfx',{index:1});}i.active=false;return true;}
    if(c===258){i.active=false;this.complete('bonus');return true;}if(c===226){i.active=false;this.complete('special');return true;}
    if(c===228){this.checkpoint={x:this.player.x,y:this.player.y};for(const j of this.items)if((j.sprite&0x1fff)===0x118)j.sprite=(j.sprite&0xe000)|0x119;i.sprite=(i.sprite&0xe000)|0x118;return false;}
    const weaponMap={13:0,182:1,44:2,224:3};
    if(c in weaponMap){this.weapon=weaponMap[c];sound=8;this.emit('weapon',{weapon:this.weapon});}
    else if(c>=0&&c<=20){this.foodHealth=u8(this.foodHealth+1);if(this.foodHealth>=6&&this.health<3){this.health++;this.foodHealth=0;this.popup(0xe2,i.x,i.y);}sound=8;}
    else if(c>=39&&c<=43){this.inventory|=1<<(c-39);sound=8;if(this.inventory===31){this.spawnFragments(this.player.x,this.player.y-112,110,0,0,1,{collectible:true});this.inventory=0;this.collectionFlash=44;}}
    else if(c>=45&&c<=50){this.inventory2|=1<<(c-45);sound=8;if(c===46)this.unlockExits();if((this.inventory2&0x38)===0x38){this.inventory2&=~0x38;this.enemyPowerTimer=660;}}
    else if(c>=51&&c<=64){if((i.vy||0)>=128){i.vy=-i.vy;i.vx=(this.rng.next()&1)?-32:32;this.emit('sfx',{index:4});return false;}if(!this.scorePickup(i))return false;}
    else if(c>=65&&c<=74){if(this.alternate)return this.discardRuntimePickup(i);this.alternate=true;this.player.action=-1;this.player.animationVariant=-1;sound=8;}
    else if(c===145){this.particleRepel.fill(7);this.emit('repelParticles',{states:Array.from(this.particleRepel)});this.scorePickup(i);}
    else if(c>=75&&c<=166)this.scorePickup(i);
    else if(c===173){if(this.health>=3)return this.discardRuntimePickup(i);this.health++;sound=4;this.popup(0xe2,i.x,i.y);}
    else if(c===174){this.lives=Math.min(99,this.lives+1);sound=4;this.popup(0xe3);}
    else if(c===167||c===168){this.player.invulnerable=44;this.player.attackActive=false;this.player.animationVariant=-1;this.player.action=8;this.playerWeapon=null;this.projectiles=this.projectiles.filter(p=>!p.contact);this.scatterHealth();this.player.landingShake=7;this.popup(0xe4,i.x,i.y);sound=1;}
    else if(c===169){for(const a of this.actors)if(a.active&&a.state!==255&&!(a.def.flags&0x10)&&this.visibleActor(a))this.killActor(a);this.player.landingShake=9;this.popup(0xe6,i.x,i.y);sound=0;}
    else if(c===170){for(const a of this.actors){if(!a.active||a.state===255||a.def.flags&0x10||!this.visibleActor(a))continue;a.state=255;this.removeActor(a,false);this.randomFood(a.x,a.y,32,-160);this.randomFood(a.x,a.y,-32,-160);this.randomFood(a.x,a.y,16,-176);this.randomFood(a.x,a.y,-16,-176);}this.popup(0xe7,i.x,i.y);sound=0;}
    else if(c===180||c===181){const mode=c===181?1:0;if(this.paletteMode!==mode){this.setPaletteMode(mode);if(mode)sound=1;}}
    else return false;
    i.active=false;if(sound!==null)this.emit('sfx',{index:sound});return true;
  }
  spawnFollowParticle(){const index=this.followParticles.findIndex(p=>p===null);if(index<0)return;this.followParticles[index]={x:u16(this.player.x<<3),y:u16(this.player.y<<3),vx:0,vy:0,timer:170};this.particleRepel[index]=0;}
  updateFollowParticles(){for(let i=0;i<20;i++){const p=this.followParticles[i];if(!p)continue;p.timer=u8(p.timer-1);if(s8(p.timer)<0){
        p.timer=(this.rng.word()&7)+3;const away=this.particleRepel[i]!==0;
        const dx=(this.rng.next()&15)*(this.player.x<(s16(p.x)>>3)?-1:1)*(away?-1:1),dy=(this.rng.next()&15)*(this.player.y<(s16(p.y)>>3)+32?-1:1)*(away?-1:1);
        p.vx=(this.rng.word()&31)*(dx<0?-1:1);p.vy=Math.min(32,dx===0?2:Math.floor(Math.abs(dy)*8/Math.abs(dx)))*(dy<0?-1:1);
        if(!(this.frame&15)&&away)this.particleRepel[i]--;
      }const next=s16(p.x)+p.vx;if(next>=-32768&&next<=32767)p.x=u16(next);p.y=u16(p.y+p.vy);
    }}
  restoreScoreProgress(saved){this.score=saved.score>>>0;this.lives=clamp(saved.lives,0,99);this.extraLifeQuotient=saved.extraLifeQuotient??Math.floor(this.score/25000);}
  setPaletteMode(mode){const base=this.assets.game.palettes[this.levelIndex].rgb6,alternate=Array.from(this.assets.tables.subarray(0xacb3,0xace3));this.paletteMode=mode;this.paletteTransition={from:mode?base.slice(0,48):alternate,to:mode?alternate:base.slice(0,48),tick:0};}
  updatePalette(){if(!this.paletteTransition)return;const p=this.paletteTransition;p.tick++;const values=p.from.map((v,i)=>v+Math.sign(p.to[i]-v)*Math.min(Math.abs(p.to[i]-v),p.tick));this.paletteOverride=this.assets.game.palettes[this.levelIndex].rgb8_scaled.slice();for(let i=0;i<48;i++)this.paletteOverride[i]=Math.round(values[i]*255/63);if(values.every((v,i)=>v===p.to[i]))this.paletteTransition=null;}
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
  setDefWord(d,p,value){d.extra[p-13]=value&255;d.extra[p-12]=value>>>8;}
  updateActors(){this.ropePoints=[];for(const a of this.actors){if(!a.active)continue;const d=a.def,e=d.extra,b=n=>this.defByte(d,n),w=n=>this.defWord(d,n);a.age++;const dx=this.player.x-a.x,dy=this.player.y-a.y,dir=dx>=0?1:-1;
      if(a.state!==255&&!this.visibleActor(a)){
        const outside=a.type===9?(Math.abs(dy)>=190||this.player.x<w(13)-480||this.player.x>=w(15)+480):(Math.abs((a.type===4?d.x:a.x)-this.player.x)>320||Math.abs((a.type===4?d.y:a.y)-this.player.y)>300);
        if(outside){const timer=d.timer;this.removeActor(a,a.state>=10&&!(d.flags&2));if(a.type===9)d.timer=timer;continue;}
      }
      if(a.vx!==-1)a.x+=sar4(a.vx);a.y+=sar4(a.vy);
      if(d.flags&8)this.actorPhysics(a);a.face=a.vx<0?-1:1;if(a.anim){
        const saved=a.anim;this.nextAnimation(a,0x138);
        if(this.enemyPowerTimer){a.marker|=(this.enemyPowerTimer&255)<<8;let converted=false;for(let ptr=0xa7fd;ptr<0xa85d;ptr+=6){if(a.sprite<this.word(ptr))break;if(a.sprite<=this.word(ptr+2)){a.sprite=this.word(ptr+4)+0x35;converted=true;break;}}if(converted)a.anim=saved;}
      }
      if(a.state===255){this.updateDeadActor(a);continue;}

      switch(a.type){
        case 0:
          if(a.state===0&&this.enemyDelay(d)){if(a.y-this.player.y>=176){this.removeActor(a,!(d.flags&2));break;}d.flags|=8;a.state=1;}
          else if(a.state===1&&a.vy===0){a.vx=dir*32;a.state=2;this.advanceEnemySegment(a);}break;
        case 1:break;
        case 2:if(a.state<2)this.enemyRope(d,0,a.y-d.y);if(a.state===0){a.vy=s8(b(14))*16;if(a.y-d.y>s8(b(13))){a.state=1;this.advanceEnemySegment(a);}}else if(a.state===1){a.vy=-s8(b(14))*16;if(a.y-d.y<0){a.state=0;this.rewindEnemySegment(a);}}break;
        case 3:
          if(a.state===0&&this.enemyDelay(d)&&(Math.abs(this.player.x-d.x)>>4)<=b(13)){d.flags&=~16;a.vy=32;a.state=1;this.advanceEnemySegment(a);}
          else if(a.state===1){this.enemyRope(d,0,a.y-d.y);if(this.floorClass(a.x,a.y)){a.y&=~15;a.vy=0;a.state=2;d.flags|=0x48;a.vx=dir*48;this.advanceEnemySegment(a);}}
          else if(a.state===2&&a.x<0)a.vx=-a.vx;break;
        case 4:{
          const swing=()=>{const phase=b(15),radius=s8(b(13));a.x=d.x+(((s8(this.byte(0x6f8c+phase))>>2)*radius)>>4);a.y=d.y+(((s8(this.byte(0x708c+phase))>>2)*radius)>>4);this.enemyRope(d,phase,b(13));};
          if(a.state===0){if(this.enemyDelay(d)){this.enemyRope(d,0,a.y-d.y);if(a.y-d.y<b(13))a.y+=2;else a.state=1;}}
          else if(a.state===1){swing();e[2]=u8(e[2]+4);if(e[2]>=b(14)){e[2]=b(14);a.state=2;}}
          else if(a.state===2){swing();e[3]=u8(e[3]+(s8(e[2])<0?1:-1));e[2]=u8(e[2]+s8(e[3]));}break;
        }
        case 5:
          if(a.state===0){a.vx=dir;if((Math.abs(dx)>>4)<=b(13)&&(Math.abs(dy)>>4)<=b(14)){a.state=10;a.vy=b(15)*16;a.vx=dir*a.vy;}}
          else if(a.state===10&&Math.abs(dy)<=8){a.vy=0;a.state=11;this.advanceEnemySegment(a);}break;
        case 6:{
          a.vx=dir;
          if(a.state===0){if((Math.abs(dx)>>4)<=b(13)){a.state=1;e[3]=24;e[1]=e[2]=0;this.setDefWord(d,17,u16(a.x<<3));this.setDefWord(d,19,u16(a.y<<3));}break;}
          if(a.state!==1)break;
          const distance=dx*dx+dy*dy;
          if(this.player.attackActive&&distance<10000){if(Math.abs(dy)<48)e[1]=u8(-dir*(distance<3600?104:64));else e[2]=0xc0;}
          else {e[3]=u8(e[3]-1);if(s8(e[3])<0){e[3]=(this.rng.word()&15)+3;const tx=(this.rng.next()&15)*dir;const ty=(this.rng.next()&15)*(this.player.y<a.y+50?-1:1);e[1]=u8((this.rng.word()&31)*(tx<0?-1:1));const vy=tx===0?2:Math.floor(Math.abs(ty)*8/Math.abs(tx));e[2]=u8(Math.min(32,vy)*(ty<0?-1:1));}}
          this.setDefWord(d,17,u16(w(17)+s8(e[1])));this.setDefWord(d,19,u16(w(19)+s8(e[2])));a.x=s16(w(17))>>3;a.y=s16(w(19))>>3;break;
        }
        case 7:if(a.state===0){a.vx=dir;if((Math.abs(dx)>>4)<=b(13)){a.state=10;a.vy=s8(b(14))*16;a.vx=dir*a.vy;this.advanceEnemySegment(a);}}break;
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
        case 11:if(a.state===0&&a.marker){a.state=1;d.flags&=~16;a.vx=dir*s8(b(13))*16;a.vy=-s8(b(14))*16;}else if(a.state===1&&a.vy<s8(b(15))*16)a.vy+=8;break;
        case 12:if(a.state===0){a.vx=dir*s8(b(13))*16;a.state=1;}else if(a.state===1){if(this.visibleActor(a))d.timer=0;else if(++d.timer>=154)a.state=255;}break;
      }
    }this.actors=this.actors.filter(a=>a.active);}
  // 0x1820a/0x14d82 enqueue three original one-pixel rope points, pool20.
  enemyRope(d,phase,length){const quarter=s8(length)>>2;for(let n=1;n<=3&&(this.ropePoints?.length||0)<20;n++){const radius=s8(quarter*n);this.ropePoints.push({x:d.x+(((s8(this.byte(0x6f8c+phase))>>2)*radius)>>4),y:d.y-24+(((s8(this.byte(0x708c+phase))>>2)*radius)>>4)});}}
  // 0x16bbd: terrain callbacks are nonzero classes; 40/80 flags select wall climbing.
  actorPhysics(a){const d=a.def,feet=this.tile(a.x,a.y),above=this.tile(a.x,a.y-16),side=this.prop('tilePropertiesX',this.tile(a.x+Math.sign(a.vx)*16,a.y-16));
    a.grounded=false;
    if((d.flags&0xc0)===0xc0){if(side){a.x-=sar4(a.vx);return;}this.rewindEnemySegment(a);a.vy=0;d.flags&=~0x80;a.y-=16;return;}
    if(side){if(d.flags&0x40){this.advanceEnemySegment(a);d.flags|=0x80;a.vy=-16;a.x+=a.vx>>2;return;}a.vx=-a.vx;a.x+=sar4(a.vx);}
    let tile=feet;if(this.prop('tilePropertiesY',above)){a.y-=16;tile=above;}else if(!this.prop('tilePropertiesY',feet)){if(a.vy<256)a.vy+=16;return;}
    a.y=(a.y&~15)+slopeOffset(this.level.tileSlopes[tile]||0,a.x);a.grounded=true;
    a.vy=(d.flags&32)?0:(-a.vy)>>1;if(Math.abs(a.vy)<=32)a.vy=0;
  }
  removeActor(a,destroy){a.active=false;a.def.active=false;a.def.flags&=~4;a.def.timer=0;if(destroy)a.def.destroyed=true;}
  enemyDeathAnimation(a){let ptr=a.anim;for(let n=0;n<2048&&ptr+2<this.assets.tables.length;n++){ptr+=2;if(this.word(ptr)===0x7d00){a.anim=ptr+2;return true;}if(this.word(ptr)===0x7d01)break;}return false;}
  killActor(a,attack={face:this.player.face,damage:25}){
    if(!a.active||a.state===255)return;
    const repeats=this.byte(0xa3ed+(((a.aux||0)>>>3)&7))||1;
    for(let n=0;n<repeats;n++)this.scoreAward(clamp(a.def.score_candidate||0,0,16),a.x+9*n,a.y+7*n);
    a.state=255;a.hitFlash=true;
    // 0x185c4 clears bit0 on harmful contact; 0x18ee5 checks it at defeat.
    // Untouched enemies retain their launched death animation without bones.
    if(!(a.def.flags&1))this.spawnFragments(a.x,a.y,0x2046,48,-128,6,{collectible:true});
    if(!(a.def.flags&1))return;
    this.enemyDeathAnimation(a);if((a.def.flags&0xc8)!==0x88)a.def.flags&=~8;
    const strength=Math.min(attack.damage??25,25);a.vy=-strength*8;a.vx=(attack.face??this.player.face)*strength*4;
  }
  updateDeadActor(a){if(!(a.def.flags&1)||(!this.visibleActor(a)&&this.player.y<a.y)){this.removeActor(a,!(a.def.flags&2));return;}if(a.vy<240)a.vy+=15;}
  checkEnemyAttacks(){for(const shot of this.projectiles){if(shot.ttl<=0)continue;for(const a of this.actors){if(!a.active||a.state===255||a.def.flags&0x10)continue;if(!this.overlap(shot,a,true))continue;
        this.consumeAttack(shot);a.hitFlash=true;const hp=a.hp;a.hp=u8(hp-shot.damage);if(hp<shot.damage){this.emit('sfx',{index:2});this.killActor(a,shot);}else a.x-=a.vx>>2;break;
      }}}
  checkActorDamage(){const p=this.player;if(p.invulnerable)return;for(const a of this.actors){if(!a.active||a.state===255||a.def.flags&0x10||!this.visibleActor(a))continue;const hit=this.collisionDetails(p,a);if(!hit)continue;
      if(this.enemyPowerTimer){this.killActor(a);return;}
      if(hit.topContact&&p.vy>=0){
        if(p.glideMode){
          if(p.vy>32){const count=(a.aux||0)&3;this.scoreAward(8+count*2,a.x,a.y);a.hitFlash=true;if(count===2){a.state=255;this.enemyDeathAnimation(a);a.def.flags&=~8;a.vy=-200;a.vx=(a.x>p.x?1:-1)*Math.abs(p.vy)*3;return;}a.aux=u8((a.aux||0)+1);}
          p.vy=-96;
        }else{this.emit('sfx',{index:3});const count=(a.aux||0)>>>2;if(count!==11){a.aux=u8((a.aux||0)+4);const next=count+1;if(!(next&1)){const sprite=this.word(0xa3e1+next);this.effects.push({x:a.x,y:a.y,sprite,vy:-8,ttl:44,active:true});}}p.vy=this.input.up?-224:-64;}
        p.fallFrames=0;p.y-=hit.penetration;p.grounded=false;return;
      }
      if(!this.godMode){a.def.flags&=~1;this.damage();}return;
    }}
  makePlatform(d){return platforms.makePlatform(d);}
  updatePlatforms(){platforms.updatePlatforms(this);}
  checkBlocks(){for(const shot of this.projectiles){if(shot.ttl<=0)continue;const tx=shot.x>>4,sy=shot.y-16;for(const b of this.blocks){if(!b.active)continue;const bx=b.pos&255,by=(b.pos>>8)*16;if(Math.abs(bx-tx)<=1&&Math.abs(by-sy)<16){this.consumeAttack(shot);this.hitBlock(b,shot);break;}}}}
  hitTileBlocks(pos,fromAttack){const b=this.blocks.find(b=>b.active&&b.pos===pos);if(b&&fromAttack)this.hitBlock(b);}
  spawnFragments(x,y,sprite,vx,vy,count,{collectible=false}={}){for(let n=0;n<count&&this.effects.filter(e=>e.nativeObject).length<32;n++){
      this.effects.push({x,y,sprite,vx,vy,ttl:198,physics:true,nativeObject:true,collectible,active:true});vx=-vx;if(n&1){if(n+1>12)vx=0;vx-=16;vy-=16;}
    }}
  hitBlock(b,shot=this.player){if(!b.active)return false;const high=b.durability&0x80;
    if(!high&&this.blockCooldown)return false;
    if(!high)this.blockCooldown=6;b.hitAt=this.frame;this.emit('sfx',{index:2});
    const x=(b.pos&255)*16,y=(b.pos>>8)*16;
    let consume=false;
    if(high){b.durability=u8(b.durability-1);if(b.durability&0x80){this.revealConnectedBlocks(b,false);return true;}let n=0;while(!n)n=this.rng.next()&7;this.spawnFragments(x,y-112,110+n,0,0,1,{collectible:true});consume=true;}
    else {
      const c=b.durability;
      if(c&0x40){const debris=this.levelIndex===3?306:[6,7].includes(this.levelIndex)?300:308;
        if(c===0x40){b.durability=0;this.spawnFragments(x,y,debris,32,-48,2);this.spawnFragments(x,y,this.levelIndex===8?310:229,shot.face<0?48:-48,-112,4);}
        else this.spawnFragments(x,y,debris,48,-96,4);
      }else{let n;do{n=this.rng.next()&127;}while(n>94);this.spawnFragments(x,y,0x2080+n,shot.face<0?48:-48,-112,1,{collectible:true});}
      const before=b.durability;b.durability=u8(before-1);consume=before===0;
    }
    if(consume)this.revealConnectedBlocks(b,true);return consume;
  }
  revealConnectedBlocks(seed,consumeSeed=true){const work=[seed.pos],seen=new Set([seed.index]);if(consumeSeed)this.breakBlock(seed);
    while(work.length){const pos=work.pop(),x=pos&255,y=pos>>8;for(const b of this.blocks){if(!b.active||seen.has(b.index)||Math.abs((b.pos&255)-x)>1||Math.abs((b.pos>>8)-y)>1)continue;seen.add(b.index);work.push(b.pos);this.breakBlock(b);}}
  }
  breakBlock(b){if(!b.active)return;b.active=false;this.brokenBlocks++;this.map[b.pos]=b.replacement;}
  // 0x1550e: twenty seven-byte gate records at DS:8363; DS:6bdd buffers Down.
  // Browser passages are instant; consume held Down until release where DOS
  // blocked interaction during its VGA wipe. Crouch/drop buffering stays active.
  checkGates(){if(this.gateDownConsumed||!this.player.downTimer||this.alternate)return;const pos=this.tilePos(this.player.x,this.player.y);for(const g of this.gates){if(!g.active||g.triggerTile!==pos)continue;
      const dest=g.destinationTile,camera=g.cameraTile;this.player.x=(dest&255)*16;this.player.y=(dest>>8)*16;this.player.vx=this.player.vy=0;
      this.camera.x=(camera&255)*16;this.camera.y=(camera>>8)*16;this.gateCameraFlag=g.cameraFlag;this.player.downTimer=0;this.gateDownConsumed=true;
      this.emit('sfx',{index:3});this.sceneFlash=4;if(this.levelIndex===5)this.activateSpecialBoss();break;
    }}
  initBosses(){bosses.initBosses(this);}
  activateSpecialBoss(){bosses.activateSpecialBoss(this);}
  bossPose(b){bosses.bossPose(this,b);}
  updateBosses(){bosses.updateBosses(this);}
  finalBossReward(){bosses.finalBossReward(this);}
  updateCamera(){if(this.gateCameraFlag)return;if(this.levelIndex===9){this.camera.x=0;this.camera.y=0;return;}const p=this.player,c=this.camera;
    let tx=c.x,ty=c.y;if(p.x-c.x>192)tx=Math.floor((p.x-192)/16)*16;else if(p.x-c.x<96)tx=Math.floor((p.x-96)/16)*16;
    if(p.y-c.y>144)ty=Math.floor((p.y-144)/16)*16;else if(p.y-c.y<48)ty=Math.floor((p.y-48)/16)*16;
    if(this.input.look){tx+=p.face*16;}
    c.x=clamp(c.x+clamp(tx-c.x,-16,16),0,this.maxCameraX());c.y=clamp(c.y+clamp(ty-c.y,-16,16),0,this.maxCameraY());
  }
  complete(kind){
    if(this.transition)return;
    const next=exitDestination(this.levelIndex,kind),pct=completionPercent(this.brokenBlocks,this.collectedAuthoredFood,this.totalBlocks,this.totalFood);
    this.transition={type:'complete',next,percent:pct,delay:58,bonus:this.collectedFood,kind};
    // 0x18a54 remaps flag-1 doors before 0x14e5d tests level<10.
    // Flag-FF entries into bonus worlds carry the ledger until their return.
    const effective=({2:12,13:2,6:14,15:6})[this.levelIndex]??this.levelIndex;
    const show=kind==='bonus'?this.levelIndex>=10&&BONUS.includes(this.levelIndex):effective<10;
    if(show)this.transition.tally=createTally(this);
    this.transitionTimer=0;this.emit('complete',{next,percent:pct});
  }
  stepTally(seconds){const t=this.transition;if(!t?.tally||t.ready)return;advanceTally(this,seconds);if(t.tally.phase==='done'){t.ready=true;this.emit('transitionReady',{transition:t});}}
  finish(type){if(this.transition)return;this.transition={type,delay:36};this.transitionTimer=0;this.emit(type);}
  advance(){if(!this.transition?.ready)return;const t=this.transition;if(t.type==='complete'){if(t.next>=this.assets.game.levels.length){this.transition=null;this.finish('ending');return;}const ledger=t.tally?null:this.foodCounts.slice();this.loadLevel(t.next);if(ledger)this.foodCounts.set(ledger);}else this.emit('finish',{type:t.type});}
  snapshot(){const p=this.player;return {level:this.levelIndex,frame:this.frame,x:p.x,y:p.y,vx:p.vx,vy:p.vy,sprite:p.sprite,grounded:p.grounded,playerState:[p.action,p.animationVariant,p.anim,p.marker||0,p.jumpFrame,p.jumpLock,p.fallFrames,p.lastGroundY,p.attackActive?1:0,p.attackCooldown,p.invulnerable,p.glideMode,p.glideEnergy,p.formAngle,p.runTimer,this.alternate?1:0,this.power,this.presentationTicks,this.godMode?1:0,p.platformId??-1],environmentState:[this.weatherTime,this.weather,this.weatherPointer,this.screenShake,this.nextScreenShake,this.shakePlayerNudge,this.player.landingShake,+this.gateDownConsumed,...this.rainSeeds,...this.movingBlocks.flatMap(b=>[b.index,b.pos,b.trigger,b.remaining])],platformState:this.platforms.flatMap(q=>[q.index,q.x,q.y,q.active?1:0,...q.raw.slice(6)]),projectiles:this.projectiles.map(a=>[a.x,a.y,a.vx,a.vy,a.sprite,a.anim||0,a.ttl]),score:this.score,health:this.health,lives:this.lives,actors:this.actors.map(a=>[a.x,a.y,a.sprite,a.hp,a.state]),rng:[this.rng.a,this.rng.b,this.rng.c,this.rng.w,this.rng.secondary],bossState:bosses.snapshot(this),camera:[this.camera.x,this.camera.y],collected:this.items.filter(i=>!i.active).map(i=>i.index),blocks:this.blocks.filter(b=>!b.active).map(b=>b.index),transition:this.transition?.type||null};}
  stateHash(){const s=this.snapshot();return fnv1a([s.level,s.frame,s.x,s.y,s.vx,s.vy,s.sprite,s.score,s.health,s.lives,...s.rng,...s.bossState,...s.environmentState,...s.platformState,...s.camera,...s.playerState,...s.projectiles.flat(),...s.actors.flat(),...s.collected,...s.blocks]);}
}

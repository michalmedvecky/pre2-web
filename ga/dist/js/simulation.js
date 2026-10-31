import {LOGIC} from './logic-data.js';
import {beginMagic,advanceMagic} from './magic.js';
import {OriginalSpeakerClock} from './speaker-clock.js';

// VGA page flip 0x9de2 waits for two vertical retraces; the nominal VGA
// scheduling rate is 35 Hz. Wall-clock equivalence is still under measurement.
export const TICK_RATE = 35;
export const TIMER_RATE = 1193182 / 32768;
export const TIMING = Object.freeze({nominalFrameHz:TICK_RATE,timerHz:TIMER_RATE,
  authority:'AXE 72a8,74fd,744c,5c1a,62b3,9de2',wallClockVerified:false});
export const STATES = Object.freeze({IDLE:0,WALK:1,RUN:2,JUMP:3,MAGIC:4,
  ATTACK:5,ATTACK2:6,ATTACK3:7,AIR_ATTACK:8,RUN_ATTACK:9,
  SPECIAL:12,KNOCKBACK:13,KNOCKDOWN:14,HURT:15,THROW:16,THROWN:17,MOUNTED:19});
const names=['idle','walk','run','jump','magic','attack','attack','attack','attack','attack',
  'attack','attack','attack','knockback','down','hurt','attack','hurt','idle','mounted'];
const signed16=v=>(v<<16)>>16;
// AXE 62b3: multiplication is repeated 16-bit ADD followed by arithmetic SAR.
export function nativeScale(value,timerTicks=1){return signed16(value*(Math.min(8,timerTicks)+1))>>1;}
export function directionFromInput(i){return LOGIC.directionLookup[(i.up?2:0)|(i.down?1:0)|(i.right?4:0)|(i.left?8:0)];}
export function originalScore(killPoints,usedPlayers,maxHealth=12){const totalTenths=Math.floor(Math.min(killPoints,9999)*12/maxHealth),used=Math.max(1,usedPlayers);return {totalTenths,usedPlayers:used,strengthTenths:Math.floor(totalTenths/used)+300,authority:'AXE183b'};}
export function mapFlags(word){const h=(word>>>8)&255;return {wall:!!(h&0x40),floor:!!(h&0x80),level:(h&0x38)>>>3};}
const intersects=(a,b)=>a.x+a.w>=b.x&&b.x+b.w>=a.x&&a.y+a.h>=b.y&&b.y+b.h>=a.y;
function frameRect(actor,rect){let [x,y,w,h]=rect;if(actor.direction>0&&actor.direction<5)x=-w-x;
  return {x:actor.x+x,y:actor.y-actor.z+y,w,h};}

export class Simulation {
  constructor({assets,mode='arcade',character='hero',players=1,character2='amazon',healthBars=3,stageIndex=0}={}){
    this.assets=assets||{maps:{},sprites:{}};this.mode=mode;this.character=character;this.character2=character2;this.playerCount=players===2?2:1;if(this.playerCount===2&&character===character2)throw new Error('Původní hra nepovoluje oběma hráčům stejnou postavu (AXE3c10).');
    if(!LOGIC.options.healthBars.includes(healthBars))throw new RangeError('Původní Life Meter nabízí 3, 4 nebo 5 polí.');this.healthBars=healthBars;this.playerHealth=(healthBars*4)&255;this.initialStage=stageIndex;this.reset();
  }
  reset(){this.nextID=1;this.timerFraction=0;this.lastInput={};this.tapHistory={};
    this.rng=[0x4a4a,0x5252,0x5353];this.magic=null;this.speakerClock=new OriginalSpeakerClock();this.speakerPITRemainder=0;
    this.state={tick:0,stage:'1',stageIndex:this.initialStage,camera:{x:0,y:0},entities:[],player:null,
      status:'playing',godMode:false,score:0,lives:this.mode==='duel'?1:3,credits:this.playerCount===2?4:3,players:[],events:[],limitations:[
      'Nominal VGA cadence; exact wall-clock replay comparison pending.',
      'Mounted/bonus/magic and special-enemy handlers are static ports; native runtime comparison remains limited to first movement/jump/attack samples.',
      'Remaining: full throw/tether reactions and exact IRQ phase scheduling; ending and original audio are separate ports.'],verifiedCompleteGame:false};
    this.loadStage(this.initialStage);return this.state;
  }
  loadStage(index){const s=this.state,previous=s.player,previousPlayers=s.players||[];s.stageIndex=index;
    s.stage=index>=16?String(index-15):index<9?String(index+1):String.fromCharCode(55+index);
    s.camera={x:LOGIC.cameraX[index]||0,y:LOGIC.cameraY[index]||0};if(this.mode==='duel'){s.stage='5';s.camera={x:536,y:152};}
    // Native6602 overwrites the map bank, then6e4c reloads only this stage's
    // sprite banks. Other shared banks persist until their next actual write.
    const stageRecords=this.mode==='duel'&&this.playerCount===2?[]:(LOGIC.stageSpriteLoads[this.mode]?.[index]||[]).map(v=>v.record);
    const paletteBase=id=>this.assets.paletteRecords?.[id]?.base;
    const mapBase=paletteBase(this.map()?.paletteRecord);
    s.paletteRecords=(s.paletteRecords||[]).filter(id=>paletteBase(id)!==mapBase);
    for(const record of stageRecords){const base=paletteBase(record);s.paletteRecords=s.paletteRecords.filter(id=>paletteBase(id)!==base);s.paletteRecords.push(record);}

    s.mapTileOverrides=[];s.mapRevision=0;this.doorFlags=[];this.doorTimer=0;
    s.entities=[];const type=Math.max(0,LOGIC.typeNames.indexOf(this.character));
    const p=this.createActor({type,x:LOGIC.startX[index]||8,y:LOGIC.startY[index]||174,health:previous?.health??this.playerHealth,player:true});
    p.magicPots=previous?.magicPots??1;p.killPoints=previous?.killPoints??0;p.deaths=previous?.deaths??0;p.maxHealth=this.mode==='duel'?32:this.playerHealth;p.lives=previous?.lives??(this.mode==='duel'?1:3);p.playerIndex=0;p.previousInput={};p.tapHistory={};p.eliminated=previous?.eliminated??false;p.removed=p.eliminated;if(this.mode==='duel'){p.eliminated=false;p.removed=false;p.lives=1;p.x=560;p.y=320;p.health=32;p.magicPots=0;p.level=this.tile(p.x,p.y).level;p.snapshotX=p.x;p.snapshotY=p.y;p.snapshotLevel=p.level;}s.player=p;s.players=[p];s.entities.push(p);
    if(this.playerCount===2){const old=previousPlayers[1],type2=Math.max(0,LOGIC.typeNames.indexOf(this.character2)),p2=this.createActor({type:type2,x:this.mode==='duel'?832:LOGIC.startX2[index],y:this.mode==='duel'?320:LOGIC.startY2[index],health:old?.health??(this.mode==='duel'?32:this.playerHealth),player:true});p2.playerIndex=1;p2.previousInput={};p2.tapHistory={};p2.lives=old?.lives??(this.mode==='duel'?1:3);p2.magicPots=old?.magicPots??(this.mode==='duel'?0:1);p2.killPoints=old?.killPoints??0;p2.deaths=old?.deaths??0;p2.eliminated=old?.eliminated??false;p2.removed=p2.eliminated;p2.maxHealth=this.mode==='duel'?32:this.playerHealth;if(this.mode==='duel'){p2.direction=6;p2.health=32;p2.lives=1;p2.magicPots=0;p2.eliminated=false;p2.removed=false;}s.players.push(p2);s.entities.push(p2);}this.script=LOGIC.scripts[this.mode]?.[this.mode==='duel'&&this.playerCount===2?15:index]||[];
    this.scriptPC=0;this.scriptWait=null;this.scrollLimit=s.camera.x;this.scrollMinimum=0;
    this.maxCameraY=Math.min((((this.map()?.height||26)-26)*8)&0xffff,200)-1;this.encounterFlag=0;
    if(!this.script.length){s.status='unimplemented-stage';s.events.push({kind:'missing-stage-script',index});}
    this.runScript();this.refresh(p);
  }
  map(){return this.assets.maps?.[this.state.stage.toLowerCase()];}
  tile(x,y){const m=this.map();if(!m?.cells)return {wall:false,floor:false,level:0,unknown:true};
    if(x<0||y<0||x>=m.width*8||y>=m.height*8)return {wall:false,floor:false,level:0};
    return mapFlags(m.cells[(y>>3)*m.width+(x>>3)]);}
  createActor({type,x,y,health=8,player=false,...extra}){
    const a={id:this.nextID++,typeId:type,type:LOGIC.typeNames[type],isPlayer:player,
      x,y,z:0,level:this.tile(x,y).level,vz:0,fallSpeed:0,direction:player?2:6,
      state:0,action:'idle',frame:0,frameTimer:0,transition:0,animationSlot:0,
      health,maxHealth:health,dead:false,lifecycle:extra.flag===3?1:0,blinkPhase:0,blinkHidden:false,removed:false,changed:true,facing:player?1:-1,
      combo:0,lastTarget:null,lastDistance:0,hitActive:true,invulnerability:player?18:0,
      revealDraw:extra.flag===2?0:-1,reveal:extra.flag===2?0:-1,decisionTimer:extra.aux||0,nativeWait:[10,11].includes(type)?540:[12,13].includes(type)?1080:extra.flag===1?180:extra.flag===3?18:0,aiCooldown:-1,variant:extra.variant||0,aux:extra.aux||0,
      breathFlame:extra.flag!==4,magicPots:[12,13].includes(type)?Math.floor(health/4):player?1:0,riderID:null,mountID:null,recovery:0,snapshotX:x,snapshotY:y,snapshotLevel:this.tile(x,y).level,snapshotCounter:4,cachedScreenX:x-this.state.camera.x,cachedScreenY:y-this.state.camera.y,...extra};
    this.refresh(a);return a;
  }
  frames(a){let slots=this.assets.sprites?.[a.type]?.slots;if(!slots)return [];
    const key=a.animationSlot;let slot=slots[key];if(!slot)slot=slots[LOGIC.slotAliases[key]??0]||slots[0];
    return slot?.frames||[];}
  metadata(a){const fs=this.frames(a);return fs[Math.min(a.frame,fs.length-1)]||null;}
  refresh(a){a.animationSlot=LOGIC.animationSlots[a.state*8+a.direction]??0;
    a.frame=0;a.transition=a.state===1?10:0;a.changed=false;
    this.syncFrame(a);if(![0,5,6,10,11,16].includes(a.state)){a.combo=0;a.lastTarget=null;}}
  syncFrame(a){a.frameTimer=this.metadata(a)?.duration||0;
    if(a.state===15)a.frameTimer=a.typeId===7?0:15;
    a.mirror=a.direction>0&&a.direction<5;a.facing=a.direction>0&&a.direction<5?1:-1;
    a.action=names[a.state]||'idle';a.nativeState=a.state;a.sprite=a.type;}
  setState(a,state){if(a.state!==state){a.state=state;a.changed=true;}}
  setDirection(a,d){if(d!==8&&a.direction!==d){const old=LOGIC.animationSlots[a.state*8+a.direction];a.direction=d;if(old!==LOGIC.animationSlots[a.state*8+d])a.changed=true;}}
  step(input={},nativeTimerTicks){this.advanceSpeakerPIT(nativeTimerTicks===undefined?undefined:Math.max(0,Math.min(8,nativeTimerTicks))*32768);const s=this.state;if(s.status==='continue'){this.doorTimer=Math.max(0,this.doorTimer-(nativeTimerTicks??1));s.continueTicks-=nativeTimerTicks??1;if(input.continue||input.players?.some(i=>i.continue))this.continueGame(true);else if(s.continueTicks<=0||input.decline)this.continueGame(false);return s;}if(s.status!=='playing')return s;
    s.tick++;s.events=[];this.timerFraction+=TIMER_RATE/TICK_RATE;
    const ticks=nativeTimerTicks??Math.min(8,Math.floor(this.timerFraction));
    if(nativeTimerTicks===undefined)this.timerFraction-=ticks;this.timerTicks=ticks;this.doorTimer=Math.max(0,this.doorTimer-ticks);
    if(this.magic){this.stepMagic(ticks);this.lastInput={...input};return s;}
    this.closeDoors();this.random();
    // AXE IRQ 744c decrements real-time countdowns; animation itself is per main loop.
    for(const a of s.entities){a.frameTimer=Math.max(0,a.frameTimer-ticks);a.nativeWait=Math.max(0,a.nativeWait-ticks);a.recovery=Math.max(0,a.recovery-ticks);}
    this.runScript();this.tryMounts();this.collectPickups();this.aiSlots=this.state.players.map(()=>[]);
    const p=s.player;
    for(const a of s.entities){if(a.removed||a.isEffect)continue;
      if(a.changed)this.refresh(a);
      const actorInput=input.players?.[a.playerIndex]||(a.playerIndex===0?input:{});
      const c=a.isPlayer?this.playerControl(a,actorInput):this.enemyControl(a,p);
      if(!([10,11].includes(a.typeId)&&a.riderID!=null))this.control(a,c);this.animate(a);this.move(a);
      a.cachedScreenX=a.x-s.camera.x;a.cachedScreenY=a.y-a.z-s.camera.y;
      if(a.isPlayer)a.previousInput={...actorInput};if(a.invulnerability>0)a.invulnerability--;if(a.reveal!==-1){const h=this.metadata(a)?.height||0,old=a.reveal;a.revealDraw=h<=old?-1:old;a.reveal=h<=old?-1:old+4;}
      if(--a.snapshotCounter<0){a.snapshotCounter=4;a.snapshotX=a.x;a.snapshotY=a.y;a.snapshotLevel=a.level;}
      a.action=names[a.state]||'idle';a.nativeState=a.state;a.mirror=a.direction>0&&a.direction<5;a.facing=a.mirror?1:-1;
    }
    this.updateRiders();this.updateCamera();this.resolveHits();this.prepareDrawAndCleanup();this.lastInput={...input};
    for(const player of s.players){if(player.removed&&!player.eliminated){player.lives--;if(player.lives>0)this.respawn(player);else if(this.mode!=='duel'&&s.credits>0){player.health=0;s.status='continue';s.continueActorID=player.id;s.continueTicks=8*18;}else player.eliminated=true;}}
    s.lives=p.lives;if(s.players.every(a=>a.eliminated)){s.status='game-over';this.calculateResults();}
    return s;
  }
  playerControl(a,i){const fresh=i.pressed,pressed=k=>fresh?!!fresh[k]:!!i[k]&&!a.previousInput?.[k];
    const direction=directionFromInput({...i,...Object.fromEntries(['up','down','left','right'].map(k=>[k,!!i[k]||!!fresh?.[k]]))});
    let attack=pressed('attack'),jump=pressed('jump'),magic=pressed('magic'),run=!!i.run;
    if(!i.explicitRun){const taps=a.runBindings??=Array.from({length:4},()=>({count:0,age:0})),makes=i.runBindingFresh||[pressed('left'),pressed('right'),false,false];
      for(let n=0;n<4;n++){const tap=taps[n];if(makes[n]){tap.age=0;tap.count=Math.min(5,tap.count+1);}else if(tap.age>=10)tap.count=0;else tap.age++;}
      if(direction!==8&&direction===a.direction){const index=taps.findIndex(t=>t.count>=2);if(index>=0){const side=index%2===0?6:2,screenX=a.cachedScreenX??a.x-this.state.camera.x;
        if(direction===side&&(side===6?screenX>=72:screenX<=248))run=true;else for(const tap of taps)tap.count=0;}}
    }
    let combo=0;if(a.lastTarget!=null){combo=a.lastDistance<31?(a.combo===0?0:a.combo===1?1:11):(a.combo===0?0:a.combo===1?1:a.combo===2?6:5);}
    if(this.scriptWait?.op===5)return {direction:2,attack:false,jump:false,magic:false,run:false,combo:0};
    return {direction,attack,jump,magic,run,combo};
  }
  enemyControl(a,p){const out={direction:8,attack:false,jump:false,magic:false,run:false,combo:0};
    if([14,15].includes(a.typeId)){out.direction=6;out.run=true;if(a.x-this.state.camera.x<1)a.removed=true;return out;}
    if(a.typeId===10||a.typeId===11){if(a.nativeWait>0){a.nativeWait--;return out;}if(a.riderID!=null)return out;out.direction=a.x-this.state.camera.x<160?6:2;out.run=true;if(a.x-this.state.camera.x<9||a.x-this.state.camera.x>311||a.y-this.state.camera.y<9||a.y-this.state.camera.y>191)a.removed=true;return out;}
    if([12,13].includes(a.typeId))return this.thiefControl(a);
    if(a.nativeWait===0&&a.lifecycle===1)a.lifecycle=0;
    if(a.reveal!==-1||a.nativeWait>0||a.dead||![0,1,2,3,19].includes(a.state))return out;
    // Ordinary skeleton/heninger/longmoan handlers all call 4d91/4dcc.
    // Special actor types remain visible but do not use invented replacement AI.
    if(![3,4,5,6,7,8,9].includes(a.typeId))return out;

    // AXE5c21 clears separate four-slot arrays each update. 4dcc evaluates
    // each player's next free goal and compares goal residuals, not actor distance.
    this.aiSlots??=this.state.players.map(()=>[]);
    const goals=this.state.players.filter(t=>!t.removed).map(t=>this.enemyGoal(a,t));
    const goal=goals.reduce((best,g)=>!best||g.distance<best.distance?g:best,null);
    if(!goal||goal.rank>=4||[13,14].includes(goal.player.state))return out;
    ({player:p}=goal);const {rank,dx,dy}=goal;
    this.aiSlots[p.playerIndex][rank]=a;a.targetPlayerID=p.id;a.goalSlot=rank;
    let {bits,faceBits}=goal;out.jump=goal.jump;out.direction=LOGIC.directionLookup[bits];
    if(bits===0){this.setDirection(a,a.x<=p.x?2:6);
      if(rank<2&&a.aiCooldown===0&&Math.abs(dx)<11&&Math.abs(dy)<11&&p.invulnerability===0&&p.level-a.level>=0&&p.level-a.level<2){out.attack=true;a.aiCooldown=-1;}
      else if(a.aiCooldown===-1)a.aiCooldown=a.variant;else if(a.aiCooldown>0)a.aiCooldown--;
    } else if(a.state===0&&a.aiCooldown!==0){a.aiCooldown=a.aiCooldown===-1?a.aux:Math.max(0,a.aiCooldown-1);out.direction=8;}
    else a.aiCooldown=-1;
    if(a.typeId===3&&out.attack){out.combo=p.state===15?(a.combo===0?6:5):0;a.combo=(a.combo+1)%3;}
    else if([4,5,9].includes(a.typeId)&&out.attack){out.combo=p.state===15&&a.combo?1:0;a.combo=(a.combo+1)%2;}
    if(a.typeId===6&&out.attack)out.combo=Math.abs(a.x-p.x)<LOGIC.aiNearDistance[6]?5:0;
    if(a.typeId===8&&out.attack)out.combo=Math.abs(a.x-p.x)<LOGIC.aiNearDistance[8]?1:0;
    if(a.typeId===3&&![13,14].includes(p.state)){const near=Math.abs(a.y-p.y)<6;if(rank<2&&a.state===0&&near&&Math.abs(a.x-p.x)<37)out.jump=true;if(a.state===2&&near&&Math.abs(a.x-p.x)<57)out.jump=true;if(a.state===3&&near&&Math.abs(a.x-p.x)<37)out.attack=true;}
    if(a.typeId===7&&a.state===0&&this.state.enemyMagicTrigger){out.magic=true;this.state.enemyMagicTrigger=false;}
    // AXE50xx: long straight approach can start a run inside the viewport.
    const sx=a.x-this.state.camera.x;
    if(bits&&a.typeId!==8&&Math.abs(dx)>119&&Math.abs(dy)<6&&sx>7&&sx<305)out.run=true;
    if(a.state===2&&rank===0&&a.typeId!==7&&Math.abs(dy)<11&&Math.abs(dx)<49&&a.level===p.level)out.attack=true;
    const faceDir=LOGIC.directionLookup[faceBits&15]; a.backward=false;
    if(out.direction!==8&&(LOGIC.backwardDirections[faceDir*8+out.direction]||0)>1){a.backward=true;out.direction=(out.direction+4)&7;out.run=false;if(a.state===2){this.setState(a,1);this.refresh(a);}}
    const t=this.tile(a.x+(out.direction===2?24:out.direction===6?-24:0),a.y);
    if(t.wall&&t.level>=a.level&&(a.direction===2||a.direction===6))out.jump=true;
    return out;
  }
  enemyGoal(a,p){const slots=this.aiSlots[p.playerIndex],existing=slots.indexOf(a),rank=existing<0?slots.length:existing;
    if(rank>=4)return {player:p,rank,distance:3200**2+2000**2};
    const type=a.state===19?this.state.entities.find(e=>e.id===a.mountID)?.typeId??a.typeId:a.typeId;
    const dist=(p.x===p.snapshotX&&p.y===p.snapshotY?LOGIC.aiNearDistance:LOGIC.aiFarDistance)[type]||0;
    let targetX=p.snapshotX,targetY=p.snapshotY;
    if(rank===0)targetX+=a.x>p.snapshotX?dist:-dist;
    if(rank===1)targetX+=p.snapshotX<=(slots[0]?.x??p.snapshotX)?-dist:dist;
    const adjustedPlayerY=p.snapshotY+this.levelHeight(p.snapshotLevel),adjustedY=a.y+this.levelHeight(a.level);
    if(rank===2)targetY+=adjustedY>adjustedPlayerY?20:-20;
    if(rank===3)targetY+=adjustedPlayerY<=(slots[2]?.x??p.snapshotX)?-20:20;
    const dx=a.x-targetX,dy=adjustedY-(targetY+this.levelHeight(p.snapshotLevel));
    let bits=0;if(Math.abs(dx)>=(rank>=2?41:11))bits|=dx<0?4:8;
    if(Math.abs(dy)>=(rank===1&&(bits&12)?21:6))bits|=dy<0?1:2;
    if(Math.abs(dy)<Math.abs(dx)&&Math.abs(dy)+(Math.abs(dy)>>2)<Math.abs(dx)&&Math.abs(dy)>5)bits&=12;
    else if(Math.abs(dx)+(Math.abs(dx)>>2)<Math.abs(dy)&&Math.abs(dx)>10)bits&=3;
    let faceBits=(a.x>p.snapshotX?8:4)|(a.y+this.levelHeight(a.level)<p.snapshotY+this.levelHeight(p.snapshotLevel)?1:2);
    const paths=this.navigate(a,bits,faceBits);bits=paths.bits;faceBits=paths.faceBits;
    return {player:p,rank,dx,dy,bits,faceBits,jump:paths.jump,distance:[13,14].includes(p.state)?3200**2+2000**2:dx*dx+dy*dy};
  }
  control(a,c){a.controlDirection=c.direction;if(a.health<=0||a.removed)return;
    if(a.state===19){this.controlRider(a,c);return;}
    // AXE4051: simultaneous attack+jump selects original special attack.
    if(c.attack&&c.jump&&[0,1].includes(a.state))this.setState(a,12);
    if(c.magic&&[0,1,2].includes(a.state)&&((a.magicPots||0)>0||a.typeId===7)){this.setState(a,4);this.refresh(a);this.magic=beginMagic(a);if(a.typeId===7){this.magic.type=LOGIC.bossSpellTypes[this.random()&7]||0;this.magic.boss=true;}this.emitEvents({kind:'magic-start',actor:a.id});return;}
    if(c.attack){if(a.state===3&&a.z!==0)this.setState(a,8);
      else if(a.state===2){this.setState(a,9);a.vz=10;}
      else if(a.state===0||a.state===1)this.setState(a,5+(c.combo||0));}
    if(c.jump&&a.z===0&&a.vz===0&&a.fallSpeed===0&&[0,1,2].includes(a.state)){
      a.vz=a.state===2?18:14;this.setState(a,3);a.frameTimer=255;}
    if(c.jump&&a.changed&&a.state===3)this.refresh(a);
    if(a.state===3&&a.transition===0){if(a.z===0&&a.vz===0)a.transition=LOGIC.stateDuration[3];
      else {a.frameTimer=255;a.frame=a.vz<0?1:0;}}
    if(a.state===9&&a.transition===0){if(a.z===0&&a.vz===0)a.transition=LOGIC.stateDuration[9];else a.frameTimer=255;}
    if(c.direction===8){if([1,2].includes(a.state)&&a.transition===0)a.transition=LOGIC.stateDuration[a.state];}
    else if(a.state===3){this.setDirection(a,c.direction);}
    else if([0,1,2].includes(a.state)){
      if(a.state===1&&c.run)this.setState(a,2);
      if(a.state===2){if(c.direction!==a.direction)this.setState(a,LOGIC.nextState[2]);}
      else {const oldSlot=LOGIC.animationSlots[a.state*8+a.direction],newSlot=LOGIC.animationSlots[8+c.direction];
        if(a.state!==1||oldSlot!==newSlot)this.setState(a,1);a.transition=0;this.setDirection(a,c.direction);}
    }
    // Ordinary input state changes load their animation at the next entity update (64a7).
  }
  animate(a){if(a.state===19){a.frameTimer=255;return;}const occupied=[10,11].includes(a.typeId)&&this.state.entities.some(r=>r.id===a.riderID&&r.state===19);
    if(occupied&&a.state===0)this.setState(a,1);
    if(a.transition){if(a.transition===1){if(a.state===12)a.direction=LOGIC.specialEndDirections[a.direction];if(a.state===13&&a.lifecycle===255){a.lifecycle=254;this.deathVoice(a);}this.setState(a,occupied?1:LOGIC.nextState[a.state]||0);this.refresh(a);}else a.transition--;return;}
    if(a.frameTimer>0)return;if(a.frame===0&&a.state>=5&&a.state<=9){const id=a.isPlayer?2:a.typeId===11?10:a.typeId===10?7:null;if(id!=null)this.emitEvents({kind:'sfx',id,actor:a.id,authority:'AXE5e41'});}
    const fs=this.frames(a);if(!fs.length)return;
    let next=a.frame+1;
    if(a.state===15){a.transition=LOGIC.stateDuration[15];return;}
    if(a.state===11&&(a.frame===2||a.frame===4))this.emitEvents({kind:'sfx',id:4,actor:a.id,authority:'AXE5e78'});
    if(next>=fs.length){a.hitActive=true;if(a.typeId===17||a.typeId===16&&a.state===0){a.removed=true;return;}
      
      if([0,1,2].includes(a.state))next=0;
      else {a.transition=LOGIC.stateDuration[a.state]||1;return;}}
    a.frame=next;this.syncFrame(a);if(a.state===14){a.invulnerability=18;if(a.lifecycle===254)a.lifecycle=253;}
  }
  deathVoice(a){const id=a.typeId===0||a.typeId===9?0:a.typeId<9?1:null;
    if(id!=null)this.emitEvents({kind:'sfx',id,actor:a.id,authority:'AXE5d7b→2cfe'});}
  prepareDrawAndCleanup(){for(const a of this.state.entities){
    const flag=a.lifecycle||0;
    if(flag!==0&&flag!==255&&flag!==253){a.blinkPhase=(a.blinkPhase||0)^128;a.blinkHidden=!!(a.blinkPhase&128);}else a.blinkHidden=flag===253;
    const sx=a.x-this.state.camera.x,offscreen=([12,13].includes(a.typeId)&&a.nativeWait===0&&(sx>=304||sx<=16))||([18,19,14,15,16].includes(a.typeId)&&sx<=0)||(a.typeId===16&&sx>=312);
    if(!a.removed&&(flag===253||(a.y&0xffff)>640||offscreen)){if(a.isPlayer&&this.state.godMode&&(a.y&0xffff)>640){this.recoverSafe(a);continue;}a.removed=true;this.emitEvents({kind:'actor-removed',actor:a.id,authority:'AXE298c'});}
    if(a.removed){for(const other of this.state.entities){if(other.lastTarget===a.id)other.lastTarget=null;if(other.riderID===a.id)other.riderID=null;if(other.mountID===a.id)other.mountID=null;}}
  }this.state.entities=this.state.entities.filter(a=>a.isPlayer||!a.removed);}
  advanceSpeakerPIT(counts){
    if(counts===undefined){this.speakerPITRemainder+=1193182;counts=Math.floor(this.speakerPITRemainder/TICK_RATE);this.speakerPITRemainder%=TICK_RATE;}
    this.speakerClock.advancePIT(counts);return this.speakerClock.snapshot();
  }
  acceptSpeakerEvents(events){for(const e of events){if(e.kind==='sfx')this.speakerClock.play(e.id);else if(e.kind==='sfx-loop-start')this.speakerClock.play(e.id,{loop:true});else if(e.kind==='sfx-stop')this.speakerClock.stop();}}
  emitEvents(...events){this.acceptSpeakerEvents(events);this.state.events.push(...events);}
  levelHeight(level){return LOGIC.groundHeight[this.state.stageIndex*8+level]||0;}
  applyDoorPatch(offset,door){const patch=LOGIC.doorPatches[String(offset)],m=this.map();if(!patch||!m?.cells)return;
    const overrides=new Map(this.state.mapTileOverrides.map(p=>[p.index,p.value]));
    for(let y=0;y<patch.height;y++)for(let x=0;x<patch.width;x++){const index=((door.y??patch.y)+y)*m.width+(door.x??patch.x)+x;
      if(index<0||index>=m.cells.length)continue;const byte=patch.tiles[y*patch.width+x],tile=byte?byte+(door.page<<8):0;
      overrides.set(index,((overrides.get(index)??m.cells[index])&0xf801)|((tile&0x3ff)<<1));}
    this.state.mapTileOverrides=[...overrides].map(([index,value])=>({index,value}));this.state.mapRevision++;
    for(const a of this.state.entities){const flag=a.lifecycle||0;if(flag!==0&&flag!==255&&flag!==253){a.blinkPhase=(a.blinkPhase||0)^128;a.blinkHidden=!!(a.blinkPhase&128);}else a.blinkHidden=flag===253;}
    this.emitEvents({kind:'map-patch',offset,actors:structuredClone(this.state.entities),overrides:structuredClone(this.state.mapTileOverrides),revision:this.state.mapRevision,authority:'AXE6c77→69a5'});
  }
  openDoor(flag){const door=LOGIC.doors[String(flag)];if(!door)return;this.emitEvents({kind:'sfx',id:11,authority:'AXE3552→6af2/6b44/6aa9'});
    for(const offset of door.open)this.applyDoorPatch(offset,door);if(!this.doorFlags.includes(flag))this.doorFlags.push(flag);this.doorTimer=door.timer;
  }
  closeDoors(){if(this.doorTimer!==0)return;for(const flag of [6,7,8])if(this.doorFlags.includes(flag)){const door=LOGIC.doors[String(flag)];
      this.emitEvents({kind:'sfx',id:11,authority:'AXE03bc→6bdf/6c2b/6b96'});for(const offset of door.close)this.applyDoorPatch(offset,door);
      this.doorFlags=this.doorFlags.filter(f=>f!==flag);if(flag===8)this.doorTimer=27;}
  }
  move(a){if(a.removed||a.state===19)return;
    if(a.state===17&&a.frame!==1){const owner=this.state.entities.find(e=>e.id===a.followActorID);if(owner&&!owner.removed){a.x=owner.x;a.y=owner.y-1;a.z=owner.z+32;a.frame=0;a.frameTimer=255;if(owner.frame<this.frames(owner).length-1)return;}a.frame=1;a.vz=12;return;}
    if(a.z<=0&&a.vz===0&&a.fallSpeed>0){a.backward=false;this.fall(a);return;}
    const airborne=a.z>0||a.vz!==0;if(airborne)a.backward=false;
    if([9,13,17].includes(a.state)&&(a.z>0||a.vz!==0)){a.frameTimer=255;if(a.state===13)a.frame=a.vz<0?1:0;}
    let vx=0,vy=0;if(a.z>0||a.vz!==0||a.fallSpeed===0&&a.transition===0){const dir=a.backward?(a.direction+4)&7:a.direction;vx=LOGIC.vx[a.state*8+dir]||0;vy=LOGIC.vy[a.state*8+dir]||0;}
    if([12,13].includes(a.typeId)&&a.z===0&&a.vz===0&&[1,2].includes(a.state)&&a.transition===0){vx=LOGIC.thiefVX[a.direction];vy=LOGIC.thiefVY[a.direction];}
    if(a.typeId===14&&!airborne&&a.transition===0)vx--;
    // AXE5fea..5ff4: both original pickup types halve airborne horizontal speed.
    if([18,19].includes(a.typeId)&&(a.z>0||a.vz!==0))vx>>=1;
    if((a.z>0||a.vz!==0)&&![9,13,17].includes(a.state)&&a.controlDirection===8){vx=0;vy=0;}
    let dx=nativeScale(vx,this.timerTicks),dy=nativeScale(vy,this.timerTicks);
    const x=a.x+dx,y=a.y+dy,ground=this.tile(x,y-(a.z>0?a.z:0));
    const wall=ground.wall&&ground.level>=a.level&&(!(a.z>0||a.vz!==0)||this.tile(x,y).wall);
    const m=this.map(),boundaryX=!airborne&&wall?a.x:x,boundaryY=!airborne&&wall?a.y:y;
    let boundary=dy<0&&boundaryY<0||dy>0&&boundaryY>Math.min((m?.height||28)*8-1,this.maxCameraY+195)||dx<0&&boundaryX<0||dx>0&&boundaryX>(m?.width||200)*8-1;
    const viewportBound=a.isPlayer||this.state.entities.some(r=>r.id===a.riderID&&r.isPlayer)||[12,13].includes(a.typeId)&&a.nativeWait>0;
    if(viewportBound&&dx){const bonus=this.state.stageIndex>=16,left=bonus?0:56,right=bonus?320:264;if(dx<0&&boundaryX<this.state.camera.x+left)boundary=true;
      if(dx>0&&(boundaryX>this.scrollLimit+right||boundaryX>this.state.camera.x+right))boundary=true;}
    const thiefVoid=[12,13].includes(a.typeId)&&a.z===0&&a.vz===0&&!ground.floor&&ground.level<=1;
    if([12,13].includes(a.typeId)&&(wall||boundary||thiefVoid))a.decisionTimer=0;
    if(!wall&&!boundary&&!thiefVoid){a.x=x;a.y=y;}
    else if(a.typeId===16){this.setState(a,0);this.refresh(a);}
    else if(!airborne&&a.state===2){if(boundary)this.setState(a,1);else if(wall&&a.transition===0)a.transition=LOGIC.stateDuration[2];}
    if(a.z>0||a.vz!==0){let dz=nativeScale(a.vz,this.timerTicks);if(a.typeId!==16)a.vz-=nativeScale(2,this.timerTicks);
      while(dz!==0){const delta=dz<0?Math.max(-8,dz):dz;dz-=delta;a.z+=delta;
        let rebased=false;if(delta>=0){const height=this.levelHeight(a.level+1)-this.levelHeight(a.level);if(height<=a.z){a.z-=height;a.y-=height;a.level++;rebased=true;}}
        if((delta<0||rebased&&a.vz<=0)&&a.z<8){const floor=this.tile(a.x,a.y);
          if(floor.floor&&a.level===floor.level||a.level<1){this.land(a);break;}
          if(floor.wall&&a.level<=floor.level){a.fallSpeed=-a.vz;a.y-=a.z;a.z=0;a.vz=0;break;}
          const height=this.levelHeight(a.level)-this.levelHeight(a.level-1);a.y+=height;a.z+=height;a.level--;}}
    }
    // AXE6291 tests CX/BX even after a refused thief void step; only a wall
    // path6220 restored CX/BX to the old position. This starts the native
    // in-place fall from a roof edge instead of trapping the thief there.
    else if(!(wall?this.tile(a.x,a.y):this.tile(x,y)).floor){a.fallSpeed=2;}
    else if(a.isPlayer&&!this.tile(a.x,a.y).wall)a.lastSafe={x:a.x,y:a.y,level:a.level};
  }
  fall(a){const m=this.map();let dy=nativeScale(a.fallSpeed,this.timerTicks);
    while(dy>0){const delta=Math.min(8,dy);a.y+=delta;dy-=delta;if(this.tile(a.x,a.y).floor){this.land(a);return;}}
    a.fallSpeed+=nativeScale(2,this.timerTicks);
    if(a.isPlayer&&this.state.godMode&&a.y>(m?.height||28)*8+64)this.recoverSafe(a);
  }
  land(a){a.z=0;a.vz=0;a.fallSpeed=0;const floor=this.tile(a.x,a.y);if(floor.floor)a.level=floor.level;
    if(a.typeId===16){this.setState(a,0);this.refresh(a);return;}
    if(a.state===8){this.setState(a,3);this.refresh(a);a.frame=1;}
    if([3,9,13,17].includes(a.state)){a.frameTimer=0;a.transition=LOGIC.stateDuration[a.state]||1;}
  }
  resolveHits(){const es=this.state.entities.filter(a=>!a.removed);
    // AXE2e41 visits unordered pairs. The first actor determines depth tolerance;
    // a forward hit skips reciprocal evaluation, a reverse hit ends this row.
    for(let i=0;i<es.length-1;i++)for(let j=i+1;j<es.length;j++){
      const a=es[i],b=es[j],depth=[10,11,16,17].includes(a.typeId)?14:7;
      if(Math.abs(a.y+this.levelHeight(a.level)-b.y-this.levelHeight(b.level))>depth)continue;
      if(a.hitActive&&this.tryHit(a,b))continue;
      if(b.hitActive&&this.tryHit(b,a))break;
    }
  }
  missHit(a,b){if(a.isPlayer&&a.lastTarget===b.id&&a.frame>=this.frames(a).length-1)a.combo=0;return false;}
  tryHit(a,b){
    // AXE2ee2 permits NPC→NPC only for a mount/projectile owned by a player.
    const rider=this.state.players.find(p=>p.id===a.riderID);
    if((!a.isPlayer&&!b.isPlayer&&(![10,11,16,17].includes(a.typeId)||!rider))||[13,14,17].includes(b.state)||
      [10,11].includes(a.typeId)&&(![5,9].includes(a.state)||a.riderID===b.id)||[12,13].includes(b.typeId)&&b.nativeWait===0)return this.missHit(a,b);
    const ma=this.metadata(a),mb=this.metadata(b);if(!ma?.attackRect||!mb?.collisionRect)return this.missHit(a,b);
    const ar=frameRect(a,ma.attackRect),br=frameRect(b,mb.collisionRect);
    if(ar.w<2||br.w<2||!intersects(ar,br))return this.missHit(a,b);
    if([18,19].includes(b.typeId)){this.takePickup(b,a);return this.missHit(a,b);}
    if(b.isPlayer&&this.state.godMode)return false;
        if(b.state===16){const victim=this.state.entities.find(v=>v.followActorID===b.id);if(victim){victim.vz=10;this.setState(victim,13);this.refresh(victim);}}
        this.emitEvents({kind:'sfx',id:3,actor:b.id,authority:'AXE308a'});if(b.isPlayer){b.combo=0;b.lastTarget=null;}a.hitActive=false;b.hitActive=true;b.backward=false;if(![12,13].includes(b.typeId))b.nativeWait=0;const wasMounted=b.mountID!=null;if(b.mountID!=null)this.detachRider(b);const hitOrigin=[16,17].includes(a.typeId)?this.state.entities.find(e=>e.id===(a.ownerID??a.riderID))||a:a;b.direction=hitOrigin.x<=b.x?6:2;
        if(a.isPlayer){a.combo=b.state===15&&a.lastTarget===b.id?a.combo+1:0;a.lastTarget=b.id;a.lastDistance=Math.max([6,7,8].includes(b.typeId)?31:0,Math.abs(a.x-b.x));}
        const knock=wasMounted||[12,13].includes(b.typeId)||[6,7,8,10,11,16,17].includes(a.typeId)||[8,9,10].includes(a.state)||b.isPlayer&&b.state===15&&b.frame+1>=this.frames(b).length;
        if(knock){b.vz=10;this.setState(b,13);this.refresh(b);}
        else if(b.state!==15){this.setState(b,15);this.refresh(b);}else {b.frame++;b.frameTimer=15;if(b.frame>=this.frames(b).length)b.frame=0;}
        if([12,13].includes(b.typeId)){this.dropPickup(b);b.nativeWait=b.magicPots>0?1080:0;}
        const damage=[12,13].includes(b.typeId)?0:LOGIC.damage[a.typeId*16+([16,17].includes(a.typeId)?5:a.state)]||0;b.health=Math.max(0,b.health-damage);
        if(a.typeId===16){this.setState(a,0);this.refresh(a);}
        if(a.state===16){b.followActorID=a.id;b.vz=0;this.setState(b,17);this.refresh(b);}
        if(b.health===0){if(a.isPlayer){a.killPoints=(a.killPoints||0)+(b.parameter||0);this.state.score=a.killPoints;}b.dead=true;b.lifecycle=255;b.vz=10;this.setState(b,13);this.refresh(b);}
        if(a.typeId===7&&this.state.stageIndex===7)this.state.enemyMagicTrigger=true;
        this.emitEvents({kind:'hit',attacker:a.id,target:b.id,damage,source:'AXE2ee2/frameheaders'});
    return true;
  }
  updateCamera(){if(this.mode==='duel')return;const s=this.state,m=this.map(),ps=s.players.filter(a=>!a.removed);if(!ps.length)return;
    const left=Math.min(...ps.map(p=>p.x-s.camera.x)),right=Math.max(...ps.map(p=>p.x-s.camera.x));
    const top=Math.min(...ps.map(p=>p.y-p.z-s.camera.y)),bottom=Math.max(...ps.map(p=>p.y-p.z-s.camera.y));
    if(s.camera.x<this.scrollMinimum&&left>39)s.camera.x+=2;
    else if(this.cameraFollowX&&right>159&&left>56&&s.camera.x<=Math.min((m?.width||40)*8-320,this.scrollLimit))s.camera.x+=2;
    if(right>169)this.cameraFollowX=true;
    if(s.camera.y>this.maxCameraY&&top<171)s.camera.y-=2;
    else if(this.cameraFollowY){this.cameraFollowY=false;
      if(top<91&&s.camera.y>1&&bottom<152){s.camera.y-=2;this.cameraFollowY=true;}
      if(bottom>129&&top>48&&s.camera.y<=Math.min((m?.height||26)*8-208,this.maxCameraY)&&s.camera.y+2<=this.maxCameraY){s.camera.y+=2;this.cameraFollowY=true;}}
    if(bottom<61||bottom>169)this.cameraFollowY=true;
  }



  jumpToStage(index,{preserveGodMode=true}={}){const mainMax=this.mode==='arcade'?7:this.mode==='beginner'?2:this.playerCount===2?1:14;
    const valid=Number.isInteger(index)&&(index>=0&&index<=mainMax||this.mode!=='duel'&&index>=16&&index<=(this.mode==='arcade'?19:18));
    if(!valid)return {ok:false,reason:'invalid-stage-for-mode'};const god=preserveGodMode&&this.state.godMode;this.initialStage=index;this.reset();
    this.state.godMode=!!god;this.state.cheated=true;this.state.diagnosticCheats=['LEVEL'];return {ok:true,index};
  }
  setGodMode(enabled){this.state.godMode=!!enabled;return this.state.godMode;}
  toggleGodMode(){return this.setGodMode(!this.state.godMode);}
  findSafeFloor(){const m=this.map();for(let y=this.state.camera.y+110;y<(m?.height||28)*8;y+=8){
    for(const side of [-1,1])for(let i=0;i<16;i++){const x=this.state.camera.x+160+side*i*8,t=this.tile(x,y);if(t.floor&&!t.wall)return {x,y,level:t.level};}}
    return null;
  }
  recoverSafe(p){const last=p.lastSafe,t=last&&this.tile(last.x,last.y),safe=t?.floor&&!t.wall?last:this.findSafeFloor();
    if(!safe){this.state.status='unverified-respawn';return false;}
    if(p.mountID!=null)this.detachRider(p);Object.assign(p,safe,{z:0,vz:0,fallSpeed:0,removed:false,dead:false,state:0,backward:false});this.refresh(p);return true;
  }
  teleport(playerIndex,x,y){const p=this.state.players[playerIndex],m=this.map();x=Math.round(x);y=Math.round(y);
    if(!p||p.eliminated||!Number.isFinite(x)||!Number.isFinite(y)||x<0||y<0||x>=(m?.width||0)*8||y>=(m?.height||0)*8)return {ok:false,reason:'outside-map'};
    const tile=this.tile(x,y);if(!tile.floor||tile.wall)return {ok:false,reason:'not-walkable-floor'};
    if(p.mountID!=null)this.detachRider(p);Object.assign(p,{x,y,z:0,vz:0,fallSpeed:0,level:tile.level,state:0,backward:false,lastSafe:{x,y,level:tile.level}});this.refresh(p);
    this.state.camera.x=Math.max(0,Math.min(x-160,m.width*8-312));this.state.camera.y=Math.max(0,Math.min(y-100,m.height*8-200));
    this.emitEvents({kind:'teleport',playerIndex,x,y});return {ok:true,x,y,level:tile.level};
  }

  navigate(a,bits,faceBits){let candidate=bits,jump=false;
    const blocked=(mask)=>{const d=LOGIC.directionLookup[mask&15],x=a.x+LOGIC.navigationX[d],y=a.y+LOGIC.navigationY[d];
      const feet=this.tile(x,y);if(!feet.wall||feet.level<a.level)return false;
      const upper=this.tile(x,y-56);if(!upper.wall||upper.level<a.level){jump=true;return false;}return true;};
    if((bits&15)!==0&&blocked(bits)){
      const choices=(bits&12)?[bits&12,bits&3,faceBits&3,1,2]:[bits&3,faceBits&12,faceBits&3,8,4];candidate=0;
      for(const mask of choices)if(mask&&!blocked(mask)){candidate=mask;break;}}
    if(candidate!==0&&(a.navigationDelay||0)>0){a.navigationDelay--;faceBits=LOGIC.directionBits[a.direction]||0;}
    else a.navigationDelay=4;
    return {bits:candidate,faceBits,jump};
  }

  thiefControl(a){const c={direction:8,attack:false,jump:false,magic:false,run:false,combo:0};
    const sx=a.x-this.state.camera.x,sy=a.y-this.state.camera.y;if(a.nativeWait>0)a.nativeWait--;else a.magicPots=0;
    if(a.nativeWait===0&&(sx<17||sx>303)){a.removed=true;return c;}
    if(a.state===13||a.state===14)return c;
    if(a.decisionTimer>0){a.decisionTimer--;if(a.state!==0)c.direction=a.direction;return c;}
    if(a.state===1&&a.nativeWait>0){this.setState(a,0);this.refresh(a);a.decisionTimer=54;return c;}
    const fleeing=a.nativeWait===0||a.magicPots<1;this.setState(a,fleeing?2:1);this.refresh(a);
    const maxX=(this.map()?.width||40)*8-320;
    let bits=fleeing?(this.state.camera.x>maxX-8||this.state.stageIndex===3||sx<160&&this.state.camera.x>=8?8:4):(sx<160?4:8),original=bits;
    const valid=(dx,dy)=>{const t=this.tile(a.x+dx,a.y+dy);return t.floor&&(!t.wall||t.level===a.level);};
    if(!valid(bits===4?12:-12,0))bits=0;
    let v=this.rng[0]&7,validVertical;
    if(sy<=130){v+=8;validVertical=valid(0,12);if(!validVertical&&a.nativeWait>0){v-=8;validVertical=valid(0,-12);}}
    else {validVertical=valid(0,-12);if(!validVertical){v+=8;validVertical=valid(0,12);}}
    if(validVertical){if(bits===0)v&=8;bits|=LOGIC.thiefVertical[v];}
    else if(bits===0)bits=original^4;
    c.direction=LOGIC.directionLookup[bits&15];if(c.direction!==8)a.direction=c.direction;c.run=fleeing;a.decisionTimer=2+(this.random()&3);return c;
  }

  playerOwned(a){return a.isPlayer||this.state.entities.some(r=>r.id===a.riderID&&r.isPlayer)||this.state.entities.some(r=>r.id===a.ownerID&&r.isPlayer);}
  tryMounts(){for(const a of this.state.entities){if(a.removed||![0,1,2,4,5,9].includes(a.typeId)||![0,1].includes(a.state))continue;
    for(const m of this.state.entities){if(m.removed||![10,11].includes(m.typeId)||m.riderID!=null||m.nativeWait===0)continue;
      if(a.level!==m.level||Math.abs(a.x-m.x)>16||Math.abs(a.y-m.y)>16)continue;
      a.mountID=m.id;m.riderID=a.id;a.direction=m.direction;a.x=m.x+(LOGIC.mountBoardX[m.direction]||0);a.y=m.y+1;
      this.setState(a,20);this.refresh(a);this.emitEvents({kind:'mount',rider:a.id,mount:m.id});break;
    }}
  }
  controlRider(rider,c){const m=this.state.entities.find(a=>a.id===rider.mountID);if(!m||m.removed){this.detachRider(rider);return;}
    if(c.magic&&rider.magicPots>0&&m.z===0){this.detachRider(rider);m.nativeWait+=72;m.state=0;this.refresh(m);rider.z=Math.max(0,rider.z-(m.typeId===10?18:32));this.setState(rider,4);this.refresh(rider);this.magic=beginMagic(rider);return;}
    // AXE4051 mounted branch: attack is handled before jump. It has no
    // simultaneous special12 or airborne attack8 path for mounts.
    if(c.attack){if(m.state===2){this.setState(m,9);m.vz=10;}
      else if(m.state===0||m.state===1){this.setState(m,5);this.refresh(m);if(m.typeId===11)this.spawnProjectile(m,rider);}}
    this.control(m,{...c,attack:false,magic:false});
    rider.direction=m.direction;
  }
  detachRider(rider){const m=this.state.entities.find(a=>a.id===rider.mountID);if(m)m.riderID=null;rider.mountID=null;if(rider.state===19||rider.state===20){this.setState(rider,0);this.refresh(rider);}}
  updateRiders(){for(const m of this.state.entities){if(![10,11].includes(m.typeId)||m.riderID==null)continue;
    const r=this.state.entities.find(a=>a.id===m.riderID);if(!r||r.state!==19)continue;
    let k=Math.min(3,m.frame)+(m.typeId===11?4:0),dx=LOGIC.mountRiderX[k]||0;
    if(LOGIC.mountDirectionFlags[m.direction]&1)dx=-dx;
    m.backward=r.backward;r.x=m.x+dx;r.y=m.y+1;r.z=m.z+(LOGIC.mountRiderZ[k]||0);r.level=m.level;r.direction=m.direction;r.frame=0;
    if(m.typeId===10&&m.state===5){k=((m.direction-1)&4)+m.frame;r.frame=LOGIC.mountAttackFrame[k]||0;r.direction=LOGIC.mountAttackDirection[k]||0;r.x+=LOGIC.mountAttackX[k]||0;}
    r.cachedScreenX=r.x-this.state.camera.x;r.cachedScreenY=r.y-r.z-this.state.camera.y;
  }}
  spawnProjectile(m,rider){const flame=m.breathFlame,type=flame?17:16;
    const p=this.createActor({type,x:m.x+(flame?LOGIC.projectileFlameX:LOGIC.projectileFireballX)[m.direction],y:m.y-1,health:0});
    p.direction=m.direction;p.z=m.z+44;p.level=m.level;p.snapshotX=p.x;p.snapshotY=p.y;p.snapshotZ=p.z;p.snapshotLevel=p.level;p.state=flame?0:9;p.ownerID=rider.id;p.riderID=rider.id;p.vz=0;this.refresh(p);this.state.entities.push(p);
  }
  collectPickups(){for(const item of this.state.entities){if(item.removed||![18,19].includes(item.typeId)||item.z!==0)continue;
    for(const p of this.state.entities.filter(a=>a.isPlayer&&!a.removed)){if(p.z>40||item.level!==p.level||Math.abs(p.x-item.x)>20||Math.abs(p.y-item.y)>20)continue;
      this.takePickup(item,p);break;}}
  }

  takePickup(item,p){if(item.typeId===18)p.magicPots=Math.min(LOGIC.maxPots[p.typeId]||0,(p.magicPots||0)+1);else p.health=Math.min(this.playerHealth,p.health+4);
    item.removed=true;this.emitEvents({kind:'sfx',id:9,actor:p.id,authority:'AXE2632'});this.emitEvents({kind:'pickup',actor:p.id,type:item.type});}
  random(){const [a,b,c]=this.rng,na=((a<<1)|(c&1))&65535,nb=((b<<1)|(a>>>15))&65535;
    this.rng=[na,nb,(c&65534)|((b>>>15)^((nb>>>13)&1))];return na;
  }
  stepMagic(ticks){const m=this.magic,p=this.state.entities.find(a=>a.id===m.casterID);
    this.state.entities=this.state.entities.filter(a=>!a.isEffect);
    const result=advanceMagic(m,ticks,()=>this.random(),{speakerIdle:this.speakerClock.isIdle});this.emitEvents(...result.events);
    for(const [i,v] of result.visual.entries())this.state.entities.push({id:10000+i,isEffect:true,type:`magic${m.type}2`,sprite:`magic${m.type}2`,animationSlot:0,frame:v.frame,mirrored:v.mirrored,x:this.state.camera.x+v.x,y:this.state.camera.y+v.y,z:0});
    if(result.done){this.state.entities=this.state.entities.filter(a=>!a.isEffect);
      const damage=m.boss?4:(p.magicPots||0)*2;
      for(const e of this.state.entities){if((m.boss?!e.isPlayer:e.isPlayer)||[10,11,14,15,16,17,18,19,20].includes(e.typeId)||e.removed)continue;
        if(e.isPlayer&&this.state.godMode)continue;if(e.mountID!=null)this.detachRider(e);
        if(e.state!==13&&!(e.state===14&&e.frame===0)){
          if([12,13].includes(e.typeId)){if(e.nativeWait>0)e.nativeWait=1080;}else e.nativeWait=0;
          e.vz=10;this.setState(e,13);this.refresh(e);this.emitEvents({kind:'sfx',id:3,actor:e.id,authority:'AXE1e8e'});
        }
        if([12,13].includes(e.typeId)){if(e.magicPots>0){this.dropPickup(e);this.emitEvents({kind:'sfx',id:8,actor:e.id,authority:'AXE1ea2/1eb9'});}continue;}
        e.health=Math.max(0,e.health-damage);e.dead=e.health===0;
        if(e.dead){e.lifecycle=255;if(e.state===14){e.lifecycle=254;this.deathVoice(e);}p.killPoints=(p.killPoints||0)+(e.parameter||0);this.state.score=p.killPoints;}

      }
      p.magicPots-=this.mode==='beginner'?Math.ceil(p.magicPots/2):p.magicPots;
      this.magic=null;this.emitEvents({kind:'magic-end',damage,source:'AXE1dc6/1e35'});
    }
  }
  dropPickup(thief){if((thief.magicPots||0)<1)return;
    const type=thief.typeId===12?18:19,p=this.createActor({type,x:thief.x,y:thief.y,health:1});
    p.z=thief.z;p.level=thief.level;p.snapshotX=p.x;p.snapshotY=p.y;p.snapshotZ=p.z;p.snapshotLevel=p.level;
    p.direction=(thief.direction+4)&7;p.state=13;p.vz=22;p.isPickup=true;this.refresh(p);this.state.entities.push(p);
    thief.magicPots--;if(thief.magicPots===0)thief.nativeWait=0;
  }

  transitionPlan(){const index=this.state.stageIndex,source=index>=16?index-16:index;
    // Main0000 invokes18a9 after bonus return, except stage4/5/6 and Duel.
    if(this.mode==='duel'||index<16&&index<4||[4,5,6].includes(source))return null;
    const n=LOGIC.travel.counts[source]||0;
    return {kind:'travel',sourceStageIndex:source,map:LOGIC.travel.map,audioSelector:11,waitTimerTicks:90,
      actors:Array.from({length:n},(_,i)=>({type:'oldmap',animationSlot:0,frame:LOGIC.travel.frames[i],x:LOGIC.travel.x[i],y:LOGIC.travel.y[i]})),authority:'AXE0000/18a9/190e'};
  }
  advanceStage(){if(this.state.status!=='stage-complete'&&!(this.mode==='duel'&&this.state.status==='duel-result'))return false;
    const index=this.state.stageIndex;
    const last=this.mode==='arcade'?7:this.mode==='beginner'?2:this.playerCount===1?14:1;
    if(this.mode==='duel'){if(index>=last){this.calculateResults();this.state.status='ending-incomplete';return false;}this.state.status='playing';this.loadStage(index+1);return true;}
    if(index>=16){if(index-16>=last){this.calculateResults();this.state.status='ending-incomplete';return false;}this.state.status='playing';this.loadStage(index-15);return true;}
    if(index>=last&&index>=4){this.calculateResults();this.state.status='ending-incomplete';this.state.message='Původní zakončení ještě není převedeno.';return false;}
    this.state.status='playing';this.loadStage(index<4?index+16:index+1);return true;
  }


  calculateResults(){this.state.results=this.state.players.map(p=>{const score=originalScore(p.killPoints||0,(p.deaths||0)+1,this.playerHealth);
    let rank=0;while(rank<LOGIC.scoreRankThresholds.length&&score.strengthTenths>=LOGIC.scoreRankThresholds[rank])rank++;
    return {...score,character:p.type,playerIndex:p.playerIndex,rank};});return this.state.results;
  }

  continueGame(accept){const s=this.state;if(s.status!=='continue')return false;const p=s.players.find(a=>a.id===s.continueActorID);
    if(accept&&s.credits>0){s.credits--;p.lives=3;this.respawn(p);s.status='playing';s.lives=s.player.lives;return true;}
    p.eliminated=true;s.status=s.players.every(a=>a.eliminated)?'game-over':'playing';if(s.status==='game-over')this.calculateResults();return false;
  }

  respawn(p){const m=this.map();let safe=null;
    // AXE2d85: DX=16 leftward probes, then DX is zero so the apparent
    // rightward loop is unreachable. BX +=8 wraps as a 16-bit word; stopping
    // at map bottom incorrectly turns a valid wrapped search into game-over.
    for(let row=0;row<8192&&!safe;row++){const y=(this.state.camera.y+110+row*8)&65535;
      for(let i=0;i<16;i++){const x=(this.state.camera.x+160-i*8)&65535;if(this.tile(x,y).floor){safe={x,y};break;}}}
    if(!safe){this.state.status='unverified-respawn';this.emitEvents({kind:'missing-safe-floor'});return;}
    Object.assign(p,safe,{z:0,vz:0,fallSpeed:0,health:this.playerHealth,dead:false,lifecycle:0,blinkPhase:0,blinkHidden:false,removed:false,state:0,direction:2,invulnerability:18,combo:0,lastTarget:null,hitActive:true,mountID:null});
    p.deaths++;p.level=this.tile(p.x,p.y).level;p.snapshotX=p.x;p.snapshotY=p.y;p.snapshotLevel=p.level;this.refresh(p);
  }

  runScript(){if(this.state.status!=='playing')return;
    if(this.scriptWait){const c=this.scriptWait,p=this.state.player;
      if(c.op===0&&Math.max(...this.state.players.filter(a=>!a.removed).map(a=>a.x))<c.x||c.op===2&&this.state.entities.some(a=>!a.isPlayer&&!a.isEffect&&!a.removed&&![10,11,16,17,18,19,20].includes(a.typeId))||c.op===5&&this.state.players.some(a=>!a.removed&&a.x<((a.playerIndex===1?LOGIC.entryX2:LOGIC.entryX)[this.state.stageIndex]||0)))return;
      if(c.op===9){if(this.state.players.filter(a=>!a.eliminated&&!a.removed).length>1)return;this.state.status='duel-result';this.calculateResults();return;}
      if(c.op===8){c.remaining=Math.max(0,c.remaining-(this.timerTicks||0));if(c.remaining>0)return;}
      this.scriptWait=null;
    }
    for(let guard=0;guard<100&&this.scriptPC<this.script.length;guard++){
      const c=this.script[this.scriptPC++];
      if(c.op===0){this.scrollLimit=c.scrollLimit;this.scriptWait=c;return;}
      if(c.op===1){if([6,7,8].includes(c.flag))this.openDoor(c.flag);const a=this.createActor({...c,health:this.mode==='beginner'&&![12,13].includes(c.type)?c.health>>>1:c.health,player:false});a.hitActive=true;this.state.entities.push(a);this.emitEvents({kind:'spawn',actor:a.id,type:a.type,offset:c.offset});}
      if(c.op===2){this.encounterFlag=c.value;this.scriptWait=c;return;}
      if(c.op===3){this.state.status='stage-complete';this.emitEvents({kind:'stage-complete',index:this.state.stageIndex});return;}
      if(c.op===4){const record=this.assets.paletteCommandRecords?.[c.value];if(Number.isInteger(record)){const base=this.assets.paletteRecords?.[record]?.base;this.state.paletteRecords=(this.state.paletteRecords||[]).filter(id=>this.assets.paletteRecords?.[id]?.base!==base);this.state.paletteRecords.push(record);}this.emitEvents({kind:'palette-command',value:c.value,offset:c.offset});}
      if(c.op===5){this.scriptWait=c;return;}
      if(c.op===6)this.maxCameraY=c.value;
      if(c.op===7)this.scrollMinimum=c.value;
      if(c.op===8){this.scriptWait={...c,remaining:c.value};return;}
      if(c.op===9){this.scriptWait=c;return;}
    }
  }
}

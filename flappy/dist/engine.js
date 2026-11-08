// Flappy uses 6 × 9 pixel half cells; the original level records use 40 columns.
export const DEFAULT_STAGE = 1;
export const FIELD_WIDTH = 40;
export const FIELD_HEIGHT = 20;
export const OBJECT_SIZE = 2;
export const TICK_MS = 113;
export const INITIAL_LIVES = 5;
export const INITIAL_TIME = 1500;
export const DIRECTIONS = Object.freeze({up:{dx:0,dy:-1},down:{dx:0,dy:1},left:{dx:-1,dy:0},right:{dx:1,dy:0}});
const DEATH_TICKS = 12;
const SLEEP_TICKS = 239;
const overlaps = (a,b,aw=2,ah=2,bw=2,bh=2) => a.x < b.x+bw && a.x+aw > b.x && a.y < b.y+bh && a.y+ah > b.y;
const sign = value => Math.sign(Number(value) || 0);
const point = source => ({x:Number(source.halfX ?? source.x),y:Number(source.halfY ?? source.y)});

export class FlappyEngine {
  constructor(levels, stage=DEFAULT_STAGE) {
    this.levels = Array.isArray(levels) ? levels : levels.levels;
    if (!Array.isArray(this.levels) || !this.levels.length) throw new Error('Missing Flappy level data.');
    this.options = {enemies:true};
    this.reset(stage);
  }

  reset(stage=this.stage, options={}) {
    const level = this.levels.find(level => level.number === Number(stage));
    if (!level) throw new RangeError(`Stage ${stage} does not exist.`);
    const retainedLives = this.lives;
    this.options = {...this.options,...options};
    this.stage = level.number;
    this.level = level;
    this.brickMasks = [...level.brickMasks];
    this.lives = options.keepLives ? retainedLives : (options.lives ?? INITIAL_LIVES);
    this.time = INITIAL_TIME;
    this.moves = 0;
    this.ammo = 0;
    this.ticks = 0;
    this.status = 'playing';
    this.deathTicks = 0;
    this.fireCooldown = 0;
    this.randomSeed = (0x6d2b79f5 ^ this.stage) >>> 0;
    this.player = {...point(level.player),dir:'right'};
    this.goal = point(level.goalPlate);
    this.objects = [{id:'egg',kind:'egg',...point(level.egg),falling:false,breaking:0},...level.rocks.map((rock,i)=>({id:`rock-${i}`,kind:'rock',...point(rock),falling:false,breaking:0}))];
    this.enemies = this.options.enemies === false ? [] : [
      ...level.ghosts.map((enemy,i)=>({id:`ghost-${i}`,kind:'ghost',...point(enemy),sleep:0,alive:true,dir:i%2?'left':'right',motion:0})),
      ...level.frogs.map((enemy,i)=>({id:`frog-${i}`,kind:'frog',...point(enemy),sleep:0,alive:true,dir:'left',motion:0}))
    ];
    this.mushrooms = level.mushrooms.map((mushroom,i)=>({id:`mushroom-${i}`,...point(mushroom),alive:true}));
    this.shots = [];
    this.events = [{type:'start',stage:this.stage}];
    this.savePreviousPositions();
    return this;
  }

  advance() {
    if (this.status !== 'won') return false;
    const next = this.levels.find(level => level.number === this.stage+1);
    if (!next) return false;
    this.reset(next.number,{keepLives:true});
    return true;
  }

  random() {
    let x=this.randomSeed;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    this.randomSeed = x >>> 0;
    return this.randomSeed / 0x100000000;
  }

  isBrick(x,y) {
    x=Math.floor(x); y=Math.floor(y);
    if (x<0 || x>=FIELD_WIDTH || y<0 || y>=FIELD_HEIGHT) return true;
    return this.brickMasks[Math.floor(y/2)][x] === '1';
  }

  hitsBrick(x,y,width=2,height=2) {
    for(let iy=Math.floor(y);iy<Math.ceil(y+height);iy++) {
      for(let ix=Math.floor(x);ix<Math.ceil(x+width);ix++) if(this.isBrick(ix,iy)) return true;
    }
    return false;
  }

  objectAt(x,y,exclude=null,width=2,height=2) {
    return this.objects.find(object => object!==exclude && overlaps({x,y},object,width,height));
  }

  savePreviousPositions() {
    for(const entity of [this.player,...this.objects,...this.enemies,...this.shots]) {
      entity.prevX=entity.x; entity.prevY=entity.y;
    }
  }

  step(input={}) {
    this.events=[];
    this.savePreviousPositions();
    if(this.status==='dead') {
      if(--this.deathTicks<=0) {
        const remaining=this.lives;
        this.reset(this.stage,{lives:remaining});
        this.events=[{type:'respawn',x:this.player.x,y:this.player.y}];
      }
      return this;
    }
    if(this.status!=='playing') return this;
    this.ticks++;
    this.time--;
    if(this.time<=0) {this.time=0;this.die('time');return this;}
    if(this.fireCooldown>0) this.fireCooldown--;
    for(const enemy of this.enemies) if(enemy.sleep>0) enemy.sleep--;
    for(const object of [...this.objects]) {
      if(object.breaking>0 && --object.breaking===0) {
        this.objects.splice(this.objects.indexOf(object),1);
        this.events.push({type:'break',x:object.x,y:object.y});
      }
    }

    let dx=sign(input.dx),dy=sign(input.dy);
    if(dx && dy) dy=0;
    if(dx || dy) {
      this.player.dir = dx<0?'left':dx>0?'right':dy<0?'up':'down';
      this.movePlayer(dx,dy);
    }
    this.collectMushrooms();
    if(input.fire && this.fireCooldown===0) this.fire();
    this.updateShots();
    this.updateDroppedMushrooms();
    this.checkEnemies();
    if(this.status!=='playing') return this;
    this.applyGravity();
    if(this.status!=='playing') return this;
    if(this.checkGoal()) return this;
    if(this.ticks%2===0) this.moveEnemies();
    this.checkEnemies();
    return this;
  }

  movePlayer(dx,dy) {
    const next={x:this.player.x+dx,y:this.player.y+dy};
    if(this.hitsBrick(next.x,next.y)) return false;
    const object=this.objectAt(next.x,next.y);
    if(object) {
      // At an odd half-row the player may touch two stacked objects at once.
      // Check the whole destination before changing either object's position.
      if(this.objectAt(next.x,next.y,object)) return false;
      // Eggs and rocks may only be pushed sideways, never lifted.
      if(object.breaking) return false;
      if(!dx) {
        if(object.kind==='rock') {
          object.breaking=3;
          this.events.push({type:'crack',x:object.x,y:object.y});
        }
        return false;
      }
      const ox=object.x+dx;
      if(this.hitsBrick(ox,object.y) || this.objectAt(ox,object.y,object)) {
        if(object.kind==='rock') {
          object.breaking=3;
          this.events.push({type:'crack',x:object.x,y:object.y});
        }
        return false;
      }
      object.x=ox;
      this.events.push({type:'push',x:object.x,y:object.y,kind:object.kind});
    }
    this.player.x=next.x;this.player.y=next.y;
    this.moves++;
    this.events.push({type:'move',x:next.x,y:next.y});
    return true;
  }

  collectMushrooms() {
    for(const mushroom of this.mushrooms) if(mushroom.alive && overlaps(this.player,mushroom,2,2,1,1)) {
      mushroom.alive=false;this.ammo++;
      this.events.push({type:'pickup',x:mushroom.x,y:mushroom.y});
    }
  }

  fire() {
    if(this.ammo<=0) return false;
    const {dx,dy}=DIRECTIONS[this.player.dir];
    const shot={id:`shot-${this.ticks}`,x:this.player.x+.5+dx*1.5,y:this.player.y+.5+dy*1.5,dx,dy,range:dy<0?6:15};
    if(this.hitsBrick(shot.x,shot.y,1,1) || this.objectAt(shot.x,shot.y,null,1,1)) return false;
    this.shots.push(shot);
    shot.prevX=shot.x;shot.prevY=shot.y;
    this.ammo--;this.fireCooldown=4;
    this.events.push({type:'shoot',x:shot.x,y:shot.y});
    return true;
  }

  updateShots() {
    for(const shot of [...this.shots]) {
      let consumed=false;
      let spent=false;
      for(let halfstep=0;halfstep<2 && !consumed;halfstep++) {
        const enemy=this.enemies.find(enemy=>enemy.alive && overlaps(shot,enemy,1,1));
        if(enemy) {
          enemy.sleep=SLEEP_TICKS;
          this.events.push({type:'sleep',x:enemy.x,y:enemy.y});
          consumed=true;
        } else if(this.hitsBrick(shot.x,shot.y,1,1) || this.objectAt(shot.x,shot.y,null,1,1) || shot.range<=0) {consumed=true;spent=true;}
        else {shot.x+=shot.dx;shot.y+=shot.dy;shot.range--;}
      }
      if(consumed) {
        this.shots.splice(this.shots.indexOf(shot),1);
        if(spent) {
          let x=shot.x,y=shot.y;
          if(this.hitsBrick(x,y,1,1) || this.objectAt(x,y,null,1,1)) {x-=shot.dx;y-=shot.dy;}
          if(!this.hitsBrick(x,y,1,1) && !this.objectAt(x,y,null,1,1)) this.mushrooms.push({id:`dropped-${this.ticks}-${this.mushrooms.length}`,x,y,alive:true,falling:true});
        }
      }
    }
  }

  updateDroppedMushrooms() {
    for(const mushroom of this.mushrooms) if(mushroom.alive && mushroom.falling) {
      if(!this.hitsBrick(mushroom.x,mushroom.y+1,1,1) && !this.objectAt(mushroom.x,mushroom.y+1,null,1,1)) mushroom.y++;
      else mushroom.falling=false;
    }
    this.collectMushrooms();
  }

  applyGravity() {
    // Bottom-up order lets a stack fall together without overlapping objects.
    const falling=[...this.objects].sort((a,b)=>b.y-a.y);
    for(const object of falling) {
      if(object.breaking) {object.falling=false;continue;}
      const ny=object.y+1;
      if(this.hitsBrick(object.x,ny) || this.objectAt(object.x,ny,object)) {
        if(object.falling) this.events.push({type:'land',x:object.x,y:object.y,kind:object.kind});
        object.falling=false;
        continue;
      }
      object.falling=true;
      object.y=ny;
      for(const enemy of this.enemies) if(enemy.alive && overlaps(object,enemy)) {
        enemy.alive=false;
        this.events.push({type:'crush',x:enemy.x,y:enemy.y});
      }
      if(overlaps(object,this.player)) {this.die('crush');return;}
    }
  }

  enemyCanMove(enemy,dx,dy) {
    const next={x:enemy.x+dx,y:enemy.y+dy};
    return !this.hitsBrick(next.x,next.y) && !this.objectAt(next.x,next.y) && !this.enemies.some(other=>other!==enemy && other.alive && overlaps(next,other));
  }

  seesPlayer(enemy) {
    if(Math.abs(enemy.y-this.player.y)>=2 || Math.abs(enemy.x-this.player.x)>10) return 0;
    const dx=sign(this.player.x-enemy.x);
    if(!dx) return 0;
    for(let x=enemy.x+dx;x!==this.player.x;x+=dx) if(this.hitsBrick(x,enemy.y)) return 0;
    return dx;
  }

  moveEnemies() {
    for(const enemy of this.enemies) {
      if(!enemy.alive || enemy.sleep>0) continue;
      let choices=[];
      if(enemy.kind==='frog') {
        const horizontal={dx:sign(this.player.x-enemy.x),dy:0};
        const vertical={dx:0,dy:sign(this.player.y-enemy.y)};
        choices=this.random()<.5?[horizontal,vertical]:[vertical,horizontal];
      } else {
        const playerDirection=this.seesPlayer(enemy);
        if(playerDirection) choices.push({dx:playerDirection,dy:0});
        const forward=DIRECTIONS[enemy.dir];
        if(enemy.motion>0) choices.push(forward);
        const directions=Object.values(DIRECTIONS).map(direction=>({...direction,sort:this.random()})).sort((a,b)=>a.sort-b.sort);
        choices.push(...directions);
      }
      for(const {dx,dy} of choices) {
        if(!(dx||dy) || !this.enemyCanMove(enemy,dx,dy)) continue;
        enemy.x+=dx;enemy.y+=dy;
        enemy.dir=dx<0?'left':dx>0?'right':dy<0?'up':'down';
        enemy.motion=enemy.motion>0?enemy.motion-1:1+Math.floor(this.random()*7);
        break;
      }
    }
  }

  checkEnemies() {
    if(this.enemies.some(enemy=>enemy.alive && enemy.sleep<=0 && overlaps(this.player,enemy))) this.die('enemy');
  }

  checkGoal() {
    const egg=this.objects.find(object=>object.kind==='egg');
    if(egg && egg.x===this.goal.x && egg.y+OBJECT_SIZE===this.goal.y && !egg.falling) {
      this.status='won';
      this.events.push({type:'win',x:egg.x,y:egg.y});
      return true;
    }
    return false;
  }

  die(cause) {
    if(this.status!=='playing') return;
    this.lives=Math.max(0,this.lives-1);
    this.status=this.lives?'dead':'gameover';
    this.deathTicks=DEATH_TICKS;
    this.events.push({type:'death',cause,x:this.player.x,y:this.player.y});
  }

  serialize() {
    return JSON.parse(JSON.stringify({stage:this.stage,lives:this.lives,time:this.time,moves:this.moves,ammo:this.ammo,status:this.status,ticks:this.ticks,goal:this.goal,player:this.player,objects:this.objects,enemies:this.enemies,mushrooms:this.mushrooms,shots:this.shots,events:this.events}));
  }
}

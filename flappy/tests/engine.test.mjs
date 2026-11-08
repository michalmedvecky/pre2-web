import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FlappyEngine,INITIAL_LIVES,INITIAL_TIME,TICK_MS} from '../dist/engine.js';

const source=JSON.parse(readFileSync(new URL('../dist/levels.json',import.meta.url),'utf8'));
const at=(x,y)=>({halfX:x,halfY:y});
function level(overrides={}) {
  return {number:1,brickMasks:Array.from({length:10},()=>`1${'0'.repeat(38)}1`),player:at(1,18),egg:at(20,18),goalPlate:at(33,20),rocks:[],ghosts:[],frogs:[],mushrooms:[],...overrides};
}
function game(overrides={}) {const engine=new FlappyEngine([level(overrides)],1);return engine;}
function tick(engine,dx=0,dy=0,fire=false) {engine.step({dx,dy,fire});return engine;}

test('a new game without an explicit stage starts in original sector 1',()=>{
  const engine=new FlappyEngine(source);
  assert.equal(engine.stage,1);
  assert.deepEqual(engine.brickMasks,source.levels[0].brickMasks);
  assert.deepEqual([engine.objects[0].x,engine.objects[0].y],[source.levels[0].egg.halfX,source.levels[0].egg.halfY]);
  assert.equal(new FlappyEngine(source,9).stage,9,'explicit stage selection is preserved');
});

test('original stage9 and all200 extracted scenes load without a replacement map',()=>{
  assert.equal(source.levels.length,200);
  const engine=new FlappyEngine(source,9);
  assert.equal(engine.stage,9);
  assert.deepEqual([engine.player.x,engine.player.y],[1,0]);
  assert.deepEqual([engine.objects[0].x,engine.objects[0].y],[23,0]);
  assert.deepEqual(engine.goal,{x:33,y:20});
  assert.equal(engine.objects.filter(object=>object.kind==='rock').length,6);
  assert.equal(engine.enemies.length,4);
  assert.equal(engine.mushrooms.length,6);
  assert.equal(engine.lives,5);assert.equal(engine.time,1500);assert.equal(TICK_MS,113);
  for(let stage=1;stage<=200;stage++) {
    engine.reset(stage);
    assert.equal(engine.brickMasks.length,10);
    assert.ok(engine.brickMasks.every(row=>row.length===40));
    for(let y=0;y<20;y++) {assert.equal(engine.isBrick(0,y),true);assert.equal(engine.isBrick(39,y),true);}
  }
});

test('original stage9 is solvable through ordinary inputs, gravity and two rock supports',()=>{
  const engine=new FlappyEngine(source,9);
  engine.reset(9,{enemies:false});
  // This route first builds supports from the rocks at (31,0) and (33,10).
  // Enemies are disabled to isolate the puzzle/physics proof from enemy timing.
  const route='RRRRRRRRURRRRRRRRRRRRDDDDRRDDRRRRRRRRUURRUUUULLLLRRRRDDDDRRDDDDDDDDDLLLLLLLLUUUULLLLUULLUUUURRRRUUUUUUURRDDDDDDDDLLDRRDDDDDRRDDUDDDRRDDR';
  const directions={R:[1,0],L:[-1,0],U:[0,-1],D:[0,1]};
  for(const action of route) {
    const [dx,dy]=directions[action];
    engine.step({dx,dy});
    assert.notEqual(engine.status,'dead');
    assert.notEqual(engine.status,'gameover');
  }
  assert.equal(engine.status,'won');
  assert.equal(engine.lives,5);assert.equal(engine.time,1364);
  assert.deepEqual([engine.objects[0].x,engine.objects[0].y],[33,18]);
  assert.deepEqual(engine.brickMasks,source.levels[8].brickMasks);
});

test('full sprite collision prevents walking through half-width walls and diagonals',()=>{
  const walls=level().brickMasks;walls[9]='1001'+'0'.repeat(35)+'1';
  const engine=game({brickMasks:walls});
  tick(engine,1,1);
  assert.deepEqual([engine.player.x,engine.player.y],[1,18]);
  assert.equal(engine.moves,0);
  tick(engine,0,-1);
  assert.equal(engine.player.y,17);
});

test('Flappy flies freely and cannot lift or destroy the white egg',()=>{
  const engine=game({player:at(10,10),egg:at(10,8)});
  tick(engine,0,-1);
  assert.equal(engine.player.y,10);
  assert.equal(engine.objects[0].x,10);
  assert.equal(engine.objects[0].breaking,0);
  assert.equal(engine.status,'dead','a falling egg crushes the player below it');
  const free=game();tick(free,0,-1);tick(free,0,-1);
  assert.equal(free.player.y,16,'player is not subject to gravity');
});

test('horizontal push moves egg and Flappy together; an obstructed egg stays intact',()=>{
  const engine=game({player:at(16,18),egg:at(18,18)});
  tick(engine,1);
  assert.deepEqual([engine.player.x,engine.objects[0].x],[17,19]);
  engine.player.x=35;engine.objects[0].x=37;
  tick(engine,1);
  assert.equal(engine.objects[0].x,37);assert.equal(engine.objects[0].breaking,0);
  assert.equal(engine.player.x,35);
});

test('a blocked move touching two stacked rocks cannot move either rock',()=>{
  const engine=game({player:at(1,17),rocks:[at(3,16),at(3,18)]});
  tick(engine,1);
  assert.equal(engine.player.x,1);
  assert.deepEqual(engine.objects.filter(object=>object.kind==='rock').map(object=>object.x),[3,3]);
  assert.ok(!engine.events.some(event=>event.type==='push'));
});

test('dark rock shatters after3 cycles when pushed into a wall or touched vertically',()=>{
  const engine=game({player:at(35,18),rocks:[at(37,18)]});
  tick(engine,1);assert.equal(engine.objects[1].breaking,3);
  tick(engine);tick(engine);assert.equal(engine.objects.length,2);
  tick(engine);assert.equal(engine.objects.length,1);
  assert.ok(engine.events.some(event=>event.type==='break'));
  const vertical=game({player:at(6,16),rocks:[at(6,18)]});
  tick(vertical,0,1);assert.equal(vertical.objects[1].breaking,3);
  assert.equal(vertical.player.y,16);assert.equal(vertical.status,'playing');
});

test('falling objects crush enemies, and a sleeping enemy is safe to cross',()=>{
  const engine=game({rocks:[at(10,15)],ghosts:[at(10,17)]});
  tick(engine);
  assert.equal(engine.enemies[0].alive,false);
  assert.ok(engine.events.some(event=>event.type==='crush'));
  const safe=game({player:at(1,18),ghosts:[at(3,18)]});
  safe.enemies[0].sleep=20;
  tick(safe,1);assert.equal(safe.status,'playing');assert.equal(safe.enemies[0].sleep,19);
});

test('mushroom pickup supplies a sleeping shot; blocked shots keep ammo',()=>{
  const engine=game({player:at(1,18),mushrooms:[at(2,19)],ghosts:[at(6,18)]});
  tick(engine);assert.equal(engine.ammo,1);assert.equal(engine.mushrooms[0].alive,false);
  tick(engine,0,0,true);
  tick(engine);
  assert.equal(engine.ammo,0);assert.ok(engine.enemies[0].sleep>230);
  assert.equal(engine.status,'playing');
  const blocked=game({player:at(1,18)});blocked.ammo=1;blocked.player.dir='left';
  tick(blocked,0,0,true);assert.equal(blocked.ammo,1);assert.equal(blocked.shots.length,0);
});

test('egg wins only when its bottom rests on the matching goalplate',()=>{
  const engine=game({egg:at(33,17)});
  tick(engine);assert.equal(engine.status,'playing');
  tick(engine);assert.equal(engine.status,'won');
  assert.ok(engine.events.some(event=>event.type==='win'));
  const wrong=game({egg:at(32,18)});tick(wrong);assert.equal(wrong.status,'playing');
});

test('timeout costs exactly one life, respawns with retained lives, and restart restores5',()=>{
  const engine=game();engine.time=1;tick(engine);
  assert.equal(engine.status,'dead');assert.equal(engine.lives,INITIAL_LIVES-1);
  for(let i=0;i<12;i++) tick(engine);
  assert.equal(engine.status,'playing');assert.equal(engine.lives,4);assert.equal(engine.time,INITIAL_TIME);
  engine.lives=1;engine.time=1;tick(engine);
  assert.equal(engine.status,'gameover');assert.equal(engine.lives,0);
  for(let i=0;i<15;i++) tick(engine);assert.equal(engine.status,'gameover');
  engine.reset();assert.equal(engine.lives,5);assert.equal(engine.status,'playing');
});

test('stage advance retains lives and serialization cannot mutate live state',()=>{
  const first=level({egg:at(33,18)}),second=level({number:2});
  const engine=new FlappyEngine([first,second],1);engine.lives=3;tick(engine);
  assert.equal(engine.advance(),true);assert.equal(engine.stage,2);assert.equal(engine.lives,3);
  const snapshot=engine.serialize();snapshot.player.x=999;snapshot.objects[0].x=999;
  assert.equal(engine.player.x,1);assert.equal(engine.objects[0].x,20);
  assert.equal(engine.advance(),false);
});

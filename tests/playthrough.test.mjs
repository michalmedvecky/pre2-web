import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {World} from '../dist/js/engine.js';
import {Presentation} from '../dist/js/presentation.js';
import {inputFromMask} from '../dist/js/compat.js';
const root=new URL('../dist/',import.meta.url),json=async n=>JSON.parse(await readFile(new URL(n,root),'utf8')),buf=async n=>new Uint8Array(await readFile(new URL('assets/'+n,root)));
const assets={game:await json('assets/game.json'),rules:await json('rules.json'),tables:await buf('tables.bin'),maps:{},footers:{}};
for(const l of assets.game.levels){assets.maps[l.id]=await buf(l.map);assets.footers[l.id]=await buf(l.footer);}
const fixtures=JSON.parse(await readFile(new URL('fixtures/playthroughs.json',import.meta.url),'utf8'));
function replay(f,presentation=null){let lost=0;const w=new World(assets,{onEvent:e=>{if(e.type==='lifeLost')lost++;}});w.loadLevel(f.level);w.toggleGodMode();const gates=new Set(),native=w.checkGates;
 w.checkGates=function(){const pos=this.tilePos(this.player.x,this.player.y),x=this.player.x,y=this.player.y;native.call(this);if(x!==this.player.x||y!==this.player.y){const gate=this.gates.find(g=>g.active&&g.triggerTile===pos);if(gate)gates.add(gate.index);}};
 let ticks=0;for(const [mask,count]of f.rle){assert.ok(mask>=0&&mask<=63);for(let n=0;n<count;n++){presentation?.beforeStep(w);w.step(inputFromMask(mask));presentation?.afterStep(w);if(presentation){presentation.sample(w,.25,1/120);presentation.sample(w,.75,1/60);}ticks++;if(w.transition)break;}if(w.transition)break;}
 assert.equal(lost,0);assert.equal(w.health,3);assert.equal(w.godMode,true);for(const gate of f.gates)assert.ok(gates.has(gate),`missing gate ${gate}`);return {w,ticks};
}
for(const f of fixtures.stages)test(`input-only IDDQD completion: stage ${f.id}, including authored next-stage transition`,()=>{const {w,ticks}=replay(f);assert.equal(ticks,f.ticks);assert.ok(w.transition);assert.equal(w.transition.type,f.transition.type);assert.equal(w.transition.next,f.transition.next);
 if([2,8].includes(f.level)){assert.equal(w.boss.active,false);assert.ok(w.boss.hp<0);assert.ok(w.inventory2&2);}
 if(f.level===5){assert.equal(w.specialBoss.stage,3);assert.equal(w.specialBoss.active,false);assert.ok(w.inventory2&2);}
 if(f.level===9)assert.equal(w.finalBoss.hp,0);
 if(f.transition.type==='complete'){for(let i=0;i<w.transition.delay;i++)w.step({});w.advance();assert.equal(w.levelIndex,f.transition.next);assert.equal(w.godMode,true);}
});
for(const f of fixtures.branches)test(`input-only secret branch: ${f.source}`,()=>{const {w}=replay(f);if(f.next!==undefined){assert.equal(w.transition.type,'complete');assert.equal(w.transition.next,f.next);}if(f.source==='qa8g-room3-edge.json')assert.ok(w.brokenBlocks>=19);});

test('presentation leaves campaign and secret-route simulation hashes unchanged',()=>{for(const f of [...fixtures.stages,...fixtures.branches])assert.equal(replay(f,new Presentation()).w.stateHash(),replay(f).w.stateHash(),f.source||f.id);});

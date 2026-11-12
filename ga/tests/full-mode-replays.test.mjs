import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Simulation} from '../dist/js/simulation.js';

const fixture=JSON.parse(await readFile(new URL('./fixtures/full-mode-replays.json',import.meta.url)));
const assets=JSON.parse(await readFile(new URL('../dist/assets/game.json',import.meta.url)));
for(const map of Object.values(assets.maps)){
  const bytes=await readFile(new URL('../dist/assets/'+map.cellsFile,import.meta.url));
  map.cells=Uint16Array.from({length:bytes.length/2},(_,i)=>bytes.readUInt16LE(i*2));
}
const decode=(mask,present)=>Object.fromEntries(fixture.packing.keys.flatMap((key,i)=>(present&(1<<i))?[[key,!!(mask&(1<<i))]]:[]));
for(const recorded of fixture.cases){
  test('full legal world replay reaches its source ending: '+recorded.id,()=>{
    const sim=new Simulation({assets,mode:recorded.mode,...recorded.options});
    const boundaries=[];let ticks=0;
    const advanceBoundary=()=>{
      const status=sim.state.status;
      if(status==='stage-complete'||status==='duel-result'){
        boundaries.push({t:ticks,index:sim.state.stageIndex,event:status});
        sim.advanceStage();
      }
    };
    for(const row of recorded.inputs){
      const first=decode(row[1],row[2]);
      const input=recorded.options.players===2?{players:[first,decode(row[3],row[4])]}:first;
      for(let count=0;count<row[0];count++){
        advanceBoundary();
        if(sim.state.status==='continue'){
          const player=sim.state.players.find(a=>a.id===sim.state.continueActorID);
          sim.continueGame(!(recorded.options.p2Continue==='decline'&&player?.playerIndex===1));
        }
        assert.equal(sim.state.status,'playing',recorded.id+' stopped before input '+ticks);
        sim.step(input);ticks++;
      }
    }
    advanceBoundary();
    assert.equal(ticks,recorded.expected.ticks);
    assert.equal(sim.state.tick,ticks);
    assert.equal(sim.state.stageIndex,recorded.expected.stageIndex);
    assert.equal(sim.state.status,recorded.expected.status);
    assert.deepEqual(boundaries,recorded.expected.boundaries);
    assert(!sim.state.cheated,'normal traversal does not use a diagnostic cheat');
    const players=sim.state.entities.filter(a=>a.isPlayer);
    assert.equal(players.length,recorded.expected.players.length);
    for(let i=0;i<players.length;i++){
      const expected=recorded.expected.players[i];
      assert.deepEqual(Object.fromEntries(Object.keys(expected).map(key=>[key,players[i][key]])),expected,recorded.id+' final player '+i);
    }
  });
}

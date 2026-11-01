// Mirrors Renderer.render/drawEntity palette composition without touching state.
import {resolveSpriteFrame} from './sprite-frame-identity.js';
import {nativeMapPaletteRecord} from './native-map-palette.js';
export function statePaletteRequests(assets,renderer,state,{limit=8}={}){
 const map=state.mapOverride||assets.maps[String(state.stage||'1').toLowerCase()];if(!map)return[];
 const actors=[...(state.entities||[])];if(state.player&&!actors.includes(state.player))actors.push(state.player);
 const defaults=[assets.sprites.score.defaultPaletteRecord,assets.commonEnemyPaletteRecord];
 for(const actor of actors){const name=actor.sprite||actor.type;if(name==='heninger'||name==='longmoan')continue;const record=assets.sprites[name]?.defaultPaletteRecord;if(Number.isInteger(record))defaults.push(record);}
 const common=[...new Set(defaults),nativeMapPaletteRecord(state,map),...(state.paletteRecords||[])],requests=[],seen=new Set();
 for(const actor of actors){
  if(actor.removed||actor.visible===false||actor.lifecycle===0xfd)continue;
  const sprite=actor.sprite||actor.type;if(!assets.sprites[sprite])continue;
  const records=[...common];if(Number.isInteger(actor.paletteRecord))records.push(actor.paletteRecord);if(actor.paletteRecords)records.push(...actor.paletteRecords);
  const palette=renderer.palette(records,state.livePalette),identity=resolveSpriteFrame(assets.sprites[sprite],actor.animationSlot??0,actor.frame??0);
  if(!identity)continue;const{slot,frame}=identity,count=assets.sprites[sprite].slots[slot].frames.length;
  for(const f of [frame,...(count>1?[(frame+1)%count]:[])]){
   const key=JSON.stringify([sprite,slot,f,palette]);if(seen.has(key))continue;seen.add(key);
   requests.push({sprite,palette,frames:[{slot,frame:f}]});if(requests.length>=limit)return requests;
  }
 }
 return requests;
}
export async function warmStatePalettes(assets,renderer,state,options){
 if(!assets?.hd?.preloadPaletteFrames)return[];
 const requests=statePaletteRequests(assets,renderer,state,options),results=[];
 for(const request of requests)results.push(await assets.hd.preloadPaletteFrames(request.sprite,request.palette,{frames:request.frames,limit:1}));
 return results;
}

import {LOGIC} from './logic-data.js';
import {nativeMapPaletteRecord} from './native-map-palette.js';
import {paletteVariantMatches,verifiedPalettePlan} from './hd-assets.js';
import {statePaletteRequests} from './hd-palette-warmup.js';

export function stageHDPlan(assets,renderer,simulation){
  const s=simulation.state,map=assets.maps[String(s.stage).toLowerCase()];
  const names=new Set(['heninger','longmoan','score','pot','bone','fire','bthief','gthief','magic02','magic12','magic22']);
  for(const row of LOGIC.stageSpriteLoads[simulation.mode]?.[s.stageIndex]||[])names.add(LOGIC.typeNames[row.type]);
  for(const c of simulation.script||[])if(c.op===1)names.add(LOGIC.typeNames[c.type]);
  for(const a of s.entities)names.add(a.sprite||a.type);
  for(const p of s.players)names.add(p.sprite||p.type);
  const defaults=[assets.sprites.score.defaultPaletteRecord,assets.commonEnemyPaletteRecord];
  for(const name of names)if(!['heninger','longmoan'].includes(name)&&Number.isInteger(assets.sprites[name]?.defaultPaletteRecord))defaults.push(assets.sprites[name].defaultPaletteRecord);
  const common=[...new Set(defaults),nativeMapPaletteRecord(s,map)];
  const makePalette=records=>renderer.palette([...common,...records],s.livePalette);
  let records=[...(s.paletteRecords||[])];
  const persistent=new Set([...s.players.map(p=>p.sprite||p.type),'score','pot','bone','fire','bthief','gthief','magic02','magic12','magic22']);
  const contexts=[{palette:makePalette(records),names:new Set([...persistent,...s.entities.map(a=>a.sprite||a.type)])}];
  for(const c of simulation.script||[]){
    if(c.op===4){const record=assets.paletteCommandRecords?.[c.value];if(Number.isInteger(record)){const base=assets.paletteRecords[record].base;records=records.filter(id=>assets.paletteRecords[id]?.base!==base);records.push(record);contexts.push({palette:makePalette(records),names:new Set(persistent)});}}
    if(c.op===1)contexts.at(-1).names.add(LOGIC.typeNames[c.type]);
  }
  const actualSeen=new Set();
  for(const request of statePaletteRequests(assets,renderer,s,{limit:256})){
    const key=JSON.stringify([request.sprite,request.palette]);if(actualSeen.has(key))continue;actualSeen.add(key);
    contexts.push({palette:request.palette,names:new Set([request.sprite])});
  }
  const palette=contexts[0].palette;
  const atlases=new Set(assets.hd.entries.frames.filter(e=>names.has(e.sprite)).map(e=>e.atlas));
  for(const e of [...assets.hd.entries.maps,...assets.hd.entries.mapStatePatches])if(e.mapId===String(s.stage).toLowerCase()&&contexts.some(c=>paletteVariantMatches(assets.hd.manifest.paletteVariants[e.paletteVariant],c.palette)))atlases.add(e.atlas);
  return {names:[...names].filter(n=>assets.sprites[n]),palette,contexts,atlases:[...atlases]};
}

// One bounded preparation per level, not a pause for each animation frame.
export class HDStageLoader {
  constructor(assets,renderer){this.assets=assets;this.renderer=renderer;this.key=null;this.status={waiting:false,failed:false};}
  prepare(simulation){
    const key=JSON.stringify([simulation.mode,simulation.state.stageIndex,simulation.state.stage,simulation.state.players.map(p=>p.sprite||p.type)]);
    if(this.key===key)return this.status;
    this.key=key;const status=this.status={waiting:true,failed:false};
    const plan=stageHDPlan(this.assets,this.renderer,simulation),bank=this.assets.hd;
    bank.stageAtlases=new Set(plan.atlases);
    bank.stagePalettes=new Set();
    for(const c of plan.contexts)for(const e of bank.entries.frames.filter(e=>c.names.has(e.sprite))){
      if(paletteVariantMatches(bank.manifest.paletteVariants[e.paletteVariant],c.palette))continue;
      const p=verifiedPalettePlan(e.sprite,bank.manifest.paletteVariants[e.paletteVariant].colors,c.palette,{entry:e,atlas:bank.manifest.atlases[e.atlas]});
      if(p?.supported)bank.stagePalettes.add(bank.paletteKey(e,p));
    }
    this.promise=(async()=>{
      const loaded=await bank.preloadAtlases(plan.atlases);
      if(this.key!==key)return;
      if(loaded.some(ok=>!ok))throw Error('HD level atlas unavailable.');
      for(const context of plan.contexts)for(const sprite of context.names){if(this.key!==key)return;if(this.assets.sprites[sprite])await bank.preloadPaletteFrames(sprite,context.palette,{limit:512});}
      // Actual initial actor overrides take precedence over the stage-wide plan.
      const requests=statePaletteRequests(this.assets,this.renderer,simulation.state,{limit:64}),seen=new Set();
      for(const r of requests){const id=JSON.stringify([r.sprite,r.palette]);if(seen.has(id))continue;seen.add(id);if(this.key!==key)return;await bank.preloadPaletteFrames(r.sprite,r.palette,{limit:512});}
      if(this.key!==key)return;
      const missing=plan.atlases.filter(id=>!bank.images.has(id));
      if(missing.length)throw Error('HD level exceeds the decoded image budget.');
      if([...bank.stagePalettes].some(key=>!bank.paletteImages.has(key)))throw Error('A required HD level palette could not be prepared or retained.');
      status.waiting=false;
    })().catch(error=>{if(this.key===key){status.failed=true;status.error=String(error.message||error);}});
    return status;
  }
}

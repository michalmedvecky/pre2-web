// AXE main0097→009c/02af→02c9/6602; DS225b[stage]→6690/6699→6f2b.
// Verified against original module5f607b28…; graphics-only, no state mutation.
const BONUS_MAP_PALETTES=Object.freeze({16:{mapId:'1',record:37},17:{mapId:'2',record:38},18:{mapId:'3',record:39},19:{mapId:'4',record:40}});
export function nativeMapPaletteRecord(state,map){
 if(state?.mapOverride||state?.mode==='duel')return map?.paletteRecord;
 const bonus=BONUS_MAP_PALETTES[state?.stageIndex];
 if(!bonus||String(map?.id).toLowerCase()!==bonus.mapId)return map?.paletteRecord;
 return bonus.record;
}

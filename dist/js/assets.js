/** Browser-ready immutable assets. Original resource provenance is assets/manifest.json. */
export class Assets {
  static async load(progress=()=>{}) {
    const base=new URL('../assets/',import.meta.url);
    const gameResponse=await fetch(new URL('game.json',base));
    if(!gameResponse.ok) throw new Error(`Asset manifest: HTTP ${gameResponse.status}`);
    const game=await gameResponse.json();const a=new Assets();a.game=game;
    a.maps={};a.tiles={};a.footers={};a.backgrounds={};a.screens={};
    const jobs=[];const add=(file,assign)=>jobs.push({file,assign});
    for(const [key,file] of Object.entries({spritesPixels:'sprites.idx',union:'union.idx',front:'front.idx',hud:'hud.idx',fonts:'fonts.bin',tables:game.tablesFile||'tables.bin'}))add(file,b=>a[key]=b);
    for(const l of game.levels){add(l.map,b=>a.maps[l.id]=b);add(l.tiles,b=>a.tiles[l.id]=b);add(l.footer,b=>a.footers[l.id]=b);}
    for(const [n,b] of Object.entries(game.backgrounds))add(b.file,v=>a.backgrounds[n]=v);
    for(const [n,b] of Object.entries(game.screens))add(b.file,v=>a.screens[n]=v);
    let done=0;progress(0);await Promise.all(jobs.map(async j=>{const r=await fetch(new URL(j.file,base));if(!r.ok)throw new Error(`${j.file}: HTTP ${r.status}`);j.assign(new Uint8Array(await r.arrayBuffer()));progress(++done/jobs.length);}));
    for(const l of game.levels){if(a.maps[l.id].length!==256*l.height||a.tiles[l.id].length!==l.localTileCount*256)throw new Error(`Level ${l.id} extent mismatch`);}
    if(a.spritesPixels.length!==313968||a.union.length!==544*256)throw new Error('Sprite/shared bank extent mismatch');
    return a;
  }
}
export default Assets;

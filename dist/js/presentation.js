// Presentation only: the DOS-rate world and its camera still control all rules.
const layers=['platforms','items','actors','bossParts','projectiles','effects','ropePoints'];
const position=o=>({x:o.x,y:o.y});
const mix=(a,b,t)=>a+(b-a)*t;
export class Presentation {
 reset(w){this.world=w;this.map=w.map;this.player=w.player;this.previous=null;this.camera={...w.camera};}
 beforeStep(w){
  if(this.world!==w||this.map!==w.map||this.player!==w.player)this.reset(w);
  this.previous={player:position(w.player),camera:{...w.camera},sceneFlash:w.sceneFlash,shakePlayerNudge:w.shakePlayerNudge||0,objects:new Map(),indexed:{}};
  for(const layer of layers){const list=w[layer]||[];this.previous.indexed[layer]=list.map(position);for(const o of list)this.previous.objects.set(o,position(o));}
 }
 afterStep(w){
  const p=this.previous;
  if(this.map!==w.map||this.player!==w.player||p&&(Math.abs(w.player.x-p.player.x)>64||Math.abs(w.player.y-p.player.y)>64||Math.abs(w.camera.x-p.camera.x)>64||Math.abs(w.camera.y-p.camera.y)>64||w.sceneFlash>p.sceneFlash))this.reset(w);
 }
 sample(w,alpha,dt){
  if(this.world!==w||this.map!==w.map||this.player!==w.player)this.reset(w);
  // Passages, respawns and checkpoint rescues cut straight to the new view.
  this.afterStep(w);
  const prev=this.previous;
  const t=Math.max(0,Math.min(1,alpha));
  const interpolate=(o,p)=>p?{...o,x:mix(p.x,o.x,t),y:mix(p.y,o.y,t)}:o;
  const player=interpolate(w.player,prev?.player);
  // A time-based filter spreads the simulation camera's 16px jumps over RAFs.
  // Exponential decay gives the same tracking at 60, 120 and 144Hz.
  const weight=1-Math.exp(-Math.max(0,dt)/.065);
  for(const axis of ['x','y'])this.camera[axis]+=((prev?mix(prev.camera[axis],w.camera[axis],t):w.camera[axis])-this.camera[axis])*weight;
  const nudge=prev?mix(prev.shakePlayerNudge,w.shakePlayerNudge||0,t):(w.shakePlayerNudge||0);
  const view={...w,player,shakePlayerNudge:nudge,camera:{x:Math.round(this.camera.x),y:Math.round(this.camera.y)}};
  for(const layer of layers)view[layer]=(w[layer]||[]).map((o,i)=>{
   const fallback=(layer==='bossParts'||layer==='ropePoints')&&prev?.indexed[layer].length===w[layer].length?prev.indexed[layer][i]:null;
   const p=prev?.objects.get(o)||fallback;
   const v=interpolate(o,p);
   return layer==='ropePoints'?{...v,x:Math.round(v.x),y:Math.round(v.y)}:v;
  });
  // Weapon frames have authored offsets; keep the current one attached to its owner.
  if(w.playerWeapon)view.playerWeapon={...w.playerWeapon,x:w.playerWeapon.x+player.x-w.player.x,y:w.playerWeapon.y+player.y-w.player.y+nudge-(w.shakePlayerNudge||0)};
  return view;
 }
}

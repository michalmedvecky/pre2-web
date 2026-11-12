import {OravaArt} from './orava.js';

// Cosmetic mode only. Native sprites and actors remain the collision authority.
export function volbyHeroPose(w){
 const p=w.player;
 if(w.deathTimer)return 'defeat';
 if(p.invulnerable>=22)return 'hurt';
 if(p.attackFrame){
  if(p.attackAction===7)return 'attack-down';
  if(p.attackAction===6)return 'attack-up';
  const duration=w.attackDuration?.(p.attackAction)||7;
  const phase=1-Math.max(0,p.attackTimer)/duration;
  return phase<.34?'attack-windup':phase<.75?'attack-swing':'attack-recover';
 }
 if(p.downTimer&&!w.alternate)return 'crouch';
 if(!p.grounded||w.alternate)return p.vy<0?'jump':'fall';
 return Math.abs(p.vx)>6?'run-'+(Math.floor(w.frame/2)%4):'idle-'+(Math.floor(w.frame/10)%2);
}

export function volbyActor(w,a){
 const source=a.def?.sprite&8191;
 let atlas;
 if(a.def&&([312,313,314,315,316,378,379,380,381].includes(source)))atlas='bear-replacement';
 else if(w.levelIndex===0&&a.def&&source>=396&&source<=401)atlas='tiger-replacement';
 else return null;
 // Preserve temporary transmutation pickups and emerging/buried silhouettes.
 const sprite=a.sprite&8191;
 if(w.enemyPowerTimer&&sprite>=110&&sprite<=219)return null;
 let id;
 if(a.state===255)id='defeat';
 else if(a.hitFlash)id='hurt';
 else if(atlas==='tiger-replacement'&&(a.state===10||a.state===11))id='pounce';
 else if(atlas==='tiger-replacement'&&a.state===12)id='pounce-windup';
 else if(Math.abs(a.vx)>1)id='walk-'+(Math.floor((a.age??w.frame)/2)%3);
 else id='idle';
 const height=w.assets?.game.sprites[sprite]?.height;
 if(atlas==='bear-replacement'&&a.type===10&&a.state!==255&&height<24)return {atlas,id:'idle',reveal:Math.max(.05,height/30)};
 return {atlas,id};
}

export class VolbyArt extends OravaArt {
 draw(c,atlas,id,x,y,flip,scale=1,size=null,flash=false,angle=0,reveal=1){
  if(reveal>=1)return super.draw(c,atlas,id,x,y,flip,scale,size,flash,angle);
  const a=this.manifest.atlases[atlas],f=a.frames[id];if(!f)return;
  const h=f.rect[3]/a.pixelsPerUnit,shown=h*reveal;
  c.save();c.beginPath();c.rect(0,(y-shown)*scale,320*scale,shown*scale);c.clip();
  super.draw(c,atlas,id,x,y+h-shown,flip,scale,size,flash,angle);c.restore();
 }
 static async load(base=new URL('../assets/volby/',import.meta.url)){
  const response=await fetch(new URL('manifest.json',base));
  if(!response.ok)throw Error('VOLBY art unavailable');
  const manifest=await response.json(),images={};
  if(manifest.version!==1||manifest.cheat!=='VOLBY')throw Error('Unsupported VOLBY art');
  for(const name of ['hero','hero-unarmed','bear-replacement','tiger-replacement']){
   const a=manifest.atlases[name];
   if(!a||a.file!==name+'.png'||!Number.isFinite(a.pixelsPerUnit)||a.pixelsPerUnit<=0)throw Error('Invalid VOLBY atlas');
   const im=new Image();im.src=new URL(a.file,base);await im.decode();
   if(im.naturalWidth!==a.width||im.naturalHeight!==a.height)throw Error('Invalid VOLBY dimensions');
   for(const f of Object.values(a.frames)){
    const[x,y,w,h]=f.rect;
    if([x,y,w,h].some(v=>!Number.isFinite(v))||x<0||y<0||w<=0||h<=0||x+w>a.width||y+h>a.height)throw Error('Invalid VOLBY frame');
   }
   images[name]=im;
  }
  return new VolbyArt(manifest,images);
 }
}

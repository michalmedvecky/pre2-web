// DOS 0x14490: bit80 starts a group of three map IDs; rotate all three.
const cache=new WeakMap();
export function tileAnimation(level,phase=0){
 let frames=cache.get(level);if(!frames){const animated=new Uint8Array(256),remaps=Array.from({length:3},()=>Uint8Array.from({length:256},(_,i)=>i));
  for(let id=0;id<256;id++){if(!(level.tilePropertiesMisc[id]&128))continue;for(let offset=0;offset<3&&id+offset<256;offset++){animated[id+offset]=1;for(let p=0;p<3;p++)remaps[p][id+offset]=id+(offset+p)%3;}id+=2;}frames={animated,remaps};cache.set(level,frames);
 }phase=((phase%3)+3)%3;return {phase,animated:frames.animated,remap:frames.remaps[phase]};
}

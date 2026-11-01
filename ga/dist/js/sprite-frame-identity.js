/** Shared identity of the original stored frame. Does not invent animation slots. */
export function resolveSpriteFrame(group,slot=0,frame=0){
 if(!group)return null;
 let canonicalSlot=slot,resolved=group.slots[slot];
 if(!resolved){const fallback=group.slotFallbacks?.[slot];if(group.slots[fallback]){canonicalSlot=fallback;resolved=group.slots[fallback];}else{canonicalSlot=0;resolved=group.slots[0];}}
 if(!resolved?.frames?.length)return null;
 const canonicalFrame=Math.max(0,Math.min(frame||0,resolved.frames.length-1)),nativeFrame=resolved.frames[canonicalFrame];
 if(!nativeFrame)return null;
 return{slot:Number(canonicalSlot),frame:canonicalFrame,nativeFrame};
}

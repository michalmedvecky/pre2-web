// A tracked head can lean through a wall even when the virtual feet are blocked.
// Fade before the near plane crosses opaque terrain, rather than exposing what lies inside it.
export function headOcclusion(p,boxes,area){
 if(!p)return 0;let alpha=0;
 for(const b of boxes){if(b.area!==area||b.platform)continue;const dx=Math.max(b.minX-p.x,0,p.x-b.maxX),dy=Math.max(b.minY-p.y,0,p.y-b.maxY),dz=Math.max(b.minZ-p.z,0,p.z-b.maxZ),distance=Math.hypot(dx,dy,dz);if(distance<.1)alpha=Math.max(alpha,1-distance/.1);}
 if(area==='caves'){const boundary=Math.min(3.65-Math.abs(p.z),23.25-p.y,p.x+.25,128.25-p.x);alpha=Math.max(alpha,1-Math.max(0,boundary)/.1);}
 return Math.max(0,Math.min(1,alpha));
}

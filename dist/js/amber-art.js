// Whole authored surfaces use the same coordinates as the collision map.
export function drawAmberTerrain(hd,level,cx,cy){
 const a=hd.pack.manifest.amber;if(!a)return false;const {ctx:c,scale:k}=hd,bg=a.background,image=hd.pack.images.get(bg.atlas),bw=bg.rect[2],bh=bg.rect[3],sw=bw*320/bg.width,sh=bh*176/bg.height,sx=Math.max(0,Math.min(bw-sw,cx/3776*(bw-sw))),sy=Math.max(0,Math.min(bh-sh,cy/464*(bh-sh)*.65));
 hd.clipped(176,()=>{c.drawImage(image,sx,sy,sw,sh,0,0,320*k,176*k);c.fillStyle='rgba(12,20,35,.27)';c.fillRect(0,0,320*k,176*k);
 const object=(name,x,y,w,h)=>{const r=a.objects[name];if(!r||x+w<cx||x>cx+320||y+h<cy||y>cy+176)return;c.drawImage(hd.pack.images.get(r.atlas),...r.rect,(x-cx)*k,(y-cy)*k,w*k,h*k);};
 for(let x=Math.floor(cx/96)*96;x<cx+416;x+=96)object('spikes',x,560,96,40);
 for(const s of level.amber.surfaces){object(s.kind,s.x,s.y-({branch:8,crown:10,root:2,wax:2}[s.kind]||0),s.width,s.height);if(s.x+s.width<cx||s.x>cx+320||s.y<cy-2||s.y>cy+176)continue;c.strokeStyle=s.optional?'#d8bc7a':'#ffe7a0';c.lineWidth=.6*k;c.beginPath();c.moveTo((s.x+3-cx)*k,(s.y+.5-cy)*k);c.lineTo((s.x+s.width-3-cx)*k,(s.y+.5-cy)*k);c.stroke();}
 for(const h of level.amber.honey)object('honey',h.x,h.y-3,h.width,6);
 for(const cache of hd.currentWorld?.amber?.caches||[])if(cache.active)object('cache',cache.x-20,cache.y-32,40,32);
 // Subtle rising pollen advertises the optional glider lane.
 const f=hd.currentWorld?.frame||0;for(let i=0;i<12;i++){const x=464+i*13,y=206-((f+i*11)%54);if(x<cx||x>cx+320)continue;c.fillStyle='rgba(255,214,92,.55)';c.beginPath();c.arc((x-cx)*k,(y-cy)*k,1.2*k,0,Math.PI*2);c.fill();}
 });return true;
}
export function drawOpenAmberDoor(hd,dx,dy,width,height,clip){const k=hd.scale;hd.clipped(clip,c=>{c.save();c.translate(dx*k,dy*k);c.scale(k,k);c.fillStyle='#10232c';c.beginPath();c.roundRect(width*.24,height*.24,width*.52,height*.73,[width*.22,width*.22,0,0]);c.fill();c.strokeStyle='#ffdb72';c.lineWidth=1;c.stroke();c.fillStyle='#ffe49b';c.font='bold 19px sans-serif';c.textAlign='center';c.fillText('→',width*.5,height*.72);c.restore();});}

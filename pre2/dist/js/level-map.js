// Read-only survey of the CURRENT level; separate bonus levels remain separate.
export function surveyLevel(w){
 const map=w.map.slice(),secrets=[];
 for(const b of w.blocks||[])if(b.active){map[b.pos]=b.replacement;secrets.push({x:(b.pos&255)*16,y:(b.pos>>8)*16});}
 const enemies=[...(w.definitions||[]),...(w.amberActors||[])].filter(d=>!d.destroyed).map(d=>({...d,sprite:d.spriteId??d.sprite}));
 return {map,width:256*16,height:w.level.height*16,secrets,enemies,
  items:(w.items||[]).filter(i=>i.active),platforms:(w.platforms||[]).filter(p=>p.active!==false),
  gates:(w.gates||[]).filter(g=>g.active).map(g=>({x:(g.triggerTile&255)*16+8,y:(g.triggerTile>>8)*16+8})),player:{...w.player},camera:{...w.camera}};
}
export class LevelMap {
 constructor(parent,onClose,onTeleport){
  this.element=document.createElement('section');this.element.className='level-map';this.element.hidden=true;this.element.setAttribute('role','dialog');this.element.setAttribute('aria-modal','true');this.element.setAttribute('aria-label','Complete level map');
  this.element.innerHTML='<header><strong></strong><button aria-label="Close level map">Back to game</button></header><canvas aria-label="Entire level including concealed terrain, items and passages"></canvas><footer><span>● YOU · □ CAMERA · <b>□ HIDDEN</b> · <i>◇ PASSAGE</i></span><span>CLICK MAP TO TELEPORT · ANY KEY TO RETURN · GAME PAUSED</span></footer>';
  parent.append(this.element);this.canvas=this.element.querySelector('canvas');this.element.querySelector('button').onclick=onClose;this.canvas.onclick=e=>{const point=mapPoint(e.clientX,e.clientY,this.canvas.getBoundingClientRect(),this.canvas,this.view,this.survey?.bounds);if(point)onTeleport?.(point);};
  this.resize=new ResizeObserver(()=>{if(!this.element.hidden)this.draw();});this.resize.observe(this.canvas);
 }
 open(w,a){
  const s=this.survey=surveyLevel(w),palette=w.paletteOverride||a.game.palettes[w.levelIndex].rgb8_scaled,full=this.full=document.createElement('canvas');full.width=s.width;full.height=s.height;const c=full.getContext('2d'),cache=new Map();c.fillStyle='#141a1c';c.fillRect(0,0,full.width,full.height);
  const image=(bank,id,width,height,offset)=>{const key=bank+':'+id;if(cache.has(key))return cache.get(key);const src=bank==='sprites'?a.spritesPixels:bank==='union'?a.union:a.tiles[w.level.id],im=document.createElement('canvas');im.width=width;im.height=height;const ctx=im.getContext('2d'),rgba=ctx.createImageData(width,height);for(let i=0;i<width*height;i++){const v=src?.[offset+i];if(!v)continue;const rgb=palette.slice(v*3,v*3+3);if(Math.max(...rgb)>16)im.hasVisible=true;rgba.data.set([...rgb,255],i*4);}ctx.putImageData(rgba,0,0);cache.set(key,im);return im;};
  let left=s.width,top=s.height,right=0,bottom=0;const include=(x,y,ww=16,hh=16)=>{left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x+ww);bottom=Math.max(bottom,y+hh);};
  for(let y=0;y<w.level.height;y++)for(let x=0;x<256;x++){const v=w.level.lookup[s.map[y*256+x]];if(v===256||v===65535||v===undefined)continue;const id=v<256?v:v-256;const tile=image(v<256?'local':'union',id,16,16,id*256);c.drawImage(tile,x*16,y*16);if(tile.hasVisible)include(x*16,y*16);}
  // Foreground covers are deliberately omitted; unrevealed pickups are drawn
  // over terrain so the survey exposes them without discovering them in-game.
  for(const o of [...s.platforms,...s.items,...s.enemies,...(w.bossParts||[]),s.player]){const id=(o.sprite??o.spriteId)&8191,m=a.game.sprites[id];if(!m)continue;include(o.x-m.originX,o.y+m.originY-m.height,m.width,m.height);const flip=o.face<0||!!(o.sprite&32768);c.save();c.translate(o.x,o.y);if(flip)c.scale(-1,1);c.drawImage(image('sprites',id,m.width,m.height,m.pixelOffset),-m.originX,m.originY-m.height);c.restore();}
  for(const p of [...s.secrets,...s.gates])include(p.x,p.y);include(s.camera.x,s.camera.y,320,176);s.bounds={x:Math.max(0,left),y:Math.max(0,top),width:Math.min(s.width,right)-Math.max(0,left),height:Math.min(s.height,bottom)-Math.max(0,top)};
  this.element.querySelector('strong').textContent=`MAP · STAGE ${w.level.id} · ${s.secrets.length} CONCEALED BLOCKS`;
  document.body.classList.add('level-map-open');this.element.hidden=false;this.draw();this.element.querySelector('button').focus({preventScroll:true});
 }
 draw(){
  const box=this.canvas.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1),w=Math.max(1,Math.round(box.width*dpr)),h=Math.max(1,Math.round(box.height*dpr));this.canvas.width=w;this.canvas.height=h;const c=this.canvas.getContext('2d'),s=this.survey,b=s.bounds,scale=Math.min((w-16*dpr)/b.width,(h-16*dpr)/b.height),ox=(w-b.width*scale)/2-b.x*scale,oy=(h-b.height*scale)/2-b.y*scale;
  this.view={scale,ox,oy};
  c.fillStyle='#0b1013';c.fillRect(0,0,w,h);c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.drawImage(this.full,b.x,b.y,b.width,b.height,ox+b.x*scale,oy+b.y*scale,b.width*scale,b.height*scale);
  c.lineWidth=dpr;c.strokeStyle='#ff68ce';for(const p of s.secrets)c.strokeRect(ox+p.x*scale,oy+p.y*scale,Math.max(2,16*scale),Math.max(2,16*scale));
  c.strokeStyle='#56eaff';for(const p of s.gates){const x=ox+p.x*scale,y=oy+p.y*scale,r=3*dpr;c.beginPath();c.moveTo(x,y-r);c.lineTo(x+r,y);c.lineTo(x,y+r);c.lineTo(x-r,y);c.closePath();c.stroke();}
  c.strokeStyle='#ffe9ae';c.strokeRect(ox+s.camera.x*scale,oy+s.camera.y*scale,320*scale,176*scale);
  const x=ox+s.player.x*scale,y=oy+s.player.y*scale;c.beginPath();c.arc(x,y,4*dpr,0,Math.PI*2);c.fillStyle='#ff4b32';c.fill();c.lineWidth=2*dpr;c.strokeStyle='#fff';c.stroke();
 }
 close(){this.element.hidden=true;document.body.classList.remove('level-map-open');this.full=null;this.survey=null;}
}

// Convert CSS coordinates through DPR, fitting and crop offsets, never letterbox clicks.
export function mapPoint(clientX,clientY,box,canvas,view,bounds){
 if(!view||!bounds||box.width<=0||box.height<=0)return null;const x=((clientX-box.left)*canvas.width/box.width-view.ox)/view.scale,y=((clientY-box.top)*canvas.height/box.height-view.oy)/view.scale;
 if(!Number.isFinite(x)||!Number.isFinite(y)||x<bounds.x||x>=bounds.x+bounds.width||y<bounds.y||y>=bounds.y+bounds.height)return null;return{x:Math.round(x),y:Math.round(y)};
}

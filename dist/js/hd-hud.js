// Resolution-independent HUD. Values and slot locations follow the DOS HUD.
export function hudState(w,tables){
 const score=String((w.score>>>0)*10).padStart(7,'0').slice(-7),bits=w.collectionFlash?((w.frame&1)?31:0):(w.inventory||0);
 return {lives:Math.min(9,Math.max(0,w.lives||0)),score,hearts:Array.from({length:3},(_,i)=>i<(w.health??3)),slots:Array.from({length:5},(_,i)=>{const p=0x6f82+i*2,v=tables[p]|tables[p+1]<<8;return {letter:'BONUS'[i],active:!!(bits&(1<<i)),x:v%40*8,y:Math.floor(v/40)};})};
}
export function heart(c,x,y,full){
 c.save();c.translate(x,y);c.beginPath();c.moveTo(8,11);c.bezierCurveTo(5,8,1,6,1,3.8);c.bezierCurveTo(1,-.8,6,-1,8,2);c.bezierCurveTo(10,-1,15,-.8,15,3.8);c.bezierCurveTo(15,6,11,8,8,11);c.closePath();
 const g=c.createLinearGradient(0,0,0,11);g.addColorStop(0,full?'#ff7370':'#8c8071');g.addColorStop(.35,full?'#e62822':'#62594e');g.addColorStop(1,full?'#8d130d':'#38332e');c.fillStyle=g;c.strokeStyle='#29221b';c.lineWidth=1.2;c.fill();c.stroke();
 if(full){c.beginPath();c.moveTo(3,3.8);c.bezierCurveTo(3,1.8,5,1.5,6,2.5);c.strokeStyle='#ffd4ae';c.lineWidth=.9;c.lineCap='round';c.stroke();}c.restore();
}
function text(c,value,x,y,size,color='#ffd043',align='center'){
 c.font=`900 ${size}px Georgia, "Times New Roman", serif`;c.textAlign=align;c.textBaseline='alphabetic';c.lineJoin='round';c.strokeStyle='#2b2118';c.lineWidth=1.25;c.strokeText(value,x,y);c.fillStyle=color;c.fillText(value,x,y);
}
export class HDHud {
 constructor(pack){this.pack=pack;this.background=null;}
 base(){
  if(this.background)return this.background;const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=96;const c=canvas.getContext('2d');c.scale(4,4);
  const stone=c.createLinearGradient(0,0,0,24);stone.addColorStop(0,'#c9bba3');stone.addColorStop(.35,'#b7a78e');stone.addColorStop(1,'#8c7d66');c.fillStyle=stone;c.fillRect(0,0,320,24);
  c.strokeStyle='#e3d5ba';c.lineWidth=1;c.beginPath();c.moveTo(0,.5);c.lineTo(320,.5);c.stroke();c.strokeStyle='#514637';c.beginPath();c.moveTo(0,23.5);c.lineTo(320,23.5);c.stroke();
  // Restrained, deterministic stone grain. No per-frame noise or pixel-art bitmap.
  for(let i=0;i<160;i++){const x=(i*71.37)%320,y=(i*13.71)%23;c.fillStyle=i%2?'#ffffff08':'#221a1109';c.fillRect(x,y,1.1,.25);}
  c.strokeStyle='#71614b80';c.lineWidth=.35;for(const x of [66,189,255]){c.beginPath();c.moveTo(x,4);c.lineTo(x-1,11);c.lineTo(x+.6,15);c.lineTo(x,21);c.stroke();}
  // Use the already authored HD protagonist, cropped to his face for the lives icon.
  const s=this.pack.manifest.sprites[0];if(s){c.save();c.beginPath();c.arc(12,13,9,0,Math.PI*2);c.clip();c.fillStyle='#443629';c.fillRect(2,3,20,20);const [x,y,w,h]=s.rect;c.imageSmoothingEnabled=true;c.drawImage(this.pack.images.get(s.atlas),x+w*.31,y,w*.55,h*.49,3,4,18,18);c.restore();}
  text(c,'LIVES',38,7.1,6.3,'#f2e8d4');text(c,'SCORE',128,7.1,6.3,'#f2e8d4');text(c,'ENERGY',224,7.1,6.3,'#f2e8d4');text(c,'×',29,19.7,12,'#f1e5ce');
  this.background=canvas;return canvas;
 }
 draw(ctx,w,tables){
  const state=hudState(w,tables);ctx.save();ctx.drawImage(this.base(),0,704);ctx.scale(4,4);
  text(ctx,String(state.lives),48,195.8,12.8);for(let i=0;i<7;i++)text(ctx,state.score[i],80+i*16,195.8,12.8);
  for(let i=0;i<3;i++)heart(ctx,200+i*16,185,state.hearts[i]);
  for(const slot of state.slots)if(slot.active){const x=slot.x+4,y=slot.y+1;ctx.fillStyle='#d5b354';ctx.strokeStyle='#584323';ctx.lineWidth=.5;ctx.fillRect(x,y,8,10);ctx.strokeRect(x,y,8,10);text(ctx,slot.letter,x+4,y+8.2,7.4,'#fff0ab');}
  ctx.restore();return state;
 }
}

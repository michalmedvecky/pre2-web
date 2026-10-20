import {AWARDS} from './compat.js';
import {heart} from './hd-hud.js';
// Exact recovered score values; text is resolution-independent, never AI lettering.
export const FEEDBACK_TEXT=new Map([
 ...AWARDS.map((v,i)=>[74+i,String(v*10)]),[224,'×2'],[225,'×3'],
 [228,'YUCK!'],[229,'EXTRA!'],[230,'SUPER!'],[231,'YEAH!'],
 ...Array.from({length:26},(_,i)=>[241+i,String.fromCharCode(65+i)]),[267,'%'],
 [268,"'"],[269,'?'],[270,'!'],[271,'.'],[272,','],[282,'PASS:'],
 ...Array.from({length:16},(_,i)=>[283+i,i.toString(16).toUpperCase()]),[301,'×4'],[302,'×6'],[303,'×8']
]);
export const FEEDBACK_SPRITES=[...FEEDBACK_TEXT.keys(),226,227].sort((a,b)=>a-b);
const scoreColors=['#fff1cf','#fff1cf','#fff1cf','#969bff','#969bff','#36dc88','#f5a27b','#36dc88','#ffdf38','#ffdf38','#b97b55','#d94452','#ffdf38','#ffdf38','#ffdf38','#36dc88','#f6d2df'];
export class HDFeedback {
 constructor(pack){this.pack=pack;this.cache=new Map();}
 image(id,source,white=false){
  if(!FEEDBACK_TEXT.has(id)&&id!==226&&id!==227)return null;
  const key=id+':'+white;if(this.cache.has(key))return this.cache.get(key);
  const canvas=document.createElement('canvas');canvas.width=source.width*4;canvas.height=source.height*4;const c=canvas.getContext('2d');c.scale(4,4);const w=source.width,h=source.height;
  const text=(value,x,y,size,maxWidth,color='#ffdb42')=>{c.font=`900 ${size}px Georgia, "Times New Roman", serif`;c.textAlign='center';c.textBaseline='alphabetic';c.lineJoin='round';c.lineWidth=Math.min(1,size/9);c.strokeStyle=white?'#fff':'#302219';c.strokeText(value,x,y,maxWidth);c.fillStyle=white?'#fff':color;c.fillText(value,x,y,maxWidth);};
  if(id===226){c.save();c.translate((w-16)/2,(h-11)/2);heart(c,0,0,true);c.restore();}
  else if(id===227){
   const s=this.pack.manifest.sprites[0];if(s){const [x,y,sw,sh]=s.rect;c.save();c.beginPath();c.ellipse(w*.28,h*.5,w*.26,h*.49,0,0,Math.PI*2);c.clip();c.imageSmoothingEnabled=true;c.drawImage(this.pack.images.get(s.atlas),x+sw*.31,y,sw*.55,sh*.49,0,0,w*.55,h);c.restore();}
   text('UP',w*.76,h*.84,h*.85,w*.48);
  }else{const value=FEEDBACK_TEXT.get(id),color=id>=74&&id<=90?scoreColors[id-74]:id>=283?'#ffdb42':id===229?'#55df84':id===228?'#f4d03d':id>=241?'#f3e8d1':'#ffd84d';text(value,w/2,h*.83,h*.87,w-1,color);}
  if(white){c.setTransform(1,0,0,1,0,0);c.globalCompositeOperation='source-in';c.fillStyle='#fff';c.fillRect(0,0,canvas.width,canvas.height);}
  this.cache.set(key,canvas);return canvas;
 }
}

import {HD_INTERFACE_FONT_SHA,HD_INTERFACE_SPECS,HD_SELECTION_HEADING} from './hd-interface-spec.js';
const color=(palette,index,fallback='#fff')=>palette?.[index]?`rgb(${palette[index].join(',')})`:fallback;
const hash=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
export async function qualifyInterfaceAssets(assets){
 const result={classification:'remastered-vector-interface',font:false,selectionHeading:false,sprites:new Map(),rejected:[]};
 if(!globalThis.crypto?.subtle){result.rejected.push({reason:'sha256-unavailable'});return result;}
 try{result.font=await hash(assets.fontPixels)===HD_INTERFACE_FONT_SHA;
 await Promise.all(Object.entries(HD_INTERFACE_SPECS).map(async([key,spec])=>{
  const[name,slot,index]=key.split('/'),frame=assets.sprites[name]?.slots[slot]?.frames[index];
  if(!frame||frame.width!==spec.width||frame.height!==spec.height){result.rejected.push({key,reason:'native-frame-mismatch'});return;}
  const [header,pixels]=await Promise.all([hash(Uint8Array.from(frame.rawHeader)),hash(assets.spritePixels.subarray(frame.offset,frame.offset+frame.count))]);
  if(header===spec.headerSHA&&pixels===spec.pixelsSHA)result.sprites.set(key,spec);else result.rejected.push({key,reason:'source-sha256-mismatch'});
 }));
 const map=assets.maps?.c;
 if(map?.cells&&map?.tiles&&map.width===40&&map.height===25){
  const raw=new Uint8Array(map.cells.length*2),view=new DataView(raw.buffer);map.cells.forEach((n,i)=>view.setUint16(i*2,n,true));
  result.selectionHeading=await hash(raw)===HD_SELECTION_HEADING.cellsSHA&&await hash(map.tiles)===HD_SELECTION_HEADING.tilesSHA;
 }
 }catch{result.font=false;result.selectionHeading=false;result.sprites.clear();result.rejected.push({reason:'source-validation-unavailable'});}return result;
}
// Draw measured smooth glyph outlines into the source's logical ink rectangle.
// Fixed source positions/advance remain controlled by the original presenter.
export function fittedInterfaceText(ctx,text,[x,y,width,height],{fill='#fff',stroke=null,style='roman',outline=.35}={}){
 if(!text||width<=0||height<=0)return;
 ctx.save();ctx.font=`${style==='logo'?'900':'700'} 100px Georgia, "Times New Roman", serif`;ctx.textAlign='left';ctx.textBaseline='alphabetic';
 const m=ctx.measureText(text),left=m.actualBoundingBoxLeft||0,right=m.actualBoundingBoxRight||m.width,ascent=m.actualBoundingBoxAscent||75,descent=m.actualBoundingBoxDescent||0;
 const inset=stroke?Math.min(outline,width/8,height/8):0,sx=(width-2*inset)/Math.max(1,left+right),sy=(height-2*inset)/Math.max(1,ascent+descent);
 ctx.translate(x+inset,y+inset);ctx.scale(sx,sy);ctx.translate(left,ascent);ctx.lineJoin='round';ctx.lineCap='round';
 if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=inset*2/Math.max(sy,.001);ctx.strokeText(text,0,0);}
 if(style==='outline'){
  ctx.strokeStyle=fill;ctx.lineWidth=Math.max(1,Math.min(6,.8/Math.max(sy,.001)));ctx.strokeText(text,0,0);
 }else{ctx.fillStyle=fill;ctx.fillText(text,0,0);}
 ctx.restore();
}
function rounded(ctx,x,y,w,h,r){r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();}
function bar(ctx,spec,palette){const[x,y,w,h]=spec.ink;rounded(ctx,x+.2,y+.2,w-.4,h-.4,1);ctx.fillStyle=color(palette,137,'#000');ctx.fill();rounded(ctx,x+.8,y+.8,w-1.6,h-1.6,.65);ctx.fillStyle=color(palette,134);ctx.fill();for(const[rx,ry,rw,rh]of spec.components){rounded(ctx,rx,ry,rw,rh,.5);ctx.fillStyle=color(palette,spec.colorIndex);ctx.fill();ctx.fillStyle=color(palette,134);ctx.globalAlpha=.16;rounded(ctx,rx+.3,ry+.25,rw-.6,Math.min(1,rh/3),.2);ctx.fill();ctx.globalAlpha=1;}}
function potions(ctx,spec,palette){for(const[x,y,w,h]of spec.components){ctx.fillStyle=color(palette,spec.colorIndex);rounded(ctx,x,y+h*.28,w,h*.72,Math.min(1,w/3));ctx.fill();rounded(ctx,x+w*.3,y,w*.4,h*.42,.25);ctx.fill();ctx.strokeStyle=color(palette,134);ctx.lineWidth=.22;ctx.globalAlpha=.6;ctx.beginPath();ctx.moveTo(x+w*.3,y+h*.4);ctx.lineTo(x+w*.3,y+h*.75);ctx.stroke();ctx.globalAlpha=1;}}
function rankTable(ctx,spec,palette){const w=spec.width,h=spec.height;for(const offset of[.8,2.4]){ctx.beginPath();if(spec.part==='top'){ctx.moveTo(offset,h);ctx.lineTo(offset,5);ctx.quadraticCurveTo(offset,offset,5,offset);ctx.lineTo(w-5,offset);ctx.quadraticCurveTo(w-offset,offset,w-offset,5);ctx.lineTo(w-offset,h);}else{ctx.moveTo(offset,0);ctx.lineTo(offset,h-5);ctx.quadraticCurveTo(offset,h-offset,5,h-offset);ctx.lineTo(w-5,h-offset);ctx.quadraticCurveTo(w-offset,h-offset,w-offset,h-5);ctx.lineTo(w-offset,0);}ctx.strokeStyle=color(palette,offset<1?188:183);ctx.lineWidth=offset<1?1.4:.8;ctx.stroke();}spec.rows.forEach(([threshold,rank],i)=>{const top=spec.part==='top'?7:0;fittedInterfaceText(ctx,threshold,[7,top+i*16,30,13],{fill:color(palette,191)});fittedInterfaceText(ctx,rank,[39,top+i*16,Math.min(37,rank.length*9),13],{fill:color(palette,183),stroke:color(palette,188),style:'gold',outline:.25});});}
export function drawInterfaceSprite(ctx,spec,palette){
 if(!spec)return false;ctx.save();
 const fill=color(palette,spec.fill),stroke=Number.isInteger(spec.stroke)?color(palette,spec.stroke):null;
 if(spec.kind==='text')fittedInterfaceText(ctx,spec.text,spec.ink,{fill,stroke,style:spec.style,outline:spec.style==='logo'?.55:.3});
 else if(spec.kind==='lines'){
  if(spec.boxed){ctx.strokeStyle=fill;ctx.lineWidth=1;rounded(ctx,.5,.5,spec.width-1,spec.height-1,1.4);ctx.stroke();}
  const count=spec.lines.length,top=spec.boxed?4:1,gap=(spec.height-top-2)/count;spec.lines.forEach((line,i)=>fittedInterfaceText(ctx,line,[spec.boxed?4:1,top+i*gap,spec.width-(spec.boxed?8:2),Math.min(7,gap-2)],{fill,stroke}));
 }else if(spec.kind==='bar')bar(ctx,spec,palette);
 else if(spec.kind==='potions')potions(ctx,spec,palette);
 else if(spec.kind==='indicator'){const[x,y,w,h]=spec.ink;rounded(ctx,x+.5,y+.5,w-1,h-1,1.6);ctx.strokeStyle=color(palette,134);ctx.lineWidth=1;ctx.stroke();rounded(ctx,x+2,y+2,w-4,h-4,1);ctx.strokeStyle=color(palette,spec.colorIndex);ctx.lineWidth=1.8;ctx.stroke();}
 else if(spec.kind==='arrow'){const[x,y,w,h]=spec.ink;ctx.beginPath();ctx.moveTo(x+.5,y+h/2);ctx.lineTo(x+w*.55,y+.4);ctx.lineTo(x+w*.55,y+h*.3);ctx.lineTo(x+w-.5,y+h*.3);ctx.lineTo(x+w-.5,y+h*.7);ctx.lineTo(x+w*.55,y+h*.7);ctx.lineTo(x+w*.55,y+h-.4);ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=.4;ctx.stroke();}}
 else if(spec.kind==='dot'){const[x,y,w,h]=spec.ink;ctx.beginPath();ctx.ellipse(x+w/2,y+h/2,w*.4,h*.4,0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();}
 else if(spec.kind==='block-logo'){
  ctx.beginPath();ctx.rect(0,0,spec.width,spec.height);ctx.clip();ctx.beginPath();for(const points of spec.paths){points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();}ctx.fillStyle=fill;ctx.fill('evenodd');ctx.strokeStyle=stroke;ctx.lineWidth=.8;ctx.lineJoin='round';ctx.stroke();
 }else if(spec.kind==='source-logo'){
  for(const layer of spec.layers){ctx.beginPath();for(const points of layer.paths){
    const n=points.length,corner=(i)=>{const a=points[(i+n-1)%n],b=points[i],c=points[(i+1)%n],r=.38,ab=Math.hypot(b[0]-a[0],b[1]-a[1]),bc=Math.hypot(c[0]-b[0],c[1]-b[1]),d=Math.min(r,ab/2,bc/2);return{b,incoming:[b[0]+(a[0]-b[0])*d/ab,b[1]+(a[1]-b[1])*d/ab],outgoing:[b[0]+(c[0]-b[0])*d/bc,b[1]+(c[1]-b[1])*d/bc]};};
    for(let i=0;i<n;i++){const p=corner(i);if(i===0)ctx.moveTo(...p.incoming);else ctx.lineTo(...p.incoming);ctx.quadraticCurveTo(...p.b,...p.outgoing);}ctx.closePath();
   }ctx.fillStyle=color(palette,layer.paletteIndex);ctx.fill('evenodd');}
 }else if(spec.kind==='ranktable')rankTable(ctx,spec,palette);
 else{ctx.restore();return false;}
 ctx.restore();return true;
}

export function hasQualifiedSelectionHeading(assets){return assets.hdInterface?.selectionHeading===true&&assets.hd?.manifest?.atlases[HD_SELECTION_HEADING.atlas]?.sha256===HD_SELECTION_HEADING.atlasSHA;}
export function drawSelectionHeading(ctx,palette){
 ctx.save();ctx.fillStyle=color(palette,HD_SELECTION_HEADING.backgroundIndex,'#000');ctx.fillRect(...HD_SELECTION_HEADING.clearRect);
 fittedInterfaceText(ctx,HD_SELECTION_HEADING.text,HD_SELECTION_HEADING.paintedInk,{fill:color(palette,HD_SELECTION_HEADING.foregroundIndex),stroke:color(palette,HD_SELECTION_HEADING.shadowIndex),outline:.25});ctx.restore();
}

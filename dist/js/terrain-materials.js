// Per-pixel material ownership. A mixed trunk/leaf tile must never become one
// opaque rectangle of bark. Native indices and source geometry stay intact.
export const EARLY_MATERIALS={2:['gray-rock','forest-leaves'],3:['green-rock','forest-leaves'],4:['forest-bark','blue-rock','forest-leaves'],5:['forest-bark','autumn-leaves']};
// These original end-grain faces are separately painted platform surfaces.
// Keep their bright horizontal grain; a vertical bark material erases depth.
export const STAGE5_CUT_FACES=new Set([17,18,93,94,95]);
export function materialSeed(level,index,value){
 if(level==='5'&&STAGE5_CUT_FACES.has(value)&&([1,2,3,7,11,15].includes(index)))return null;
 if(value>=775&&value<=783)return null; // Literal LEVEL lettering and numbers.
 if(level==='2'&&index>=11)return'gray-rock';
 if(level==='3'&&index>=11)return'green-rock';
 if(['2','3','4'].includes(level)&&index>=8&&index<=10)return'forest-leaves';
 if(level==='4'||level==='5'){
  if(index>=1&&index<=3||index===11||index===7)return'forest-bark';
  if(level==='4'&&index>=12)return'blue-rock';
  if(level==='5'&&index>=8&&index<=10)return'autumn-leaves';
 }return null;
}
export function materialFields(level,source,width,values,columns,opened=source){
 const names=EARLY_MATERIALS[level];if(!names)return null;
 const height=source.length/width,fields=Object.fromEntries(names.map(n=>[n,new Float32Array(source.length)])),seeds=Array.from(source,(index,p)=>materialSeed(level,index,values[((p/width|0)>>4)*columns+((p%width)>>4)]));
 const pure=values.map((_,i)=>{const set=new Set();let protectedInk=false;const tx=i%columns*16,ty=(i/columns|0)*16;for(let y=0;y<16;y++)for(let x=0;x<16;x++){const p=(ty+y)*width+tx+x;if(seeds[p])set.add(seeds[p]);else if(source[p]!==0&&source[p]!==6)protectedInk=true;}return !protectedInk&&set.size===1?[...set][0]:null;});
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const p=y*width+x,seed=seeds[p];if(seed){fields[seed][p]=1;continue;}if(source[p]!==6)continue;const owner=pure[(y>>4)*columns+(x>>4)];if(owner&&opened[p]!==0){fields[owner][p]=1;continue;}
  // Fill thin native material cracks, but preserve broad shadow/empty areas.
  let distance=5,name=null;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const xx=x+dx,yy=y+dy,d=dx*dx+dy*dy;if(xx<0||xx>=width||yy<0||yy>=height||d>=distance)continue;const n=seeds[yy*width+xx];if(n){distance=d;name=n;}}
  if(name)fields[name][p]=distance<=2?1:.5;
 }
 return{level,width,height,fields};
}
export function sampleField(field,width,height,x,y){const xx=(x+.5)/4-.5,yy=(y+.5)/4-.5,ix=Math.floor(xx),iy=Math.floor(yy),fx=xx-ix,fy=yy-iy,x0=Math.max(0,Math.min(width-1,ix)),x1=Math.max(0,Math.min(width-1,ix+1)),y0=Math.max(0,Math.min(height-1,iy))*width,y1=Math.max(0,Math.min(height-1,iy+1))*width;return(field[y0+x0]*(1-fx)+field[y0+x1]*fx)*(1-fy)+(field[y1+x0]*(1-fx)+field[y1+x1]*fx)*fy;}

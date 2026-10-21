// Authored tileable 3D surface studies, using the recovered level-one palette as color reference.
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {encodePNG} from './png.mjs';
const size=256,root=new URL('../dist/vr/textures/',import.meta.url),game=JSON.parse(await readFile(new URL('../dist/assets/game.json',import.meta.url))),p=game.palettes[0].rgb8_scaled;
const rgb=i=>p.slice(i*3,i*3+3),mix=(a,b,t)=>a.map((v,i)=>v*(1-t)+b[i]*t),palette={grass:mix(rgb(9),rgb(7),.22),earth:mix(rgb(3),rgb(2),.45),stone:rgb(13),bark:mix(rgb(3),rgb(11),.4),foliage:mix(rgb(8),rgb(10),.28)};
const hash=(x,y,s)=>{let h=Math.imul(x+11,374761393)^Math.imul(y+37,668265263)^Math.imul(s,1274126177);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;},mod=(n,m)=>(n%m+m)%m,fade=t=>t*t*(3-2*t);
function noise(u,v,n,s){const x=u*n,y=v*n,ix=Math.floor(x),iy=Math.floor(y),a=fade(x-ix),b=fade(y-iy),at=(x,y)=>hash(mod(x,n),mod(y,n),s);return (at(ix,iy)*(1-a)+at(ix+1,iy)*a)*(1-b)+(at(ix,iy+1)*(1-a)+at(ix+1,iy+1)*a)*b;}
function cells(u,v,n,s){const x=u*n,y=v*n,ix=Math.floor(x),iy=Math.floor(y);let first=9,second=9;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const cx=ix+dx,cy=iy+dy,hx=hash(mod(cx,n),mod(cy,n),s),hy=hash(mod(cx,n),mod(cy,n),s+1),d=Math.hypot(cx+.15+hx*.7-x,cy+.15+hy*.7-y);if(d<first){second=first;first=d;}else second=Math.min(second,d);}return {first,edge:second-first};}
await mkdir(root,{recursive:true});const manifest={version:1,size,source:'authored deterministic seamless textures; original level-one RGB palette reference only',generator:'scripts/build-vr-textures.mjs',assets:{}};
for(const [kind,base] of Object.entries(palette)){const pixels=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const u=x/(size-1),v=y/(size-1),n=noise(u,v,4,13),f=noise(u,v,32,31),micro=noise(u,v,96,71);let shade=.72+n*.36+f*.18,tint=0;
  if(kind==='grass'){const blade=Math.max(0,Math.sin(2*Math.PI*(u*47+v*19+noise(u,v,7,41)*.6)));shade=.65+n*.38+f*.2+blade**14*.22+micro*.1;tint=noise(u,v,9,27)>.65?.12:0;}
  if(kind==='stone'){const c=cells(u,v,6,17);shade=.72+n*.36+f*.17-Math.exp(-c.edge*65)*.22+micro*.07;tint=Math.max(0,noise(u,v,7,45)-.66)*.4;}
  if(kind==='earth'){const c=cells(u,v,20,21);shade=.7+n*.25+f*.15+(c.first<.15?.15:0)+micro*.1;}
  if(kind==='bark'){const grain=Math.sin(2*Math.PI*(u*23+noise(u,v,4,51)*.75));shade=.66+n*.22+f*.15+Math.max(0,grain)*.25-Math.max(0,-grain)**12*.2;}
  if(kind==='foliage'){const c=cells(u,v,15,39);shade=.62+n*.32+f*.17+Math.max(0,.6-c.first)*.6-Math.exp(-c.edge*32)*.12;}
  const i=(y*size+x)*4;for(let k=0;k<3;k++)pixels[i+k]=Math.min(255,Math.max(0,base[k]*shade+(k===1?20:4)*tint));pixels[i+3]=255;
 }
 const file=kind+'.png',data=encodePNG(size,size,pixels);await writeFile(new URL(file,root),data);manifest.assets[kind]={file,sha256:createHash('sha256').update(data).digest('hex'),colorSpace:'sRGB',repeat:true};
}
await writeFile(new URL('manifest.json',root),JSON.stringify(manifest,null,2)+'\n');console.log('Generated five seamless 256×256 VR surface textures.');

// Pack image_gen's raw atlases without changing the authored frame order/pivots.
// Resampling and transparent texture packing are deterministic; AI drawing stays raw.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {decodePNG,encodePNG,alphaBounds} from './png.mjs';
const root=new URL('../',import.meta.url),art=new URL('art/hd-v1/',root),out=new URL('dist/assets/hd/',root),inventory=JSON.parse(await readFile(new URL('inventory.json',art))),sha=b=>createHash('sha256').update(b).digest('hex');
await mkdir(out,{recursive:true});const manifest={version:1,scale:4,kind:'2d-rgba-sprite-atlases',sourceHashes:inventory.sourceHashes,atlases:[],sprites:{},future3D:{status:'not-authored',reference:'../../../docs/VR-ROADMAP.md',coordinateContract:'scene.js'}};
const review=[];
for(const g of inventory.groups){const raw=await readFile(new URL('raw/'+(g.id==='weapons'?'weapons-clean':g.id)+'.png',art)),baseImage=decodePNG(raw),cell=256,width=g.columns*cell,height=g.rows*cell,dst=new Uint8Array(width*height*4),cells=[];
 const correction=g.id==='weapons'?decodePNG(await readFile(new URL('raw/club-grips.png',art))):null;
 for(let i=0;i<g.columns*g.rows;i++){
  const corrected=correction&&[58,64].includes(g.ids[i]),image=corrected?correction:baseImage;
  const x=Math.round((i%g.columns)*image.width/g.columns),y=Math.round(Math.floor(i/g.columns)*image.height/g.rows),right=Math.round((i%g.columns+1)*image.width/g.columns),bottom=Math.round((Math.floor(i/g.columns)+1)*image.height/g.rows),bounds=alphaBounds(image,[x,y,right-x,bottom-y],24);
  if(i>=g.ids.length){if(bounds&&bounds[2]*bounds[3]>100)throw Error('Unexpected art in empty cell '+g.id+':'+i);continue;}
  const id=g.ids[i],s=inventory.sprites[id];if(!bounds)throw Error('Missing AI frame '+id);const [sx,sy,sw,sh]=bounds,[nx,ny,nw,nh]=s.ink,dx=(i%g.columns)*cell+nx*4,dy=Math.floor(i/g.columns)*cell+ny*4;
  // Premultiplied bilinear sampling avoids dark outlines around translucent edges.
  for(let yy=0;yy<nh*4;yy++)for(let xx=0;xx<nw*4;xx++){
   const u=Math.max(sx,Math.min(sx+sw-1,sx+(xx+.5)*sw/(nw*4)-.5)),v=Math.max(sy,Math.min(sy+sh-1,sy+(yy+.5)*sh/(nh*4)-.5)),x0=Math.floor(u),y0=Math.floor(v),fx=u-x0,fy=v-y0;let a=0,r=0,b=0,c=0;
   for(let oy=0;oy<2;oy++)for(let ox=0;ox<2;ox++){const p=(Math.min(image.height-1,y0+oy)*image.width+Math.min(image.width-1,x0+ox))*4,weight=(ox?fx:1-fx)*(oy?fy:1-fy),alpha=image.pixels[p+3]/255*weight;a+=alpha;r+=image.pixels[p]*alpha;b+=image.pixels[p+1]*alpha;c+=image.pixels[p+2]*alpha;}
   const p=((dy+yy)*width+dx+xx)*4;if(a){dst[p]=Math.round(r/a);dst[p+1]=Math.round(b/a);dst[p+2]=Math.round(c/a);dst[p+3]=Math.round(a*255);}
  }
  manifest.sprites[id]={atlas:g.id,rect:[(i%g.columns)*cell,Math.floor(i/g.columns)*cell,s.width*4,s.height*4],width:s.width,height:s.height,originX:s.originX,originY:s.originY,role:s.role,sourceSprite:id,dimensionality:'2d',sourceCell:i};
  cells.push({id,rawOverride:corrected?'club-grips.png':null,rawCell:[x,y,right-x,bottom-y],rawInk:bounds,nativeInk:s.ink});
 }
 const png=encodePNG(width,height,dst);await writeFile(new URL(g.id+'.png',out),png);manifest.atlases.push({id:g.id,file:g.id+'.png',width,height,sha256:sha(png),frames:g.ids.length});review.push({group:g.id,rawFile:g.id==='weapons'?'weapons-clean.png':g.id+'.png',rawSHA256:sha(raw),rawSize:[baseImage.width,baseImage.height],cells});
}
await writeFile(new URL('manifest.json',out),JSON.stringify(manifest,null,2)+'\n');await writeFile(new URL('packing.json',art),JSON.stringify(review,null,2)+'\n');console.log('Packed '+Object.keys(manifest.sprites).length+' HD frames in '+manifest.atlases.length+' atlases.');

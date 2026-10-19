import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {decodePNG,encodePNG,alphaBounds} from './png.mjs';
const root=new URL('../',import.meta.url),art=new URL('art/hd-v2/',root),out=new URL('dist/assets/hd/',root),inventory=JSON.parse(await readFile(new URL('inventory.json',art))),manifest=JSON.parse(await readFile(new URL('manifest.json',out))),game=JSON.parse(await readFile(new URL('dist/assets/game.json',root))),pal=game.palettes[0].rgb8_scaled,sha=b=>createHash('sha256').update(b).digest('hex');
for(const [file,hash]of Object.entries(inventory.sourceHashes))if(sha(await readFile(new URL(file,root)))!==hash)throw Error('Original source changed: '+file);
manifest.atlases=manifest.atlases.filter(a=>!a.id.startsWith('v2-'));for(const [id,s]of Object.entries(manifest.sprites))if(s.atlas.startsWith('v2-'))delete manifest.sprites[id];manifest.tiles={};manifest.backgrounds={};manifest.extensions={...manifest.extensions,environmentV2:{level:'1',sourceHashes:inventory.sourceHashes,retainedOriginalSprites:[282],retainedTextTiles:['1:union:519','1:union:520']}};
const banks={};for(const [bank,file]of Object.entries({local:game.levels[0].tiles,union:'union.idx',front:'front.idx'}))banks[bank]=await readFile(new URL('dist/assets/'+file,root));
function sample(im,x,y){x=Math.max(0,Math.min(im.width-1,x));y=Math.max(0,Math.min(im.height-1,y));const x0=Math.floor(x),y0=Math.floor(y),fx=x-x0,fy=y-y0;let alpha=0;const rgb=[0,0,0];for(let oy=0;oy<2;oy++)for(let ox=0;ox<2;ox++){const p=(Math.min(im.height-1,y0+oy)*im.width+Math.min(im.width-1,x0+ox))*4,a=im.pixels[p+3]/255*(ox?fx:1-fx)*(oy?fy:1-fy);alpha+=a;for(let k=0;k<3;k++)rgb[k]+=im.pixels[p+k]*a;}return [...rgb.map(v=>alpha?v/alpha:0),alpha*255];}
const reviews=[];
for(const group of inventory.groups){const raw=await readFile(new URL('raw/'+group.id+'.png',art)),image=decodePNG(raw),isTile=group.kind==='tile',size=isTile?64:256,width=group.columns*size,height=group.rows*size,dst=new Uint8Array(width*height*4),records=isTile?group.tiles:group.ids,cells=[];
 for(const [i,record]of records.entries()){
  const key=isTile?'1:'+record.bank+':'+record.id:record,source=isTile?inventory.tiles[key]:inventory.sprites[key],cx=i%group.columns,cy=Math.floor(i/group.columns),left=Math.round(cx*image.width/group.columns),top=Math.round(cy*image.height/group.rows),right=Math.round((cx+1)*image.width/group.columns),bottom=Math.round((cy+1)*image.height/group.rows),bounds=alphaBounds(image,[left,top,right-left,bottom-top],24);
  if(!source.ink||!isTile&&+key===282)continue;const preservedOriginal=isTile&&source.bank==='union'&&[519,520].includes(source.id);const preservedFlat=isTile&&new Set(banks[source.bank].subarray(source.id*256,source.id*256+256)).size===1;if(!bounds&&!preservedFlat)throw Error('Empty generated cell '+group.id+':'+key);
  const [sx,sy,sw,sh]=bounds||[left,top,right-left,bottom-top],[nx,ny,nw,nh]=source.ink;
  for(let yy=0;yy<nh*4;yy++)for(let xx=0;xx<nw*4;xx++){
   let v=sample(image,sx+(xx+.5)*sw/(nw*4)-.5,sy+(yy+.5)*sh/(nh*4)-.5);const dx=cx*size+nx*4+xx,dy=cy*size+ny*4+yy,p=(dy*width+dx)*4;
   if(isTile){const px=nx+Math.floor(xx/4),py=ny+Math.floor(yy/4),indexed=banks[source.bank][source.id*256+py*16+px];if(indexed===0)continue;
    // Preserve native alpha and the outermost HD pixel, feathering over the next seven.
    // A whole native-pixel border would leave a visible 4px pixel-art grid.
    const gx=nx*4+xx,gy=ny*4+yy;let edge=Math.min(gx,gy,63-gx,63-gy);
    for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++)if(px+ox>=0&&px+ox<16&&py+oy>=0&&py+oy<16&&banks[source.bank][source.id*256+(py+oy)*16+px+ox]===0){
     const left=(px+ox)*4,top=(py+oy)*4,dx=Math.max(left-gx-1,0,gx-left-4),dy=Math.max(top-gy-1,0,gy-top-4);edge=Math.min(edge,Math.max(dx,dy));
    }
    const weight=(preservedOriginal||preservedFlat||edge===0?0:Math.min(1,edge/8))*v[3]/255;
    for(let k=0;k<3;k++)v[k]=pal[indexed*3+k]*(1-weight)+v[k]*weight;v[3]=255;
   }
   for(let k=0;k<4;k++)dst[p+k]=Math.round(v[k]);
  }
  if(isTile)manifest.tiles[key]={atlas:group.id,rect:[cx*size,cy*size,64,64],level:'1',bank:source.bank,index:source.id,width:16,height:16,mask:'native-nearest',edgePhysicalPixels:1,preservedFlat,preservedOriginal};
  else manifest.sprites[key]={atlas:group.id,rect:[cx*size,cy*size,source.width*4,source.height*4],width:source.width,height:source.height,originX:source.originX,originY:source.originY,role:'collectible',sourceSprite:+key,dimensionality:'2d',sourceCell:i};
  cells.push({key,rawCell:[left,top,right-left,bottom-top],rawInk:bounds,nativeInk:source.ink});
 }
 const packed=encodePNG(width,height,dst);await writeFile(new URL(group.id+'.png',out),packed);manifest.atlases.push({id:group.id,file:group.id+'.png',width,height,sha256:sha(packed),frames:records.length,kind:group.kind});reviews.push({id:group.id,rawSHA256:sha(raw),rawSize:[image.width,image.height],cells});
}
const raw=await readFile(new URL('raw/v2-background.png',art)),bg=decodePNG(raw),width=1280,height=800,dst=new Uint8Array(width*height*4);for(let y=0;y<height;y++)for(let x=0;x<width;x++){const v=sample(bg,(x+.5)*bg.width/width-.5,(y+.5)*bg.height/height-.5);v[3]=255;for(let k=0;k<4;k++)dst[(y*width+x)*4+k]=Math.round(v[k]);}const png=encodePNG(width,height,dst);await writeFile(new URL('v2-background.png',out),png);manifest.atlases.push({id:'v2-background',file:'v2-background.png',width,height,sha256:sha(png),kind:'background'});manifest.backgrounds['1:BACK0']={atlas:'v2-background',rect:[0,0,width,height],level:'1',name:'BACK0',width:320,height:200};reviews.push({id:'v2-background',rawSHA256:sha(raw),rawSize:[bg.width,bg.height]});
await writeFile(new URL('manifest.json',out),JSON.stringify(manifest,null,2)+'\n');await writeFile(new URL('packing.json',art),JSON.stringify(reviews,null,2)+'\n');console.log({sprites:Object.keys(manifest.sprites).length,tiles:Object.keys(manifest.tiles).length,backgrounds:Object.keys(manifest.backgrounds).length});

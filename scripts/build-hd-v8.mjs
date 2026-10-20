import{readFile,writeFile}from'node:fs/promises';import{createHash}from'node:crypto';import{decodePNG,encodePNG}from'./png.mjs';import{wrapMaterial}from'./quilt-material.mjs';
const root=new URL('../',import.meta.url),read=n=>readFile(new URL(n,root)),m=JSON.parse(await read('dist/assets/hd/manifest.json')),sources=JSON.parse(await read('art/hd-v8/sources.json')),hash=b=>createHash('sha256').update(b).digest('hex');
for(const[f,h]of Object.entries(sources.sourceHashes))if(hash(await read(f))!==h)throw Error('Original changed '+f);
m.atlases=m.atlases.filter(a=>!a.id.startsWith('v8-'));m.worldMaterials={};const generated=[];
for(const name of ['wall','roots']){const raw=await read('art/hd-v8/raw/'+name+'.png'),decoded=decodePNG(raw),im=wrapMaterial(decoded,{vertical:name==='wall'}),width=name==='wall'?512:384,height=name==='wall'?416:128,pixels=new Uint8Array(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const xx=(x+.5)*im.width/width-.5,yy=(y+.5)*im.height/height-.5,ix=Math.max(0,Math.floor(xx)),iy=Math.max(0,Math.floor(yy)),fx=xx-Math.floor(xx),fy=yy-Math.floor(yy),p=(y*width+x)*4;for(let k=0;k<3;k++){let v=0;for(let j=0;j<2;j++)for(let i=0;i<2;i++)v+=im.pixels[(Math.min(im.height-1,iy+j)*im.width+Math.min(im.width-1,ix+i))*4+k]*(i?fx:1-fx)*(j?fy:1-fy);pixels[p+k]=Math.round(v);}pixels[p+3]=255;}
 if(name==='roots'){
  // Keep the drawn roots/moss and their immediate ink. Stone behind/below them
  // comes from the SAME world-space wall on both sides of the ground band.
  const seed=new Uint8Array(width*height);for(let p=0;p<seed.length;p++){const r=pixels[p*4],g=pixels[p*4+1],b=pixels[p*4+2],hi=Math.max(r,g,b),lo=Math.min(r,g,b);seed[p]=hi>45&&(hi-lo)/hi>.4?255:0;}
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){let alpha=0;for(let yy=Math.max(0,y-2);yy<=Math.min(height-1,y+2);yy++)for(let xx=Math.max(0,x-2);xx<=Math.min(width-1,x+2);xx++)alpha=Math.max(alpha,seed[yy*width+xx]);pixels[(y*width+x)*4+3]=Math.round(alpha*Math.min(1,(height-1-y)/16));}
 }
 const png=encodePNG(width,height,pixels),id='v8-'+name;await writeFile(new URL('dist/assets/hd/'+id+'.png',root),png);m.atlases.push({id,file:id+'.png',width,height,sha256:hash(png),kind:'world-material'});m.worldMaterials[name]={atlas:id,rect:[0,0,width,height],width:width/4,height:height/4,level:'1',sampling:'world-periodic',originY:name==='wall'?704:0};generated.push({name,rawSHA256:hash(raw),rawSize:[decoded.width,decoded.height],size:[width,height],wrapSize:[im.width,im.height],seams:im.seams,overlap:im.bands});
}
m.extensions.continuousTerrainV8={level:'1',sourceHashes:sources.sourceHashes};await writeFile(new URL('dist/assets/hd/manifest.json',root),JSON.stringify(m,null,2)+'\n');await writeFile(new URL('art/hd-v8/packing.json',root),JSON.stringify({generated},null,2)+'\n');console.log(generated.map(({name,size,rawSize})=>({name,size,rawSize})));

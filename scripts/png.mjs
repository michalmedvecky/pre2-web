// Minimal, dependency-free PNG codec for reproducible RGBA8 asset preparation.
import {deflateSync,inflateSync} from 'node:zlib';
const table=Uint32Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc(b){let n=0xffffffff;for(const v of b)n=table[(n^v)&255]^(n>>>8);return (n^0xffffffff)>>>0;}
export function encodePNG(width,height,pixels){const chunk=(type,b)=>{const t=Buffer.from(type),out=Buffer.alloc(b.length+12);out.writeUInt32BE(b.length);t.copy(out,4);b.copy(out,8);out.writeUInt32BE(crc(Buffer.concat([t,b])),8+b.length);return out;},ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(width);ihdr.writeUInt32BE(height,4);ihdr[8]=8;ihdr[9]=6;const raw=Buffer.alloc(height*(width*4+1));for(let y=0;y<height;y++)Buffer.from(pixels.buffer,pixels.byteOffset+y*width*4,width*4).copy(raw,y*(width*4+1)+1);return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);}
export function decodePNG(data){
 if(!data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw Error('Invalid PNG signature');
 let width,height,channels,compressed=[];
 for(let p=8;p<data.length;){
  const n=data.readUInt32BE(p);if(p+n+12>data.length)throw Error('Truncated PNG chunk');
  const type=data.toString('ascii',p+4,p+8),b=data.subarray(p+8,p+8+n);
  if(type==='IHDR'){width=b.readUInt32BE(0);height=b.readUInt32BE(4);if(b[8]!==8||![2,6].includes(b[9])||b[12]!==0)throw Error('Expected noninterlaced RGB/RGBA8 PNG');channels=b[9]===6?4:3;}
  if(type==='IDAT')compressed.push(b);p+=n+12;
 }
 if(!width||!height||width>8192||height>8192||!channels)throw Error('Invalid PNG extent');
 const stride=width*channels,raw=inflateSync(Buffer.concat(compressed),{maxOutputLength:height*(stride+1)}),decoded=new Uint8Array(width*height*channels);
 if(raw.length!==height*(stride+1))throw Error('Invalid scanline length');
 let p=0;
 for(let y=0;y<height;y++){
  const filter=raw[p++];if(filter>4)throw Error('Unsupported filter');
  for(let x=0;x<stride;x++){
   const i=y*stride+x,a=x>=channels?decoded[i-channels]:0,b=y?decoded[i-stride]:0,c=y&&x>=channels?decoded[i-stride-channels]:0,q=a+b-c,pa=Math.abs(q-a),pb=Math.abs(q-b),pc=Math.abs(q-c);
   const v=filter===0?0:filter===1?a:filter===2?b:filter===3?(a+b)>>1:pa<=pb&&pa<=pc?a:pb<=pc?b:c;
   decoded[i]=(raw[p++]+v)&255;
  }
 }
 const pixels=channels===4?decoded:new Uint8Array(width*height*4);
 if(channels===3)for(let i=0;i<width*height;i++){pixels.set(decoded.subarray(i*3,i*3+3),i*4);pixels[i*4+3]=255;}
 return {width,height,pixels};
}
export function alphaBounds(image,rect=[0,0,image.width,image.height],threshold=16){const [x,y,w,h]=rect;let left=x+w,top=y+h,right=x,bottom=y;for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)if(image.pixels[(yy*image.width+xx)*4+3]>threshold){left=Math.min(left,xx);top=Math.min(top,yy);right=Math.max(right,xx+1);bottom=Math.max(bottom,yy+1);}return right>left?[left,top,right-left,bottom-top]:null;}

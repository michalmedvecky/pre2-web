import * as T from '../vendor/three.module.js';
// Shared smooth sculpt surfaces and a deterministic fur weave. No transparent
// hair cards, shell layers, or per-frame geometry/texture generation on Quest.
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
function sculpt(kind){const g=new T.SphereGeometry(1,kind==='limb'?24:kind==='torso'?64:48,kind==='limb'?16:kind==='torso'?48:32),p=g.attributes.position,colors=[],brown=new T.Color('#99592f'),cream=new T.Color('#edc38d'),color=new T.Color();
 for(let n=0;n<p.count;n++){let x=p.getX(n),y=p.getY(n),z=p.getZ(n);const t=(y+1)/2;
 if(kind==='torso'){
  const width=1+.11*Math.cos((t-.2)*Math.PI)-.12*smooth(.65,1,t);x*=.25*width;z*=.235*width;const yy=.18+t*.6;x+=.018*Math.sin(t*Math.PI)-.025*t;y=yy;
  const front=smooth(.035,.2,x),chest=(1-smooth(.17,.225,Math.abs(z)))*smooth(.22,.32,y)*(1-smooth(.65,.75,y));color.copy(brown).lerp(cream,front*chest);colors.push(color.r,color.g,color.b);
 }else if(kind==='head'){x=x*.205+.016*(1-y*y);y*=.18;z*=.205*(1+.035*Math.cos(y*12));color.copy(brown).lerp(cream,smooth(.055,.17,x)*(1-smooth(.015,.085,y))*(1-smooth(.13,.205,Math.abs(z))));colors.push(color.r,color.g,color.b);}
 else if(kind==='limb'){const r=1+.12*Math.sin(t*Math.PI)-.15*t;x*=r;z*=r;x+=.10*(1-y*y);}
 if(kind==='torso'||kind==='head'){const a=Math.atan2(z,x),ripple=1+.004*Math.sin(a*37+y*93)+.002*Math.sin(a*59-y*61);x*=ripple;z*=ripple;}
 p.setXYZ(n,x,y,z);
 }
 if(colors.length)g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();g.computeBoundingBox();g.userData.sculpt=kind;return g;
}
let cached;
export function bearSurfaces(){if(cached)return cached;const width=256,height=512,bytes=new Uint8Array(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const u=x/width*Math.PI*2,warp=2.2*Math.sin(y*.016+u*3)+1.4*Math.sin(y*.043),strand=Math.sin(u*69+warp)+.45*Math.sin(u*127+y*.08),noise=Math.sin(Math.cos(u)*127.1+Math.sin(u)*67.9+y*311.7)*43758.5453;const value=Math.round(233+3*strand+12*(noise-Math.floor(noise)));const i=(y*width+x)*4;bytes.set([value,value,value,255],i);}
 const map=new T.DataTexture(bytes,width,height,T.RGBAFormat);map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.minFilter=T.LinearMipmapLinearFilter;map.magFilter=T.LinearFilter;map.generateMipmaps=true;map.needsUpdate=true;const bump=map.clone();bump.colorSpace=T.NoColorSpace;bump.needsUpdate=true;
 cached={sphere:new T.SphereGeometry(1,18,12),torso:sculpt('torso'),head:sculpt('head'),limb:sculpt('limb'),map,bump};return cached;}

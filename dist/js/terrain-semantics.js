// Opaque palette6 is a cave's dark backdrop, not transparent air or solid rock
// decoration. The HD surface must not replace that semantic mask with boulders.
export function terrainStats(pixels){let dark=0,green=0,bright=0,other=0;for(const v of pixels){if(v===6)dark++;else if(v>=8&&v<=10)green++;else if(v>=14)bright++;else if(v!==0&&v!==11&&v!==12&&v!==13)other++;}return{flatDark:dark===256,sparse:dark>128&&!green&&!bright&&!other};}
export function shadowRoleForMaterial(role,kind,covered=false){return covered?0:role===2||role===1&&kind==='wall'?role:0;}
export function terrainShadowRoles(level,map,union,local){const stats=new Map(),role=new Uint8Array(map.length),value=i=>level.lookup[map[i]],get=v=>{if(!stats.has(v)){const bank=v<256?local:union,off=(v<256?v:v-256)*256;stats.set(v,terrainStats(bank?.subarray(off,off+256)||[]));}return stats.get(v);};
 const queue=new Int32Array(map.length);let head=0,tail=0;
 for(let i=0;i<map.length;i++)if(get(value(i)).flatDark){role[i]=2;queue[tail++]=i;}
 while(head<tail){const i=queue[head++],tx=i%256,ty=i>>8;for(let y=Math.max(0,ty-1);y<=Math.min(level.height-1,ty+1);y++)for(let x=Math.max(0,tx-1);x<=Math.min(255,tx+1);x++){const at=y*256+x;if(!role[at]&&get(value(at)).sparse){role[at]=2;queue[tail++]=at;}}}
 for(let i=0;i<map.length;i++)if(role[i]===2){const tx=i%256,ty=i>>8;for(let y=Math.max(0,ty-1);y<=Math.min(level.height-1,ty+1);y++)for(let x=Math.max(0,tx-1);x<=Math.min(255,tx+1);x++){const at=y*256+x;if(!role[at])role[at]=1;}}
 return role;
}
// Opening with a small disk keeps broad cave space and removes thin native
// inter-stone cracks which disagree with the continuous painted stone pattern.
export function caveVoidMask(source,width,roles,columns){const n=source.length,raw=new Uint8Array(n),eroded=new Uint8Array(n),out=new Uint8Array(n),disk=[];for(let y=-5;y<=5;y++)for(let x=-5;x<=5;x++)if(x*x+y*y<=25)disk.push([x,y]);
 for(let y=0;y<width;y++)for(let x=0;x<width;x++){const p=y*width+x,role=roles[(y>>4)*columns+(x>>4)];raw[p]=role===2||role===1&&source[p]===6?1:0;}
 for(let y=5;y<width-5;y++)for(let x=5;x<width-5;x++){let keep=1;for(const[dx,dy]of disk)if(!raw[(y+dy)*width+x+dx]){keep=0;break;}eroded[y*width+x]=keep;}
 for(let y=5;y<width-5;y++)for(let x=5;x<width-5;x++)if(eroded[y*width+x])for(const[dx,dy]of disk)out[(y+dy)*width+x+dx]=1;
 return out;
}
export function preserveCaveShadows(paint,source,width,roles,columns,palette){if(!roles.some(v=>v))return paint;const out=new Float32Array(4),dark=palette.slice(18,21),voids=caveVoidMask(source,width,roles,columns),value=(field,x,y)=>field[Math.max(0,Math.min(width-1,y))*width+Math.max(0,Math.min(width-1,x))],sample=(field,x,y)=>{const xx=(x+.5)/4-.5,yy=(y+.5)/4-.5,ix=Math.floor(xx),iy=Math.floor(yy),fx=xx-ix,fy=yy-iy;return(value(field,ix,iy)*(1-fx)+value(field,ix+1,iy)*fx)*(1-fy)+(value(field,ix,iy+1)*(1-fx)+value(field,ix+1,iy+1)*fx)*fy;},pebbles=new Uint8Array(source.length);
 for(let y=0;y<width;y++)for(let x=0;x<width;x++){const p=y*width+x;if(roles[(y>>4)*columns+(x>>4)]===2&&source[p]!==0&&source[p]!==6)pebbles[p]=1;}
 return(x,y,r=16,g=16,b=16)=>{out.set(paint(x,y));if(!out[3])return out;let a=sample(voids,x,y);a=Math.max(0,Math.min(1,(a-.15)/.7));a=a*a*(3-2*a);for(let k=0;k<3;k++)out[k]=out[k]*(1-a)+dark[k]*a;const pebble=sample(pebbles,x,y);if(pebble){const color=[r,g,b];for(let k=0;k<3;k++)out[k]=out[k]*(1-pebble)+color[k]*pebble;}return out;};
}

// HD presentation anchors recovered from actual map patterns. No world mutation.
export function mapFingerprint(map){let h=2166136261;for(const b of map)h=Math.imul(h^b,16777619);return h>>>0;}
export function discoverDecor(level,map,union){
 const width=4096,height=level.height*16,objects=[],covered=new Set(),physical=i=>level.lookup[map[i]],mask=new Uint8Array(width*height);
 const mark=(object,tx,ty,w,h)=>{objects.push({...object,x:tx*16,y:ty*16,width:w*16,height:h*16});for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++)covered.add((ty+yy)*256+tx+xx);};
 const column=[654,11,12,667,668,669,651,652,653,664,665,666],sign=[775,776,3,777,778,779];
 for(let i=0;i<map.length;i++){const v=physical(i),tx=i%256,ty=i>>8;
  const match=(pattern,w,h)=>tx+w<=256&&ty+h<=level.height&&pattern.every((p,j)=>physical(i+(j/w|0)*256+j%w)===p);
  if(v===654&&match(column,3,4))mark({kind:'column'},tx,ty,3,4);
  if(v===775&&match(sign,3,2))mark({kind:'sign'},tx,ty,3,2);
  if(v===633)mark({kind:'spikes'},tx,ty,1,1);
 }
 const greenValues=new Set([605,606,607,622,623,624,641,642,701,702,703,705,706,707,708,709,710,711,712,713,719,720,721,722,723,724]);
 // Group original leaf pixels across tile boundaries. Padding joins individual
 // leaflets, but does not impose a rectangular native-tile crop on the HD plant.
 for(let i=0;i<map.length;i++){const value=physical(i);if(covered.has(i)||!greenValues.has(value))continue;const tx=i%256*16,ty=(i>>8)*16,off=(value-256)*256;
  for(let y=0;y<16;y++)for(let x=0;x<16;x++){const v=union[off+y*16+x];if(v<8||v>10)continue;const wx=tx+x,wy=ty+y;for(let yy=Math.max(0,wy-2);yy<=Math.min(height-1,wy+2);yy++)for(let xx=Math.max(0,wx-2);xx<=Math.min(width-1,wx+2);xx++)mask[yy*width+xx]|=1;mask[wy*width+wx]|=2;}
 }
 const queue=new Int32Array(width*height),plants=[];
 for(let p=0;p<mask.length;p++){if(!(mask[p]&1))continue;let n=1;queue[0]=p;mask[p]|=4;let x0=width,y0=height,x1=0,y1=0,count=0;
  for(let q=0;q<n;q++){const at=queue[q],x=at%width,y=at/width|0;if(mask[at]&2){count++;x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}for(const next of[x?at-1:-1,x+1<width?at+1:-1,y?at-width:-1,y+1<height?at+width:-1])if(next>=0&&(mask[next]&1)&&!(mask[next]&4)){mask[next]|=4;queue[n++]=next;}mask[at]&=~1;
  }
  if(count>=5){const pieces=x1-x0+1>(y1-y0+1)*2.2?Math.ceil((x1-x0+1)/48):1,step=pieces>1&&y1-y0>23?32:Math.ceil((x1-x0+1)/pieces);for(let start=x0;start<=x1;start+=step){let ax=width,ay=height,bx=0,by=0;for(let z=0;z<n;z++){const at=queue[z],x=at%width,y=at/width|0;if((mask[at]&2)&&x>=start&&x<start+step){ax=Math.min(ax,x);bx=Math.max(bx,x);ay=Math.min(ay,y);by=Math.max(by,y);}}if(ax<=bx)plants.push({kind:'plant',x:ax-1,y:ay-1,width:bx-ax+3,height:by-ay+3,shape:(bx-ax+1)/(by-ay+1)>1.3?'low':'tall'});}}
 }
 const backdrops=new Map(),root=v=>[714,715,716,717,780,781].includes(v)?'root-top':[693,694,695,696,697,698,786,787].includes(v)?'root-bottom':null;
 for(const o of objects)for(let y=o.y>>4;y<(o.y+o.height)>>4;y++){const left=(o.x>>4)-1,right=(o.x+o.width)>>4,kind=root(physical(y*256+left))||root(physical(y*256+right));if(kind)for(let x=o.x>>4;x<(o.x+o.width)>>4;x++)backdrops.set(y*256+x,kind);}
 return{objects,covered,plants,backdrops};
}

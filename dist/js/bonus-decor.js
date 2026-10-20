// Complete five-by-six-cell cherry ornament, recovered from B's authored map.
const pattern=[256,256,534,535,536,541,542,543,544,545,531,532,533,256,256,537,538,539,540,256,546,547,0,1,256,548,549,3,4,256];
export function bonusCherries(level,map){const out=[];for(let y=0;y<=level.height-6;y++)for(let x=0;x<=251;x++){if(level.lookup[map[(y+0)*256+x+2]]!==534)continue;if(pattern.every((v,j)=>level.lookup[map[(y+(j/5|0))*256+x+j%5]]===v))out.push({x:x*16,y:y*16,width:80,height:96,cells:pattern.flatMap((v,j)=>v===256?[]:[(y+(j/5|0))*256+x+j%5])});}return out;}

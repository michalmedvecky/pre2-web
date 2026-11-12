// Exact five-by-six-cell authored ornaments. B uses local right-fruit cells;
// D repeats the shared left-fruit cells. Never match arbitrary food/glass tiles.
const pattern=[256,256,534,535,536,541,542,543,544,545,531,532,533,256,256,537,538,539,540,256,546,547,0,1,256,548,549,3,4,256];
const sharedFruitPattern=pattern.map((v,j)=>({22:546,23:547,27:548,28:549})[j]??v);
export function bonusCherries(level,map){const out=[];for(let y=0;y<=level.height-6;y++)for(let x=0;x<=251;x++){if(level.lookup[map[(y+0)*256+x+2]]!==534)continue;const expected=level.id==='D'?sharedFruitPattern:pattern;if(expected.every((v,j)=>level.lookup[map[(y+(j/5|0))*256+x+j%5]]===v))out.push({x:x*16,y:y*16,width:80,height:96,cells:pattern.flatMap((v,j)=>v===256?[]:[(y+(j/5|0))*256+x+j%5])});}return out;}

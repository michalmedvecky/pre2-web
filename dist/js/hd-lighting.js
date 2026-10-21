// Painted RGB art has no VGA palette indices. Transfer the authored terrain
// palette's channel energy to one coherent scene grade; actors/HUD are separate.
export function paletteLighting(base,current){
 if(!current)return[1,1,1];const out=[];for(let k=0;k<3;k++){let a=0,b=0;for(let i=1;i<16;i++){a+=base[i*3+k]||0;b+=current[i*3+k]||0;}out.push(a?Math.max(0,Math.min(1.5,b/a)):1);}return out;
}
export const neutralLighting=v=>v.every(x=>Math.abs(x-1)<1/255);
export function lightingColor(v){return'rgb('+v.map(x=>Math.round(Math.min(1,x)*255)).join(',')+')';}

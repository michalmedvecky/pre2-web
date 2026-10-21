// Editable 360-degree interpretations of source spider/frog/bird poses, with real limbs and rear surfaces.
import * as T from '../vendor/three.module.js';
import {naturalLedge} from './trail.js';
const sphere=new T.SphereGeometry(1,10,7),box=new T.BoxGeometry(1,1,1),cylinder=new T.CylinderGeometry(1,1,1,7),eyeWhite='#eee9cf',dark='#241b16';
export const creatureFamily=id=>id>=318&&id<=326?'spider':id>=349&&id<=354?'dinosaur':id>=388&&id<=395?'sauropod':id>=382&&id<=385?'bird':id===232?'platform':null;
export function creatureGeometry(id,source,{depth=.5}={}){
 const family=creatureFamily(id),parts=[];if(!family)return null;
 function part(geometry,color,p,s,q){const g=geometry.clone();const m=new T.Matrix4().compose(new T.Vector3(...p),q||new T.Quaternion(),new T.Vector3(...s));g.applyMatrix4(m);const c=new T.Color(color),colors=[];for(let n=0;n<g.attributes.position.count;n++)colors.push(c.r,c.g,c.b);g.setAttribute('color',new T.Float32BufferAttribute(colors,3));parts.push(g);}
 const ball=(color,p,s)=>part(sphere,color,p,s),bar=(color,a,b,r)=>{const v=new T.Vector3(...b).sub(new T.Vector3(...a)),mid=new T.Vector3(...a).addScaledVector(v,.5);part(cylinder,color,mid.toArray(),[r,v.length(),r],new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),v.normalize()));};
 if(family==='spider'){
  const phase=(id-318)*Math.PI/2;ball('#514334',[-.14,.57,0],[.29,.32,.29]);ball('#8b7760',[-.2,.65,0],[.17,.19,.22]);ball('#65371f',[.18,.32,0],[.2,.2,.21]);
  for(const side of [-1,1])for(let n=0;n<4;n++){const x=(n-1.5)*.13,step=Math.sin(phase+n*Math.PI/2)*.055,a=[x,.4,side*.13],b=[x-.12,.32+step,side*(.35+Math.abs(n-1.5)*.04)],c=[x+.13,.06+Math.max(0,step),side*.45];bar('#7d4122',a,b,.035);bar('#9b5931',b,c,.026);ball('#b87944',b,[.045,.045,.045]);}
  for(const side of [-1,1]){ball(eyeWhite,[.32,.41,side*.095],[.055,.06,.047]);ball(dark,[.359,.4,side*.105],[.024,.027,.024]);bar('#ede0b5',[.33,.25,side*.075],[.42,.16,side*.05],.025);}
 }else if(family==='dinosaur'){
  const stride=Math.sin((id-349)*Math.PI*.65),green='#35954a',light='#c7bc77';ball(green,[-.03,.43,0],[.27,.34,.25]);ball(light,[.17,.39,0],[.13,.23,.19]);ball('#49a856',[.09,.72,0],[.28,.23,.23]);ball('#4fa35b',[.31,.67,0],[.2,.13,.2]);
  for(const side of [-1,1]){ball(green,[-.12,.19,side*.18],[.17,.22,.13]);bar(green,[-.12,.2,side*.18],[.02+side*stride*.065,.055,side*.23],.09);ball('#72a256',[.13+side*stride*.065,.05,side*.23],[.19,.055,.12]);bar(green,[.16,.47,side*.18],[.29,.39-side*stride*.02,side*.23],.045);ball(eyeWhite,[.19,.83,side*.17],[.075,.08,.06]);ball(dark,[.235,.84,side*.2],[.035,.04,.025]);ball('#315c37',[.43,.72,side*.09],[.018,.018,.018]);for(let n=0;n<3;n++)bar('#e6dfb5',[.21+n*.08,.57,side*.13],[.21+n*.08,.53,side*.13],.018);}
  const tail=[[-.2,.3,0],[-.36,.25,0],[-.48,.19,0],[-.58,.23,0]];for(let n=0;n<tail.length-1;n++)bar(green,tail[n],tail[n+1],.11-n*.035);
  for(let n=0;n<6;n++)part(new T.ConeGeometry(.065,.12,5),'#d0ad4e',[-.22-n*.045,.66-n*.075,0],[1,1,1]);
 }else if(family==='sauropod'){
  ball('#45964c',[-.08,.35,0],[.34,.22,.24]);ball('#a37a41',[-.12,.5,0],[.29,.14,.22]);bar('#468e43',[.17,.4,0],[.3,.76,0],.09);ball('#5aab58',[.35,.8,0],[.18,.12,.12]);bar('#438f43',[-.35,.33,0],[-.55,.2,0],.07);
  for(const side of [-1,1])for(const x of [-.25,.13])bar('#438a42',[x,.3,side*.15],[x+Math.sin(id+x*5)*.035,.055,side*.19],.065);
  for(const side of [-1,1]){ball(eyeWhite,[.4,.86,side*.075],[.045,.048,.035]);ball(dark,[.425,.86,side*.09],[.02,.025,.018]);}
 }else if(family==='bird'){
  const flap=[-.3,.1,.9,.4][id-382];ball('#85502b',[-.08,.4,0],[.26,.3,.22]);ball('#b47435',[.13,.65,0],[.22,.22,.22]);ball('#ecbd48',[.37,.64,0],[.17,.105,.09]);bar('#5e3820',[-.24,.36,0],[-.47,.57,0],.08);
  for(const side of [-1,1]){bar('#8c522c',[-.07,.53,side*.12],[-.2,.48+flap*.36,side*.42],.09);for(let n=0;n<3;n++)bar('#a56635',[-.2,.48+flap*.36,side*.38],[-.35+n*.08,.23+flap*.65,side*(.44+n*.025)],.042);ball(eyeWhite,[.23,.76,side*.16],[.075,.085,.055]);ball(dark,[.275,.76,side*.195],[.035,.043,.03]);bar('#d9a440',[-.03,.2,side*.1],[.09,.045,side*.11],.035);for(let n=0;n<3;n++)bar('#edbb50',[.09,.045,side*.11],[.25,.02,side*.11+(n-1)*.055],.018);}
 }else{
  part(naturalLedge(1,1),'#70654d',[0,1,0],[1,.7,1]);for(let n=0;n<9;n++){const z=-.43+n*.107;ball(n%2?'#78654b':'#5a4932',[Math.sin(n*2)*.08,.7,z],[.43,.16,.075]);bar('#738440',[-.4,1.005,z],[-.1,1.01,z+.02],.022);bar('#54713a',[.1,1.005,z],[.4,1.01,z-.025],.02);}
 }
 const positions=[],normals=[],colors=[],indices=[];for(const g of parts){const base=positions.length/3;positions.push(...g.attributes.position.array);normals.push(...g.attributes.normal.array);colors.push(...g.attributes.color.array);for(const index of g.index.array)indices.push(base+index);g.dispose();}
 const result=new T.BufferGeometry();result.setAttribute('position',new T.Float32BufferAttribute(positions,3));result.setAttribute('normal',new T.Float32BufferAttribute(normals,3));result.setAttribute('color',new T.Float32BufferAttribute(colors,3));result.setIndex(indices);
 const width=source.width/32,height=source.height/32;result.scale(width,height,family==='platform'?depth:Math.max(.25,width*.8));result.translate((source.width/2-source.originX)/32,-source.originY/32,0);result.computeBoundingBox();result.computeBoundingSphere();result.userData={reconstruction:'anatomical-'+family,closed:true};return result;
}

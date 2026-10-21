// Editable 360-degree interpretations of source spider/frog/bird poses, with real limbs and rear surfaces.
import * as T from '../vendor/three.module.js';
const sphere=new T.SphereGeometry(1,10,7),box=new T.BoxGeometry(1,1,1),cylinder=new T.CylinderGeometry(1,1,1,7),eyeWhite='#eee9cf',dark='#241b16';
export const creatureFamily=id=>id>=318&&id<=326?'spider':id>=349&&id<=351?'frog':id>=382&&id<=385?'bird':id===232?'platform':null;
export function creatureGeometry(id,source,{depth=.5}={}){
 const family=creatureFamily(id),parts=[];if(!family)return null;
 function part(geometry,color,p,s,q){const g=geometry.clone();const m=new T.Matrix4().compose(new T.Vector3(...p),q||new T.Quaternion(),new T.Vector3(...s));g.applyMatrix4(m);const c=new T.Color(color),colors=[];for(let n=0;n<g.attributes.position.count;n++)colors.push(c.r,c.g,c.b);g.setAttribute('color',new T.Float32BufferAttribute(colors,3));parts.push(g);}
 const ball=(color,p,s)=>part(sphere,color,p,s),bar=(color,a,b,r)=>{const v=new T.Vector3(...b).sub(new T.Vector3(...a)),mid=new T.Vector3(...a).addScaledVector(v,.5);part(cylinder,color,mid.toArray(),[r,v.length(),r],new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),v.normalize()));};
 if(family==='spider'){
  const phase=(id-318)*Math.PI/2;ball('#514334',[-.14,.57,0],[.29,.32,.29]);ball('#8b7760',[-.2,.65,0],[.17,.19,.22]);ball('#65371f',[.18,.32,0],[.2,.2,.21]);
  for(const side of [-1,1])for(let n=0;n<4;n++){const x=(n-1.5)*.13,step=Math.sin(phase+n*Math.PI/2)*.055,a=[x,.4,side*.13],b=[x-.12,.32+step,side*(.35+Math.abs(n-1.5)*.04)],c=[x+.13,.06+Math.max(0,step),side*.45];bar('#7d4122',a,b,.035);bar('#9b5931',b,c,.026);ball('#b87944',b,[.045,.045,.045]);}
  for(const side of [-1,1]){ball(eyeWhite,[.32,.41,side*.095],[.055,.06,.047]);ball(dark,[.359,.4,side*.105],[.024,.027,.024]);bar('#ede0b5',[.33,.25,side*.075],[.42,.16,side*.05],.025);}
 }else if(family==='frog'){
  const hop=(id-349)/2;ball('#29752b',[-.05,.4,0],[.35,.3,.29]);ball('#79a842',[.16,.36,0],[.16,.22,.25]);ball('#538b25',[.2,.64,0],[.25,.22,.27]);
  for(const side of [-1,1]){ball('#358c2d',[-.24,.2,side*.27],[.22,.2,.15]);bar('#7c9f34',[-.22,.2,side*.28],[-.35+hop*.15,.04,side*.36],.065);bar('#4b912d',[.2,.37,side*.16],[.35,.05+hop*.1,side*.31],.045);ball(eyeWhite,[.3,.75,side*.17],[.09,.1,.08]);ball('#1b2114',[.369,.76,side*.17],[.045,.055,.045]);ball('#d7bc73',[.35,.54,side*.06],[.085,.035,.15]);}
  ball('#173d22',[.403,.57,0],[.02,.018,.15]);
 }else if(family==='bird'){
  const flap=[-.3,.1,.9,.4][id-382];ball('#85502b',[-.08,.4,0],[.26,.3,.22]);ball('#b47435',[.13,.65,0],[.22,.22,.22]);ball('#ecbd48',[.37,.64,0],[.17,.105,.09]);bar('#5e3820',[-.24,.36,0],[-.47,.57,0],.08);
  for(const side of [-1,1]){bar('#8c522c',[-.07,.53,side*.12],[-.2,.48+flap*.36,side*.42],.09);for(let n=0;n<3;n++)bar('#a56635',[-.2,.48+flap*.36,side*.38],[-.35+n*.08,.23+flap*.65,side*(.44+n*.025)],.042);ball(eyeWhite,[.23,.76,side*.16],[.075,.085,.055]);ball(dark,[.275,.76,side*.195],[.035,.043,.03]);bar('#d9a440',[-.03,.2,side*.1],[.09,.045,side*.11],.035);for(let n=0;n<3;n++)bar('#edbb50',[.09,.045,side*.11],[.25,.02,side*.11+(n-1)*.055],.018);}
 }else{
  part(box,'#65543a',[0,.66,0],[.94,.34,.98]);for(let n=0;n<9;n++){const z=-.43+n*.107;ball(n%2?'#78654b':'#5a4932',[Math.sin(n*2)*.08,.37,z],[.44,.3,.095]);bar('#738440',[-.4,.87,z],[-.1,.96,z+.02],.022);bar('#54713a',[.1,.9,z],[.4,.94,z-.025],.02);}
 }
 const positions=[],normals=[],colors=[],indices=[];for(const g of parts){const base=positions.length/3;positions.push(...g.attributes.position.array);normals.push(...g.attributes.normal.array);colors.push(...g.attributes.color.array);for(const index of g.index.array)indices.push(base+index);g.dispose();}
 const result=new T.BufferGeometry();result.setAttribute('position',new T.Float32BufferAttribute(positions,3));result.setAttribute('normal',new T.Float32BufferAttribute(normals,3));result.setAttribute('color',new T.Float32BufferAttribute(colors,3));result.setIndex(indices);
 const width=source.width/32,height=source.height/32;result.scale(width,height,family==='platform'?depth:Math.max(.25,width*.8));result.translate((source.width/2-source.originX)/32,-source.originY/32,0);result.computeBoundingBox();result.computeBoundingSphere();result.userData={reconstruction:'anatomical-'+family,closed:true};return result;
}

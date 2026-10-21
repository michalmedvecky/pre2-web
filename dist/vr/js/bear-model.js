// Closed, editable 3D interpretation of original bear sprites 312..316 and 379..381.
// The sprite reference is upright: two hind legs, hanging arms, pale muzzle/chest.
import * as T from '../vendor/three.module.js';
const HEIGHT=.96;
const sphere=new T.SphereGeometry(1,12,9);
const hitColor=new T.Color('#fff3cf');
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function part(parent,material,position,scale,geometry=sphere){const m=new T.Mesh(geometry,material);m.position.set(...position);m.scale.set(...scale);m.castShadow=true;parent.add(m);return m;}
function pivot(parent,x,y,z){const g=new T.Group();g.position.set(x,y,z);parent.add(g);return g;}

export function makeBear(){
 const root=new T.Group(),ground=new T.Plane(new T.Vector3(0,1,0),0);
 const material=color=>new T.MeshStandardMaterial({color,roughness:.9,clippingPlanes:[ground],clipShadows:true});
 const fur=material('#99592f'),highlight=material('#b77542'),belly=material('#f1c998'),muzzle=material('#dfac72'),dark=material('#2d1b15'),mouth=material('#401a17'),tongue=material('#df5143'),ivory=material('#fff0c8');
 const colors=[fur,highlight,belly,muzzle,dark,mouth,tongue,ivory].map(m=>[m,m.color.clone()]);
 const body=pivot(root,0,0,0);
 // Upright pear-shaped torso; the pale chest lies on the forward (+X) surface.
 part(body,fur,[-.055,.48,0],[.255,.32,.245]);
 part(body,highlight,[-.04,.61,0],[.235,.25,.24]);
 part(body,belly,[.17,.43,0],[.098,.21,.185]);
 part(body,belly,[.185,.59,0],[.077,.14,.18]);
 // Tiny tail, visible from behind in a full 360-degree view.
 part(body,fur,[-.31,.35,0],[.07,.075,.07]);
 const head=pivot(body,.035,.735,0);
 part(head,fur,[0,0,0],[.205,.18,.212]);
 part(head,highlight,[.02,.07,0],[.18,.125,.2]);
 for(const side of [-1,1]){
  part(head,fur,[-.055,.14,side*.166],[.088,.09,.07]);
  part(head,muzzle,[-.012,.145,side*.185],[.045,.055,.041]);
  // Cheek tufts preserve the broad original side silhouette without open surfaces.
  part(head,highlight,[.025,-.075,side*.183],[.115,.12,.076]).rotation.x=side*.22;
  part(head,belly,[.112,-.057,side*.14],[.083,.103,.069]);
  part(head,ivory,[.15,.044,side*.145],[.069,.066,.046]);
  part(head,dark,[.197,.043,side*.16],[.026,.037,.019]);
  part(head,ivory,[.213,.059,side*.169],[.009,.012,.008]);
  const brow=part(head,dark,[.146,.103,side*.154],[.085,.024,.043]);brow.rotation.x=side*.18;brow.rotation.z=-.22;
 }
 // Original's conspicuous open mouth and long, light muzzle, rather than a realistic snout.
 part(head,mouth,[.218,-.109,0],[.104,.092,.13]);
 part(head,muzzle,[.213,-.164,0],[.113,.039,.128]);
 part(head,tongue,[.299,-.141,0],[.018,.022,.075]);
 part(head,muzzle,[.237,-.042,0],[.14,.064,.137]);
 part(head,dark,[.352,-.027,0],[.065,.056,.092]);
 part(head,ivory,[.386,-.007,-.024],[.014,.013,.032]);
 for(const side of [-1,1])part(head,ivory,[.292,-.095,side*.081],[.026,.043,.022]).rotation.z=.22;
 const arms=[],legs=[];
 for(const side of [-1,1]){
  const arm=pivot(body,-.035,.62,side*.225);arms.push(arm);
  part(arm,fur,[-.045,-.105,side*.019],[.11,.19,.108]);
  part(arm,highlight,[.005,-.23,side*.019],[.113,.105,.107]);
  for(let n=0;n<3;n++)part(arm,ivory,[.084,-.275,side*.019+(n-1)*.047],[.027,.032,.016]);
  const leg=pivot(body,-.045,.275,side*.137);legs.push(leg);
  part(leg,fur,[0,-.095,0],[.106,.16,.115]);
  part(leg,highlight,[.066,-.225,0],[.155,.05,.113]);
  for(let n=0;n<3;n++)part(leg,ivory,[.19,-.227,(n-1)*.055],[.029,.027,.02]);
 }
 // Retain an editable joint hierarchy, but render its repeated spheres in eight batches.
 // This is eight draw calls per bear rather than one call for each small feature.
 const batches=[],byMaterial=new Map();
 root.traverse(o=>{if(o.isMesh){if(!byMaterial.has(o.material))byMaterial.set(o.material,[]);byMaterial.get(o.material).push(o);o.visible=false;}});
 for(const [m,parts] of byMaterial){const instances=new T.InstancedMesh(sphere,m,parts.length);instances.instanceMatrix.setUsage(T.DynamicDrawUsage);instances.frustumCulled=false;instances.castShadow=true;root.add(instances);batches.push({instances,parts});}
 root.userData={body,head,arms,legs,ground,colors,batches,inverse:new T.Matrix4(),matrix:new T.Matrix4(),height:HEIGHT,referenceSprites:[312,313,314,315,316,379,380,381]};
 updateBatches(root);
 return root;
}

function updateBatches(root){
 const d=root.userData;root.updateMatrixWorld(true);d.inverse.copy(root.matrixWorld).invert();
 for(const {instances,parts} of d.batches){parts.forEach((part,i)=>instances.setMatrixAt(i,d.matrix.multiplyMatrices(d.inverse,part.matrixWorld)));instances.instanceMatrix.needsUpdate=true;}
}

export function animateBear(mesh,bear,time){
 const data=mesh.userData;
 const visibility=clamp(bear.visibility??(bear.state==='hidden'?0:1),0,1);
 mesh.visible=visibility>0;
 mesh.position.set(bear.x,bear.y-(1-visibility)*HEIGHT,bear.z);
 mesh.rotation.set(0,bear.face===-1?Math.PI:0,0);mesh.scale.setScalar(1);
 // The plane is in world space: movement and mirroring do not move the soil surface.
 data.ground.constant=-bear.y;
 const phase=(bear.phase??time??0)*9;
 const walking=bear.alive&&(!bear.state||bear.state==='walk');
 const stride=walking?Math.sin(phase):0;
 data.body.position.y=walking?Math.abs(Math.cos(phase))*.014:0;
 data.body.rotation.z=walking?Math.sin(phase)*.025:0;
 data.head.rotation.z=walking?Math.sin(phase)*-.025:0;
 data.legs.forEach((leg,i)=>{const step=stride*(i===0?1:-1);leg.rotation.z=step*.49;leg.position.y=.275+Math.max(0,step)*.045;});
 data.arms.forEach((arm,i)=>{arm.rotation.z=stride*(i===0?-1:1)*.32;arm.rotation.x=0;});
 for(const [m,color] of data.colors){m.color.copy(color);if(bear.hurt>0)m.color.lerp(hitColor,.68);}
 if(!bear.alive||bear.state==='defeat'){
  const t=clamp((bear.defeat??0)*2.3,0,1);
  mesh.rotation.z=-t*1.6*(bear.face===-1?-1:1);mesh.position.y+=Math.sin(t*Math.PI)*.35;
  data.arms.forEach((arm,i)=>{arm.rotation.z=-(.9+t*.6);arm.rotation.x=(i?1:-1)*.65;});
  data.legs.forEach((leg,i)=>{leg.rotation.z=(i?-.8:.6);});
 }
 updateBatches(mesh);
}

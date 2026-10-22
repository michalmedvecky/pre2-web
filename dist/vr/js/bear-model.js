// Closed, editable 3D interpretation of original bear sprites 312..316 and 379..381.
// The sprite reference is upright: two hind legs, hanging arms, pale muzzle/chest.
import * as T from '../vendor/three.module.js';
import {bearSurfaces} from './bear-surfaces.js';
const HEIGHT=.96;
const surfaces=bearSurfaces(),sphere=surfaces.sphere;
const hitColor=new T.Color('#fff3cf');
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function part(parent,material,position,scale,geometry=sphere){const m=new T.Mesh(geometry,material);m.position.set(...position);m.scale.set(...scale);m.castShadow=true;parent.add(m);return m;}
function pivot(parent,x,y,z){const g=new T.Group();g.position.set(x,y,z);parent.add(g);return g;}

export function makeBear(){
 const root=new T.Group(),ground=new T.Plane(new T.Vector3(0,1,0),0);
 const material=color=>new T.MeshStandardMaterial({color,roughness:.9,clippingPlanes:[ground],clipShadows:true});
 const coat=material('#ffffff');coat.vertexColors=true;
 const fur=material('#99592f'),muzzle=material('#dfac72'),dark=material('#2d1b15'),mouth=material('#401a17'),tongue=material('#df5143'),ivory=material('#fff0c8');
 for(const m of [coat,fur]){m.map=surfaces.map;m.bumpMap=surfaces.bump;m.bumpScale=.00015;m.roughness=.98;}dark.roughness=.42;mouth.roughness=.7;
 const colors=[coat,fur,muzzle,dark,mouth,tongue,ivory].map(m=>[m,m.color.clone()]);
 const body=pivot(root,0,0,0);
 // Upright pear-shaped torso; the pale chest lies on the forward (+X) surface.
 part(body,coat,[0,0,0],[1,1,1],surfaces.torso);
 // Tiny tail, visible from behind in a full 360-degree view.
 part(body,fur,[-.31,.35,0],[.07,.075,.07]);
 const head=pivot(body,.035,.735,0);
 part(head,coat,[0,0,0],[1,1,1],surfaces.head);
 // A continuous skull and blended cheek mask replace overlapping cheek balls.
 for(const side of [-1,1]){
  part(head,fur,[-.055,.14,side*.166],[.088,.09,.07]);
  part(head,muzzle,[-.012,.145,side*.185],[.045,.055,.041]);
  part(head,ivory,[.15,.044,side*.145],[.054,.051,.038]);
  part(head,dark,[.197,.043,side*.16],[.025,.032,.018]);
  part(head,ivory,[.213,.059,side*.169],[.009,.012,.008]);
  const brow=part(head,dark,[.146,.103,side*.154],[.069,.018,.035]);brow.rotation.x=side*.18;brow.rotation.z=-.22;
 }
 // Original's conspicuous open mouth and long, light muzzle, rather than a realistic snout.
 part(head,mouth,[.218,-.109,0],[.104,.092,.13]);
 part(head,muzzle,[.213,-.164,0],[.113,.039,.128]);
 part(head,tongue,[.299,-.141,0],[.018,.022,.075]);
 part(head,muzzle,[.237,-.042,0],[.14,.064,.137]);
 part(head,dark,[.352,-.027,0],[.065,.056,.092]);
 part(head,ivory,[.386,-.007,-.024],[.014,.013,.032]);
 for(const side of [-1,1])part(head,ivory,[.292,-.095,side*.081],[.026,.043,.022]).rotation.z=.22;
 const arms=[],legs=[],elbows=[],knees=[],paws=[];
 for(const side of [-1,1]){
  const arm=pivot(body,-.035,.62,side*.225);arms.push(arm);
  part(arm,fur,[-.03,-.10,side*.014],[.105,.17,.10],surfaces.limb);
  const elbow=pivot(arm,-.025,-.14,side*.015);elbows.push(elbow);
  part(elbow,fur,[.018,-.05,0],[.09,.115,.095],surfaces.limb);

  for(let n=0;n<3;n++)part(elbow,ivory,[.11,-.13,(n-1)*.045],[.022,.025,.014]);
  const leg=pivot(body,-.045,.275,side*.137);legs.push(leg);
  part(leg,fur,[0,-.055,0],[.108,.105,.113],surfaces.limb);
  const knee=pivot(leg,.005,-.12,0);knees.push(knee);
  part(knee,fur,[.014,-.045,0],[.088,.085,.10],surfaces.limb);
  const paw=pivot(knee,.04,-.105,0);paws.push(paw);
  part(paw,fur,[.03,0,0],[.14,.052,.109]);
  for(let n=0;n<3;n++){part(paw,fur,[.118,-.002,(n-1)*.05],[.055,.037,.033]);part(paw,ivory,[.166,-.007,(n-1)*.05],[.025,.019,.014]);}
 }
 // Keep the editable joints while batching repeated sculpt surfaces.
 // Group by material AND sculpt geometry; no per-frame vertex deformation.
 const batches=[],byMaterial=new Map();
 root.traverse(o=>{if(o.isMesh){const key=o.material.uuid+':'+o.geometry.uuid;if(!byMaterial.has(key))byMaterial.set(key,[]);byMaterial.get(key).push(o);o.visible=false;}});
 for(const parts of byMaterial.values()){const instances=new T.InstancedMesh(parts[0].geometry,parts[0].material,parts.length);instances.instanceMatrix.setUsage(T.DynamicDrawUsage);instances.frustumCulled=false;instances.castShadow=true;root.add(instances);batches.push({instances,parts});}
 root.userData={body,head,arms,legs,elbows,knees,paws,ground,colors,batches,inverse:new T.Matrix4(),matrix:new T.Matrix4(),height:HEIGHT,model:'sculpted-upright-bear',referenceSprites:[312,313,314,315,316,379,380,381]};
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
 const stride=walking?Math.sin(phase):0,breath=Math.sin((time||0)*2.4);
 data.body.position.y=walking?Math.abs(Math.cos(phase))*.009:0;
 data.body.rotation.set(walking?Math.cos(phase)*.012:0,walking?Math.sin(phase)*.018:0,walking?Math.sin(phase)*.017:0);
 data.body.scale.set(1+breath*.003,1+breath*.002,1+breath*.004);
 data.head.rotation.set(0,walking?Math.sin(phase*.5)*.035:0,walking?-Math.sin(phase)*.014:0);
 data.legs.forEach((leg,i)=>{const step=stride*(i===0?1:-1),lift=Math.max(0,step);leg.rotation.z=step*.36;leg.position.y=.275+lift*.028;data.knees[i].rotation.z=-lift*.32;data.paws[i].rotation.z=lift*.18;});
 data.arms.forEach((arm,i)=>{const step=stride*(i===0?-1:1);arm.rotation.set((i?1:-1)*.025,0,step*.25);data.elbows[i].rotation.z=-.08-Math.max(0,step)*.18;});
 if(bear.state==='emerge'||bear.state==='retreat'){
  const crouch=(1-visibility);data.body.rotation.z=-crouch*.08;
  data.arms.forEach((arm,i)=>{arm.rotation.z=-crouch*.38;data.elbows[i].rotation.z=-crouch*.3;});
 }
 for(const [m,color] of data.colors){m.color.copy(color);if(bear.hurt>0)m.color.lerp(hitColor,.68);if(m.vertexColors)m.emissive.copy(hitColor).multiplyScalar(bear.hurt>0?.28:0);}
 if(!bear.alive||bear.state==='defeat'){
  const t=clamp((bear.defeat??0)*2.3,0,1);
  mesh.rotation.z=-t*1.6*(bear.face===-1?-1:1);mesh.position.y+=Math.sin(t*Math.PI)*.35;
  data.arms.forEach((arm,i)=>{arm.rotation.z=-(.9+t*.6);arm.rotation.x=(i?1:-1)*.65;});
  data.legs.forEach((leg,i)=>{leg.rotation.z=(i?-.8:.6);});
 }
 updateBatches(mesh);
}

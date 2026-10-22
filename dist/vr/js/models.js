// Editable procedural 360° meshes. New 3D interpretation of the recovered silhouettes/palette.
import * as T from '../vendor/three.module.js';
import {surfaceMaterial} from './surfaces.js';
const mat=(color)=>new T.MeshStandardMaterial({color,roughness:.94,flatShading:true});
const geo={ball:new T.IcosahedronGeometry(1,1),box:new T.BoxGeometry(1,1,1),limb:new T.CylinderGeometry(.09,.07,1,7)};
export function piece(parent,geometry,material,position,scale=[1,1,1]){const m=new T.Mesh(geometry,material);m.position.set(...position);m.scale.set(...scale);parent.add(m);return m;}
export {makeCraftedClub as makeClub} from './club-model.js';
export function makeBear(){const root=new T.Group(),fur=mat('#7b4b2e'),light=mat('#b07744'),black=mat('#201a16'),cream=mat('#e4ce9c'),pivots=[];
 piece(root,geo.ball,fur,[0,.66,0],[.65,.48,.37]);piece(root,geo.ball,fur,[.4,.9,0],[.38,.37,.33]);piece(root,geo.ball,light,[.66,.76,0],[.23,.16,.22]);piece(root,geo.ball,black,[.85,.78,0],[.065,.07,.1]);
 for(const z of [-.26,.26]){piece(root,geo.ball,fur,[.4,1.18,z],[.13,.16,.12]);piece(root,geo.ball,light,[.44,1.19,z],[.075,.09,.08]);piece(root,geo.ball,black,[.65,.99,z*.91],[.045,.053,.026]);piece(root,geo.ball,cream,[.668,1.005,z*.96],[.012,.015,.012]);}
 for(const x of [-.4,.4])for(const z of [-.26,.26]){const joint=new T.Group();joint.position.set(x,.54,z);root.add(joint);piece(joint,geo.limb,fur,[0,-.22,0],[1.5,.42,1.5]);piece(joint,geo.ball,fur,[.06,-.43,0],[.19,.12,.14]);for(let n=0;n<3;n++)piece(joint,geo.ball,cream,[.21,-.45,(n-1)*.055],[.045,.025,.018]);pivots.push(joint);}
 piece(root,geo.ball,fur,[-.62,.76,0],[.12,.13,.12]);
 root.userData={pivots,fur,base:fur.color.clone()};return root;
}
export function animateBear(mesh,bear,time){mesh.position.set(bear.x,bear.y,bear.z);mesh.rotation.y=bear.face===1?0:Math.PI;
 mesh.userData.fur.color.copy(mesh.userData.base);if(bear.hurt>0)mesh.userData.fur.color.set('#f5d8aa');
 if(!bear.alive){const t=Math.min(1,bear.defeat*2.3);mesh.rotation.z=-t*1.5;mesh.position.y+=t*.35;mesh.scale.setScalar(1-t*.13);return;}
 mesh.scale.setScalar(1);mesh.position.y+=Math.sin(time*3)*.018;mesh.rotation.z=Math.sin(time*2)*.012;
 mesh.userData.pivots.forEach((p,i)=>p.rotation.z=Math.sin(time*6+(i===0||i===3?0:Math.PI))*.3);
}
export function makeBone(){const g=new T.Group(),m=mat('#f2dfb5');piece(g,new T.CylinderGeometry(.028,.028,.23,6),m,[0,0,0]);for(const y of [-.12,.12])for(const z of [-.025,.025])piece(g,geo.ball,m,[0,y,z],[.05,.047,.045]);g.rotation.z=Math.PI/2;return g;}
export function makeBody(){const g=new T.Group(),cloth=mat('#98542d'),skin=mat('#dda579');piece(g,geo.ball,cloth,[0,.72,0],[.23,.34,.16]);for(const x of [-.13,.13])piece(g,geo.limb,skin,[x,.3,0],[1,.55,1]);return g;}
function sign(text){const c=document.createElement('canvas');c.width=1024;c.height=256;const x=c.getContext('2d');x.fillStyle='#25453e';x.fillRect(0,0,1024,256);x.strokeStyle='#edce91';x.lineWidth=9;x.strokeRect(12,12,1000,232);x.fillStyle='#ffebbf';x.font='bold 52px system-ui';x.textAlign='center';text.split('\n').forEach((s,i)=>x.fillText(s,512,94+i*70));const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;const m=new T.Mesh(new T.BoxGeometry(2,.5,.08),[mat('#573e2b'),mat('#573e2b'),mat('#573e2b'),mat('#573e2b'),new T.MeshBasicMaterial({map:texture}),mat('#573e2b')]);return m;}
export function buildEnvironment(scene,layout,game,tiles,union,textures){const environment=new T.Group();scene.add(environment);scene=environment;const treeGeo=new T.CylinderGeometry(.08,.18,1,6);const grass=surfaceMaterial('grass',textures),stone=surfaceMaterial('stone',textures),trunk=surfaceMaterial('bark',textures),leaves=surfaceMaterial('foliage',textures),level=game.levels[0],grouped=new Map();
 grouped.set(layout.boxes.find(b=>b.row===42).tile,layout.boxes);
 for(const [id,boxes] of grouped){const earth=surfaceMaterial('earth',textures),m=new T.InstancedMesh(geo.box,[earth,earth,grass,earth,earth,earth],boxes.length),dummy=new T.Object3D();boxes.forEach((b,i)=>{dummy.position.set((b.minX+b.maxX)/2,(b.minY+b.maxY)/2,(b.minZ+b.maxZ)/2);dummy.scale.set(b.maxX-b.minX,b.maxY-b.minY,b.maxZ-b.minZ);dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix);});scene.add(m);}
 // Authored scenery in depth: fully closed meshes, including rear and upper surfaces.
 for(let i=0;i<38;i++){const x=(i*8.37)%39-3,z=(i%2?-1:1)*(5+(i%5)*.73),y=-.1;piece(scene,treeGeo,trunk,[x,y+1.2,z],[1,3+(i%3)*.3,1]);for(let h=0;h<3;h++)piece(scene,geo.ball,leaves,[x+(h-1)*.4,2.5+(i%3)*.3+h*.22,z],[1.3-h*.18,.9,1.1]);}
 for(let i=0;i<22;i++){const x=(i*7.11)%48-8,z=(i%2?-1:1)*(9+i%4);const r=piece(scene,geo.ball,stone,[x,-.7,z],[1.8+i%3,2+i%4,2]);r.rotation.y=i*.7;}
 // Close the rear view with an authored stone bluff at the native left boundary.
 piece(scene,geo.ball,stone,[-3,1,0],[3,3,4]);piece(scene,geo.box,grass,[-4,-.35,0],[8,.7,6.4]);
 const camp=new T.Group();camp.position.set(22,.02,1.9);scene.add(camp);for(let n=0;n<9;n++){const a=n*2*Math.PI/9;piece(camp,geo.ball,stone,[Math.cos(a)*.4,0,Math.sin(a)*.4],[.17,.12,.15]);}for(let n=0;n<3;n++)piece(camp,new T.CylinderGeometry(.075,.075,.7,7),trunk,[0,.08,0]).rotation.set(Math.PI/2,n*1.1,0);
 const fire=piece(camp,geo.ball,new T.MeshBasicMaterial({color:'#f5b454'}),[0,.26,0],[.16,.3,.16]);
 for(const [x,text] of [[2,'CESTA PRAVEKEM\nMedved → ohniste → cil'],[23.5,'CHECKPOINT\nA / SPACE: skok pres jamu'],[31,'CIL PROTOTYPU\nPoraz medveda a dojdi sem']]){const board=sign(text);board.position.set(x,1.8,-2.9);scene.add(board);piece(scene,new T.CylinderGeometry(.045,.055,1.65,6),trunk,[x,.8,-2.9]);}
 // A visible pit floor is decoration, not a collider.
 piece(scene,geo.box,mat('#162e31'),[26,-7,0],[2,.2,7]);
 const arch=new T.Group();arch.position.set(31,0,0);scene.add(arch);for(const z of [-1.3,1.3])piece(arch,geo.ball,stone,[0,1,z],[.3,1.3,.32]);piece(arch,geo.ball,stone,[0,2.35,0],[.4,.4,1.8]);
 for(const z of [-10,10])piece(scene,geo.box,grass,[16,-1.4,z],[64,.8,10]);
 batchStatic(scene,fire);return {fire,camp};
}

function batchStatic(group,dynamic){
 group.updateMatrixWorld(true);const groups=new Map();group.traverse(o=>{if(!o.isMesh||o.isInstancedMesh||o===dynamic||Array.isArray(o.material))return;const key=o.geometry.uuid+o.material.uuid;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(o);});
 const inv=group.matrixWorld.clone().invert();for(const list of groups.values()){if(list.length<2)continue;const inst=new T.InstancedMesh(list[0].geometry,list[0].material,list.length);list.forEach((o,i)=>inst.setMatrixAt(i,new T.Matrix4().multiplyMatrices(inv,o.matrixWorld)));for(const o of list)o.removeFromParent();group.add(inst);}
}

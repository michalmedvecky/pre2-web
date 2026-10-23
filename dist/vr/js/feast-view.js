import * as T from '../vendor/three.module.js';
import {makeCraftedClub} from './club-model.js';

// DS:7c67 selects 25/26 then 27/28 while braking. Both hands reach
// forward before velocity becomes zero; DS:7cab returns to the idle pose.
export function feastActorPose(t){
 const reach=({25:.45,26:.8,27:1,28:1})[t.player.sprite]||0;
 const moving=['approach','arrive','brake','leave'].includes(t.phase),stride=moving?Math.sin(t.frame*.65)*.65:Math.sin(t.frame*.12)*.025;
 return {reach,arms:[-stride*.65*(1-reach)-Math.PI/2*reach,stride*.65*(1-reach)-Math.PI/2*reach],legs:[stride*(1-.7*reach),-stride*(1-.7*reach)],bob:(moving?Math.abs(Math.sin(t.frame*.65))*.025:Math.sin(t.frame*.12)*.007)-.025*reach,lean:-.08*reach};
}

// A spectator stage: native screen coordinates animate the actor and apparatus,
// while the headset remains entirely under the viewer's control.
export function buildFeast(scene,pilot,art){
 const root=new T.Group();root.name='stage-feast';root.visible=false;scene.add(root);
 const ownedGeometry=new Set(),ownedMaterial=new Set(),mesh=(g,m,parent=root)=>{ownedGeometry.add(g);const o=new T.Mesh(g,m);parent.add(o);return o;};
 const material=color=>{const m=new T.MeshStandardMaterial({color,roughness:.88});ownedMaterial.add(m);return m;};
 const skin=material('#dda579'),hair=material('#613718'),cloth=material('#ab682c'),black=material('#251b12'),ivory=material('#fff2ce');
 const actor=new T.Group();actor.name='feast-prehistorik';root.add(actor);
 function ellipsoid(parent,m,x,y,z,sx,sy,sz){const o=mesh(new T.SphereGeometry(1,18,12),m,parent);o.position.set(x,y,z);o.scale.set(sx,sy,sz);return o;}
 ellipsoid(actor,cloth,0,.37,0,.15,.2,.12);ellipsoid(actor,skin,0,.57,0,.12,.14,.12);ellipsoid(actor,hair,-.02,.66,-.025,.13,.1,.13);ellipsoid(actor,skin,.11,.58,.1,.075,.06,.075);
 for(const side of [-1,1]){ellipsoid(actor,ivory,side*.048,.63,.112,.026,.037,.018);ellipsoid(actor,black,side*.048,.63,.128,.01,.017,.009);}
 for(let n=0;n<9;n++)ellipsoid(actor,black,Math.sin(n*2.4)*.12,.32+(n%3)*.05,Math.cos(n*2.4)*.105,.022,.02,.015);
 const legs=[],arms=[];for(const side of [-1,1]){const leg=new T.Group();leg.position.set(side*.075,.24,0);actor.add(leg);ellipsoid(leg,skin,0,-.08,0,.055,.1,.055);ellipsoid(leg,skin,0,-.19,.045,.07,.04,.105);legs.push(leg);const arm=new T.Group();arm.position.set(side*.15,.47,0);actor.add(arm);ellipsoid(arm,skin,side*.015,-.09,0,.045,.115,.045);ellipsoid(arm,skin,side*.02,-.18,.01,.05,.05,.05);arms.push(arm);}
 actor.userData={arms,legs};
 const club=makeCraftedClub();club.scale.setScalar(.45);club.position.set(.02,-.17,0);club.rotation.z=-.45;arms[1].add(club);
 const floor=mesh(new T.CylinderGeometry(4.1,4.25,.12,64),material('#51402c'));floor.position.set(0,-.08,0);
 for(const id of [98,100,104,105,106,107,108,109])art.sprite(id,{depth:.5});
 const pieces=[100,98,104].map(id=>{const m=art.sprite(id,{depth:.5});root.add(m);return m;});
 const falling=Array.from({length:20},()=>({sprite:-1,mesh:null}));
 let bound=null,topSprite=104;
 const forward=new T.Vector3();
 function update(view){
  const t=pilot.tally,show=!!t&&t.phase!=='iris'&&!['enter','playing'].includes(pilot.stage);root.visible=show;if(!show){if(!t)bound=null;return false;}
  if(bound!==t){bound=t;forward.set(0,0,-1).applyQuaternion(view.quaternion);forward.y=0;forward.normalize();root.position.copy(view.position).addScaledVector(forward,4.8);root.position.y=pilot.player.y;root.rotation.y=Math.atan2(-forward.x,-forward.z);}
  actor.position.set((t.player.x-160)/48,(175-t.player.y)/48,0);actor.rotation.y=Math.PI/2;actor.scale.setScalar(1.3);
  const pose=feastActorPose(t);legs.forEach((leg,i)=>leg.rotation.x=pose.legs[i]);arms.forEach((arm,i)=>arm.rotation.x=pose.arms[i]);actor.position.y+=pose.bob;actor.rotation.x=pose.lean;actor.userData.sourceSprite=t.player.sprite;actor.userData.brakeReach=pose.reach;
  for(let i=0;i<3;i++){const p=t.props[i];pieces[i].visible=!!p;if(!p)continue;if(i===2&&p.sprite!==topSprite){pieces[i].geometry=art.sprite(p.sprite,{depth:.5}).geometry;topSprite=p.sprite;}pieces[i].position.set((p.x-160)/48,(175-p.y)/48,.05);pieces[i].scale.setScalar(32/48);}
  falling.forEach((slot,i)=>{const o=t.falling[i];if(!o){if(slot.mesh)slot.mesh.visible=false;return;}if(o.sprite!==slot.sprite){slot.mesh?.removeFromParent();slot.mesh=art.sprite(o.sprite);slot.sprite=o.sprite;root.add(slot.mesh);}slot.mesh.visible=true;slot.mesh.position.set((o.x-160)/48,(175-o.y)/48,.05);slot.mesh.rotation.y=t.frame*.05;slot.mesh.scale.setScalar(32/48);});
  return true;
 }
 return {root,update,stats:{source:'0x14e5d',trackedCameraMotion:false},dispose(){root.removeFromParent();for(const g of ownedGeometry)g.dispose();for(const m of ownedMaterial)m.dispose();}};
}

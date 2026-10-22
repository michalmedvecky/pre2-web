import * as T from '../vendor/three.module.js';
const local=new T.Vector3(),point=new T.Vector3(),axis=new T.Vector3();
export const CLUB_LENGTH=.825;
// Conservative spheres along the whole wooden shaft, not just the tip. Radius
// includes the crooked centreline. Boxes are collision proxies, not render meshes.
function radius(y){return y<.35?.065:y<.5?.105:.17;}
export function clubOverlaps(position,quaternion,boxes){for(let n=0;n<=20;n++){const y=.01+n/20*.815,r=radius(y);point.copy(local.set(0,y,0).applyQuaternion(quaternion)).add(position);for(const b of boxes){const dx=Math.max(b.minX-point.x,0,point.x-b.maxX),dy=Math.max(b.minY-point.y,0,point.y-b.maxY),dz=Math.max(b.minZ-point.z,0,point.z-b.maxZ);if(dx*dx+dy*dy+dz*dz<r*r-1e-8)return b;}}return null;}
export class ClubContact {
 constructor(){this.reset();}
 reset(){this.position=null;this.quaternion=null;this.desiredPosition=null;this.desiredQuaternion=null;this.blocked=false;this.lastPulse=-Infinity;this.time=null;this.stats={blocked:false,contacts:0,speed:0,object:null};}
 solve(position,quaternion,boxes,time){const p=position.clone(),q=quaternion.clone(),dt=this.time===null?0:time-this.time;let speed=0,hit=null;
 if(this.position){const travel=this.position.distanceTo(p)+CLUB_LENGTH*this.quaternion.angleTo(q);speed=dt>0&&this.desiredPosition?(this.desiredPosition.distanceTo(position)+CLUB_LENGTH*this.desiredQuaternion.angleTo(quaternion))/dt:0;
  // Walking back out of a newly moved platform must always be possible.
  if(!clubOverlaps(this.position,this.quaternion,boxes)){
   const steps=Math.max(1,Math.ceil(travel/.018)),a=new T.Vector3(),b=new T.Quaternion();let safe=0;
   for(let n=1;n<=steps;n++){const t=n/steps;a.lerpVectors(this.position,p,t);b.slerpQuaternions(this.quaternion,q,t);hit=clubOverlaps(a,b,boxes);if(hit){let lo=safe,hi=t;for(let j=0;j<9;j++){const mid=(lo+hi)/2;a.lerpVectors(this.position,p,mid);b.slerpQuaternions(this.quaternion,q,mid);if(clubOverlaps(a,b,boxes))hi=mid;else lo=mid;}p.lerpVectors(this.position,position,lo);q.slerpQuaternions(this.quaternion,quaternion,lo);break;}safe=t;}
  }else hit=clubOverlaps(p,q,boxes);
 }else hit=clubOverlaps(p,q,boxes);
 if(hit&&clubOverlaps(p,q,boxes)){
  // Tracking starts/recentres inside geometry: find the nearest empty translated
  // pose, never move the tracked controller or head to satisfy weapon collision.
  let found=false;for(let d=.02;d<=1&&!found;d+=.02)for(const dir of [[0,1,0],[1,0,0],[-1,0,0],[0,0,1],[0,0,-1],[0,-1,0]]){point.copy(p).addScaledVector(axis.set(...dir),d);const candidate=point.clone();if(!clubOverlaps(candidate,q,boxes)){p.copy(candidate);found=true;break;}}
 }
 const blocked=!!hit,pulse=blocked&&speed>.25&&(!this.blocked||time-this.lastPulse>.14);if(pulse){this.lastPulse=time;this.stats.contacts++;}
 this.desiredPosition=position.clone();this.desiredQuaternion=quaternion.clone();this.position=p;this.quaternion=q;this.time=time;this.blocked=blocked;this.stats={...this.stats,blocked,speed,object:hit?.kind||null};return {position:p,quaternion:q,blocked,pulse,speed};
 }
}

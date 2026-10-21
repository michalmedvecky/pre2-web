import * as T from '../vendor/three.module.js';
export function floorEdges(layout,world){
 const solid=new Set(layout.boxes.map(b=>b.row*256+b.column)),rows=[];
 for(const b of layout.boxes){if(!b.floor||solid.has((b.row-1)*256+b.column))continue;for(const side of [-1,1]){
 const gate=world.gates.some(g=>g.active&&((g.triggerTile&255)/2-b.minX)>.0-1&&((g.triggerTile&255)/2-b.minX)<1&&Math.abs((672-(g.triggerTile>>8)*16)/32-b.maxY)<1.3&&((g.triggerTile>>8)<16?side===1:side===-1));if(!gate)rows.push({...b,side,z:side*1.73});}}
 return rows;
}
export function railMeshes(edges,wood,rope){const root=new T.Group();root.name='trail-railings';const post=new T.CylinderGeometry(.045,.06,1,7),beam=new T.CylinderGeometry(.024,.024,1,6);beam.rotateZ(Math.PI/2);const marker=new T.Object3D(),posts=[],rails=[];
 for(const e of edges){posts.push([e.minX,e.maxY+.45,e.z]);for(const h of [.48,.87])rails.push([(e.minX+e.maxX)/2,e.maxY+h,e.z]);}
 for(const [geometry,material,points,isBeam] of [[post,wood,posts,false],[beam,rope,rails,true]]){if(!points.length)continue;const mesh=new T.InstancedMesh(geometry,material,points.length);points.forEach((p,i)=>{marker.position.set(...p);marker.scale.set(isBeam?.5:1,isBeam?1:.9,1);marker.updateMatrix();mesh.setMatrixAt(i,marker.matrix);});mesh.computeBoundingSphere();mesh.userData.ownedGeometry=true;root.add(mesh);}return root;
}
export function naturalLedge(width,depth=3.6){
 const positions=[],indices=[],N=24,rings=[[1,0],[1.02,-.08],[.88,-.24],[.52,-.47],[.08,-.62]];
 for(const [r,y] of rings)for(let n=0;n<N;n++){const a=n/N*Math.PI*2,c=Math.cos(a),s=Math.sin(a);positions.push(Math.sign(c)*Math.abs(c)**.32*width*.5*r,y+(r<1?Math.sin(n*1.7)*.025:0),Math.sign(s)*Math.abs(s)**.32*depth*.5*r);}
 for(let j=0;j<rings.length-1;j++)for(let n=0;n<N;n++){const a=j*N+n,b=j*N+(n+1)%N,c=b+N,d=a+N;indices.push(a,b,d,b,c,d);}
 const base=positions.length/3;positions.push(0,-.63,0);for(let n=0;n<N;n++)indices.push(base,(rings.length-1)*N+n,(rings.length-1)*N+(n+1)%N);
 const grassStart=indices.length,top=positions.length/3;positions.push(0,.002,0);for(let n=0;n<N;n++)indices.push(top,(n+1)%N,n);const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.addGroup(0,grassStart,0);g.addGroup(grassStart,indices.length-grassStart,1);g.computeVertexNormals();g.computeBoundingSphere();return g;
}

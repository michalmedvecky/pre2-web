// Original indexed tile faces + authored closed depth, forest, cave walls and upright bears.
import * as T from '../vendor/three.module.js';
import {makeNativeArt} from './native-art.js';
import {makeBear,animateBear} from './bear-model.js';
import {isBear,bearPresentation,nativeY,areaForY} from './level-one.js';
import {headOcclusion} from './occlusion.js';
import {tileAnimation} from '../native/tile-animation.js';
import {surfaceMaterial} from './surfaces.js';
const dummy=new T.Object3D(),scoreForward=new T.Vector3(),scoreUp=new T.Vector3();
export function buildLevelOne(scene,pilot,textures,hdArt=null){
 const art=hdArt||makeNativeArt(pilot.assets),root=new T.Group(),terrain=new T.Group(),props=new T.Group(),forest=new T.Group();root.add(terrain,props,forest);scene.add(root);
 const hints=new T.Group();hints.name='secret-hints';root.add(hints);
 const secretGhosts=new T.InstancedMesh(new T.BoxGeometry(.5,.5,3.6),new T.MeshBasicMaterial({color:'#53ffff',wireframe:true,transparent:true,opacity:.8,depthTest:false,depthWrite:false}),48);secretGhosts.frustumCulled=false;secretGhosts.renderOrder=10;hints.add(secretGhosts);
 const gateGhosts=new T.InstancedMesh(new T.IcosahedronGeometry(.36,1),new T.MeshBasicMaterial({color:'#ffda62',wireframe:true,depthTest:false,depthWrite:false}),8);gateGhosts.frustumCulled=false;gateGhosts.renderOrder=10;hints.add(gateGhosts);
 const rope=new T.InstancedMesh(new T.IcosahedronGeometry(.018,0),new T.MeshStandardMaterial({color:'#e7d5ac',roughness:1}),20);rope.frustumCulled=false;props.add(rope);
 const earth=surfaceMaterial('earth',textures),grass=surfaceMaterial('grass',textures),stone=surfaceMaterial('stone',textures),bark=surfaceMaterial('bark',textures),foliage=surfaceMaterial('foliage',textures);
 const atlasMaterial=new T.MeshStandardMaterial({map:art.tileAtlas(),alphaTest:.3,roughness:1,side:T.DoubleSide});
 const stats={chunkBuilds:0,lastChangedCells:0,lastRebuiltChunks:[],art:art.stats},chunks=new Map();let mapSnapshot=null;
 const cube=new T.BoxGeometry(1,1,1),ball=new T.IcosahedronGeometry(1,1),cylinder=new T.CylinderGeometry(.1,.18,1,7),dynamic=new Map();let revision=-1,area='',phase=-1,animated=[],boundWorld=null;
 function instances(group,geometry,material,rows){if(!rows.length)return;const m=new T.InstancedMesh(geometry,material,rows.length);for(let n=0;n<rows.length;n++){const r=rows[n];dummy.position.set(...r.p);dummy.scale.set(...(r.s||[1,1,1]));dummy.rotation.set(0,r.yaw||0,0);dummy.updateMatrix();m.setMatrixAt(n,dummy.matrix);}m.computeBoundingSphere();group.add(m);return m;}
 function disposeChunk(group){group.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.geometry&&o.userData.ownedGeometry)o.geometry.dispose();});group.removeFromParent();}
 function buildChunk(chunk,targetArea){
  const key=targetArea+':'+chunk,previous=chunks.get(key);if(previous)disposeChunk(previous);
  const w=pilot.world,level=w.level,g={solid:[],decor:new Map(),tiles:[]};
  for(let row=0;row<level.height;row++)for(let x=chunk*16;x<(chunk+1)*16;x++){
   if(areaForY(row*16)!==targetArea)continue;const id=w.map[row*256+x],value=level.lookup[id];if(value===256||value===65535||value===undefined)continue;
   const c=level.tilePropertiesY[id],solid=(c>=1&&c<=5)||level.tilePropertiesX[id],y=nativeY(row*16),pos={x:x*.5,y,row,id};
   if(solid){g.solid.push({p:[x*.5+.25,y-.25,0],s:[.5,.5,3.6]});g.tiles.push(pos);}
   else{if(!g.decor.has(id))g.decor.set(id,[]);g.decor.get(id).push({p:[x*.5+.25,y-.5,-2.15],s:[1,1,1]});}
  }
  const remap=tileAnimation(level,w.tileAnimationPhase).remap,group=new T.Group();group.name='source-chunk:'+key;group.userData={chunk,area:targetArea,animated:[]};terrain.add(group);chunks.set(key,group);
   instances(group,cube,[stone,stone,grass,earth,stone,stone],g.solid);
   const positions=[],uvs=[],normals=[],indices=[];
   for(const t of g.tiles)for(const z of [-1.806,1.806]){
    const i=positions.length/3,r=art.tileUV(remap[t.id]);positions.push(t.x,t.y-.5,z,t.x+.5,t.y-.5,z,t.x+.5,t.y,z,t.x,t.y,z);uvs.push(r.u0,r.v0,r.u1,r.v0,r.u1,r.v1,r.u0,r.v1);normals.push(0,0,Math.sign(z),0,0,Math.sign(z),0,0,Math.sign(z),0,0,Math.sign(z));indices.push(i,i+1,i+2,i,i+2,i+3);
   }
   if(positions.length){const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geo.setIndex(indices);geo.computeBoundingSphere();const mesh=new T.Mesh(geo,atlasMaterial);mesh.userData.ownedGeometry=true;group.add(mesh);group.userData.animated.push({geo,tiles:g.tiles});}
   const staticDecor=[];for(const [id,rows] of g.decor){const mesh=art.tileMesh(remap[id],{depth:art.stats?.model==='rounded-volume'?.5:.32});if(tileAnimation(level).animated[id]){const m=instances(group,mesh.geometry,mesh.material,rows);m.userData.animatedTile=id;group.userData.animated.push({instances:m,id});}else for(const row of rows)staticDecor.push({geometry:mesh.geometry,position:row.p});}
   if(staticDecor.length){const positions=[],normals=[],colors=[],uvs=[],indices=[];for(const {geometry:g,position:p} of staticDecor){const base=positions.length/3;for(let i=0;i<g.attributes.position.count;i++)positions.push(g.attributes.position.getX(i)+p[0],g.attributes.position.getY(i)+p[1],g.attributes.position.getZ(i)+p[2]);normals.push(...g.attributes.normal.array);if(g.attributes.color)colors.push(...g.attributes.color.array);if(g.attributes.uv)uvs.push(...g.attributes.uv.array);for(const index of g.index.array)indices.push(base+index);}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('normal',new T.Float32BufferAttribute(normals,3));if(colors.length)geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));if(uvs.length)geo.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geo.setIndex(indices);geo.computeBoundingSphere();const m=new T.Mesh(geo,art.material);m.userData.ownedGeometry=true;group.add(m);}
  stats.chunkBuilds++;return key;
 }
 function refresh(){
  const w=pilot.world;stats.lastRebuiltChunks=[];stats.lastChangedCells=0;
  if(boundWorld!==w){for(const group of chunks.values())disposeChunk(group);chunks.clear();for(const target of ['outdoors','caves'])for(let col=0;col<16;col++)stats.lastRebuiltChunks.push(buildChunk(col,target));mapSnapshot=w.map.slice();boundWorld=w;}
  else if(revision!==pilot.revision){const dirty=new Set();for(let pos=0;pos<w.map.length;pos++)if(w.map[pos]!==mapSnapshot[pos]){stats.lastChangedCells++;mapSnapshot[pos]=w.map[pos];dirty.add(areaForY((pos>>8)*16)+':'+((pos&255)>>4));}for(const key of dirty){const [target,col]=key.split(':');stats.lastRebuiltChunks.push(buildChunk(Number(col),target));}}
  revision=pilot.revision;animated=Array.from(chunks.values()).flatMap(g=>g.userData.animated);phase=-1;
 }
 // Depth scenery uses the same palette/materials, beyond the source walking strip.
 const trunks=[],leaves=[],rocks=[];
 for(let n=0;n<150;n++){const x=(n*7.371)%140-5,z=(n%2?-1:1)*(5+(n%7)*1.15),column=Math.max(0,Math.min(255,Math.floor(x*2)));const candidates=pilot.layout.columns[column].filter(b=>b.area==='outdoors'&&b.floor&&b.row>=28);const y=candidates.length?Math.max(...candidates.map(b=>b.maxY)):-2;
  trunks.push({p:[x,y+1.5,z],s:[1,3+(n%3)*.2,1]});for(let h=0;h<3;h++)leaves.push({p:[x+(h-1)*.3,y+3+h*.3,z],s:[1.4-h*.2,1,1.2]});if(n%3===0)rocks.push({p:[x,y-.2,z*.8],s:[1.1,1.2,1],yaw:n*.7});
 }
 const distantGround=new T.Mesh(new T.BoxGeometry(160,.5,48),earth);distantGround.position.set(64,-4.2,0);forest.add(distantGround);
 instances(forest,cylinder,bark,trunks);instances(forest,ball,foliage,leaves);instances(forest,ball,stone,rocks);
 // A closed rear wall in packed bonus rooms gives them a cave interior in 360°.
 const caveBackdrop=new T.Mesh(new T.BoxGeometry(128,12,.7),stone);caveBackdrop.position.set(64,16,-4);root.add(caveBackdrop);
 const caveFront=caveBackdrop.clone();caveFront.position.z=4;caveFront.scale.y=2;root.add(caveFront);caveBackdrop.scale.y=2;
 const caveRoof=new T.Mesh(new T.BoxGeometry(128,.5,10),stone);caveRoof.position.set(64,23.5,0);root.add(caveRoof);
 const caveEnds=new T.Group();root.add(caveEnds);for(const x of [-.5,128.5]){const wall=new T.Mesh(new T.BoxGeometry(1,26,10),stone);wall.position.set(x,11,0);caveEnds.add(wall);}
 function setSprite(key,word,x,y,z=0,depth){let m=dynamic.get(key);if(!m||m.userData.word!==word){if(m)m.removeFromParent();m=(key.text&&art.label?.(key.text))||((word&0x1fff)>=74&&(word&0x1fff)<=90&&art.score?.(word&0x1fff))||art.sprite(word,{depth});m.userData.word=word;dynamic.set(key,m);props.add(m);}m.visible=true;m.position.set(x,y,z);m.rotation.y=Math.PI/2;return m;}
 function update(view={}){
  const w=pilot.world;if(boundWorld!==w||revision!==pilot.revision)refresh();area=pilot.area;forest.visible=area==='outdoors';caveEnds.visible=caveFront.visible=caveBackdrop.visible=caveRoof.visible=area==='caves';scene.background.set(area==='caves'?'#26302b':'#adcfcd');scene.fog.color.copy(scene.background);stats.headOccluded=headOcclusion(view.position,pilot.layout.boxes,area);
  for(const c of terrain.children)c.visible=c.userData.area===area&&Math.abs((c.userData.chunk*8+4)-pilot.player.x)<26;
  if(phase!==w.tileAnimationPhase){phase=w.tileAnimationPhase;const remap=tileAnimation(w.level,phase).remap;for(const entry of animated){if(entry.instances){entry.instances.geometry=art.tileMesh(remap[entry.id],{depth:art.stats?.model==='rounded-volume'?.5:.32}).geometry;continue;}const array=entry.geo.attributes.uv.array;entry.tiles.forEach((t,i)=>{const r=art.tileUV(remap[t.id]),v=[r.u0,r.v0,r.u1,r.v0,r.u1,r.v1,r.u0,r.v1];array.set(v,i*16);array.set(v,i*16+8);});entry.geo.attributes.uv.needsUpdate=true;}}
  hints.visible=w.secretHints;let secretCount=0,gateCount=0;if(w.secretHints){for(const b of w.blocks){const x=((b.pos&255)*16+8)/32,y=(b.pos>>8)*16;if(!b.active||areaForY(y)!==area||Math.abs(x-pilot.player.x)>22)continue;dummy.position.set(x,nativeY(y+8),0);dummy.scale.set(1,1,1);dummy.rotation.set(0,0,0);dummy.updateMatrix();secretGhosts.setMatrixAt(secretCount++,dummy.matrix);}for(const gate of w.gates){const x=((gate.triggerTile&255)*16+8)/32,y=(gate.triggerTile>>8)*16;if(!gate.active||areaForY(y)!==area||Math.abs(x-pilot.player.x)>22)continue;dummy.position.set(x,nativeY(y)+.7,area==='caves'?1.6:-1.6);dummy.updateMatrix();gateGhosts.setMatrixAt(gateCount++,dummy.matrix);}}secretGhosts.count=secretCount;gateGhosts.count=gateCount;secretGhosts.instanceMatrix.needsUpdate=gateGhosts.instanceMatrix.needsUpdate=true;stats.hints={secrets:secretCount,passages:gateCount};
  const points=w.ropePoints.filter(p=>areaForY(p.y)===area);rope.count=points.length;for(let i=0;i<points.length;i++){dummy.position.set(points[i].x/32,nativeY(points[i].y),0);dummy.scale.set(1,1,1);dummy.rotation.set(0,0,0);dummy.updateMatrix();rope.setMatrixAt(i,dummy.matrix);}rope.instanceMatrix.needsUpdate=true;
  for(const m of dynamic.values())m.visible=false;
  for(const i of w.items){if(!i.active||(i.vrArea??areaForY(i.y))!==area||Math.abs(i.x/32-pilot.player.x)>38)continue;const m=setSprite(i,i.sprite,i.x/32,nativeY(i.y));if(art.stats?.model==='rounded-volume')m.rotation.y=Math.PI/2+(i.sprite>=128&&i.sprite<=227?pilot.time*.4:0);else if(view.position)m.rotation.y=Math.atan2(view.position.x-m.position.x,view.position.z-m.position.z);}
  let labelIndex=0;for(const e of w.effects)if((e.sprite!==65535||e.text)&&e.sprite!==undefined&&(e.vrArea??areaForY(e.y))===area&&Math.abs(e.x/32-pilot.player.x)<30){const m=setSprite(e,e.sprite,e.x/32,nativeY(e.y),e.z||0,.12);if(m.userData.scoreLabel&&view.quaternion){m.quaternion.copy(view.quaternion);m.scale.x=1;if(view.position){scoreForward.set(0,0,-1).applyQuaternion(view.quaternion);scoreUp.set(0,1,0).applyQuaternion(view.quaternion);m.position.copy(view.position).addScaledVector(scoreForward,1.8).addScaledVector(scoreUp,.08+(labelIndex++%4)*.19+Math.max(0,44-e.ttl)/176);}}}
  for(const q of w.platforms)if(q.active&&q.vrArea===area){const m=setSprite(q,q.sprite,q.x/32,nativeY(q.y-(q.raw[6]&64?0:2)),0,3.6);m.name='source-platform:'+q.index;m.rotation.y=0;}
  for(const a of w.actors){if(!a.active||(a.vrArea??areaForY(a.y))!==area)continue;
   if(isBear(a)){let m=dynamic.get(a);if(!m){m=makeBear();dynamic.set(a,m);props.add(m);}animateBear(m,bearPresentation(a,pilot.time),pilot.time);}
   else setSprite(a,a.sprite|(a.face<0?0x8000:0),a.x/32,nativeY(a.y),a.z||0,.5);
  }
  // Remove expired object meshes; shared native geometry remains cached.
  const live=new Set([...w.items,...w.effects,...w.platforms,...w.actors.filter(a=>a.active)]);
  for(const [key,m] of dynamic)if(!live.has(key)){m.removeFromParent();if(m.userData.batches){for(const {instances} of m.userData.batches)instances.dispose();for(const material of new Set(m.userData.batches.map(b=>b.instances.material)))material.dispose();}dynamic.delete(key);}
 }
 const arches=new T.Group();root.add(arches);for(const gate of pilot.world.gates.filter(g=>g.active&&[12,13,14,15,16,17,18].includes(g.index))){const x=((gate.triggerTile&255)*16+8)/32,y=nativeY((gate.triggerTile>>8)*16);const g=new T.Group();g.position.set(x,y,0);g.userData.area=areaForY((gate.triggerTile>>8)*16);if(g.userData.area==='caves')g.rotation.y=Math.PI;arches.add(g);instances(g,ball,stone,[{p:[-.65,.6,-1.25],s:[.3,.9,.4]},{p:[.65,.6,-1.25],s:[.3,.9,.4]},{p:[0,1.35,-1.25],s:[.8,.3,.4]}]);const mouth=new T.Mesh(new T.BoxGeometry(1.1,1.25,.25),new T.MeshBasicMaterial({color:'#131b19'}));mouth.position.set(0,.58,-1.65);g.add(mouth);}const originalUpdate=update;const viewUpdate=view=>{originalUpdate(view);for(const arch of arches.children)arch.visible=arch.userData.area===pilot.area;};
 viewUpdate();return {update:viewUpdate,root,art,stats};
}

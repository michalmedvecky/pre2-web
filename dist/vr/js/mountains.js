import * as T from '../vendor/three.module.js';
// Finite, world-anchored distant scenery: translation produces a small natural parallax.
export async function loadMountains(renderer){
 const texture=await new T.TextureLoader().loadAsync(new URL('../textures/mountains-360.jpg',import.meta.url).href);texture.colorSpace=T.SRGBColorSpace;texture.wrapS=T.RepeatWrapping;texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());renderer.initTexture(texture);
 const material=new T.MeshBasicMaterial({map:texture,side:T.BackSide,fog:false,depthWrite:false});
 // Join both photographed borders without a hard seam. This only blends the outer 3%.
 material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`vec4 panoramaColor=texture2D(map,vMapUv);
 float seam=smoothstep(0.94,1.0,abs(vMapUv.x-0.5)*2.0);
 vec4 border=(texture2D(map,vec2(0.0003,vMapUv.y))+texture2D(map,vec2(0.9997,vMapUv.y)))*0.5;
 diffuseColor*=mix(panoramaColor,border,seam);`);};material.customProgramCacheKey=()=> 'pre2-mountains-seam-v1';
 const mesh=new T.Mesh(new T.SphereGeometry(180,64,32),material);mesh.name='mountains-360';mesh.renderOrder=-100;mesh.frustumCulled=false;mesh.rotation.y=.3;
 return {mesh,update(position,outdoors){mesh.visible=outdoors;if(position)mesh.position.set(64+(position.x-64)*.9,1.65,position.z*.9);},metadata:{generated:true,width:texture.image.naturalWidth,height:texture.image.naturalHeight,parallax:.1,radius:180}};
}

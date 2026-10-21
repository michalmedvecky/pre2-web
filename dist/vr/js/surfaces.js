import * as T from '../vendor/three.module.js';
export const SURFACES={grass:1.8,earth:2,stone:2.2,bark:1.6,foliage:1};
export async function loadSurfaces(renderer){const loader=new T.TextureLoader(),textures={};await Promise.all(Object.keys(SURFACES).map(async kind=>{const t=await loader.loadAsync(new URL('../textures/'+kind+'.png',import.meta.url).href);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());textures[kind]=t;}));return textures;}
// World-space triplanar mapping keeps scale consistent across native half-metre boxes,
// tree trunks and irregular rocks. Adjacent tiles sample the same surface at their edge.
export function surfaceMaterial(kind,textures){const m=new T.MeshStandardMaterial({map:textures[kind],roughness:.96,flatShading:true});m.name='vr-surface:'+kind;const period=SURFACES[kind].toFixed(3);
 m.onBeforeCompile=shader=>{shader.vertexShader='varying vec3 vSurfaceWorld;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
 vec4 surfacePosition=vec4(transformed,1.0);
 #ifdef USE_INSTANCING
 surfacePosition=instanceMatrix*surfacePosition;
 #endif
 vSurfaceWorld=(modelMatrix*surfacePosition).xyz;`);
 shader.fragmentShader='varying vec3 vSurfaceWorld;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#ifdef USE_MAP
 vec3 surfaceNormal=abs(normalize(cross(dFdx(vSurfaceWorld),dFdy(vSurfaceWorld))));
 vec3 surfaceWeights=pow(surfaceNormal,vec3(4.0));surfaceWeights/=max(dot(surfaceWeights,vec3(1.0)),0.0001);
 vec3 surfaceUV=vSurfaceWorld/${period};
 vec4 surfaceColor=texture2D(map,surfaceUV.yz)*surfaceWeights.x+texture2D(map,surfaceUV.xz)*surfaceWeights.y+texture2D(map,surfaceUV.xy)*surfaceWeights.z;
 diffuseColor*=surfaceColor;
 #endif`);};m.customProgramCacheKey=()=>`vr-triplanar-${kind}-1`;return m;
}

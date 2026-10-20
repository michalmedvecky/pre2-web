/** Renderer-neutral scene export. No DOM, engine mutations, camera coupling or XR API.
 * This exports a 2D simulation on a world plane; it does not infer absent 3D art.
 */
export function worldToMetres(x,y,{pixelsPerMetre=32,originX=0,originY=0,depth=0}={}){
 if(!Number.isFinite(pixelsPerMetre)||pixelsPerMetre<=0)throw Error('Invalid world scale');
 return {x:(x-originX)/pixelsPerMetre,y:(originY-y)/pixelsPerMetre,z:depth};
}
export class SceneAdapter {
 constructor(options={}){this.options={pixelsPerMetre:32,...options};this.ids=new WeakMap();this.nextId=1;}
 id(object){if(!this.ids.has(object))this.ids.set(object,this.nextId++);return this.ids.get(object);}
 capture(w){const entities=[],add=(o,kind,layer,id)=>{if(!o||o.active===false||o.render===false||o.removed||o.hidden||o.ttl<=0)return;const word=o.sprite??o.spriteId;if(word==null||word<0||word===65535)return;const sprite=word&8191,flip=!!(word&32768)||!!(o.flip??o.flipX??(o.face<0));entities.push({id:id||kind+':'+this.id(o),kind,layer,asset:'sprite:'+sprite,sourceSprite:sprite,position:worldToMetres(o.x,o.y,this.options),nativeAnchor:{x:o.x,y:o.y},facing:flip?-1:1,yaw:flip?Math.PI/2:-Math.PI/2,hitFlash:!!o.hitFlash||!!(word&16384),visible:true,animation:{sprite,action:o.action??null,variant:o.animationVariant??null,glideMode:o.glideMode??0}});};
 for(const [layer,kind] of ['platforms','items','actors','bossParts','projectiles'].entries())for(const o of w[kind]||[])add(o,kind,layer+1);
 if(w.player&&(!(w.player.invulnerable>0)||((w.frame||0)&2)===0)){add(w.player,'player',6,'player');if(w.playerWeapon){add(w.playerWeapon,'equipment',7,'player:equipment');const e=entities.at(-1);if(e?.id==='player:equipment')e.attachment={owner:'player',offsetPixels:{x:w.playerWeapon.x-w.player.x,y:w.playerWeapon.y-w.player.y}};}}
 for(const o of w.effects||[])add(o,'effect',8);
 return {version:1,simulation:'dos-2d',stage:w.level.id,tick:w.frame,coordinateSystem:{handedness:'right',up:'+Y',forward:'-Z',pixelsPerMetre:this.options.pixelsPerMetre,simulationPlaneZ:this.options.depth||0},entities,gameplay:{health:w.health,lives:w.lives,score:w.score,transition:w.transition?structuredClone(w.transition):null},cameraPolicy:'owned-by-renderer; never apply 2D scrolling camera to an XR head pose'};
 }
 describeLevel(w){return {version:1,id:w.level.id,width:256,height:w.level.height,tilePixels:16,map:Array.from(w.map),tileLookup:[...w.level.lookup],tilePropertiesX:[...(w.level.tilePropertiesX||[])],tilePropertiesY:[...(w.level.tilePropertiesY||[])],gates:(w.gates||[]).map(g=>({...g})),depthGeometry:null,meshStatus:'requires-authored-3d-level'};}
}

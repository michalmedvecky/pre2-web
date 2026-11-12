// Optional visual pilot only: world coordinates, timings and collision metadata stay original.
export function validateHdManifest(manifest){
 if(manifest?.version!==1||!Number.isInteger(manifest.scale)||manifest.scale<2)throw Error('Invalid HD manifest version/scale');
 const images=manifest.images||{},check=(entry,w,h)=>{const image=images[entry.image],r=entry.sourceRect;if(!image||!r||![r.x,r.y,r.width,r.height,w,h].every(Number.isFinite)||r.x<0||r.y<0||r.width<=0||r.height<=0||r.x+r.width>image.width||r.y+r.height>image.height)throw Error('Invalid HD atlas rectangle');const density=image.density??manifest.scale;if(Math.abs(r.width-w*density)>1e-7||Math.abs(r.height-h*density)>1e-7)throw Error('HD atlas scale differs from original coordinates');};
 for(const entry of manifest.sprites||[]){check(entry,entry.frame.width,entry.frame.height);if(!Number.isFinite(entry.frame.pivotX)||!Number.isFinite(entry.frame.pivotY))throw Error('Invalid HD pivot');}
 for(const entry of manifest.regions||[])check(entry,entry.width,entry.height);
 return manifest;
}
async function browserImage(url){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('HD image unavailable'));image.src=url;});}
export class HdPilotAssets{
 constructor(manifest,{baseUrl,enabled=false,imageLoader=browserImage}={}){this.manifest=validateHdManifest(manifest);this.baseUrl=baseUrl;this.imageLoader=imageLoader;this.enabled=!!enabled;this.images=new Map();this.errors=[];this.disposed=false;}
 static async load(url,{fetchFn=globalThis.fetch,...options}={}){const response=await fetchFn(url);if(!response.ok)throw Error('HD manifest unavailable');const bank=new HdPilotAssets(await response.json(),{...options,baseUrl:new URL('.',url)});await bank.prepare();return bank;}
 async prepare(){await Promise.all(Object.entries(this.manifest.images).map(async([key,spec])=>{try{const image=await this.imageLoader(new URL(spec.url,this.baseUrl));if(this.disposed){image.close?.();return;}const width=image.naturalWidth||image.width,height=image.naturalHeight||image.height;if(width!==spec.width||height!==spec.height){image.close?.();throw Error(`HD image dimensions ${width}x${height}, expected ${spec.width}x${spec.height}`);}this.images.set(key,image);}catch(error){this.errors.push({image:key,message:String(error.message||error)});}}));return this;}
 setEnabled(value){this.enabled=!!value;return this.enabled;}toggle(){return this.setEnabled(!this.enabled);}
 get renderScale(){return this.enabled&&[...this.manifest.sprites,...this.manifest.regions].some(e=>e.runtimeEligible!==false&&this.images.has(e.image))?this.manifest.scale:1;}
 getSprite(name,slot,frame){if(!this.enabled||this.disposed)return null;const entry=this.getPreviewSprite(name,slot,frame);return entry?.runtimeEligible!==false?entry:null;}
 getPreviewSprite(name,slot,frame){if(this.disposed)return null;const entry=this.manifest.sprites.find(e=>e.name===name&&e.slot===slot&&e.index===frame),image=entry&&this.images.get(entry.image);return image?{...entry,image,scale:this.manifest.images[entry.image].density??this.manifest.scale}:null;}
 getMapRegions(stage){if(!this.enabled||this.disposed)return[];return this.manifest.regions.filter(e=>e.runtimeEligible!==false&&String(e.stage).toLowerCase()===String(stage).toLowerCase()&&this.images.has(e.image)).map(e=>({...e,image:this.images.get(e.image),scale:this.manifest.scale}));}
 diagnostics(){return{enabled:this.enabled,scale:this.renderScale,status:this.manifest.status,approval:this.manifest.approval,loaded:[...this.images.keys()],errors:this.errors.slice(),coverage:{sprites:this.manifest.sprites.length,regions:this.manifest.regions.length},fallback:'Original bitmap for every missing frame/region; no gameplay changes'};}
 dispose(){this.disposed=true;for(const image of this.images.values())image.close?.();this.images.clear();}
}

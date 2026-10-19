import {Assets} from './assets.js';
import {Renderer} from './render.js';
import {HDAssets} from './hd.js';
import {World} from './engine.js';
const $=s=>document.querySelector(s);
try{
 const assets=await Assets.load();assets.rules=await(await fetch('rules.json')).json();const pack=await HDAssets.load(),world=new World(assets),original=new Renderer($('#original'),assets),hd=new Renderer($('#hd'),assets);hd.setHD(pack);
 const sets=pack.manifest.atlases.map(a=>({id:a.id,ids:Object.entries(pack.manifest.sprites).filter(([,s])=>s.atlas===a.id).map(([id])=>+id)}));
 for(const set of sets){const o=document.createElement('option');o.value=set.id;o.textContent=set.id;$('#set').append(o);}
 let playing=true,last=0,index=0;
 function draw(){const set=sets.find(s=>s.id===$('#set').value),id=set.ids[index%set.ids.length],source=pack.manifest.sprites[id],face=$('#mirror').checked?-1:1,word=id|($('#flash').checked?16384:0)|(face<0?32768:0);$('#frame').max=set.ids.length-1;$('#frame').value=index;world.player.sprite=word;world.player.face=face;world.player.x=160;world.player.y=136;world.player.glideMode=0;world.deathTimer=0;world.transition=null;world.updatePlayerWeapon();if(source.role==='hero-legs')world.updateFormSprite({});const player=source.role.startsWith('hero')&&!['hero-gear'].includes(source.role);const view={level:{id:'1',height:11,lookup:Array(256).fill(65535),background:'none'},map:new Uint8Array(256*11),camera:{x:0,y:0},player:player?world.player:null,playerWeapon:player?world.playerWeapon:null,actors:player?[]:[{x:160,y:136,sprite:word,face}],frame:0,health:3,lives:2};original.render(view);hd.render(view);$('#status').textContent=`Sprite ${id} · ${source.width}×${source.height} native pixels · frame ${index+1}/${set.ids.length}`;}
 $('#set').onchange=()=>{index=0;draw();};$('#frame').oninput=()=>{playing=false;$('#play').textContent='Play';index=+$('#frame').value;draw();};$('#mirror').onchange=draw;$('#flash').onchange=draw;$('#play').onclick=()=>{playing=!playing;$('#play').textContent=playing?'Pause':'Play';};
 function tick(now){if(playing&&now-last>140){last=now;const set=sets.find(s=>s.id===$('#set').value);index=(index+1)%set.ids.length;draw();}requestAnimationFrame(tick);}draw();requestAnimationFrame(tick);
}catch(e){$('#status').textContent='Preview could not load: '+e.message;console.error(e);}

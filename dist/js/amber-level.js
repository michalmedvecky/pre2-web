// Original browser-authored adventure. The sixteen recovered levels stay unchanged.
export function registerAmberLevel(game,descriptor){
 if(game.levels.some(l=>l.id==='H'))return;
 game.levels.push(structuredClone(descriptor.level));game.palettes.push(structuredClone(game.palettes[descriptor.paletteIndex]));
}
export function appendAmberSprites(a,descriptor,pixels){const offset=a.spritesPixels.length,joined=new Uint8Array(offset+pixels.length);joined.set(a.spritesPixels);joined.set(pixels,offset);a.spritesPixels=joined;for(const s of descriptor.sprites)a.game.sprites[s.id]={...s,pixelOffset:s.pixelOffset+offset};}
function key(w){if(w.items.some(i=>i.amberKey&&i.active))return;w.items.push({index:10000,sprite:467,x:3744,y:344,active:true,originalSprite:467,authored:false,amberKey:true});}
export function initAmber(w,saved){
 w.amber=null;w.amberActors=[];if(w.level.custom!=='amber')return;
 const spec=w.level.amber;
 w.amber={oldY:w.player.y,bees:spec.bees.map((e,i)=>({...e,index:i,baseX:e.x,baseY:e.y,sprite:460,active:!saved?.deadBees?.includes(i),hp:1,lastHit:-100})),queen:{...spec.queen,sprite:462,baseX:spec.queen.x,baseY:spec.queen.y,active:!saved?.queenDead,hp:saved?.queenHP??spec.queen.hp,lastHit:-100},bullets:[],caches:spec.caches.map((c,i)=>({...c,index:i,active:!saved?.openedCaches?.includes(i)}))};
 w.mem[65534]=w.mem[65535]=255;w.weatherPointer=65534;w.camera={x:0,y:Math.max(0,w.player.y-112)};
 if(saved){w.camera.x=Math.max(0,Math.min(w.maxCameraX(),w.player.x-112));if(saved.exitUnlocked){w.inventory2|=2;w.unlockExits();for(const i of w.items)if(i.amberExit)i.sprite=466;}else if(saved.queenDead)key(w);}
 syncEntities(w);
}
export function amberPersistence(w){if(!w.amber)return null;return{queenDead:!w.amber.queen.active,queenHP:w.amber.queen.hp,exitUnlocked:!!(w.inventory2&2),deadBees:w.amber.bees.filter(b=>!b.active).map(b=>b.index),openedCaches:w.amber.caches.filter(c=>!c.active).map(c=>c.index)};}
export function beforeAmberPlayer(w){if(!w.amber)return;w.amber.oldY=w.player.y;if(w.player.grounded&&w.tile(w.player.x,w.player.y)===3)w.player.vx=Math.max(-40,Math.min(40,w.player.vx));}
const overlaps=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
function body(w,e){const r=w.spriteBounds(e);return{left:r.left+4,right:r.right-4,top:r.top+5,bottom:r.bottom-2};}
function hitEnemy(w,e,queen=false){if(w.frame-e.lastHit<18)return;e.lastHit=w.frame;e.hp--;w.emit('sfx',{index:2});if(e.hp<=0){e.active=false;w.scoreAward(queen?15:5,e.x,e.y);if(queen){key(w);w.emit('bossDefeated');}else w.spawnFragments(e.x,e.y,0x2046,24,-80,3,{collectible:true});}}
export function updateAmber(w){if(!w.amber||w.deathTimer||w.transition)return;const a=w.amber,p=w.player,frame=w.frame;
 for(const b of a.bees){if(!b.active)continue;const old=b.x;b.x=Math.round(b.baseX+Math.sin((frame+b.index*29)/26)*b.range);b.y=Math.round(b.baseY+Math.sin(frame/17+b.index)*9);b.flip=b.x>old;b.sprite=460+((frame>>2)&1);}
 const q=a.queen;if(q.active&&p.x>3376){const old=q.x;q.x=Math.round(q.baseX+Math.sin(frame/27)*44);q.y=Math.round(q.baseY+Math.sin(frame/20)*10);q.flip=p.x>q.x;if(frame%55===0)a.bullets.push({x:q.x+(p.x<q.x?-28:28),y:q.y-22,vx:p.x<q.x?-2:2,vy:-1,ttl:100,sprite:464,active:true});}
 for(const shot of a.bullets){shot.x+=shot.vx;shot.y+=shot.vy;shot.vy+=.14;if(--shot.ttl<=0||shot.y>560)shot.active=false;if(shot.active&&overlaps(body(w,shot),body(w,p))){w.damage();shot.active=false;}}a.bullets=a.bullets.filter(s=>s.active);
 for(const enemy of [...a.bees,q]){if(!enemy.active||Math.abs(p.x-enemy.x)>380)continue;const box=body(w,enemy),pb=body(w,p),queen=enemy===q;
  for(const shot of w.projectiles){if(shot.ttl<=0||!overlaps(w.spriteBounds(shot),box))continue;hitEnemy(w,enemy,queen);if(shot.ranged)shot.ttl=0;break;}
  if(!enemy.active)continue;
  if(p.vy>=0&&a.oldY<=box.top+5&&p.y>=box.top&&p.x>box.left-8&&p.x<box.right+8){hitEnemy(w,enemy,queen);p.y=box.top;p.vy=w.input.up?-224:-64;p.jumpFrame=9;p.grounded=false;p.fallFrames=0;}
  else if(overlaps(pb,box)&&frame-enemy.lastHit>6)w.damage();
 }
 for(const c of a.caches){if(!c.active)continue;for(const s of w.projectiles)if(s.ttl>0&&Math.abs(s.x-c.x)<36&&Math.abs(s.y-c.y)<36){c.active=false;for(const dx of[-16,0,16])w.items.push({index:11000+c.index*3+dx+16,sprite:469,amberFood:true,x:c.x+dx,y:c.y-12,active:true,originalSprite:469,authored:false});w.emit('sfx',{index:8});break;}}
 syncEntities(w);
}
function syncEntities(w){for(const e of [...w.amber.bees,w.amber.queen])e.hitFlash=w.frame-e.lastHit<3;w.amberActors=[...w.amber.bees.filter(b=>b.active),...(w.amber.queen.active?[w.amber.queen]:[]),...w.amber.bullets];}
export function amberState(w){if(!w.amber)return[];const a=w.amber;return[a.queen.hp,+a.queen.active,a.queen.x,a.queen.y,...a.bees.flatMap(b=>[+b.active,b.x,b.y]),...a.caches.map(c=>+c.active),...a.bullets.flatMap(b=>[b.x,b.y,b.vx,b.vy,b.ttl])];}

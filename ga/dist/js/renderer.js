export async function loadAssets(base = new URL('../assets/', import.meta.url)) {
  const response = await fetch(new URL('game.json', base));
  if (!response.ok) throw new Error('Nepodařilo se načíst původní herní data.');
  const assets = await response.json();
  async function binary(name) {
    const r = await fetch(new URL(name, base));
    if (!r.ok) throw new Error(`Chybí soubor ${name}.`);
    return r.arrayBuffer();
  }
  const [sprites, font] = await Promise.all([binary('sprites.bin'), binary(assets.font.file)]);
  assets.spritePixels = new Uint8Array(sprites);
  assets.fontPixels = new Uint8Array(font);
  await Promise.all(Object.values(assets.maps).map(async map => {
    const [cells, tiles] = await Promise.all([binary(map.cellsFile), binary(map.tilesFile)]);
    const view = new DataView(cells);
    map.cells = Uint16Array.from({length: cells.byteLength / 2}, (_, i) => view.getUint16(i * 2, true));
    map.tiles = new Uint8Array(tiles);
  }));
  return assets;
}

function canvas(width, height) {
  const el = document.createElement('canvas');
  el.width = width; el.height = height;
  return el;
}

// AXE56d2/572f sorts ordinary actor pointers by unsigned16(cachedScreenY+Z).
// Equal keys retain original pointer-array order. Magic handler temp draws follow it.
export function nativeActorDrawOrder(actors, cameraY = 0) {
  return [...actors].sort((a,b) => Number(!!a.isEffect)-Number(!!b.isEffect) ||
    (a.isEffect ? 0 : ((Math.trunc(a.y-cameraY)&0xffff)-(Math.trunc(b.y-cameraY)&0xffff))));
}

export class Renderer {
  constructor(target, assets) {
    this.canvas = target;
    this.ctx = target.getContext('2d', {alpha: false});
    this.assets = assets;
    this.maps = new Map(); this.frames = new Map();
    this.ctx.imageSmoothingEnabled = false;
    this.lastState = null;
  }
  palette(records = [], live = null) {
    const rgb6 = this.assets.basePalette.map(c => [...c]);
    for (const id of records) {
      const record = this.assets.paletteRecords[id];
      if (record) record.rgb6.forEach((color, i) => { rgb6[record.base + i] = color; });
    }
    if (live) live.forEach((color, i) => { rgb6[i] = color; });
    return rgb6.map(color => color.map(v => (v << 2) | (v >> 4)));
  }
  mapImage(map, palette, overrides = null, revision = 0) {
    const key = map.id + ':' + revision + ':' + JSON.stringify(overrides || []) + ':' + JSON.stringify(palette);
    if (this.maps.has(key)) return this.maps.get(key);
    const tileOverrides = new Map((overrides || []).map(({index,value}) => [index,value & 0xffff]));
    const image = canvas(map.width * 8, map.height * 8);
    const ctx = image.getContext('2d');
    const data = ctx.createImageData(image.width, image.height);
    for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) {
      const cellIndex = (y >> 3) * map.width + (x >> 3);
      const cell = tileOverrides.get(cellIndex) ?? map.cells[cellIndex];
      const tile = (cell & 0x07ff) >> 1;
      const index = map.tiles[tile * 64 + (y & 7) * 8 + (x & 7)];
      const color = palette[index]; const p = (y * image.width + x) * 4;
      data.data[p] = color[0]; data.data[p + 1] = color[1]; data.data[p + 2] = color[2]; data.data[p + 3] = 255;
    }
    ctx.putImageData(data, 0, 0); this.maps.set(key, image);
    if (this.maps.size > 3) this.maps.delete(this.maps.keys().next().value);
    return image;
  }
  getFrame(name, slot, frame) {
    const group = this.assets.sprites[name];
    if (!group) return null;
    let resolved = group.slots[slot];
    if (!resolved) resolved = group.slots[group.slotFallbacks?.[slot]] || group.slots[0];
    if (!resolved?.frames.length) return null;
    return resolved.frames[Math.max(0, Math.min(frame || 0, resolved.frames.length - 1))];
  }
  frameImage(name, slot, frameIndex, palette) {
    const frame = this.getFrame(name, slot, frameIndex);
    if (!frame) return null;
    const key = `${name}:${slot}:${frameIndex}:` + JSON.stringify(palette);
    if (this.frames.has(key)) return {image: this.frames.get(key), frame};
    const image = canvas(frame.width, frame.height);
    const ctx = image.getContext('2d'); const data = ctx.createImageData(frame.width, frame.height);
    for (let i = 0; i < Math.min(frame.count, frame.width * frame.height); i++) {
      const index = this.assets.spritePixels[frame.offset + i];
      if (frame.transparent && index === frame.transparentIndex) continue;
      const color = palette[index]; const p = i * 4;
      data.data[p] = color[0]; data.data[p + 1] = color[1]; data.data[p + 2] = color[2]; data.data[p + 3] = 255;
    }
    ctx.putImageData(data, 0, 0); this.frames.set(key, image);
    if (this.frames.size > 192) this.frames.delete(this.frames.keys().next().value);
    return {image, frame};
  }
  drawEntity(entity, state, commonRecords) {
    // AXE56d2 lifecycle visibility is advanced by Simulation, once per game tick.
    if (entity.visible === false || entity.removed || entity.blinkHidden || entity.lifecycle === 0xfd) return;
    const name = entity.sprite || entity.type;
    const group = this.assets.sprites[name];
    if (!group) return;
    const records = [...commonRecords];
    const record = entity.paletteRecord;
    if (Number.isInteger(record)) records.push(record);
    if (entity.paletteRecords) records.push(...entity.paletteRecords);
    const palette = this.palette(records, state.livePalette);
    const entry = this.frameImage(name, entity.animationSlot ?? 0, entity.frame ?? 0, palette);
    if (!entry) return;
    const {image, frame} = entry;
    const camera = state.camera || {x: 0, y: 0};
    const x = (Math.trunc(entity.x - camera.x) & ~1);
    const groundY=Math.trunc(entity.y-camera.y-(entity.z||0));
    let y = groundY-frame.pivotY;
    const reveal=entity.revealDraw??entity.reveal;
    const cropped=Number.isFinite(reveal)&&reveal>=0&&reveal<frame.height;
    if(cropped){y+=frame.height-reveal;this.ctx.save();this.ctx.beginPath();this.ctx.rect(0,0,320,Math.max(0,groundY));this.ctx.clip();}
    const mirror = entity.mirrored ?? (entity.direction !== undefined ? entity.direction > 0 && entity.direction < 5 : entity.facing < 0);
    const left = mirror ? x - frame.width + frame.pivotX : x - frame.pivotX;
    if (mirror) {
      this.ctx.save(); this.ctx.translate(left + frame.width, y); this.ctx.scale(-1, 1); this.ctx.drawImage(image, 0, 0); this.ctx.restore();
    } else this.ctx.drawImage(image, left, y);
    if(cropped)this.ctx.restore();
  }
  text(text, x, y, color = '#fff') {
    const ctx = this.ctx;
    function pass(dx, dy, fill) {
      ctx.fillStyle = fill;
      for (let n = 0; n < text.length; n++) {
        const glyph = text.toUpperCase().charCodeAt(n) - 32;
        if (glyph < 0 || glyph >= this.assets.font.glyphs) continue;
        for (let yy = 0; yy < 8; yy++) for (let xx = 0; xx < 8; xx++) {
          if (this.assets.fontPixels[glyph * 64 + yy * 8 + xx] === 143) ctx.fillRect(x + n * 8 + xx + dx, y + yy + dy, 1, 1);
        }
      }
    }
    pass.call(this, 1, 1, '#000'); pass.call(this, 0, 0, color);
  }
  screenSprite(name, slot, index, x, y, palette, mirror = false) {
    const entry=this.frameImage(name,slot,index,palette); if(!entry)return;
    const {image,frame}=entry,roundX=Math.trunc(x)&~1;
    const left=mirror?roundX-frame.width+frame.pivotX:roundX-frame.pivotX,top=y-frame.pivotY;
    if(mirror){this.ctx.save();this.ctx.translate(left+frame.width,top);this.ctx.scale(-1,1);this.ctx.drawImage(image,0,0);this.ctx.restore();}
    else this.ctx.drawImage(image,left,top);
  }
  drawHUD(state,palette) {
    const players=state.players || (state.player?[state.player]:[]),draw=(frame,x,y)=>this.screenSprite('score',0,frame,x,y,palette);
    if(state.mode==='duel'){
      players.forEach((player,index)=>{
        for(let i=0;i<Math.ceil(Math.max(0,player.health)/4);i++)draw(9,64+i*24,index?33:16);
        this.screenSprite(player.sprite||player.type,22,0,32,index?29:11,palette);
      });
      if(players.length===1){
        draw(25,16,33);
        const health=(state.entities||[]).filter(e=>!e.isPlayer&&!e.isEffect&&!e.removed&&![10,11,16,17].includes(e.typeId)).reduce((sum,e)=>sum+Math.max(0,e.health||0),0);
        for(let i=0;i<Math.ceil(health/4);i++)draw(9,64+i*24,33);
      }
      return;
    }
    const nativeStage=state.stageIndex??this.assets.maps[String(state.stage).toLowerCase()]?.nativeStage??0;
    if(nativeStage>7&&nativeStage<16)return;
    draw(8,8,16);draw(nativeStage>=16?nativeStage-16:nativeStage,64,16);
    players.forEach((player,index)=>{
      if(player.removed)return;
      const pots=player.magicPots||0,magicX=index?168:80;
      if(pots>0){draw(14,magicX,8);draw((player.typeId??['amazon','hero','dwarf'].indexOf(player.type))+10,magicX,16);draw(pots+15,magicX+1,17);}
      for(let i=0;i<Math.ceil(Math.max(0,player.health)/4);i++)draw(9,index?191+i*24:100-i*24,182);
      const lives=player.lives??state.lives??0;
      if(lives>0)draw(lives-1,index?183:124,182);
      this.screenSprite(player.sprite||player.type,22,0,index?164:132,182,palette);
    });
  }
  render(state) {
    this.lastState = state;
    const ctx = this.ctx;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 320, 200);
    const map = state.mapOverride || this.assets.maps[String(state.stage || '1').toLowerCase()];
    if (!map) return;
    const actors = [...(state.entities || [])];
    if (state.player && !actors.includes(state.player)) actors.push(state.player);
    const defaults = [this.assets.sprites.score.defaultPaletteRecord,this.assets.commonEnemyPaletteRecord];
    for (const actor of actors) {
      const name = actor.sprite || actor.type;
      if (name === 'heninger' || name === 'longmoan') continue;
      const record = this.assets.sprites[name]?.defaultPaletteRecord;
      if (Number.isInteger(record)) defaults.push(record);
    }
    const commonRecords = [...new Set(defaults), map.paletteRecord, ...(state.paletteRecords || [])];
    const palette = this.palette(commonRecords, state.livePalette);
    const camera = state.camera || map.initialCamera;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, this.assets.playfieldWidth, 200); ctx.clip();
    ctx.drawImage(this.mapImage(map, palette, state.mapTileOverrides, state.mapRevision), Math.trunc(camera.x), Math.trunc(camera.y), this.assets.playfieldWidth, 200, 0, 0, this.assets.playfieldWidth, 200);
    for (const actor of nativeActorDrawOrder(actors,camera.y)) this.drawEntity(actor, state, commonRecords);
    if (state.hideHUD) {ctx.restore(); return;}
    this.drawHUD(state,palette);
    if (state.message) this.text(String(state.message).slice(0, 36), 16, 164);
    ctx.restore();
  }
  renderMenu(step = 'mode') {
    if (step === 'character') {
      this.render({stage:'c',camera:this.assets.maps.c.initialCamera,entities:[],hideHUD:true});
    } else {
      this.ctx.fillStyle = '#000'; this.ctx.fillRect(0,0,320,200);
    }
  }
  fontChar(code,x,y,palette){
    const glyph=code-32;if(glyph<0||glyph>=this.assets.font.glyphs)return;
    for(let yy=0;yy<8;yy++)for(let xx=0;xx<8;xx++){
      const index=this.assets.fontPixels[glyph*64+yy*8+xx],color=palette[index];
      this.ctx.fillStyle=`rgb(${color.join(',')})`;this.ctx.fillRect(x+xx,y+yy,1,1);
    }
  }
  dialogue(message,text,camera={x:0,y:0},palette=this.palette([56])){
    const left=message.col*8-camera.x,top=message.row*8-camera.y;
    const put=(code,col,row)=>this.fontChar(code,left+col*8,top+row*8,palette);
    if(message.boxed){
      put(0x60,0,0);put(0x61,21,0);put(0x62,0,8);put(0x63,21,8);
      for(let x=1;x<21;x++){put(0x64,x,0);put(0x67,x,8);}
      for(let y=1;y<8;y++){put(0x65,0,y);put(0x66,21,y);for(let x=1;x<21;x++)put(32,x,y);}
    }
    let x=1,y=1;
    for(const c of text){if(c==='\r')x=1;else if(c==='\n')y+=2;else{put(c.charCodeAt(0),x,y);x++;}}
  }
  renderResults(state){
    const results=state.results||[],records=[58,2,17,8];
    this.render({stage:'d',hideHUD:true,entities:[],camera:this.assets.maps.d.initialCamera,paletteRecords:records});
    const palette=this.palette([56,this.assets.maps.d.paletteRecord,...records]);
    const draw=(frame,x,y,mirror=false)=>this.screenSprite('scoring',0,frame,x,y,palette,mirror);
    const decimal=(value,x,y,base,dot)=>{
      value=Math.max(0,Math.min(9999,Math.trunc(value)));const digits=String(value).padStart(4,'0');
      if(value>=1000)draw(base+Number(digits[0]),x,y);
      if(value>=100)draw(base+Number(digits[1]),x+9,y);
      draw(base+Number(digits[2]),x+18,y);draw(dot,x+27,y);draw(base+Number(digits[3]),x+36,y);
    };
    for(const result of results){
      const second=result.playerIndex===1;
      this.screenSprite({amazon:'select1',hero:'select2',dwarf:'select3'}[result.character],0,0,second?235:79,172,palette);
      draw(15,second?212:8,8);draw(16,second?212:8,32);draw(17,second?232:8,56);
      draw(3,second?250:63,176-result.rank*16,second);
      decimal(result.totalTenths,second?244:32,18,18,28);
      const used=Math.min(99,result.usedPlayers);if(used>=10)draw(18+Math.floor(used/10),second?252:40,42);draw(18+used%10,second?261:49,42);
      decimal(result.strengthTenths,second?252:18,66,4,14);
    }
    draw(0,136,36);draw(1,100,52);draw(2,100,124);
    const ranks=state.resultsHistogram||Array.from({length:8},(_,i)=>results.filter(r=>r.rank===i).length);
    for(let row=0;row<8;row++){const value=Math.min(99,ranks[7-row]||0);draw(4+Math.floor(value/10),189,61+row*16);draw(4+value%10,197,61+row*16);}
  }
}

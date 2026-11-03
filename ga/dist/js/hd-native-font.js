import {fittedInterfaceText} from './hd-interface.js';
// Source cell inventory plus an opt-in, SHA-qualified smooth typography remaster.
// Both paths are vector typography, never generated painted artwork.
export class NativeVectorFont {
  constructor(pixels, {glyphCount = 72, width = 8, height = 8, foregroundIndex = 143, backgroundIndex = 142,smooth = false} = {}) {
    if (!Number.isInteger(glyphCount) || glyphCount < 1 || width !== 8 || height !== 8 || pixels?.length < glyphCount * width * height) throw new TypeError('Invalid original glyph data.');
    this.glyphCount = glyphCount;
    this.width = width;
    this.height = height;
    this.foregroundIndex = foregroundIndex;
    this.backgroundIndex = backgroundIndex;
    this.smooth=smooth;this.classification=smooth?'remastered-vector-typography':'preserved-vector-typography';
    this.glyphs = Array.from({length: glyphCount}, (_, glyph) => {
      const rectangles = [], active = new Map();
      for (let y = 0; y < height; y++) {
        const next = new Map();
        for (let x = 0; x < width;) {
          if (pixels[glyph * width * height + y * width + x] !== foregroundIndex) { x++; continue; }
          const left = x++;
          while (x < width && pixels[glyph * width * height + y * width + x] === foregroundIndex) x++;
          const key = `${left}:${x-left}`, previous = active.get(key);
          if (previous) { previous[3]++; next.set(key, previous); }
          else { const rect = [left, y, x-left, 1]; rectangles.push(rect); next.set(key, rect); }
        }
        active.clear(); for (const [key, rect] of next) active.set(key, rect);
      }
      return rectangles;
    });
  }
  drawGlyph(ctx, glyph, x, y, {foreground = '#fff', background} = {}) {
    if (!Number.isInteger(glyph) || glyph < 0 || glyph >= this.glyphCount) return false;
    if (background !== undefined && !(this.smooth&&glyph>=64&&glyph<=67)) { ctx.fillStyle = background; ctx.fillRect(x, y, this.width, this.height); }
    if(this.smooth){
      const code=glyph+32;
      if(code>=96){this.drawBorder(ctx,code,x,y,foreground,background);return true;}
      const rects=this.glyphs[glyph];if(!rects.length)return true;
      const left=Math.min(...rects.map(r=>r[0])),top=Math.min(...rects.map(r=>r[1])),right=Math.max(...rects.map(r=>r[0]+r[2])),bottom=Math.max(...rects.map(r=>r[1]+r[3]));
      fittedInterfaceText(ctx,String.fromCharCode(code),[x+left,y+top,right-left,bottom-top],{fill:foreground});return true;
    }
    ctx.fillStyle = foreground;
    ctx.beginPath();
    for (const [left, top, width, height] of this.glyphs[glyph]) ctx.rect(x + left, y + top, width, height);
    ctx.fill();
    return true;
  }
  drawBorder(ctx,code,x,y,foreground,background){
    ctx.save();ctx.translate(x,y);
    if(background!==undefined&&code<=99){
      ctx.save();if(code===97){ctx.translate(8,0);ctx.scale(-1,1);}else if(code===98){ctx.translate(0,8);ctx.scale(1,-1);}else if(code===99){ctx.translate(8,8);ctx.scale(-1,-1);}
      ctx.beginPath();ctx.moveTo(8,0);ctx.lineTo(6,0);ctx.quadraticCurveTo(0,0,0,6);ctx.lineTo(0,8);ctx.lineTo(8,8);ctx.closePath();ctx.fillStyle=background;ctx.fill();ctx.restore();
    }
    ctx.strokeStyle=foreground;ctx.lineWidth=2;ctx.lineCap='butt';ctx.beginPath();
    if(code===96){ctx.moveTo(1,8);ctx.lineTo(1,6);ctx.quadraticCurveTo(1,1,6,1);ctx.lineTo(8,1);}
    else if(code===97){ctx.moveTo(0,1);ctx.lineTo(2,1);ctx.quadraticCurveTo(7,1,7,6);ctx.lineTo(7,8);}
    else if(code===98){ctx.moveTo(1,0);ctx.lineTo(1,2);ctx.quadraticCurveTo(1,7,6,7);ctx.lineTo(8,7);}
    else if(code===99){ctx.moveTo(0,7);ctx.lineTo(2,7);ctx.quadraticCurveTo(7,7,7,2);ctx.lineTo(7,0);}
    else if(code===100){ctx.moveTo(0,1);ctx.lineTo(8,1);}
    else if(code===101){ctx.moveTo(1,0);ctx.lineTo(1,8);}
    else if(code===102){ctx.moveTo(7,0);ctx.lineTo(7,8);}
    else if(code===103){ctx.moveTo(0,7);ctx.lineTo(8,7);}
    ctx.stroke();ctx.restore();
  }
  drawCode(ctx, code, x, y, palette) {
    const foreground = palette?.[this.foregroundIndex], background = palette?.[this.backgroundIndex];
    if (!foreground || !background) return false;
    return this.drawGlyph(ctx, code-32, x, y, {foreground: `rgb(${foreground.join(',')})`, background: `rgb(${background.join(',')})`});
  }
}

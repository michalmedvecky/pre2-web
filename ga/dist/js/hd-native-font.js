// Deliberately preserved original block typography, drawn as scalable paths.
// These glyphs are NOT generated painted HD artwork and must be reported apart.
export class NativeVectorFont {
  constructor(pixels, {glyphCount = 72, width = 8, height = 8, foregroundIndex = 143, backgroundIndex = 142} = {}) {
    if (!Number.isInteger(glyphCount) || glyphCount < 1 || width !== 8 || height !== 8 || pixels?.length < glyphCount * width * height) throw new TypeError('Invalid original glyph data.');
    this.glyphCount = glyphCount;
    this.width = width;
    this.height = height;
    this.foregroundIndex = foregroundIndex;
    this.backgroundIndex = backgroundIndex;
    this.classification = 'preserved-vector-typography';
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
    if (background !== undefined) { ctx.fillStyle = background; ctx.fillRect(x, y, this.width, this.height); }
    ctx.fillStyle = foreground;
    ctx.beginPath();
    for (const [left, top, width, height] of this.glyphs[glyph]) ctx.rect(x + left, y + top, width, height);
    ctx.fill();
    return true;
  }
  drawCode(ctx, code, x, y, palette) {
    const foreground = palette?.[this.foregroundIndex], background = palette?.[this.backgroundIndex];
    if (!foreground || !background) return false;
    return this.drawGlyph(ctx, code-32, x, y, {foreground: `rgb(${foreground.join(',')})`, background: `rgb(${background.join(',')})`});
  }
}

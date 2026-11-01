import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {NativeVectorFont} from '../dist/js/hd-native-font.js';
const pixels = await readFile(new URL('../dist/assets/font.bin', import.meta.url));
const font = new NativeVectorFont(pixels);

test('all72 vector glyphs preserve every original foreground cell and transparent hole', () => {
  let painted = 0;
  for (let glyph = 0; glyph < 72; glyph++) {
    const actual = new Uint8Array(64);
    for (const [x,y,w,h] of font.glyphs[glyph]) {
      for (let yy=y; yy<y+h; yy++) for (let xx=x; xx<x+w; xx++) actual[yy*8+xx]++;
    }
    for (let i=0; i<64; i++) {
      assert.equal(actual[i], Number(pixels[glyph*64+i] === 143), `glyph${glyph}/cell${i}`);
      painted += actual[i];
    }
  }
  assert.equal(painted, 1570);
  assert.equal(font.classification, 'preserved-vector-typography');
});

test('dialogue and border glyphs retain live foreground/background colors, text can remain transparent', () => {
  const calls=[], ctx={beginPath(){calls.push(['begin']);},rect(...v){calls.push(['rect',...v]);},fill(){calls.push(['fill',this.fillStyle]);},fillRect(...v){calls.push(['background',this.fillStyle,...v]);}};
  const palette=[]; palette[142]=[1,2,3];palette[143]=[250,240,230];
  assert.equal(font.drawCode(ctx,0x60,16,24,palette),true);
  assert.deepEqual(calls[0],['background','rgb(1,2,3)',16,24,8,8]);
  assert.deepEqual(calls.at(-1),['fill','rgb(250,240,230)']);
  calls.length=0;font.drawGlyph(ctx,33,0,0,{foreground:'#f00'});
  assert(!calls.some(c=>c[0]==='background'));
  assert.equal(font.drawGlyph(ctx,72,0,0),false);
});

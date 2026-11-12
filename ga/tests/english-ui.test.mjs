import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
const root=new URL('../dist/',import.meta.url);

test('all shipped HTML, JavaScript, CSS and JSON are free of Czech UI remnants',async()=>{
  const failures=[];
  async function visit(directory){
    for(const entry of await readdir(directory,{withFileTypes:true})){
      const file=new URL(entry.name+(entry.isDirectory()?'/':''),directory);
      if(entry.isDirectory())await visit(file);
      else if(/\.(?:html|js|css|json)$/.test(entry.name)){
        const text=await readFile(file,'utf8');
        const match=text.match(/[ěščřžýáíéúůťďňĚŠČŘŽÝÁÍÉÚŮŤĎŇ]|\b(?:zapnuto|vypnuto|Pohyb|Skok|Magie|Zrusit|Zpet)\b/);
        if(match)failures.push({file:file.href.slice(root.href.length),text:match[0]});
      }
    }
  }
  await visit(root);
  assert.deepEqual(failures,[]);
});

test('game and historical pilot declare English; remaster controls describe their initial state',async()=>{
  const main=await readFile(new URL('index.html',root),'utf8'),pilot=await readFile(new URL('hd-pilot.html',root),'utf8');
  assert.match(main,/<html lang="en">/);assert.match(pilot,/<html lang="en">/);
  assert.equal((main.match(/data-toggle-music-edition[^>]*aria-pressed="true"/g)||[]).length,2);
  assert.equal((main.match(/data-toggle-effects-edition[^>]*aria-pressed="true"/g)||[]).length,2);
  assert.match(main,/Controls and combos/);assert.match(main,/Music: remastered/);assert.match(main,/Sound effects: Remastered/);
});

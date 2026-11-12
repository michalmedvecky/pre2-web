import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('historical HD preview resolves inside a mounted GA directory and still works standalone',async()=>{
 const source=await readFile(new URL('../dist/js/hd-preview-overlay.js',import.meta.url),'utf8');
 const match=source.match(/frame\.src=new URL\('([^']+)',import\.meta\.url\)\.href/);
 assert.ok(match,'Preview must use the module URL, not the hostname root');
 for(const prefix of['/','/ga/'])assert.equal(new URL(match[1],`https://remastered.500miles.cz${prefix}js/hd-preview-overlay.js`).pathname,prefix+'hd-pilot.html');
 const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
 for(const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)){
  const value=match[1];if(value.startsWith('#')||/^[a-z]+:/i.test(value))continue;
  assert.ok(new URL(value,'https://remastered.500miles.cz/ga/').pathname.startsWith('/ga/'),value);
 }
});

test('historical pilot imports a real retained helper instead of the incompatible live HD bank',async()=>{
 const html=await readFile(new URL('../dist/hd-pilot.html',import.meta.url),'utf8');
 const match=html.match(/import\{HdPilotAssets\}from'([^']+)'/);assert.ok(match);
 const module=await import(new URL('../dist/'+match[1],import.meta.url));
 assert.equal(typeof module.HdPilotAssets.load,'function');
 const source=JSON.parse(await readFile(new URL('../dist/assets/hd/pilot/manifest.json',import.meta.url)));
 const bank=new module.HdPilotAssets(source);
 assert.equal(bank.manifest.runtimeEligible,false);
 assert.equal(bank.renderScale,1);
});

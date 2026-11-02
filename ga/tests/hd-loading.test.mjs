import test from 'node:test';
import assert from 'node:assert/strict';
import {HDAssetBank} from '../dist/js/hd-assets.js';
import {HDFramePresenter} from '../dist/js/hd-frame-presenter.js';

const palette=[[0,0,0]],native={pivotX:0,pivotY:0};
function manifest(){return {version:1,atlases:Object.fromEntries(['a','b','c'].map(id=>[id,{src:id+'.png',width:8,height:8}])),paletteVariants:{p:{colors:[]}},frames:[{sprite:'enemy',slot:0,frame:0,atlas:'a',rectPixels:[0,0,8,8],nativePivot:[0,0],translationNative:[0,0],scaleNativePerPixel:1,paletteVariant:'p',status:'approved'}],maps:[],fonts:[],tilePatches:[]};}
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};}
test('only exact visible dependencies block commit; unrelated queued atlases do not',async()=>{
 const a=deferred(),b=deferred(),bank=new HDAssetBank(manifest(),{loadImage:u=>u.pathname.endsWith('a.png')?a.promise:b.promise});
 const background=bank.ensureAtlas('b');bank.beginDemandFrame();assert.equal(bank.frame('enemy',0,0,palette,native).reason,'loading');assert.deepEqual(bank.endDemandFrame(),{ready:false,atlases:['a'],palettes:[],failed:false});
 a.resolve({width:8,height:8});await bank.pending.get('a');bank.beginDemandFrame();assert(bank.frame('enemy',0,0,palette,native).image);assert(bank.endDemandFrame().ready);assert(bank.pending.has('b'));b.resolve({width:8,height:8});await background;
});
test('background loads evict unused images before the visible frame, retaining the byte limit',async()=>{
 const bank=new HDAssetBank(manifest(),{maxAtlases:2,maxDecodedBytes:512,loadImage:async()=>({width:8,height:8})});await bank.preloadAtlases(['a','b']);bank.beginDemandFrame();bank.frame('enemy',0,0,palette,native);bank.endDemandFrame();await bank.ensureAtlas('c');assert(bank.images.has('a'));assert(!bank.images.has('b'));assert.equal(bank.coverage().decodedBytes,512);
});
test('an unavailable visible atlas is explicit failure, never a completed HD frame',async()=>{
 const bank=new HDAssetBank(manifest(),{loadImage:async()=>{throw Error('offline');}});await bank.ensureAtlas('a');bank.beginDemandFrame();bank.frame('enemy',0,0,palette,native);const result=bank.endDemandFrame();assert.equal(result.ready,false);assert.equal(result.failed,true);
});
test('presentation retains display until ready, reports timeout, and original mode bypasses barrier',()=>{
 const calls=[],ctx={setTransform(){},save(){},restore(){},drawImage(){calls.push('commit');}},target={width:1280,height:800},work={width:0,height:0,getContext:()=>ctx};let ready=false;
 const r={canvas:target,ctx,backingScale:4,graphicsMode:'hd',hd:{beginDemandFrame(){},endDemandFrame:()=>({ready,atlases:ready?[]:['a'],palettes:[]})}},p=new HDFramePresenter(r,{createCanvas:()=>work});
 p.begin();assert.equal(r.canvas,work);assert(p.finish(0).waiting);assert.equal(r.canvas,target);assert.deepEqual(calls,[]);p.begin();assert(p.finish(16000).failed);ready=true;p.begin();assert(!p.finish(16001).waiting);assert.deepEqual(calls,['commit']);r.graphicsMode='original';p.begin();assert.equal(r.canvas,target);assert(!p.finish(16002).waiting);
});

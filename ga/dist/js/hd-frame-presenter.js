// Commit a whole presentation frame only after its exact HD dependencies exist.
// Rendering still requests missing art, but SD loading placeholders never reach
// the display. The app stops its clock while waiting; it never catches up later.
export class HDFramePresenter {
  constructor(renderer,{createCanvas=()=>document.createElement('canvas')}={}) {
    this.renderer=renderer;this.work=createCanvas();this.waiting=false;this.waitStarted=null;
  }
  begin() {
    const r=this.renderer;
    if(r.graphicsMode!=='hd'){this.waiting=false;this.waitStarted=null;return;}
    this.target=r.canvas;this.targetContext=r.ctx;
    if(this.work.width!==r.canvas.width||this.work.height!==r.canvas.height){this.work.width=r.canvas.width;this.work.height=r.canvas.height;}
    r.canvas=this.work;r.ctx=this.work.getContext('2d',{alpha:false});
    r.ctx.setTransform(r.backingScale,0,0,r.backingScale,0,0);r.ctx.imageSmoothingEnabled=false;
    r.hd?.beginDemandFrame();
  }
  finish(now) {
    const r=this.renderer;
    if(!this.target)return {waiting:false,failed:false};
    const demand=r.hd?.endDemandFrame()||{ready:true};
    r.canvas=this.target;r.ctx=this.targetContext;this.target=null;this.targetContext=null;
    this.waiting=!demand.ready;
    if(this.waiting)this.waitStarted??=now;else this.waitStarted=null;
    if(!this.waiting){r.ctx.save();r.ctx.setTransform(1,0,0,1,0,0);r.ctx.drawImage(this.work,0,0);r.ctx.restore();}
    return {waiting:this.waiting,failed:!!demand.failed||this.waiting&&now-this.waitStarted>15000,missingAtlases:demand.atlases?.length||0,missingPalettes:demand.palettes?.length||0};
  }
}

// Join cached chunks on integer pixels before filtering the moving world layer.
// Filtering each chunk separately clamps its edge samples and exposes seams.
export class TerrainLayer {
 draw(hd,cx,cy,draw){
  const size=64,scale=hd.scale;
  // Presentation can differ from the rounded camera by half a native pixel.
  // Include a full native pixel on all sides for both motion and filtering.
  const bounds={x0:Math.max(0,Math.floor((cx-1)/size)),x1:Math.floor((cx+320)/size),y0:Math.max(0,Math.floor((cy-1)/size)),y1:Math.floor((cy+176)/size)};
  const ox=bounds.x0*size,oy=bounds.y0*size,width=(bounds.x1-bounds.x0+1)*size*scale,height=(bounds.y1-bounds.y0+1)*size*scale;
  this.canvas||=document.createElement('canvas');
  if(this.canvas.width!==width)this.canvas.width=width;
  if(this.canvas.height!==height)this.canvas.height=height;
  const c=this.canvas.getContext('2d');c.clearRect(0,0,width,height);c.save();c.imageSmoothingEnabled=false;c.translate(-ox*scale,-oy*scale);draw(c,bounds);c.restore();
  hd.clipped(176,target=>target.drawImage(this.canvas,(ox-cx)*scale,(oy-cy)*scale));
 }
}

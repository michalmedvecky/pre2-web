// Preserve logical source coordinates while decoding a smaller display bitmap.
// PNGs, frame registration and material annotations remain immutable.
export const imageBytes=image=>image.decodedBytes??image.width*image.height*4;
export function drawHDImage(ctx,image,sx,sy,sw,sh,...destination){
  ctx.drawImage(image.bitmap||image,sx*(image.scaleX??1),sy*(image.scaleY??1),sw*(image.scaleX??1),sh*(image.scaleY??1),...destination);
}
export async function displayBitmap(image){
  if(typeof createImageBitmap!=='function')return image;
  const width=Math.max(1,Math.ceil(image.width/2)),height=Math.max(1,Math.ceil(image.height/2));
  let bitmap=await createImageBitmap(image,{resizeWidth:width,resizeHeight:height,resizeQuality:'high'});
  if(bitmap.width!==width||bitmap.height!==height){
    const canvas=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(width,height):document.createElement('canvas');
    canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');ctx.imageSmoothingQuality='high';ctx.drawImage(bitmap,0,0,width,height);bitmap.close();bitmap=await createImageBitmap(canvas);
  }
  return {bitmap,width:image.width,height:image.height,scaleX:width/image.width,scaleY:height/image.height,decodedBytes:width*height*4,close:()=>bitmap.close()};
}

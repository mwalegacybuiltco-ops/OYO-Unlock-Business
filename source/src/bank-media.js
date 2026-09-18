import {bankLimits} from './game/bank.js';
export async function compressScreenshot(file){
  if(!file||!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>20*1024*1024)throw Error('Choose a PNG, JPEG or WebP screenshot smaller than 20 MB.');
  const bitmap=await createImageBitmap(file);
  try{
    if(bitmap.width*bitmap.height>40000000)throw Error('This image is too large. Crop it before saving.');
    let scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));
    for(let attempt=0;attempt<7;attempt++){
      const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
      const ctx=canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.78));
      if(blob&&blob.size<=bankLimits.imageBytes)return {image:new Uint8Array(await blob.arrayBuffer()),mime:'image/jpeg'};
      scale*=.75;
    }
    throw Error('This screenshot could not fit. Crop it and try again.');
  }finally{bitmap.close();}
}

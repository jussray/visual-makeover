import type { Brief, ScreenPlan } from "./schema";
import type { Audience } from "./review";
export function storyboardKey(brief:Brief,description:string,audience:Audience,plans:ScreenPlan[]){
 return JSON.stringify([brief,description.trim(),audience,plans]);
}
export function imagePayload(url:string,mime:"png"|"jpeg"){
 const prefix="data:image/"+mime+";base64,", payload=url.startsWith(prefix)?url.slice(prefix.length):"";
 if(!payload||!/^[A-Za-z0-9+/]+={0,2}$/.test(payload)||payload.length%4!==0)throw Error("Invalid image data");
 return payload;
}
export async function storyboardPng(url:string){
 imagePayload(url,"jpeg");const img=new Image();img.src=url;await img.decode();
 const canvas=document.createElement("canvas");canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
 const ctx=canvas.getContext("2d");if(!ctx||!canvas.width||!canvas.height)throw Error("Invalid image");
 ctx.drawImage(img,0,0);return imagePayload(canvas.toDataURL("image/png"),"png");
}

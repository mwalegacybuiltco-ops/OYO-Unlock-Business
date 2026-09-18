import {requireThat,safeText,safeURL} from './engine.js';
import {worlds} from './content.js';
export function cleanResources(data){
 requireThat(data&&Array.isArray(data.products)&&data.products.length<=20,'Add up to 20 product links.');
 const mainUrl=safeURL(safeText(data.mainUrl||'',0,2000));
 const products=data.products.map(p=>({id:safeText(p.id,1,64),title:safeText(p.title,1,80),description:safeText(p.description||'',0,300),url:safeURL(safeText(p.url,1,2000)),world:safeText(p.world||'all',1,40)}));
 requireThat(new Set(products.map(p=>p.id)).size===products.length,'Product IDs must be unique.');
 products.forEach(p=>requireThat(p.world==='all'||worlds.some(w=>w.id===p.world),'Choose a valid world.'));
 return {mainUrl,mainTitle:safeText(data.mainTitle||'Expedition tools',1,80),products};
}
export function cleanChat(text){return safeText(text,1,800);}

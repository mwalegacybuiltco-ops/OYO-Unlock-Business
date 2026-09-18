import {readFile,writeFile,rm} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
const root=resolve('dist');
let html=await readFile(resolve(root,'index.html'),'utf8');
const scripts=[...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g)];
if(scripts.length!==1)throw Error('Expected one compiled game entry');
const scriptPath=resolve(root,scripts[0][1]);
if(!scriptPath.startsWith(root+'/assets/'))throw Error('Entry must be a local compiled asset');
let code=await readFile(scriptPath,'utf8');
code=code.replace(/<\/script/gi,'<\\/script');
html=html.replace(scripts[0][0],()=>`<script type="module" id="oyo-game-code">${code}</script>`);
const styles=[...html.matchAll(/<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"[^>]*>/g)];
for(const match of styles){
 const cssPath=resolve(root,match[1]);
 let css=await readFile(cssPath,'utf8');
 css=css.replace(/url\((['"]?)([^)'"\s]+)\1\)/g,(whole,quote,url)=>{
  if(/^(data:|https?:|#)/.test(url))return whole;
  const target=resolve(dirname(cssPath),url);
  if(!target.startsWith(root+'/'))throw Error('CSS asset escapes the website');
  return `url("./${target.slice(root.length+1)}")`;
 });
 html=html.replace(match[0],()=>`<style id="oyo-game-style">${css.replace(/<\/style/gi,'<\\/style')}</style>`);
}
if(!styles.length)throw Error('Expected compiled game styling');
if(/<script\b[^>]*\bsrc=|<link\b[^>]*\brel="stylesheet"/.test(html))throw Error('External startup assets remain');
await writeFile(resolve(root,'index.html'),html);
await rm(resolve(root,'assets'),{recursive:true});
console.log('Game code and styling embedded in index.html; artwork stays at the website root.');

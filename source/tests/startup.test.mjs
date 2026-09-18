import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const controller=html.match(/<script id="opening-controller">([\s\S]*?)<\/script>/)[1];
function boot(){const status={textContent:'Opening your adventure…'},retry={hidden:true,addEventListener:(_event,fn)=>retry.click=fn},events={},window={addEventListener:(event,fn)=>events[event]=fn};let timeout,cleared=false,reloaded=false;vm.runInNewContext(controller,{document:{getElementById:id=>id==='opening-status'?status:retry},window,location:{reload:()=>reloaded=true},setTimeout:fn=>{timeout=fn;return 1;},clearTimeout:()=>cleared=true});return {status,retry,events,window,timeout:()=>timeout(),cleared:()=>cleared,reloaded:()=>reloaded};}
test('opening HTML starts automatically and contains no skip/start link',()=>{assert.doesNotMatch(html,/Skip to game|href="#main"/);assert.match(html,/Opening your adventure/);assert.match(html,/<script type="module" src="\/src\/main.js">/);});
test('successful first render cancels opening timeout and never asks for a start click',()=>{const b=boot();b.window.oyoBoot.ready();b.timeout();b.events.error();assert.equal(b.cleared(),true);assert.equal(b.retry.hidden,true);});
test('failed startup offers a working reload instead of leaving an empty screen',()=>{const b=boot();b.timeout();assert.equal(b.retry.hidden,false);assert.match(b.status.textContent,/could not finish opening/);b.retry.click();assert.equal(b.reloaded(),true);});

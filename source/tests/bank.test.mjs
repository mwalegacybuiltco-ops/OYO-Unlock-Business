import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {cleanBankItem,freeBankSlot,conversationItem} from '../src/game/bank.js';
import {exportBank} from '../src/bank-export.js';
test('bank validation bounds screenshots and rejects empty or oversized notes',()=>{
  assert.equal(cleanBankItem({kind:'screenshot',title:'Proof',image:new Uint8Array(180000),mime:'image/jpeg'}).image.length,180000);
  assert.throws(()=>cleanBankItem({kind:'screenshot',title:'Proof',image:new Uint8Array(180001),mime:'image/jpeg'}));
  assert.throws(()=>cleanBankItem({kind:'screenshot',title:'Proof',image:new Uint8Array(1),mime:'image/svg+xml'}));
  assert.throws(()=>cleanBankItem({kind:'note',title:'Note',text:''}));
  assert.throws(()=>cleanBankItem({kind:'note',title:'Note',text:'x'.repeat(12001)}));
});
test('full banks reject additions and a cleared slot becomes reusable',()=>{
  const images=Array.from({length:12},(_,i)=>({id:'image-'+i}));assert.throws(()=>freeBankSlot(images,'screenshot'),/full/);images.splice(5,1);assert.equal(freeBankSlot(images,'screenshot'),'image-5');
  assert.throws(()=>freeBankSlot(Array.from({length:24},(_,i)=>({id:'note-'+i})),'template'),/full/);
});
test('conversation keeps exact text and roles as a private journal item',()=>{const item=conversationItem({name:'Veyra'},[{role:'user',text:'My idea'},{role:'guide',text:'Try one step'}]);assert.equal(item.text,'You: My idea\n\nVeyra: Try one step');assert.equal(item.kind,'conversation');assert.throws(()=>conversationItem({name:'Veyra'},[]));});
test('portable ZIP contains notes, images, captions and a dated manifest without mutating originals',async()=>{
  const items=[{id:'note-0',kind:'note',title:'Résumé',text:'Keep this ✨',savedAt:1},{id:'image-0',kind:'screenshot',title:'Screenshot',text:'Caption',image:new Uint8Array([255,216,255,217]),savedAt:2}];
  const before=structuredClone(items),blob=exportBank(items,new Date('2026-09-18T00:00:00Z')),bytes=new Uint8Array(await blob.arrayBuffer()),view=new DataView(bytes.buffer);
  assert.equal(blob.type,'application/zip');assert.equal(view.getUint32(0,true),0x04034b50);assert.equal(view.getUint32(bytes.length-22,true),0x06054b50);assert.equal(view.getUint16(bytes.length-12,true),5);
  const text=new TextDecoder().decode(bytes);for(const value of ['inventory.json','journal/note-0.txt','screenshots/image-0.jpg','screenshots/image-0-caption.txt','Keep this ✨'])assert.ok(text.includes(value));assert.deepEqual(items,before);assert.throws(()=>exportBank([]),/empty/);
});
const source=(await readFile(new URL('../src/firebase.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'').replaceAll('export ','').replaceAll('import.meta.env','({})');
function storageHarness(used=0){
  const records=new Map([['sparkBankCapacity/global',{used}]]),writes=[];
  const snapshot=path=>({exists:()=>records.has(path),data:()=>records.get(path)});
  const context={cleanBankItem,freeBankSlot,Uint8Array,requireThat:(ok,msg)=>{if(!ok)throw Error(msg);},doc:(_db,...p)=>p.join('/'),collection:(_db,...p)=>p.join('/'),getDocs:async path=>({docs:[...records].filter(([key])=>key.startsWith(path+'/')).map(([key,data])=>({id:key.split('/').at(-1),data:()=>data}))}),serverTimestamp:()=>({toMillis:()=>123}),Bytes:{fromUint8Array:v=>v},runTransaction:async(_db,fn)=>{const pending=[];await fn({get:async path=>snapshot(path),set:(path,value)=>pending.push(['set',path,value]),delete:path=>pending.push(['delete',path])});for(const [op,path,value] of pending){writes.push(path);if(op==='delete')records.delete(path);else records.set(path,value);}}};
  vm.createContext(context);vm.runInContext(source+"\nauth={currentUser:{uid:'alice'}};db={};",context);
  return {records,writes,save:fields=>context.saveBankItem(fields),remove:(id,expectedSavedAt)=>context.deleteBankItem({id,expectedSavedAt})};
}
test('shared storage full rejects a save without changing records',async()=>{const h=storageHarness(400);await assert.rejects(h.save({kind:'note',title:'Idea',text:'My text'}),/storage is full/);assert.equal(h.writes.length,0);});
test('offload deletion frees one shared slot and preserves unrelated progress',async()=>{const h=storageHarness();h.records.set('sparkPlayers/alice/missions/m1',{status:'verified'});await h.save({kind:'note',title:'Idea',text:'My text'});assert.equal(h.records.get('sparkBankCapacity/global').used,1);await h.remove('note-0',123);assert.equal(h.records.get('sparkBankCapacity/global').used,0);assert.equal(h.records.get('sparkPlayers/alice/missions/m1').status,'verified');await h.save({kind:'note',title:'Next',text:'New text'});assert.equal(h.records.get('sparkBankCapacity/global').used,1);});
test('offload will not remove an item changed since the downloaded backup',async()=>{const h=storageHarness();await h.save({kind:'note',title:'Idea',text:'My text'});await assert.rejects(h.remove('note-0',122),/changed/);assert.equal(h.records.get('sparkBankCapacity/global').used,1);assert.ok(h.records.has('sparkPlayers/alice/bank/note-0'));});

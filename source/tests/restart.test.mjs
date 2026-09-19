import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {restartPlan} from '../src/game/restart.js';
import {requireThat} from '../src/game/engine.js';
const source=(await readFile(new URL('../src/firebase.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'').replaceAll('export ','').replaceAll('import.meta.env','({})');
function harness(fail=false){
 const records=new Map([
  ['sparkPlayers/alice',{profile:{name:'Alice'},cosmetics:{title:'Reward'}}],
  ['sparkPlayers/alice/missions/m1',{status:'verified',proofId:'proof1'}],
  ['sparkPlayers/alice/missions/m2',{status:'pending',proofId:'proof2'}],
  ['sparkPlayers/alice/missions/m3',{status:'active'}],
  ['sparkPlayers/alice/bosses/foundation',{won:true}],
  ['sparkPlayers/alice/bank/note-0',{text:'Keep me'}],
  ['sparkPlayers/alice/guides/spark',{chats:['Keep conversation']}],
  ['sparkProofs/proof1',{uid:'alice',status:'verified'}],
  ['sparkProofs/proof2',{uid:'alice',status:'pending'}],
  ['sparkTesters/alice',{active:true}],['sparkPayPalMemberships/alice',{active:true}],
  ['sparkPlayers/bob/missions/m1',{status:'verified'}]
 ]);const reads=[],writes=[];
 const context={restartPlan,requireThat,doc:(_db,...p)=>p.join('/'),serverTimestamp:()=> 'TIME',runTransaction:async(_db,fn)=>{await fn({get:async ref=>{assert.equal(writes.length,0,'transaction must read before writing');reads.push(ref);return {exists:()=>records.has(ref),data:()=>records.get(ref)}},delete:ref=>writes.push(['delete',ref]),update:(ref,data)=>writes.push(['update',ref,data])});if(fail)throw Error('Connection failed');for(const [op,ref,data] of writes)if(op==='delete')records.delete(ref);else records.set(ref,{...records.get(ref),...data});}};
 vm.createContext(context);vm.runInContext(source+"\nauth={currentUser:{uid:'alice'}};db={};",context);
 return {records,reads,writes,restart:options=>context.restartProgress(options)};
}
test('restart requires explicit confirmation and rejects invalid targets',async()=>{for(const options of [{scope:'adventure'},{scope:'other',confirmed:true},{scope:'mission',missionId:'bad',confirmed:true}]){const h=harness();await assert.rejects(h.restart(options));assert.equal(h.reads.length,0);assert.equal(h.writes.length,0);}});
test('mission restart clears dependent progress and withdraws pending proof while retaining earlier achievements',async()=>{const h=harness();await h.restart({scope:'mission',missionId:'m2',confirmed:true});assert.ok(h.records.has('sparkPlayers/alice/missions/m1'));assert.ok(!h.records.has('sparkPlayers/alice/missions/m2'));assert.ok(!h.records.has('sparkPlayers/alice/missions/m3'));assert.ok(!h.records.has('sparkPlayers/alice/bosses/foundation'));assert.equal(h.records.get('sparkProofs/proof2').status,'withdrawn');assert.equal(h.records.get('sparkProofs/proof1').status,'verified');assert.equal(h.reads.filter(p=>p.includes('/missions/')).length,17);});
test('whole restart preserves account, paid/tester access, bank, conversations and other players',async()=>{const h=harness();await h.restart({scope:'adventure',confirmed:true});assert.equal(h.records.get('sparkPlayers/alice').profile.name,'Alice');assert.equal(Object.keys(h.records.get('sparkPlayers/alice').cosmetics).length,0);for(const path of ['sparkPlayers/alice/bank/note-0','sparkPlayers/alice/guides/spark','sparkTesters/alice','sparkPayPalMemberships/alice','sparkPlayers/bob/missions/m1','sparkProofs/proof1'])assert.ok(h.records.has(path),path);assert.ok(!h.records.has('sparkPlayers/alice/missions/m1'));assert.equal(h.reads.filter(p=>p.includes('/missions/')).length,18);assert.equal(h.reads.filter(p=>p.includes('/bosses/')).length,9);});
test('failed transaction leaves the original adventure and pending proof intact',async()=>{const h=harness(true);await assert.rejects(h.restart({scope:'adventure',confirmed:true}),/Connection failed/);assert.ok(h.records.has('sparkPlayers/alice/missions/m1'));assert.equal(h.records.get('sparkProofs/proof2').status,'pending');});

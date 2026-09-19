import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {activeTester,cleanTester,activeMembership,paidMembership,billingApiURL} from '../src/game/spark.js';
test('tester access supports indefinite and future grants but not exact expiry',()=>{
 assert.equal(activeTester({active:true,expiresAt:0},100),true);
 assert.equal(activeTester({active:true,expiresAt:101},100),true);
 for(const t of [null,{active:false,expiresAt:0},{active:true,expiresAt:100},{active:true,expiresAt:99},{active:true,expiresAt:'200'},{active:true,expiresAt:NaN}])assert.equal(activeTester(t,100),false);
});
test('tester grant validation rejects invalid dates and permits revocation',()=>{
 assert.deepEqual(cleanTester({active:true,expiresAt:0,note:'Test'},100),{active:true,expiresAt:0,note:'Test'});
 for(const expiresAt of [-1,100,99,Infinity,101.5])assert.throws(()=>cleanTester({active:true,expiresAt},100));
 assert.throws(()=>cleanTester({active:'true',expiresAt:0},100));
 assert.deepEqual(cleanTester({active:false,expiresAt:0},100),{active:false,expiresAt:0,note:''});
});
const source=(await readFile(new URL('../src/firebase.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'').replaceAll('export ','').replaceAll('import.meta.env','({})');
function harness(owner='owner',exists=true,matches=['alice']){
 const writes=[],membership={active:true,expiresAt:Date.now()+86400000},progress={xp:400};
 const context={activeTester,activeMembership,cleanTester,paidMembership,billingApiURL,requireThat:(ok,msg)=>{if(!ok)throw Error(msg)},doc:(_db,...path)=>path.join('/'),getDoc:async path=>({exists:()=>path==='sparkConfig/owner'||exists,data:()=>path==='sparkConfig/owner'?{uid:owner}:{progress}}),setDoc:async(path,value)=>writes.push({path,value}),serverTimestamp:()=> 'server-time'};
 Object.assign(context,{collection:(_db,...p)=>p.join('/'),where:(...p)=>p,limit:n=>n,query:(...p)=>p,getDocs:async q=>{assert.equal(q[0],'sparkPlayers');assert.deepEqual(q[1],['email','==','alice@example.test']);return {docs:matches.map(id=>({id}))}}});
 vm.createContext(context);vm.runInContext(source+"\nauth={currentUser:{uid:'owner'}};db={};",context);
 return {writes,membership,progress,save:d=>context.saveTester(d),access:(tester,member=membership)=>{context.input={tester,membership:member,billing:{requireMembership:true},isOwner:false};return vm.runInContext('cached=input;access(1)',context)}};
}
test('real tester save operation only writes the separate tester record',async()=>{
 const h=harness();await h.save({uid:'alice',active:true,expiresAt:0,note:'Trial'});await h.save({uid:'alice',active:false,expiresAt:0});
 assert.deepEqual(h.writes.map(w=>w.path),['sparkTesters/alice','sparkTesters/alice']);assert.equal(h.writes[1].value.active,false);assert.equal(h.membership.active,true);assert.equal(h.progress.xp,400);
 h.access({active:false,expiresAt:0});assert.throws(()=>h.access({active:false,expiresAt:0},null),/confirmation/);h.access({active:true,expiresAt:0},null);
});
test('owner can grant by email; missing or ambiguous accounts do not create grants',async()=>{
 const h=harness();await h.save({uid:' ALICE@example.test ',active:true,expiresAt:0});assert.equal(h.writes[0].path,'sparkTesters/alice');
 for(const matches of [[],['alice','bob']]){const h=harness('owner',true,matches);await assert.rejects(h.save({uid:'alice@example.test',active:true,expiresAt:0}));assert.equal(h.writes.length,0);}
 await assert.rejects(harness('not-owner').save({uid:'alice@example.test',active:true,expiresAt:0}),/Owner access/);
});
test('tester save operation rejects nonowner, missing player and invalid ID before writing',async()=>{
 for(const [h,d] of [[harness('someone-else'),{uid:'alice',active:true,expiresAt:0}],[harness('owner',false),{uid:'alice',active:true,expiresAt:0}],[harness(),{uid:'alice/other',active:true,expiresAt:0}]]){await assert.rejects(h.save(d));assert.equal(h.writes.length,0);}
});

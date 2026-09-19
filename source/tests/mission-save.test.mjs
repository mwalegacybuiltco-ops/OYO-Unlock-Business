import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {freshGame,applyAction,missionState,requireThat} from '../src/game/engine.js';
import {missions,worlds} from '../src/game/content.js';
const source=(await readFile(new URL('../src/firebase.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'').replaceAll('export ','').replaceAll('import.meta.env','({})');
const rules=await readFile(new URL('../firestore.rules',import.meta.url),'utf8');
function missingMissionHarness(step=1){
 const game=freshGame();game.missions.m1={step,status:'active',draft:'stale draft'};
 let saved;const writes=[];
 const context={structuredClone,missions,applyAction,missionState,requireThat,doc:(_db,...p)=>p.join('/'),serverTimestamp:()=> 'SERVER_TIME',runTransaction:async(_db,fn)=>fn({get:async()=>({exists:()=>!!saved,data:()=>saved}),set:(_ref,value)=>{if(!saved)assert.equal(value.step,1,'new mission must start at step 1');else assert.equal(value.step,saved.step+1);writes.push(value);saved=value;}})};
 vm.createContext(context);context.input=game;vm.runInContext(source+"\nauth={currentUser:{uid:'alice'}};db={};cached={game:input,isOwner:true};",context);
 return {writes,action:a=>context.gameAction({type:'step',missionId:'m1',...a})};
}
test('stale Practice screen with no cloud mission creates the required initial record before saving the answer',async()=>{const h=missingMissionHarness();await h.action({expectedStep:1,answer:missions[0].correct});assert.deepEqual(h.writes.map(w=>w.step),[1,2]);assert.equal(h.writes[0].practiceAnswer,-1);assert.equal(h.writes[1].practiceAnswer,1);assert.equal(h.writes[1].draft,'');});
test('wrong answers and stale later stages do not create or restore cloud progress',async()=>{const wrong=missingMissionHarness();await assert.rejects(wrong.action({expectedStep:1,answer:0}),/Not quite/);assert.equal(wrong.writes.length,0);const later=missingMissionHarness(2);await assert.rejects(later.action({expectedStep:2,draft:'A'.repeat(80)}),/no saved starting stage/);assert.equal(later.writes.length,0);});
test('all quiz answers match the packaged security rules and real save payloads advance one stage',async()=>{
 const answers=JSON.parse(rules.match(/function mission\(id\)\{return (.*)\[id\];\}/)[1]);
 for(const m of missions){
  assert.equal(answers[m.id].correct,m.correct,m.id);
  const game=freshGame();for(const w of worlds)game.bosses[w.id]={won:true};for(const other of missions)game.missions[other.id]={step:6,status:'verified'};delete game.missions[m.id];
  let saved;const context={structuredClone,missions,applyAction,missionState,requireThat,doc:(_db,...p)=>p.join('/'),serverTimestamp:()=> 'SERVER_TIME',runTransaction:async(_db,fn)=>fn({get:async()=>({exists:()=>!!saved,data:()=>saved}),set:(_ref,value)=>{saved=value}})};
  vm.createContext(context);context.input=game;vm.runInContext(source+"\nauth={currentUser:{uid:'alice'}};db={};cached={game:input,isOwner:true};",context);
  await context.gameAction({type:'step',missionId:m.id,expectedStep:0});assert.equal(saved.step,1);assert.equal(saved.practiceAnswer,-1);
  await assert.rejects(context.gameAction({type:'step',missionId:m.id,expectedStep:1,answer:(m.correct+1)%3}));assert.equal(saved.step,1);
  await context.gameAction({type:'step',missionId:m.id,expectedStep:1,answer:m.correct});assert.equal(saved.step,2);assert.equal(saved.practiceAnswer,answers[m.id].correct);assert.equal(saved.status,'active');assert.equal(saved.proofId,'');assert.equal(saved.feedback,'');assert.equal(saved.draft,'');
  await context.gameAction({type:'step',missionId:m.id,expectedStep:2,draft:'Specific business asset and planned test. '.repeat(3)});assert.equal(saved.step,3);assert.equal(saved.practiceAnswer,m.correct);
  await context.gameAction({type:'step',missionId:m.id,expectedStep:3,confirmed:true});assert.equal(saved.step,4);assert.equal(saved.practiceAnswer,m.correct);
 }
});

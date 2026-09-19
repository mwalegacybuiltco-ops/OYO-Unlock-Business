import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {freshGame,applyAction,missionState,requireThat} from '../src/game/engine.js';
import {missions,worlds} from '../src/game/content.js';
const source=(await readFile(new URL('../src/firebase.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'').replaceAll('export ','').replaceAll('import.meta.env','({})');
const rules=await readFile(new URL('../firestore.rules',import.meta.url),'utf8');
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

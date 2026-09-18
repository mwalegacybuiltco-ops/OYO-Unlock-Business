import test from 'node:test';import assert from 'node:assert/strict';
import {freshGame} from '../src/game/engine.js';
import {equipReward,rewardCatalogue,rewardEarned} from '../src/game/rewards.js';
test('locked rewards cannot be equipped or forged',()=>{const g=freshGame();for(const r of rewardCatalogue){assert.equal(rewardEarned(g,r),false);assert.throws(()=>equipReward(g,r.id),/Earn/);}assert.throws(()=>equipReward(g,'admin'));});
test('proof rewards equip without XP inflation or mutating the save',()=>{const g=freshGame();g.missions.m1={status:'verified'};const next=equipReward(g,'first-light');assert.equal(next.cosmetics.title,'First Light');assert.equal(next.xp,g.xp);assert.equal(g.cosmetics,undefined);assert.deepEqual(equipReward(next,'first-light').cosmetics,next.cosmetics);});
test('world rewards use victories rather than attempts or paid membership',()=>{const g=freshGame();g.entitlement=true;g.bosses.a={won:false,attempts:100};assert.throws(()=>equipReward(g,'golden-hour'));for(const id of ['a','b','c'])g.bosses[id]={won:true};assert.equal(equipReward(g,'golden-hour').cosmetics.aura,'gold');assert.throws(()=>equipReward(g,'worldmaker'));});

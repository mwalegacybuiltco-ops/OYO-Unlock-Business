import {requireThat} from './engine.js';
export const rewardCatalogue=[
 {id:'first-light',name:'First Light',slot:'title',value:'First Light',icon:'Star',proofs:1,description:'Your first real action, backed by evidence.',requirement:'Verify your first mission'},
 {id:'trailblazer',name:'Trailblazer',slot:'title',value:'Trailblazer',icon:'Compass',bosses:1,description:'A new world opens because you made your move.',requirement:'Defeat your first world boss'},
 {id:'golden-hour',name:'Golden Hour',slot:'aura',value:'gold',icon:'Flame',bosses:3,description:'Wrap your character and world in a warm golden glow.',requirement:'Conquer three worlds'},
 {id:'violet-flame',name:'Violet Flame',slot:'aura',value:'violet',icon:'Zap',proofs:1,description:'The original violet spark, earned through action.',requirement:'Verify your first mission'},
 {id:'pathfinder',name:'Pathfinder',slot:'title',value:'Pathfinder',icon:'Gem',bosses:6,description:'Six worlds. A growing collection of real skills.',requirement:'Conquer six worlds'},
 {id:'worldmaker',name:'Worldmaker',slot:'title',value:'Worldmaker',icon:'Crown',bosses:9,description:'The first journey is complete. Your possibilities keep growing.',requirement:'Conquer all nine worlds'}
];
export function rewardEarned(game,reward){return reward.proofs?Object.values(game.missions).filter(m=>m.status==='verified').length>=reward.proofs:Object.values(game.bosses).filter(b=>b.won).length>=reward.bosses;}
export function equipReward(original,id){const r=rewardCatalogue.find(r=>r.id===id);requireThat(r&&rewardEarned(original,r),'Earn this reward before equipping it.');const game=structuredClone(original);game.cosmetics={...game.cosmetics,[r.slot]:r.value};game.updatedAt=Date.now();return game;}

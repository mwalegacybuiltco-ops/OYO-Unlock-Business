import {missions,worlds,guides,optionNames,bossPrompts} from './content.js';
export const freshGame=()=>({version:1,profile:{name:'Adventurer',path:'Service',avatar:'Compass',business:''},xp:0,skills:{},options:[],achievements:[],missions:{},bosses:{},guideXp:{},chats:{},updatedAt:0});
export const level=g=>1+Math.floor(g.xp/500);
export const guideLevel=(g,id)=>1+Math.floor((g.guideXp[id]||0)/300);
export const missionState=(g,id)=>g.missions[id]||{step:0,status:'active',draft:''};
export const worldOpen=(g,w)=>w===0||!!g.bosses[worlds[w-1].id]?.won;
export const missionOpen=(g,id)=>{const m=missions.find(m=>m.id===id);return !!m&&worldOpen(g,m.world)&&(Number(id.slice(1))%2===1||missionState(g,`m${Number(id.slice(1))-1}`).status==='verified');};
export const bossReady=(g,w)=>worldOpen(g,w)&&missions.filter(m=>m.world===w).every(m=>missionState(g,m.id).status==='verified');
export function requireThat(ok,message){if(!ok)throw new Error(message);}
export function safeText(v,min=0,max=6000){requireThat(typeof v==='string'&&v.trim().length>=min&&v.length<=max,`Please enter ${min}–${max} characters.`);return v.trim();}
export function safeURL(v){if(!v)return '';const u=new URL(v);requireThat(u.protocol==='https:','Use an HTTPS link.');return u.href;}
export function checkProof(p,m){safeText(p.summary,60,6000);requireThat(Array.isArray(p.evidence)&&p.evidence.length===m.criteria.length,'Address every proof criterion.');p.evidence.forEach(x=>safeText(x,20,2000));if(p.url)safeURL(p.url);return true;}
function reward(g,m){g.xp+=m.xp;g.skills[worlds[m.world].skill]=(g.skills[worlds[m.world].skill]||0)+1;const id=worlds[m.world].guide;g.guideXp[id]=(g.guideXp[id]||0)+m.xp;if(!g.achievements.includes('First proof'))g.achievements.push('First proof');if(Object.values(g.missions).filter(m=>m.status==='verified').length===9)g.achievements.push('Halfway hero');}
export function applyAction(original,action,now=Date.now()){
 const g=structuredClone(original);const {type}=action;
 if(type==='profile'){
  const p=action.profile;requireThat(['Compass','Feather','Gem','Flame','Shield','Crown'].includes(p.avatar),'Choose an avatar.');requireThat(['Creator','Affiliate','Service','Digital products','Coach','Local business'].includes(p.path),'Choose a path.');g.profile={name:safeText(p.name,1,32),avatar:p.avatar,path:p.path,business:safeText(p.business,0,500)};
 }else if(type==='step'){
  const m=missions.find(x=>x.id===action.missionId);requireThat(m&&missionOpen(g,m.id),'This mission is locked.');const s=missionState(g,m.id);requireThat(s.status==='active'&&s.step<4,'This stage is already complete.');requireThat(action.expectedStep===s.step,'Progress changed. Please try again.');
  if(s.step===1)requireThat(action.answer===m.correct,'Not quite. Revisit the lesson and try again.');
  if(s.step===2)s.draft=safeText(action.draft,60,6000);
  if(s.step===3)requireThat(action.confirmed===true,'Complete the real-world action first.');
  s.step++;g.missions[m.id]=s;
 }else if(type==='submit'){
  const m=missions.find(x=>x.id===action.missionId);requireThat(m&&missionOpen(g,m.id),'This mission is locked.');const s=missionState(g,m.id);requireThat(s.step===4&&s.status==='active','Finish the mission stages before submitting.');checkProof(action.proof,m);s.step=5;s.status='pending';s.proofId=safeText(action.proofId,1,100);g.missions[m.id]=s;
 }else if(type==='review'){
  // This action is trusted: only call from an authorised server reviewer or explicit local simulation.
  const m=missions.find(x=>x.id===action.missionId);requireThat(m,'Unknown mission.');const s=missionState(g,m.id);requireThat(s.status==='pending'&&s.proofId===action.proofId,'This proof has already been reviewed or replaced.');requireThat(typeof action.approved==='boolean','Choose an outcome.');s.feedback=safeText(action.feedback,10,2000);
  if(action.approved){s.status='verified';s.step=6;g.missions[m.id]=s;reward(g,m);}else{s.status='active';s.step=4;g.missions[m.id]=s;}
 }else if(type==='boss'){
  const w=worlds.find(x=>x.id===action.worldId);requireThat(w&&bossReady(g,w.index),'Verify both missions before entering this battle.');const b=g.bosses[w.id]||{round:0,attempts:0,won:false,history:[]};requireThat(!b.won,'This boss is already defeated.');safeText(action.answer,40,3000);requireThat(action.expectedRound===b.round,'Battle changed. Try again.');requireThat(typeof action.passed==='boolean','A server battle assessment is required.');if(action.nextObjection)b.nextObjection=safeText(action.nextObjection,1,1200);b.attempts++;b.history.push({answer:action.answer,feedback:safeText(action.feedback,1,2000)});b.history=b.history.slice(-12);if(action.passed)b.round++;
  if(b.round===3){b.won=true;g.xp+=300+w.index*50;g.options.push(optionNames[w.index]);g.achievements.push(`${w.name} explorer`);g.guideXp[w.guide]=(g.guideXp[w.guide]||0)+300;}
  g.bosses[w.id]=b;
 }else throw new Error('Unknown game action.');
 g.updatedAt=now;return g;
}
export function trainingBoss(g,w,answer){safeText(answer,40,3000);const round=g.bosses[w.id]?.round||0;const parts=answer.trim().split(/\n+/).filter(x=>x.trim().length>=12);const passed=parts.length>=3&&answer.trim().length>=90+round*30;
 return {passed,feedback:passed?'Practice rubric met: three developed points. Carry this thinking into your next real action.':'Develop three separate lines: your understanding, your action, and how you will check it. Each needs detail. This is a structure check, not AI verification.'};}
export function bossChallenge(g,w){const round=g.bosses[w.id]?.round||0;return `${g.bosses[w.id]?.nextObjection||bossPrompts[w.index]} ${['Give three developed points: understanding, action, and a check.','Constraint added: you have only two hours this week. Adapt your three points.','Final round: your first attempt did not work. Explain a respectful adjustment and how you will test it.'][Math.min(round,2)]}`;}
export function trainingGuide(g,id,message){const guide=guides.find(x=>x.id===id);requireThat(guide,'Unknown guide.');safeText(message,3,2000);const lvl=guideLevel(g,id);const active=missions.find(m=>missionOpen(g,m.id)&&missionState(g,m.id).status!=='verified');return {text:`${guide.name} · practice guidance · level ${lvl}\n${active?`Your next field task: ${active.irl}`:g.options.length===9?'You have built a complete first journey. Choose one experiment to repeat.':'Your world missions are verified. Face the next available boss to open another world.'}\n${lvl<3?'Start with one specific person, one useful action, and one observation. Write a first draft; it can improve after feedback.':lvl<6?'Compare two possible actions. Choose the smaller test and define what evidence would change your mind.':'Review the evidence from your completed missions. Identify a bottleneck, state an alternative explanation, and design a bounded experiment.'}\nThis is a built-in practice response. Adaptive questions are available through your online account.`,mode:'practice'};}

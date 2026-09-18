import {freshGame,requireThat,safeText} from './engine.js';
import {missions,worlds,optionNames} from './content.js';
export const defaultBilling={requireMembership:true,paypalUrl:'',apiUrl:'',offerLabel:'OYO Adventure Pass'};
export function activeMembership(m,now=Date.now()){return m?.active===true&&Number.isFinite(m.expiresAt)&&m.expiresAt>now;}
export function paypalURL(value){if(!value)return '';const u=new URL(value);requireThat(u.protocol==='https:'&&['www.paypal.com','www.sandbox.paypal.com'].includes(u.hostname)&&!u.username&&!u.password,'Use your HTTPS PayPal subscription link.');return u.href;}
export function cleanMembership(data,now=Date.now()){const expiresAt=Number(data.expiresAt);requireThat(typeof data.active==='boolean','Choose access status.');requireThat(Number.isFinite(expiresAt)&&expiresAt>=0&&(!data.active||expiresAt>now),'Active access needs a future paid-through date.');requireThat(!data.active||data.confirmed===true,'Check the actual payment in your PayPal account first.');return {active:data.active,expiresAt,reference:safeText(data.reference||'',data.active?3:0,200),note:safeText(data.note||'',0,500)};}
// XP, levels and unlocks are derived from rule-protected mission/boss records, never a writable XP field.
export function assembleGame(profile,missionRecords={},bossRecords={},guideRecords={}){
 const g=freshGame();g.profile=profile||g.profile;g.missions=missionRecords;g.bosses=bossRecords;let verified=0;
 for(const m of missions)if(missionRecords[m.id]?.status==='verified'){verified++;g.xp+=m.xp;const w=worlds[m.world];g.skills[w.skill]=(g.skills[w.skill]||0)+1;g.guideXp[w.guide]=(g.guideXp[w.guide]||0)+m.xp;}
 if(verified)g.achievements.push('First proof');if(verified>=9)g.achievements.push('Halfway hero');
 for(const w of worlds)if(bossRecords[w.id]?.won===true){g.xp+=300+w.index*50;g.options.push(optionNames[w.index]);g.achievements.push(`${w.name} explorer`);g.guideXp[w.guide]=(g.guideXp[w.guide]||0)+300;}
 g.coaching={};for(const [id,record] of Object.entries(guideRecords)){g.chats[id]=record.chats||[];g.coaching[id]=record.memory||{};}
 return g;
}

export function activeTester(t,now=Date.now()){return t?.active===true&&Number.isFinite(t.expiresAt)&&(t.expiresAt===0||t.expiresAt>now);}
export function cleanTester(d,now=Date.now()){const expiresAt=Number(d.expiresAt);requireThat(typeof d.active==='boolean','Choose tester access status.');requireThat(Number.isSafeInteger(expiresAt)&&expiresAt>=0&&(!d.active||expiresAt===0||expiresAt>now),'Choose a future tester expiry or leave it blank.');return {active:d.active,expiresAt,note:safeText(d.note||'',0,500)};}

export function billingApiURL(value){if(!value)return '';const u=new URL(value);requireThat(u.protocol==='https:'&&!u.username&&!u.password&&!u.search&&!u.hash,'Use your HTTPS payment server address, without a query or fragment.');return u.href.replace(/\/$/,'');}
export function paidMembership(manual,automatic,now=Date.now()){return [manual,automatic].filter(m=>activeMembership(m,now)).sort((a,b)=>b.expiresAt-a.expiresAt)[0]||null;}

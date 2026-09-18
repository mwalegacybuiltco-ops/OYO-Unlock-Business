import {freshGame,checkProof} from './game/engine.js';
import {missions} from './game/content.js';
import {activeMembership,activeTester} from './game/spark.js';
export const cloud=true;
let fb,initialized=false,user=null,onChange=()=>{};
const blank=()=>({game:freshGame(),proofs:[],user:null,isOwner:false,reviewer:false,resourceAdmin:false,moderator:false,entitlement:false,membership:null,tester:null,membershipRequired:true,checkoutReady:false,billing:null,resources:null,announcement:null,mode:'spark',ready:false,connectionError:''});
export let session=blank();
async function refresh(){const current=user;if(!current)return;const result=await fb.call('getPlayer',{});if(user!==current)return;session={...session,...result,user:{uid:current.uid,email:current.email},reviewer:result.isOwner,resourceAdmin:result.isOwner,moderator:result.isOwner,ready:true,connectionError:''};onChange(session);}
export async function initBackend(listener){onChange=listener;try{fb=await import('./firebase.js');await fb.initFirebase();initialized=true;fb.watchAuth(async u=>{user=u;session={...blank(),user:u?{uid:u.uid,email:u.email}:null,ready:!u};onChange(session);if(u)try{await refresh();}catch(e){if(user===u){session={...session,ready:true,connectionError:e.message};onChange(session);}}});}catch(e){session={...session,ready:true,connectionError:e.message};onChange(session);}
 // Expire the visible access badge without repeatedly reading the database.
 setInterval(()=>{if(session.entitlement&&!activeMembership(session.membership)&&!activeTester(session.tester)){session={...session,entitlement:false};onChange(session);}},30000);
}
const signed=()=>{if(!navigator.onLine)throw Error('Reconnect to save your move or use community.');if(!user)throw Error('Open Character & settings and sign in first.');};
async function execute(name,a={}){signed();const result=await fb.call(name,a);await refresh();return result;}
export async function auth(kind,email,password){if(!navigator.onLine)throw Error('Connect to set up or recover your account.');if(!initialized)throw Error('Firebase settings are missing.');if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email||''))throw Error('Enter your account email.');return fb.authenticate(kind,email,password);}
export const signOut=()=>fb.logout();
export const action=a=>execute('gameAction',a);
export async function submitProof(missionId,proof,file){signed();if(file)throw Error('Use written evidence and an HTTPS link. This version does not upload files.');checkProof(proof,missions.find(m=>m.id===missionId));return execute('submitProof',{missionId,proofId:crypto.randomUUID(),proof});}
export const chat=(guideId,message,reset=false)=>execute('askGuide',{guideId,message,reset});
export const fight=(worldId,answer,choice,check,scenarioId)=>execute('battle',{worldId,answer,choice,check,scenarioId,expectedRound:session.game.bosses[worldId]?.round||0});
export async function checkout(){signed();const {url}=await fb.call('createCheckout',{});const target=new URL(url);if(target.protocol!=='https:'||!['www.paypal.com','www.sandbox.paypal.com'].includes(target.hostname))throw Error('Invalid PayPal address.');location.assign(target.href);}
export const reviewQueue=()=>{signed();return fb.call('reviewQueue',{});};
export const reviewProof=d=>execute('reviewProof',d);
export const exportSave=()=>new Blob([JSON.stringify({exportedAt:new Date().toISOString(),game:session.game,proofs:session.proofs},null,2)],{type:'application/json'});
export const refreshPlayer=async()=>{signed();let failure;try{await fb.call('refreshPayment',{});}catch(e){failure=e;}await refresh();if(failure)throw failure;};
export const getAdminOverview=()=>{signed();return fb.call('getAdminOverview',{});};
export const saveAnnouncement=d=>execute('saveAnnouncement',d);
export const watchGamerChat=(next,error)=>{signed();return fb.watchGamerChat(next,error);};
export const sendChat=(text,messageId)=>{signed();return fb.call('sendChat',{text,messageId});};
export const reportChat=(messageId,reason)=>{signed();return fb.call('reportChat',{messageId,reason});};
export const moderateChat=(messageId,mute=false)=>{signed();return fb.call('moderateChat',{messageId,mute});};
export const getChatReports=()=>{signed();return fb.call('getChatReports',{});};
export const resolveChatReport=id=>{signed();return fb.call('resolveChatReport',{id});};
export const requestMembership=d=>execute('requestMembership',d);
export const saveMembership=d=>execute('saveMembership',d);
export const saveBilling=d=>execute('saveBilling',d);
// Removed upload/self-review paths fail explicitly if an old browser attempts to call them.
export const proofFile=async()=>{throw Error('This edition uses text and links, not file uploads.');};
export const simulateReview=async()=>{throw Error('Proof must be reviewed by the owner.');};
export const importSave=async()=>{throw Error('Cloud saves cannot be replaced with an unverified backup.');};
export const resetLocal=async()=>{throw Error('No device-only adventure is active.');};
export const switchMode=()=>{throw Error('This edition saves to Firebase Spark.');};

export const saveTester=d=>execute("saveTester",d);

export const loadBank=()=>{signed();return fb.call('loadBank',{});};
export const saveBankItem=d=>{signed();return fb.call('saveBankItem',d);};
export const deleteBankItem=(id,expectedSavedAt)=>{signed();return fb.call('deleteBankItem',{id,expectedSavedAt});};

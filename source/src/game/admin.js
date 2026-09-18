import {requireThat,safeText} from './engine.js';
export const isOwner=(uid,claims,configuredUid)=>!!uid&&claims?.owner===true&&uid===configuredUid;
export function cleanAnnouncement(data){return {title:safeText(data.title||'',0,100),body:safeText(data.body||'',0,1500),enabled:data.enabled===true};}

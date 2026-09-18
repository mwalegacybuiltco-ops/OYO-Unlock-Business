import {requireThat,safeText} from './engine.js';
export const bankLimits={screenshots:12,notes:24,imageBytes:180000,text:12000};
export function cleanBankItem(d){
  requireThat(['screenshot','template','conversation','note'].includes(d.kind),'Choose an inventory item type.');
  const result={kind:d.kind,title:safeText(d.title,1,80),text:safeText(d.text||'',0,bankLimits.text)};
  if(d.kind==='screenshot'){
    requireThat(d.image instanceof Uint8Array&&d.image.byteLength>0&&d.image.byteLength<=bankLimits.imageBytes,'Screenshot must be compressed to 180 KB or less.');
    requireThat(d.mime==='image/jpeg','Save a compressed JPEG screenshot.');
    result.image=d.image;result.mime=d.mime;
  }else requireThat(result.text.length>0,'Add something to keep.');
  return result;
}
export function freeBankSlot(items,kind){
  const prefix=kind==='screenshot'?'image-':'note-',count=kind==='screenshot'?bankLimits.screenshots:bankLimits.notes;
  for(let i=0;i<count;i++)if(!items.some(x=>x.id===prefix+i))return prefix+i;
  throw Error(kind==='screenshot'?'Your screenshot slots are full. Download and remove an item to make room.':'Your journal slots are full. Download and remove an item to make room.');
}
export function conversationItem(guide,chats){
  requireThat(chats?.length,'Have a conversation with this Guide first.');
  const text=chats.map(c=>(c.role==='user'?'You':guide.name)+': '+c.text).join('\n\n');
  requireThat(text.length<=bankLimits.text,'This conversation is too long for one journal item. Save a shorter excerpt in the Proof Bank.');
  return cleanBankItem({kind:'conversation',title:'Conversation with '+guide.name,text});
}

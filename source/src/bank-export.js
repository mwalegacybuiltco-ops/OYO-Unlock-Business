// Dependency-free, uncompressed ZIP. Keeps screenshots and UTF-8 notes portable offline.
const encoder=new TextEncoder();
function crc32(bytes){let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
function header(size){const bytes=new Uint8Array(size);return {bytes,view:new DataView(bytes.buffer)};}
export function zipFiles(files){
  const chunks=[],directory=[];let offset=0;
  for(const file of files){
    const name=encoder.encode(file.name),data=typeof file.data==='string'?encoder.encode(file.data):file.data,crc=crc32(data),local=header(30);
    local.view.setUint32(0,0x04034b50,true);local.view.setUint16(4,20,true);local.view.setUint16(6,0x800,true);local.view.setUint16(12,33,true);local.view.setUint32(14,crc,true);local.view.setUint32(18,data.length,true);local.view.setUint32(22,data.length,true);local.view.setUint16(26,name.length,true);
    chunks.push(local.bytes,name,data);
    const central=header(46);central.view.setUint32(0,0x02014b50,true);central.view.setUint16(4,20,true);central.view.setUint16(6,20,true);central.view.setUint16(8,0x800,true);central.view.setUint16(14,33,true);central.view.setUint32(16,crc,true);central.view.setUint32(20,data.length,true);central.view.setUint32(24,data.length,true);central.view.setUint16(28,name.length,true);central.view.setUint32(42,offset,true);directory.push(central.bytes,name);
    offset+=30+name.length+data.length;
  }
  const directorySize=directory.reduce((sum,b)=>sum+b.length,0),end=header(22);end.view.setUint32(0,0x06054b50,true);end.view.setUint16(8,files.length,true);end.view.setUint16(10,files.length,true);end.view.setUint32(12,directorySize,true);end.view.setUint32(16,offset,true);
  return new Blob([...chunks,...directory,end.bytes],{type:'application/zip'});
}
export function exportBank(items,now=new Date()){
  if(!items.length)throw Error('Your Proof Bank is already empty.');
  const manifest={exportedAt:now.toISOString(),items:items.map(({image,...item})=>({...item,savedAt:item.savedAt?.toMillis?.()??item.savedAt}))};
  const files=[{name:'READ-ME.txt',data:'OYO: UNLOCKED — Proof Bank backup\n\nScreenshots are in screenshots/. Notes, templates and conversations are in journal/. Screenshot captions are beside their images. inventory.json records the saved item names and dates.\n\nOpen this ZIP in your phone Files/Downloads app and check your items before confirming removal in the game. This backup does not include submitted evidence or mission progress; those stay in your account.\n'},{name:'inventory.json',data:JSON.stringify(manifest,null,2)}];
  for(const item of items){const text=item.title+'\n\n'+(item.text||'');if(item.kind==='screenshot'){files.push({name:'screenshots/'+item.id+'.jpg',data:item.image},{name:'screenshots/'+item.id+'-caption.txt',data:text});}else files.push({name:'journal/'+item.id+'.txt',data:text});}
  return zipFiles(files);
}

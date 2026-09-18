import {readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
async function walk(dir){const entries=await readdir(dir,{withFileTypes:true});return (await Promise.all(entries.map(e=>e.isDirectory()?walk(`${dir}/${e.name}`):`${dir}/${e.name}`))).flat();}
const files=(await walk('dist')).filter(f=>!f.endsWith('/sw.js'));const hash=createHash('sha256');for(const f of files)hash.update(await readFile(f));const version=hash.digest('hex').slice(0,12);
const urls=['./',...files.map(f=>'./'+f.slice(5))];
await writeFile('dist/sw.js',`const PREFIX='oyo-shell-'+new URL(self.registration.scope).pathname+'-';const CACHE=PREFIX+'${version}';const SHELL=${JSON.stringify(urls)}.map(path=>new URL(path,self.registration.scope).href);
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const request=event.request,url=new URL(request.url);if(request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;
if(request.mode==='navigate'){event.respondWith(fetch(request).catch(()=>caches.match(new URL('./index.html',self.registration.scope).href)));return;}
if(SHELL.includes(url.href))event.respondWith(caches.match(url.href).then(cached=>cached||fetch(request)));
});`);
console.log('Offline shell generated:',version,urls.length,'public assets');

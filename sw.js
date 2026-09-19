const PREFIX='oyo-shell-'+new URL(self.registration.scope).pathname+'-';const CACHE=PREFIX+'ec1b36e8bc9f';const SHELL=["./","./icon-192.png","./icon-512.png","./icon.svg","./index.html","./manifest.webmanifest","./reach-characters.png","./unwritten-reach.png"].map(path=>new URL(path,self.registration.scope).href);
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const request=event.request,url=new URL(request.url);if(request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;
if(request.mode==='navigate'){event.respondWith(fetch(request).catch(()=>caches.match(new URL('./index.html',self.registration.scope).href)));return;}
if(SHELL.includes(url.href))event.respondWith(caches.match(url.href).then(cached=>cached||fetch(request)));
});
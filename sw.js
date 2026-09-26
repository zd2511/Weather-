const CACHE="vaal-weather-max-v2";
const APP=["./","./index.html","./manifest.webmanifest","./icons/icon.svg"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(APP)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=="GET")return;
  if(u.origin===location.origin){
    e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(x=>x.put(e.request,copy));return r}).catch(()=>caches.match("./index.html"))));
  }
});
async function saveAlertConfig(cfg){
  const c=await caches.open(CACHE);
  await c.put("./__weather_alert_config__",new Response(JSON.stringify(cfg),{headers:{"content-type":"application/json"}}));
}
async function readAlertConfig(){
  const c=await caches.open(CACHE),r=await c.match("./__weather_alert_config__");
  return r?await r.json():null;
}
async function checkAlerts(){
  const cfg=await readAlertConfig(); if(!cfg?.key||cfg.lat==null||cfg.lon==null)return;
  try{
    const u=`https://api.openweathermap.org/data/3.0/onecall?lat=${cfg.lat}&lon=${cfg.lon}&appid=${cfg.key}&units=metric&exclude=minutely,hourly,daily`;
    const r=await fetch(u,{cache:"no-store"}); if(!r.ok)return;
    const d=await r.json();
    for(const a of (d.alerts||[]).slice(0,4)){
      const key=`${a.event||""}|${a.start||""}|${a.end||""}`;
      const c=await caches.open(CACHE), seen=await c.match("./__weather_alert_seen__"), arr=seen?await seen.json():[];
      if(arr.includes(key))continue;
      arr=[...arr,key].slice(-30);
      await c.put("./__weather_alert_seen__",new Response(JSON.stringify(arr),{headers:{"content-type":"application/json"}}));
      await self.registration.showNotification(`Vaal Weather Max • ${a.event||"Weather alert"}`,{
        body:(a.description||"Severe weather alert for your selected location.").slice(0,220),
        tag:"weather-alert-"+key,
        icon:"./icons/icon.svg",
        renotify:true
      });
    }
  }catch(e){}
}
self.addEventListener("message",e=>{
  if(e.data?.type==="configureAlerts")e.waitUntil(saveAlertConfig(e.data));
  if(e.data?.type==="checkAlerts")e.waitUntil(checkAlerts());
});
self.addEventListener("periodicsync",e=>{
  if(e.tag==="weather-alert-check")e.waitUntil(checkAlerts());
});
self.addEventListener("notificationclick",e=>{e.notification.close();e.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(cs=>{for(const c of cs)if("focus"in c)return c.focus();return clients.openWindow("./")}))});

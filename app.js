const $ = id => document.getElementById(id);
const state = {lat:-26.2041, lon:28.0473, city:"Johannesburg", country:"South Africa", unit:"C", forecast:null, timezone:"Africa/Johannesburg"};
const WMO = {
  0:["Clear sky","☀"],1:["Mainly clear","🌤"],2:["Partly cloudy","⛅"],3:["Overcast","☁"],
  45:["Fog","🌫"],48:["Rime fog","🌫"],51:["Light drizzle","🌦"],53:["Drizzle","🌦"],55:["Dense drizzle","🌧"],
  56:["Freezing drizzle","🌧"],57:["Heavy freezing drizzle","🌧"],61:["Light rain","🌦"],63:["Rain","🌧"],65:["Heavy rain","🌧"],
  66:["Freezing rain","🌧"],67:["Heavy freezing rain","🌧"],71:["Light snow","🌨"],73:["Snow","🌨"],75:["Heavy snow","❄"],77:["Snow grains","🌨"],
  80:["Rain showers","🌦"],81:["Showers","🌧"],82:["Heavy showers","⛈"],85:["Snow showers","🌨"],86:["Heavy snow showers","❄"],
  95:["Thunderstorm","⛈"],96:["Thunderstorm & hail","⛈"],99:["Severe thunderstorm & hail","⛈"]
};
function weatherInfo(code){return WMO[code]||["Changeable","🌤"];}
function temp(v){return v==null?"--":Math.round(state.unit==="F"?v*9/5+32:v);}
function tempStr(v){return `${temp(v)}°`;}
function km(v){return v==null?"--":Math.round(v);}
function direction(deg){if(deg==null)return "--";return ["N","NE","E","SE","S","SW","W","NW"][Math.round(deg/45)%8];}
function hourLabel(iso){return new Date(iso).toLocaleTimeString("en-ZA",{hour:"numeric",hour12:true,timeZone:state.timezone}).replace(" ","").toLowerCase();}
function dateLabel(iso,opts){return new Date(iso).toLocaleDateString("en-ZA",{...opts,timeZone:state.timezone});}
function isDay(hourIndex=0){const h=new Date().getHours();return h>=6&&h<18;}
function notify(msg){const el=$("toast");el.textContent=msg;el.classList.add("show");clearTimeout(notify.t);notify.t=setTimeout(()=>el.classList.remove("show"),2800);}
function setScene(code,precip){
  const rain=$("rainLayer"), artRain=$("artRain"), sun=$("sunCore"), lightning=$("lightning");
  const wet=precip>35||[51,53,55,61,63,65,80,81,82,95,96,99].includes(code);
  rain.style.opacity=wet?".75":"0"; artRain.style.opacity=wet?"1":"0";
  sun.style.opacity=([0,1,2].includes(code))?"1":".42";
  document.querySelector(".cloud-front").style.opacity=([0,1].includes(code))?".5":"1";
  if([95,96,99].includes(code)){lightning.classList.remove("flash");void lightning.offsetWidth;lightning.classList.add("flash");}
  $("sceneLabel").textContent=wet?"PRECIPITATION IN THE FORECAST":"CURRENT CONDITIONS";
}
function makeRain(){
  const layer=$("rainLayer");for(let i=0;i<65;i++){const d=document.createElement("i");d.className="rain-drop";d.style.left=Math.random()*100+"%";d.style.animationDuration=(.7+Math.random()*1.4)+"s";d.style.animationDelay=(-Math.random()*3)+"s";d.style.opacity=(.2+Math.random()*.6).toString();layer.appendChild(d);}
}
async function geocode(query){
  const url=`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=8&language=en&format=json`;
  const r=await fetch(url);if(!r.ok)throw new Error("Location search is unavailable right now.");const j=await r.json();
  if(!j.results?.length)throw new Error("We couldn't find that place. Try a nearby city or town.");
  return j.results.sort((a,b)=>(b.population||0)-(a.population||0))[0];
}
async function loadForecast(){
  const btn=$("refreshButton");btn.classList.add("spin");$("currentCondition").textContent="Updating forecast…";
  try{
    const url=`https://api.open-meteo.com/v1/forecast?latitude=${state.lat}&longitude=${state.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max,precipitation_sum&temperature_unit=celsius&wind_speed_unit=kmh&precipitation_unit=mm&timezone=auto&forecast_days=7`;
    const r=await fetch(url);if(!r.ok)throw new Error("Forecast service could not be reached.");const data=await r.json();if(!data.current||!data.hourly||!data.daily)throw new Error("Forecast data was incomplete.");
    state.forecast=data;state.timezone=data.timezone||"auto";render(data);$("updatedTime").textContent=new Date().toLocaleTimeString("en-ZA",{hour:"2-digit",minute:"2-digit"});setScene(data.current.weather_code,data.hourly.precipitation_probability?.[nextHourIndex(data.hourly.time)]||0);
  }catch(e){$("currentCondition").textContent="Forecast unavailable";$("heroSummary").textContent=e.message||"Please check your connection and try again.";notify(e.message||"Unable to load forecast.");}
  finally{btn.classList.remove("spin");}
}
function nextHourIndex(times){const now=Date.now();let idx=times.findIndex(t=>new Date(t).getTime()>=now);return Math.max(0,idx);}
function render(d){
 const c=d.current,h=d.hourly,day=d.daily,idx=nextHourIndex(h.time),dayIdx=Math.max(0,day.time.findIndex(t=>t===c.time?.slice(0,10)));
 $("locationName").textContent=`${state.city}${state.country?", "+state.country:""}`;
 $("localTime").textContent=new Date().toLocaleTimeString("en-ZA",{hour:"2-digit",minute:"2-digit",timeZone:state.timezone});
 $("todayDate").textContent=dateLabel(c.time,{weekday:"long",day:"numeric",month:"long"}).toUpperCase();
 $("currentTemp").textContent=temp(c.temperature_2m);$("degreeMark").textContent="°";
 $("currentIcon").textContent=weatherInfo(c.weather_code)[1];$("currentCondition").textContent=weatherInfo(c.weather_code)[0];
 $("feelsLike").textContent=tempStr(c.apparent_temperature);
 $("highTemp").textContent=tempStr(day.temperature_2m_max[dayIdx]??day.temperature_2m_max[0]);$("lowTemp").textContent=tempStr(day.temperature_2m_min[dayIdx]??day.temperature_2m_min[0]);
 const pop=h.precipitation_probability?.[idx]??day.precipitation_probability_max?.[dayIdx]??0;
 $("heroSummary").textContent=summaryText(c.weather_code,c.wind_speed_10m,pop,c.temperature_2m);
 $("windSpeed").textContent=km(c.wind_speed_10m);$("windGust").textContent=km(c.wind_gusts_10m);$("windDirection").textContent=`From ${direction(c.wind_direction_10m)}`;$("windArrow").style.transform=`rotate(${c.wind_direction_10m||0}deg)`;
 $("gustStatus").textContent=c.wind_gusts_10m>=45?"Strong gusts":c.wind_gusts_10m>=28?"Breezy":"Moderate";$("rainChance").textContent=pop;$("rainProgress").style.width=pop+"%";$("rainText").textContent=pop>=50?"Rain likely":"Today's chance";
 const uv=day.uv_index_max?.[dayIdx]??0;$("uvIndex").textContent=uv.toFixed(1);const uvName=uv<3?"Low":uv<6?"Moderate":uv<8?"High":uv<11?"Very high":"Extreme";$("uvLabel").textContent=uvName;$("uvStatus").textContent=uvName+" exposure";
 $("windDetail").innerHTML=`${km(c.wind_speed_10m)} <small>km/h</small>`;$("gustDetail").innerHTML=`${km(c.wind_gusts_10m)} <small>km/h</small>`;$("windDetailDirection").textContent=`${direction(c.wind_direction_10m)} · ${Math.round(c.wind_direction_10m||0)}°`;$("compassNeedle").style.transform=`rotate(${c.wind_direction_10m||0}deg)`;
 $("windNote").textContent=c.wind_gusts_10m>=45?"Strong gusts — secure loose items":c.wind_speed_10m>=25?"Breezy conditions":"Light to moderate wind";
 $("rainDetail").textContent=pop+"%";$("rainMeterFill").style.width=pop+"%";$("rainDetailIcon").textContent=weatherInfo(c.weather_code)[1];$("cloudCover").textContent=(c.cloud_cover??"--")+"%";$("rainAmount").textContent=`${(day.precipitation_sum?.[dayIdx]??0).toFixed(1)} mm`;
 $("rainDescription").textContent=pop>=70?"Rain is likely during the forecast period. Consider a backup for outdoor plans.":pop>=35?"Some showers are possible. Keep an eye on the hourly forecast.":"Rain chances are currently low, but local conditions can change.";
 $("hourlyDate").textContent=dateLabel(c.time,{weekday:"short",day:"numeric",month:"short"});
 renderHourly(h,idx);renderWeekly(day);renderActivities(c,h,day,idx,dayIdx,pop);renderInsight(c,h,day,idx,dayIdx,pop,uv);document.title=`Zapify Weather | ${state.city}`;
}
function summaryText(code,wind,pop,t){
 if([95,96,99].includes(code))return "Thunderstorms in the forecast. Keep outdoor plans flexible and monitor official alerts.";
 if([61,63,65,80,81,82].includes(code)||pop>=65)return "Rain is possible or likely. Check the hourly outlook before heading out.";
 if(wind>=35)return "Windy conditions may affect outdoor work. Secure loose items and check gusts.";
 if(t>=30)return "Warm conditions ahead. Stay hydrated and plan outdoor activity around the heat.";
 if(t<=8)return "Cool conditions. A warm layer may make time outdoors more comfortable.";
 return "A quick look at the conditions to help you plan your day with confidence.";
}
function renderHourly(h,start){
 const end=Math.min(start+24,h.time.length),out=[];
 for(let i=start;i<end;i++){const code=h.weather_code[i],pop=h.precipitation_probability?.[i]??0;out.push(`<article class="hour-card"><div class="hour-time">${i===start?"NOW":hourLabel(h.time[i])}</div><div class="hour-icon" title="${weatherInfo(code)[0]}">${weatherInfo(code)[1]}</div><div class="hour-temp">${tempStr(h.temperature_2m[i])}</div><div class="hour-rain">💧 ${pop}%</div><div class="hour-divider"></div><div class="hour-wind">↗ ${km(h.wind_speed_10m[i])} km/h</div><div class="hour-gust">Gust <b>${km(h.wind_gusts_10m[i])}</b></div></article>`);}
 $("hourlyTrack").innerHTML=out.join("")||'<div class="loading-state">Hourly forecast is unavailable.</div>';
}
function renderWeekly(d){
 const temps=d.temperature_2m_max,mins=d.temperature_2m_min,globalMin=Math.min(...mins),globalMax=Math.max(...temps),span=Math.max(1,globalMax-globalMin);
 $("weeklyGrid").innerHTML=d.time.map((date,i)=>{const code=d.weather_code[i],pop=d.precipitation_probability_max?.[i]??0,left=((mins[i]-globalMin)/span)*100,width=Math.max(8,((temps[i]-mins[i])/span)*100);const dayName=i===0?"Today":i===1?"Tomorrow":dateLabel(date,{weekday:"short"});return `<div class="day-row"><div><div class="day-name">${dayName}</div><div class="day-date">${dateLabel(date,{day:"numeric",month:"short"})}</div></div><div class="day-condition"><span>${weatherInfo(code)[1]}</span>${weatherInfo(code)[0]}</div><div class="day-temps"><strong>${tempStr(temps[i])}</strong><span>${tempStr(mins[i])}</span></div><div class="day-tempbar"><span style="--left:${left}%;--width:${width}%"></span></div><div class="day-rain">💧 ${pop}%</div></div>`}).join("");
}
function renderActivities(c,h,d,idx,dayIdx,pop){
 const wind=c.wind_speed_10m||0,gust=c.wind_gusts_10m||0,t=c.temperature_2m||0,uv=d.uv_index_max?.[dayIdx]||0,rainMm=d.precipitation_sum?.[dayIdx]||0,code=c.weather_code;
 const items=[
 ["🌿","Gardening",pop>=60||rainMm>=5?"Rain may interrupt outdoor gardening.":t>=32?"Heat may stress plants; work early or late.":"Generally suitable for routine gardening.",pop>=60||t>=32?"Caution":"Good",pop>=60||t>=32?"caution":"good"],
 ["🎨","Painting & spraying",pop>=25?"Rain risk — check product cure and drying requirements.":gust>=25?"Windy — overspray and finish quality may be affected.":"Potentially suitable; verify label temperature, humidity and wind limits.",pop>=25||gust>=25?"Caution":"Check label",pop>=25||gust>=25?"caution":"good"],
 ["👕","Laundry",pop>=45?"Rain risk; indoor drying is the safer choice.":wind>=8?"Good drying potential, but secure light items.":"Low rain risk; drying may be slower without a breeze.",pop>=45?"Indoor drying":wind>=8?"Good":"Fair",pop>=45?"caution":"good"],
 ["🏃","Running",t>=31?"Hot — reduce intensity and avoid peak heat.":gust>=40||[95,96,99].includes(code)?"Consider an indoor alternative during severe conditions.":t<6?"Cold — warm up well and layer appropriately.":"Generally suitable; hydrate and dress for conditions.",t>=31||gust>=40||[95,96,99].includes(code)?"Caution":"Good",t>=31||gust>=40||[95,96,99].includes(code)?"caution":"good"],
 ["🌱","Lawn watering",rainMm>=4||pop>=65?"Consider postponing; useful rain may arrive.":"Check soil moisture; rain looks limited in the forecast.",rainMm>=4||pop>=65?"Wait and reassess":"Check soil",rainMm>=4||pop>=65?"good":"caution"],
 ["🪴","Outdoor work",gust>=40||[95,96,99].includes(code)?"Secure equipment and reassess exposed work.":pop>=60?"Plan around showers; protect materials.":"Conditions look broadly workable; keep an eye on gusts.",gust>=40||[95,96,99].includes(code)?"Caution":"Plan ahead",gust>=40||[95,96,99].includes(code)?"poor":"good"],
 ["🚗","Travel",pop>=65||[95,96,99].includes(code)?"Allow extra time if storms or heavy rain develop.":gust>=45?"Be alert in exposed areas and for high-sided vehicles.":"No major weather concern indicated by these conditions.",pop>=65||gust>=45||[95,96,99].includes(code)?"Take care":"Fair",pop>=65||gust>=45||[95,96,99].includes(code)?"caution":"good"],
 ["☕","Outdoor comfort",c.apparent_temperature>=30?"Hot feels-like conditions; shade and water are important.":c.apparent_temperature<=8?"Chilly — a warm layer will help.":pop>=55?"Have a sheltered backup option.":"Comfortable conditions are possible for a while outdoors.",c.apparent_temperature>=30||c.apparent_temperature<=8||pop>=55?"Plan ahead":"Favourable",c.apparent_temperature>=30||c.apparent_temperature<=8||pop>=55?"caution":"good"]
 ];
 $("activityGrid").innerHTML=items.map(x=>`<article class="activity-card glass"><span class="activity-emoji">${x[0]}</span><h3>${x[1]}</h3><p>${x[2]}</p><span class="activity-status ${x[4]}">${x[3]}</span></article>`).join("");
}
function renderInsight(c,h,d,idx,dayIdx,pop,uv){
 let title="Your forecast, made useful.",text="Use the hourly outlook to choose a better time for your plans.",icon=weatherInfo(c.weather_code)[1];
 if([95,96,99].includes(c.weather_code)){title="Storms need a flexible plan.";text="Thunderstorms are indicated. Move indoors if thunder is heard and follow local official warnings.";icon="⛈";}
 else if(pop>=60){title="Keep a rain-ready plan.";text=`The forecast shows a ${pop}% precipitation chance in the next hourly period. Consider covering outdoor projects and bringing laundry inside.`;icon="🌧";}
 else if(c.wind_gusts_10m>=35){title="Watch the gusts.";text=`Gusts are around ${km(c.wind_gusts_10m)} km/h. Secure light objects and use extra care with painting, spraying and exposed outdoor work.`;icon="💨";}
 else if(uv>=6){title="Sun protection matters today.";text=`The maximum UV index is ${uv.toFixed(1)} (${uv<8?"high":"very high"}). Seek shade around midday and use suitable sun protection.`;icon="☀";}
 else if((d.precipitation_sum?.[dayIdx]||0)>=4){title="Rain may help the garden.";text="Useful rainfall is possible today. Check soil moisture before watering the lawn or garden.";icon="🌱";}
 else {title="A clearer plan starts here.";text="Check wind gusts before outdoor work, use the rain chance to plan laundry, and compare hourly temperatures before exercising.";icon="✦";}
 $("insightTitle").textContent=title;$("insightText").textContent=text;$("insightIcon").textContent=icon;
}
$("searchForm").addEventListener("submit",async e=>{e.preventDefault();const query=$("cityInput").value.trim();if(!query){notify("Enter a city or town first.");return;}try{notify("Finding location…");const place=await geocode(query);state.lat=place.latitude;state.lon=place.longitude;state.city=place.name;state.country=place.country||"";state.timezone=place.timezone||"auto";await loadForecast();}catch(err){notify(err.message||"Location search failed.");}});
$("refreshButton").addEventListener("click",loadForecast);
$("unitToggle").addEventListener("click",()=>{state.unit=state.unit==="C"?"F":"C";$("unitToggle").innerHTML=state.unit==="C"?'°C <span class="unit-divider">/</span> °F':'°F <span class="unit-divider">/</span> °C';if(state.forecast)render(state.forecast);});
$("menuButton").addEventListener("click",()=>{$("menuButton").classList.toggle("selected");document.querySelector(".main-nav").classList.toggle("open");});
document.querySelectorAll(".main-nav a").forEach(a=>a.addEventListener("click",()=>document.querySelector(".main-nav").classList.remove("open")));
$("locateButton").addEventListener("click",()=>{if(!navigator.geolocation){notify("Location is not supported by this browser.");return;}notify("Requesting your location…");navigator.geolocation.getCurrentPosition(async p=>{state.lat=p.coords.latitude;state.lon=p.coords.longitude;try{const r=await fetch(`https://geocoding-api.open-meteo.com/v1/reverse?latitude=${state.lat}&longitude=${state.lon}&language=en&format=json`);const j=await r.json();const place=j.results?.[0];state.city=place?.name||"Your location";state.country=place?.country||"";state.timezone=place?.timezone||"auto";$("cityInput").value=state.city;loadForecast();}catch{state.city="Your location";state.country="";loadForecast();}},()=>notify("Location permission was not granted."),{enableHighAccuracy:false,timeout:10000});});
$("footerYear").textContent=new Date().getFullYear();makeRain();loadForecast();

(()=>{
  if(window.__bodyWeightPublishedGuardV1)return;
  window.__bodyWeightPublishedGuardV1=true;

  const valid=v=>Number.isFinite(+v)&&+v>=300&&+v<=700;
  const norm=s=>String(s||'').normalize('NFKC').replace(/[\s　]+/g,'').trim();
  const published=new Map();
  const explicitCurrent=h=>{
    const keys=['current_body_weight','currentBodyWeight','race_body_weight','raceBodyWeight','official_body_weight','officialBodyWeight'];
    for(const k of keys)if(valid(h?.[k]))return {weight:Math.round(+h[k]),explicit:true};
    if(h?.body_weight_published===true||h?.bodyWeightPublished===true||h?.weight_published===true)return valid(h?.body_weight)?{weight:Math.round(+h.body_weight),explicit:true}:{weight:null,explicit:true};
    return {weight:null,explicit:false};
  };

  function remember(h,w){const n=norm(h?.name);if(n&&valid(w))published.set(n,Math.round(+w));}
  function raceDate(){try{const vals=[window.raceMeta?.race_date,window.raceMeta?.date,window.raceMeta?.raceDate,window.currentRace?.race_date,window.currentRace?.date];for(const v of vals){const m=String(v||'').normalize('NFKC').match(/(20\d{2})[\\/.-](\d{1,2})[\\/.-](\d{1,2})/);if(m)return `${m[1]}-${String(+m[2]).padStart(2,'0')}-${String(+m[3]).padStart(2,'0')}`}}catch(_){} try{const rid=String(typeof raceId==='function'?raceId():'');const m=rid.match(/^(20\d{2})(\d{2})(\d{2})/);if(m)return `${m[1]}-${m[2]}-${m[3]}`}catch(_){} return ''}
  function beforeRaceDay(){const d=raceDate();if(!d)return false;const raceStart=Date.parse(`${d}T00:00:00+09:00`);return Number.isFinite(raceStart)&&Date.now()<raceStart}

  function normalize(){
    try{if(!Array.isArray(horses))return; horses=horses.map(h=>{const z={...h},cur=explicitCurrent(z),saved=published.get(norm(z.name)); if(cur.weight!==null){remember(z,cur.weight);z.body_weight=cur.weight;z.weight=cur.weight;z.current_body_weight=cur.weight;z.race_body_weight=cur.weight;z.official_body_weight=cur.weight;z.body_weight_published=true;return z} if(valid(saved)){z.body_weight=saved;z.weight=saved;z.current_body_weight=saved;z.race_body_weight=saved;z.official_body_weight=saved;z.body_weight_published=true;return z} const preRaceDay=beforeRaceDay(); const stale=valid(z.body_weight)?Math.round(+z.body_weight):(valid(z.weight)?Math.round(+z.weight):null); if(stale!==null&&!valid(z.last_body_weight))z.last_body_weight=stale; z.body_weight=null;if(valid(z.weight))z.weight=null;z.body_weight_published=false;return z})}catch(e){console.warn('body weight published guard',e)}}

  function snapshot(){try{if(!Array.isArray(horses))return;horses.forEach(h=>{const w=explicitCurrent(h).weight;if(valid(w))remember(h,w);else if(valid(h?.body_weight_published)&&valid(h?.body_weight))remember(h,h.body_weight);else {const n=norm(h?.name),w2=published.get(n);if(valid(w2))remember(h,w2)}})}catch(_) {}}
  function installEval(){try{const old=window.evalAll;if(typeof old!=='function'||old.__bodyWeightPublishedGuardV1)return;const fn=function(...args){snapshot();normalize();const out=old.apply(this,args);try{normalize()}catch(_){}return out};fn.__bodyWeightPublishedGuardV1=true;fn.__original=old;window.evalAll=fn;try{evalAll=fn}catch(_) {}}catch(e){console.warn('body weight eval guard',e)}}
  function refresh(){snapshot();normalize();installEval();try{if(typeof renderHorses==='function')renderHorses()}catch(_){}try{if(typeof renderAnalysis==='function')renderAnalysis()}catch(_) {}}
  normalize();installEval();addEventListener('keiba-data-updated',()=>setTimeout(refresh,60));addEventListener('keiba-odds-updated',()=>setTimeout(refresh,80));addEventListener('keiba-patches-ready',()=>setTimeout(refresh,80));setTimeout(refresh,120);document.documentElement.dataset.bodyWeightGuard='v2';
})();
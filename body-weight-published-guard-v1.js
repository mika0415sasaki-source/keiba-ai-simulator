(()=>{
  if(window.__bodyWeightPublishedGuardV1)return;
  window.__bodyWeightPublishedGuardV1=true;

  const valid=v=>Number.isFinite(+v)&&+v>=300&&+v<=700;
  const explicitCurrent=h=>{
    const keys=['current_body_weight','currentBodyWeight','race_body_weight','raceBodyWeight','official_body_weight','officialBodyWeight'];
    for(const k of keys)if(valid(h?.[k]))return {weight:Math.round(+h[k]),explicit:true};
    if(h?.body_weight_published===true||h?.bodyWeightPublished===true||h?.weight_published===true)return valid(h?.body_weight)?{weight:Math.round(+h.body_weight),explicit:true}:{weight:null,explicit:true};
    if(Number.isFinite(+h?.body_weight_change)&&valid(h?.body_weight))return {weight:Math.round(+h.body_weight),explicit:false};
    return {weight:null,explicit:false};
  };

  function raceDate(){
    try{
      const vals=[window.raceMeta?.race_date,window.raceMeta?.date,window.raceMeta?.raceDate,window.currentRace?.race_date,window.currentRace?.date];
      for(const v of vals){
        const m=String(v||'').normalize('NFKC').match(/(20\d{2})[\\/.-](\d{1,2})[\\/.-](\d{1,2})/);
        if(m)return `${m[1]}-${String(+m[2]).padStart(2,'0')}-${String(+m[3]).padStart(2,'0')}`;
      }
    }catch(_){ }
    try{
      const rid=String(typeof raceId==='function'?raceId():'');
      const m=rid.match(/^(20\d{2})(\d{2})(\d{2})/);
      if(m)return `${m[1]}-${m[2]}-${m[3]}`;
    }catch(_){ }
    return '';
  }

  function beforeRaceDay(){
    const d=raceDate();
    if(!d)return false;
    const raceStart=Date.parse(`${d}T00:00:00+09:00`);
    return Number.isFinite(raceStart)&&Date.now()<raceStart;
  }

  function normalize(){
    try{
      if(!Array.isArray(horses))return;
      horses=horses.map(h=>{
        const z={...h},cur=explicitCurrent(z),preRaceDay=beforeRaceDay();
        if(cur.weight!==null&&(cur.explicit||!preRaceDay)){
          z.body_weight=cur.weight;
          z.weight=cur.weight;
          z.current_body_weight=cur.weight;
          z.body_weight_published=true;
          return z;
        }
        const stale=valid(z.body_weight)?Math.round(+z.body_weight):(valid(z.weight)?Math.round(+z.weight):null);
        if(stale!==null&&!valid(z.last_body_weight))z.last_body_weight=stale;
        z.body_weight=null;
        if(valid(z.weight))z.weight=null;
        z.body_weight_published=false;
        return z;
      });
    }catch(e){console.warn('body weight published guard',e)}
  }

  function installEval(){
    try{
      const old=window.evalAll;
      if(typeof old!=='function'||old.__bodyWeightPublishedGuardV1)return;
      const fn=function(...args){
        normalize();
        const out=old.apply(this,args);
        try{normalize()}catch(_){}
        return out;
      };
      fn.__bodyWeightPublishedGuardV1=true;
      fn.__original=old;
      window.evalAll=fn;
      try{evalAll=fn}catch(_){}
    }catch(e){console.warn('body weight eval guard',e)}
  }

  function refresh(){
    normalize();
    installEval();
    try{if(typeof renderHorses==='function')renderHorses()}catch(_){}
    try{if(typeof renderAnalysis==='function')renderAnalysis()}catch(_){}
  }

  normalize();
  installEval();
  addEventListener('keiba-data-updated',()=>setTimeout(refresh,60));
  addEventListener('keiba-odds-updated',()=>setTimeout(refresh,80));
  addEventListener('keiba-patches-ready',()=>setTimeout(refresh,80));
  setTimeout(refresh,120);
  document.documentElement.dataset.bodyWeightGuard='v1';
})();

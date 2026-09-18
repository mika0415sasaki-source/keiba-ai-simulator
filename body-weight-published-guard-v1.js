(()=>{
  if(window.__bodyWeightPublishedGuardV1)return;
  window.__bodyWeightPublishedGuardV1=true;

  const valid=v=>Number.isFinite(+v)&&+v>=300&&+v<=700;
  const explicitCurrent=h=>{
    const keys=['current_body_weight','currentBodyWeight','race_body_weight','raceBodyWeight','official_body_weight','officialBodyWeight'];
    for(const k of keys)if(valid(h?.[k]))return Math.round(+h[k]);
    if(h?.body_weight_published===true||h?.bodyWeightPublished===true||h?.weight_published===true)return valid(h?.body_weight)?Math.round(+h.body_weight):null;
    if(Number.isFinite(+h?.body_weight_change)&&valid(h?.body_weight))return Math.round(+h.body_weight);
    return null;
  };

  function normalize(){
    try{
      if(!Array.isArray(horses))return;
      horses=horses.map(h=>{
        const z={...h},cur=explicitCurrent(z);
        if(cur!==null){
          z.body_weight=cur;
          z.weight=cur;
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

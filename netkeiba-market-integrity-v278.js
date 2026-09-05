(()=>{
  if(window.__netkeibaMarketIntegrityV278)return;
  window.__netkeibaMarketIntegrityV278=true;

  const clean=v=>String(v||'').normalize('NFKC').replace(/[\s　]+/g,'').trim();
  const isNk=()=>/netkeiba\.com/i.test(String(document.getElementById('raceUrl')?.value||''));
  const list=()=>{try{if(typeof horses!=='undefined'&&Array.isArray(horses))return horses}catch(_){}return Array.isArray(window.horses)?window.horses:[]};
  const valid=v=>Number.isFinite(+v)&&+v>1;
  const validPop=v=>Number.isInteger(+v)&&+v>=1&&+v<=18;
  const active=()=>list().filter(h=>!/取消|除外|中止|失格/.test(String(h?.status||h?.result_status||'')));
  let inSanitize=false;

  function marketState(){
    try{return typeof window.__getNetkeibaForecastState==='function'?window.__getNetkeibaForecastState():null}catch(_){return null}
  }

  function clearHorseMarket(h){
    if(!h)return;
    h.odds=null;h.popularity=null;h.forecast_odds=null;h.forecast_popularity=null;
    h.netkeiba_actual_odds=null;h.netkeiba_actual_popularity=null;
    h.netkeiba_forecast_odds=null;h.netkeiba_forecast_popularity=null;
    h.netkeiba_forecast_snapshot=false;
  }

  function completeMarket(){
    const hs=active(),n=hs.length;if(!n)return {ok:false,n:0,type:'unavailable',count:0};
    const st=marketState();
    const type=String(st?.oddsType||'unavailable').toLowerCase();
    const actual=hs.filter(h=>valid(h?.netkeiba_actual_odds)).length;
    const forecast=hs.filter(h=>valid(h?.netkeiba_forecast_odds)).length;
    const count=type==='actual'?actual:type==='forecast'?forecast:0;
    const ok=st?.status==='ready'&&Number(st?.count)===n&&count===n&&(type==='actual'||type==='forecast');
    return {ok,n,type,count,stateCount:Number(st?.count)||0};
  }

  function sanitize({rerender=false}={}){
    if(inSanitize||!isNk())return false;
    const hs=active();if(!hs.length)return false;
    const m=completeMarket();if(m.ok)return false;
    inSanitize=true;
    let changed=false;
    try{
      for(const h of hs){
        if(valid(h?.odds)||valid(h?.forecast_odds)||valid(h?.netkeiba_actual_odds)||valid(h?.netkeiba_forecast_odds)||validPop(h?.popularity)||validPop(h?.forecast_popularity)||validPop(h?.netkeiba_actual_popularity)||validPop(h?.netkeiba_forecast_popularity))changed=true;
        clearHorseMarket(h);
      }
      try{
        if(typeof evaluated!=='undefined'&&Array.isArray(evaluated)){
          evaluated=evaluated.map(h=>{
            if(!hs.some(x=>clean(x.name)===clean(h?.name)))return h;
            return {...h,odds:null,popularity:null,forecast_odds:null,forecast_popularity:null,netkeiba_actual_odds:null,netkeiba_actual_popularity:null,netkeiba_forecast_odds:null,netkeiba_forecast_popularity:null,netkeiba_forecast_snapshot:false,winOdds:null,valueIndex:1};
          });
        }
      }catch(_){}
      try{
        if(typeof oddsCache==='object'&&oddsCache){
          const src=[oddsCache.source,oddsCache.odds_type,...Object.values(oddsCache.win||{}).slice(0,4).map(v=>v&&typeof v==='object'?v.source:'')].filter(Boolean).join(' ');
          const official=/(?:JRA|公式|実オッズ|ACTUAL|OFFICIAL)/i.test(src)&&!/(?:予想|FORECAST)/i.test(src);
          const n=hs.length,have=Object.keys(oddsCache.win||{}).length;
          if(!official||have!==n)oddsCache={race_id:'',win:{},wide:{},trio:{},fetched_at:null,partial_rejected:{have,total:n}};
        }
      }catch(_){}
      if(rerender&&typeof renderAnalysis==='function'){
        try{renderAnalysis()}catch(_){}
      }
      return changed;
    }finally{inSanitize=false}
  }

  function wrapForecast(){
    const fn=window.__loadNetkeibaForecastV59;
    if(typeof fn!=='function'||fn.__marketIntegrityV278)return false;
    const wrapped=async function(...args){
      if(isNk())for(const h of active())clearHorseMarket(h);
      const out=await fn.apply(this,args);
      sanitize({rerender:true});
      return out;
    };
    wrapped.__marketIntegrityV278=true;wrapped.__previous=fn;
    window.__loadNetkeibaForecastV59=wrapped;
    return true;
  }

  function wrapRenderers(){
    for(const name of ['evalAll','renderAnalysis']){
      try{
        const fn=window[name];if(typeof fn!=='function'||fn.__marketIntegrityV278)continue;
        const wrapped=function(...args){sanitize();const out=fn.apply(this,args);sanitize();return out};
        wrapped.__marketIntegrityV278=true;wrapped.__previous=fn;window[name]=wrapped;
        try{if(name==='evalAll')evalAll=wrapped;else renderAnalysis=wrapped}catch(_){}
      }catch(_){}
    }
  }

  function install(){wrapForecast();wrapRenderers();sanitize()}
  document.addEventListener('click',e=>{
    const t=e.target;if(!t)return;
    if(t.id==='importRace'||t.id==='analyze'||t.id==='make'||/出馬表取込|AI分析|買い目生成/.test(String(t.textContent||''))){
      setTimeout(()=>sanitize({rerender:true}),500);
      setTimeout(()=>sanitize({rerender:true}),2200);
      setTimeout(()=>sanitize({rerender:true}),5000);
    }
  },true);
  let n=0;const tick=()=>{n++;install();if(n<50)setTimeout(tick,300)};setTimeout(tick,80);
})();
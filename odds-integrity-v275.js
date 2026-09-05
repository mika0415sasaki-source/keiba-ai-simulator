(()=>{
  if(window.__oddsIntegrityV275)return;
  window.__oddsIntegrityV275=true;

  const list=()=>{try{if(typeof horses!=='undefined'&&Array.isArray(horses))return horses}catch(_){}return Array.isArray(window.horses)?window.horses:[]};
  const isNk=()=>/netkeiba\.com/i.test(String(document.getElementById('raceUrl')?.value||''));
  const active=()=>list().filter(h=>!/取消|除外|中止|失格/.test(String(h?.status||h?.result_status||'')));
  const validNum=v=>Number.isFinite(+v)&&+v>0;

  function sanitizeOdds(){
    if(!isNk())return;
    const hs=active(),n=hs.length;if(!n)return;
    try{
      if(typeof oddsCache==='object'&&oddsCache){
        const win=oddsCache.win&&typeof oddsCache.win==='object'?oddsCache.win:{};
        const have=hs.filter(h=>{
          const no=String(+h.no);const v=win[no];
          if(validNum(v))return true;
          if(v&&typeof v==='object')return validNum(v.odds)||validNum(v.value)||validNum(v.price);
          return false;
        }).length;
        if(have>0&&have<n){
          oddsCache.win={};oddsCache.wide={};oddsCache.trio={};
          oddsCache.partial_rejected={have,total:n,reason:'incomplete-win-odds'};
        }
      }
    }catch(_){}

    const f=hs.filter(h=>validNum(h?.forecast_odds)&&Number.isFinite(+h?.forecast_popularity)&&+h.forecast_popularity>=1&&+h.forecast_popularity<=n).length;
    if(f>0&&f<n){
      hs.forEach(h=>{h.forecast_odds=null;h.forecast_popularity=null});
      try{if(typeof raceMeta==='object'&&raceMeta)raceMeta.forecast_odds_partial_rejected={have:f,total:n}}catch(_){}
    }
  }

  function install(){
    for(const name of ['renderAnalysis','evalAll']){
      try{
        const fn=window[name];if(typeof fn!=='function'||fn.__oddsIntegrityV275)continue;
        const wrapped=function(){sanitizeOdds();const v=fn.apply(this,arguments);sanitizeOdds();return v};
        wrapped.__oddsIntegrityV275=true;wrapped.__previous=fn;window[name]=wrapped;try{eval(`${name}=window.${name}`)}catch(_){}
      }catch(_){}
    }
  }

  document.addEventListener('click',e=>{
    const t=e.target;if(!t)return;
    if(t.id==='importRace'||t.id==='analyze'||t.id==='make'||/出馬表取込|AI分析|買い目生成/.test(String(t.textContent||''))){
      setTimeout(sanitizeOdds,300);setTimeout(sanitizeOdds,1800);setTimeout(sanitizeOdds,4500);
    }
  },true);

  let tries=0;const tick=()=>{tries++;install();sanitizeOdds();if(tries<40)setTimeout(tick,400)};setTimeout(tick,100);
})();
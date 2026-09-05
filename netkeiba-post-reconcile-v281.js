(()=>{
  if(window.__netkeibaPostReconcileV281)return;
  window.__netkeibaPostReconcileV281=true;

  const isNk=()=>/netkeiba\.com/i.test(String(document.getElementById('raceUrl')?.value||''));
  const hs=()=>{try{if(typeof horses!=='undefined'&&Array.isArray(horses))return horses}catch(_){}return Array.isArray(window.horses)?window.horses:[]};
  const validOdds=v=>Number.isFinite(+v)&&+v>1;
  const validPop=v=>Number.isInteger(+v)&&+v>=1&&+v<=18;

  function marketInfo(){
    const list=hs();
    let state=null;
    try{state=typeof window.__getNetkeibaForecastState==='function'?window.__getNetkeibaForecastState():null}catch(_){}
    const type=String(state?.oddsType||'').toLowerCase();
    const actual=list.filter(h=>validOdds(h?.netkeiba_actual_odds)&&validPop(h?.netkeiba_actual_popularity)).length;
    const forecast=list.filter(h=>validOdds(h?.netkeiba_forecast_odds)&&validPop(h?.netkeiba_forecast_popularity)).length;
    const generic=list.filter(h=>validOdds(h?.odds)&&validPop(h?.popularity)).length;
    if(type==='actual'&&actual)return {count:actual,label:'netkeiba単勝オッズ・人気'};
    if(type==='forecast'&&forecast)return {count:forecast,label:'netkeiba予想オッズ・人気'};
    if(actual)return {count:actual,label:'netkeiba単勝オッズ・人気'};
    if(forecast)return {count:forecast,label:'netkeiba予想オッズ・人気'};
    if(generic)return {count:generic,label:'netkeiba単勝オッズ・人気'};
    return {count:0,label:'netkeibaオッズ・人気'};
  }

  function syncPace(){
    if(!isNk())return;
    try{if(typeof window.renderPaceReason==='function')window.renderPaceReason();else if(typeof renderPaceReason==='function')renderPaceReason()}catch(_){}
  }

  function syncMarketEvidence(){
    if(!isNk())return;
    const list=hs(),n=list.length;if(!n)return;
    const m=marketInfo();
    const ev=document.getElementById('evidence');
    if(ev){
      const line=ev.querySelector?.('[data-grade-odds-evidence]');
      if(line){
        const before=String(line.textContent||'');
        const after=before.replace(/netkeiba(?:予想|単勝)?オッズ・人気\s*\d+\/\d+頭/g,`${m.label} ${m.count}/${n}頭`);
        if(after!==before)line.textContent=after;
      }
      let html=ev.innerHTML;
      if(m.count>0){
        html=html.replace(/netkeiba予想オッズ・人気：未取得（AI指数と妙味判定には未使用）/g,`${m.label}を表示（AI指数と妙味判定には未使用）`)
                 .replace(/netkeiba予想オッズ・人気を表示（AI指数と妙味判定には未使用）/g,`${m.label}を表示（AI指数と妙味判定には未使用）`);
      }
      if(html!==ev.innerHTML)ev.innerHTML=html;
    }
  }

  function syncAll(){syncPace();syncMarketEvidence()}

  function wrapImport(){
    try{
      if(typeof jraImport!=='function'||jraImport.__netkeibaPostReconcileV281)return false;
      const prev=jraImport;
      const wrapped=async function(url){
        const value=await prev.apply(this,arguments);
        if(/netkeiba\.com/i.test(String(url||''))){setTimeout(syncAll,0);setTimeout(syncAll,500)}
        return value;
      };
      wrapped.__netkeibaPostReconcileV281=true;wrapped.__previous=prev;
      jraImport=wrapped;try{window.jraImport=wrapped}catch(_){}
      return true;
    }catch(_){return false}
  }

  function wrapRender(){
    for(const name of ['renderHorses','renderAnalysis']){
      try{
        const fn=window[name];if(typeof fn!=='function'||fn.__netkeibaPostReconcileV281)continue;
        const wrapped=function(...args){const out=fn.apply(this,args);setTimeout(syncAll,0);return out};
        wrapped.__netkeibaPostReconcileV281=true;wrapped.__previous=fn;window[name]=wrapped;
        try{if(name==='renderHorses')renderHorses=wrapped;else renderAnalysis=wrapped}catch(_){}
      }catch(_){}
    }
  }

  function install(){wrapImport();wrapRender();syncAll()}
  document.addEventListener('click',e=>{
    const t=e.target;if(!t)return;
    if(t.id==='importRace'||t.id==='importHist'||t.id==='analyze'||/出馬表取込|過去5走を再取得|AI分析/.test(String(t.textContent||''))){
      [300,1200,2800,5200].forEach(ms=>setTimeout(syncAll,ms));
    }
  },true);
  let timer=0;
  new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(syncMarketEvidence,80)}).observe(document.body,{subtree:true,childList:true,characterData:true});
  let tries=0;const tick=()=>{tries++;install();if(tries<50)setTimeout(tick,300)};setTimeout(tick,80);
})();
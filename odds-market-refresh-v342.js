(()=>{
  if(window.__oddsMarketRefreshV343)return;
  window.__oddsMarketRefreshV343=true;

  let busy=false;
  let lastTry=0;
  const RETRY_MS=15000;

  function raceReady(){
    try{
      const u=String(document.getElementById('raceUrl')?.value||'').trim();
      return !!u && typeof horses!=='undefined' && Array.isArray(horses) && horses.length>=2;
    }catch(_){return false}
  }

  function counts(){
    try{
      return {
        win:Object.keys(oddsCache?.win||{}).length,
        wide:Object.keys(oddsCache?.wide||{}).length,
        trio:Object.keys(oddsCache?.trio||{}).length
      };
    }catch(_){return {win:0,wide:0,trio:0}}
  }

  function needsComboRefresh(){
    if(!raceReady())return false;
    const c=counts();
    return c.wide===0 || c.trio===0;
  }

  async function refreshMissingMarkets(reason='auto',force=false){
    if(busy || !raceReady())return false;
    const now=Date.now();
    if(!force && now-lastTry<RETRY_MS)return false;
    if(!force && !needsComboRefresh())return false;
    busy=true; lastTry=now;
    try{
      if(typeof oddsApi!=='function')return false;
      const before=counts();
      await oddsApi({force:true});
      const after=counts();
      document.documentElement.dataset.oddsMarketRefresh=`${after.win}-${after.wide}-${after.trio}`;
      document.documentElement.dataset.oddsMarketRefreshReason=reason;

      if((after.wide!==before.wide || after.trio!==before.trio || after.win!==before.win) && typeof evalAll==='function'){
        try{evalAll()}catch(_){}
      }else if(typeof renderAnalysis==='function' && typeof evaluated!=='undefined' && Array.isArray(evaluated) && evaluated.length){
        try{renderAnalysis()}catch(_){}
      }
      try{window.dispatchEvent(new CustomEvent('keiba-odds-updated',{detail:after}))}catch(_){}
      return after.wide>0 && after.trio>0;
    }catch(e){
      console.warn('odds market refresh',reason,e);
      return false;
    }finally{busy=false}
  }

  // 発売開始後の反映を待たせないため15秒間隔で再確認。
  const timer=setInterval(()=>{
    if(document.visibilityState==='visible' && needsComboRefresh())refreshMissingMarkets('interval');
  },RETRY_MS);

  // Safariへ戻った時・分析/買い目を開いた時は即再取得。
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible')refreshMissingMarkets('visibility',true);
  });
  document.addEventListener('click',e=>{
    const t=e.target?.closest?.('button'); if(!t)return;
    const txt=String(t.textContent||'');
    if(t.id==='analyze'||t.id==='make'||t.dataset?.tab==='analysis'||t.dataset?.tab==='tickets'||/AI分析|買い目/.test(txt)){
      setTimeout(()=>refreshMissingMarkets('user-action',true),120);
    }
  },true);

  // 読込直後にも既に出馬表があるなら即確認。続けて短時間の再試行も行う。
  setTimeout(()=>refreshMissingMarkets('boot',true),500);
  setTimeout(()=>{if(needsComboRefresh())refreshMissingMarkets('boot-retry',true)},3500);
  addEventListener('beforeunload',()=>clearInterval(timer),{once:true});
})();

(()=>{
  if(window.__oddsMarketRefreshV344)return;
  window.__oddsMarketRefreshV344=true;

  let busy=false;
  let lastTry=0;
  let emptyStreak=0;
  const USER_RETRY_MS=30000;      // 手動操作時でも30秒以内の連打はしない
  const AUTO_RETRY_MS=300000;     // 自動確認は5分間隔
  const MAX_EMPTY_AUTO=6;         // 空応答が続く場合は自動巡回を止める

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

  function missingCombo(){
    if(!raceReady())return false;
    const c=counts();
    return c.wide===0 || c.trio===0;
  }

  async function refreshMissingMarkets(reason='auto',force=false){
    if(busy || !raceReady())return false;
    const now=Date.now();
    if(!force && now-lastTry<USER_RETRY_MS)return false;
    if(!missingCombo())return true;

    busy=true;
    lastTry=now;
    try{
      if(typeof oddsApi!=='function')return false;
      const before=counts();
      await oddsApi({force:true});
      const after=counts();

      const gotCombo=after.wide>0 && after.trio>0;
      emptyStreak=gotCombo?0:(emptyStreak+1);
      document.documentElement.dataset.oddsMarketRefresh=`${after.win}-${after.wide}-${after.trio}`;
      document.documentElement.dataset.oddsMarketRefreshReason=reason;
      document.documentElement.dataset.oddsEmptyStreak=String(emptyStreak);

      if((after.wide!==before.wide || after.trio!==before.trio || after.win!==before.win) && typeof evalAll==='function'){
        try{evalAll()}catch(_){}
      }else if(typeof renderAnalysis==='function' && typeof evaluated!=='undefined' && Array.isArray(evaluated) && evaluated.length){
        try{renderAnalysis()}catch(_){}
      }
      try{window.dispatchEvent(new CustomEvent('keiba-odds-updated',{detail:after}))}catch(_){}
      return gotCombo;
    }catch(e){
      emptyStreak++;
      console.warn('odds market refresh',reason,e);
      return false;
    }finally{
      busy=false;
    }
  }

  // 常時15秒巡回は廃止。5分に1回だけ確認し、空が続けば自動巡回を止める。
  const timer=setInterval(()=>{
    if(document.visibilityState!=='visible')return;
    if(emptyStreak>=MAX_EMPTY_AUTO)return;
    if(missingCombo() && Date.now()-lastTry>=AUTO_RETRY_MS)refreshMissingMarkets('interval');
  },60000);

  // Safariへ戻った時は、前回取得から30秒以上経っていれば1回だけ確認。
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible' && Date.now()-lastTry>=USER_RETRY_MS){
      refreshMissingMarkets('visibility');
    }
  });

  // AI分析・買い目を開いた時は、その操作に合わせて1回確認。連打は30秒で抑制。
  document.addEventListener('click',e=>{
    const t=e.target?.closest?.('button'); if(!t)return;
    const txt=String(t.textContent||'');
    if(t.id==='analyze'||t.id==='make'||t.dataset?.tab==='analysis'||t.dataset?.tab==='tickets'||/AI分析|買い目/.test(txt)){
      setTimeout(()=>refreshMissingMarkets('user-action'),120);
    }
  },true);

  // 起動時は1回だけ。旧版の500ms+3.5秒+15秒巡回は行わない。
  setTimeout(()=>refreshMissingMarkets('boot',true),800);
  addEventListener('beforeunload',()=>clearInterval(timer),{once:true});
})();

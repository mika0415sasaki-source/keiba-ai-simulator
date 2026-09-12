(()=>{
  if(window.__rankingStableV356)return;
  window.__rankingStableV356=true;

  const openKeys=new Set();
  const sel='#ranking details.ranking-card > summary';

  function keyOf(card){
    const summary=card?.querySelector(':scope > summary');
    const aria=String(summary?.getAttribute('aria-label')||'');
    const m=aria.match(/AI\s*\d+位\s+(.+?)の詳細/);
    if(m)return m[1].trim();
    const rank=String(card?.querySelector('.rank')?.textContent||'').trim();
    return rank.replace(/^AI\s*\d+位\s*[◎○▲△☆注]?\s*/,'').trim();
  }

  function sync(card){
    if(!(card instanceof HTMLDetailsElement))return;
    const key=keyOf(card);
    const shouldOpen=openKeys.has(key);
    if(card.open!==shouldOpen)card.open=shouldOpen;
    const summary=card.querySelector(':scope > summary');
    if(summary)summary.setAttribute('aria-expanded',shouldOpen?'true':'false');
    const chev=summary?.querySelector('.accordion-chevron');
    if(chev)chev.textContent=shouldOpen?'▲':'▼';
  }

  function syncAll(){
    document.querySelectorAll('#ranking details.ranking-card').forEach(sync);
  }

  // Safariの<details>既定動作と独自処理を二重で動かさない。
  // 開閉状態はユーザーのタップ時だけ変更し、再描画やtoggleイベントでは変更しない。
  document.addEventListener('click',e=>{
    const summary=e.target?.closest?.(sel);
    if(!summary)return;
    const card=summary.parentElement;
    if(!(card instanceof HTMLDetailsElement))return;

    e.preventDefault();
    e.stopImmediatePropagation();

    const key=keyOf(card);
    const next=!openKeys.has(key);
    if(next)openKeys.add(key);else openKeys.delete(key);
    sync(card);
  },true);

  function observeRanking(){
    const ranking=document.getElementById('ranking');
    if(!ranking)return false;
    syncAll();

    const obs=new MutationObserver(mutations=>{
      // v345がランキングDOMを作り直した直後、次の描画前に同じ開閉状態を復元する。
      // setTimeoutを使わず、その場で同期して閉→開のちらつきを出さない。
      if(mutations.some(m=>m.type==='childList'&&m.addedNodes.length))syncAll();
    });
    obs.observe(ranking,{childList:true});
    return true;
  }

  let tries=0;
  const boot=()=>{
    if(observeRanking())return;
    if(++tries<40)setTimeout(boot,100);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();

  addEventListener('keiba-data-updated',syncAll);
  addEventListener('keiba-odds-updated',syncAll);
  addEventListener('pageshow',syncAll);
  document.documentElement.dataset.rankingStable='v356';
})();
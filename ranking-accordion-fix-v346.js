(()=>{
  if(window.__rankingAccordionFixV346)return;
  window.__rankingAccordionFixV346=true;

  const selector='#ranking details.ranking-card > summary';
  const openKeys=new Set();
  let restoring=false;

  function keyOf(card){
    const summary=card?.querySelector(':scope > summary');
    const aria=String(summary?.getAttribute('aria-label')||'');
    const m=aria.match(/AI\s*\d+位\s+(.+?)の詳細/);
    if(m)return m[1].trim();
    return String(card?.querySelector('.rank')?.textContent||'').replace(/^AI\s*\d+位\s*[◎○▲△☆注]?\s*/,'').trim();
  }

  function syncChevron(card){
    const want=card.open?'▲':'▼';
    const c=card?.querySelector(':scope > summary .accordion-chevron');
    if(c&&c.textContent!==want)c.textContent=want;
    const summary=card?.querySelector(':scope > summary');
    const expanded=card.open?'true':'false';
    if(summary&&summary.getAttribute('aria-expanded')!==expanded)summary.setAttribute('aria-expanded',expanded);
  }

  function restoreCard(card){
    if(!(card instanceof HTMLDetailsElement))return;
    const shouldOpen=openKeys.has(keyOf(card));
    restoring=true;
    if(card.open!==shouldOpen)card.open=shouldOpen;
    syncChevron(card);
    restoring=false;
  }

  function installCard(card){
    if(!(card instanceof HTMLDetailsElement))return;
    if(!card.dataset.accordionV346){
      card.dataset.accordionV346='1';
      card.addEventListener('toggle',()=>{
        if(restoring)return;
        const key=keyOf(card);
        if(card.open)openKeys.add(key);else openKeys.delete(key);
        syncChevron(card);
      });
    }
    restoreCard(card);
  }

  function installAll(){
    document.querySelectorAll('#ranking details.ranking-card').forEach(installCard);
  }

  document.addEventListener('click',e=>{
    const summary=e.target?.closest?.(selector);
    if(!summary)return;
    const card=summary.parentElement;
    if(!(card instanceof HTMLDetailsElement))return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const key=keyOf(card);
    const next=!openKeys.has(key);
    if(next)openKeys.add(key);else openKeys.delete(key);
    restoring=true;
    if(card.open!==next)card.open=next;
    syncChevron(card);
    restoring=false;
    requestAnimationFrame(installAll);
    setTimeout(installAll,100);
  },true);

  const obs=new MutationObserver(mutations=>{
    // ランキングカード自体が差し替わった時だけ復元する。
    // chevronの文字更新など内部描画では再実行しない。
    const replaced=mutations.some(m=>[...m.addedNodes].some(n=>
      n?.nodeType===1&&(n.matches?.('details.ranking-card')||n.querySelector?.('details.ranking-card'))
    ));
    if(replaced)setTimeout(installAll,0);
  });

  const start=()=>{
    installAll();
    const ranking=document.getElementById('ranking');
    if(ranking)obs.observe(ranking,{childList:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();

  addEventListener('keiba-data-updated',()=>setTimeout(installAll,0));
  addEventListener('keiba-odds-updated',()=>setTimeout(installAll,0));
  addEventListener('pageshow',()=>setTimeout(installAll,0));
  document.documentElement.dataset.rankingAccordion='v352-loop-safe';
})();
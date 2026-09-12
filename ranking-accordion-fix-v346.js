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
    const c=card?.querySelector(':scope > summary .accordion-chevron');
    if(c)c.textContent=card.open?'▲':'▼';
    const summary=card?.querySelector(':scope > summary');
    if(summary)summary.setAttribute('aria-expanded',card.open?'true':'false');
  }

  function restoreCard(card){
    if(!(card instanceof HTMLDetailsElement))return;
    const key=keyOf(card);
    restoring=true;
    card.open=openKeys.has(key);
    syncChevron(card);
    restoring=false;
  }

  function installCard(card){
    if(!card)return;
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

  // iOS Safariでもsummary全体を確実に開閉。開閉状態は馬ごとに保持し、
  // v345等がランキングDOMを再生成しても直後に復元する。
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
    card.open=next;
    syncChevron(card);
    restoring=false;
    requestAnimationFrame(()=>installAll());
    setTimeout(installAll,80);
    setTimeout(installAll,220);
  },true);

  const obs=new MutationObserver(mutations=>{
    if(mutations.some(m=>m.type==='childList'))queueMicrotask(installAll);
  });
  const start=()=>{
    installAll();
    const ranking=document.getElementById('ranking');
    if(ranking)obs.observe(ranking,{childList:true,subtree:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();

  addEventListener('keiba-data-updated',()=>setTimeout(installAll,0));
  addEventListener('keiba-odds-updated',()=>setTimeout(installAll,0));
  addEventListener('pageshow',()=>setTimeout(installAll,0));
  document.documentElement.dataset.rankingAccordion='v351-persistent';
})();
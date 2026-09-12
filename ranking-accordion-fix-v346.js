(()=>{
  if(window.__rankingAccordionFixV346)return;
  window.__rankingAccordionFixV346=true;

  const selector='#ranking details.ranking-card > summary';

  function syncChevron(card){
    const c=card?.querySelector('.accordion-chevron');
    if(c)c.textContent=card.open?'▲':'▼';
  }

  function installCard(card){
    if(!card||card.dataset.accordionV346)return;
    card.dataset.accordionV346='1';
    syncChevron(card);
    card.addEventListener('toggle',()=>syncChevron(card),{passive:true});
  }

  function installAll(){
    document.querySelectorAll('#ranking details.ranking-card').forEach(installCard);
  }

  // iOS Safari では、後段の再描画/旧ハンドラが summary のネイティブ開閉を
  // 打ち消すケースがあるため、capture でこの操作だけを確定させる。
  document.addEventListener('click',e=>{
    const summary=e.target?.closest?.(selector);
    if(!summary)return;
    const card=summary.parentElement;
    if(!(card instanceof HTMLDetailsElement))return;
    e.preventDefault();
    e.stopImmediatePropagation();
    card.open=!card.open;
    syncChevron(card);
  },true);

  // 再描画でカードDOMが差し替わっても開閉機能を維持する。
  const obs=new MutationObserver(()=>installAll());
  const start=()=>{
    installAll();
    const ranking=document.getElementById('ranking');
    if(ranking)obs.observe(ranking,{childList:true,subtree:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();

  addEventListener('keiba-data-updated',()=>setTimeout(installAll,0));
  document.documentElement.dataset.rankingAccordion='v346';
})();
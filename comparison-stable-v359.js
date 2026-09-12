(()=>{
  if(window.__comparisonStableV359)return;
  window.__comparisonStableV359=true;

  const openNos=new Set();
  let restoring=false;

  function horseNo(button){
    const text=String(button?.textContent||'').replace(/\s+/g,' ');
    const m=text.match(/AI\s*\d+位\s*(\d{1,2})\s+/i);
    return m?m[1]:'';
  }

  function syncRow(row){
    const button=row?.querySelector?.('.comparison-toggle');
    if(!button)return;
    const no=horseNo(button);
    const open=!!no&&openNos.has(no);
    restoring=true;
    row.classList.toggle('is-open',open);
    button.setAttribute('aria-expanded',open?'true':'false');
    const c=button.querySelector('.comparison-chevron');
    if(c)c.textContent=open?'▲':'▼';
    restoring=false;
  }

  function syncAll(){
    document.querySelectorAll('#rows tr').forEach(syncRow);
  }

  // v345側の tbody.onclick より先に処理し、Safariで二重トグルされないようにする。
  document.addEventListener('click',e=>{
    const button=e.target?.closest?.('#rows .comparison-toggle');
    if(!button)return;
    const row=button.closest('tr');
    if(!row)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const no=horseNo(button);
    if(!no)return;
    if(openNos.has(no))openNos.delete(no);else openNos.add(no);
    syncRow(row);
  },true);

  function start(){
    const tbody=document.getElementById('rows');
    if(!tbody)return setTimeout(start,80);
    syncAll();
    const obs=new MutationObserver(mutations=>{
      if(restoring)return;
      if(mutations.some(m=>m.type==='childList'))queueMicrotask(syncAll);
    });
    obs.observe(tbody,{childList:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  addEventListener('keiba-data-updated',()=>setTimeout(syncAll,0));
  addEventListener('keiba-odds-updated',()=>setTimeout(syncAll,0));
  addEventListener('pageshow',()=>setTimeout(syncAll,0));
  document.documentElement.dataset.comparisonAccordion='v359-stable';
})();
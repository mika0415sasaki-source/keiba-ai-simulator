(function(){
  'use strict';
  if(window.__keibaNetkeibaEntryRouteV233)return;
  window.__keibaNetkeibaEntryRouteV233=true;

  function isNetkeibaRaceEntryV233(raw){
    try{
      const u=new URL(String(raw||'').trim());
      const host=String(u.hostname||'').toLowerCase();
      if(!(host==='netkeiba.com'||host.endsWith('.netkeiba.com')))return false;
      const rid=String(u.searchParams.get('race_id')||'');
      if(!/^20\d{10}$/.test(rid))return false;
      const p=String(u.pathname||'').replace(/\/{2,}/g,'/');
      return /\/race\/(?:shutuba|shutuba_past|newspaper|newspaper_master)\.html$/i.test(p);
    }catch(e){return false;}
  }

  function mountV233(){
    const b=document.getElementById('fetchJraEntry');
    const input=document.getElementById('jraEntryUrl');
    const st=document.getElementById('jraEntryStatus');
    if(!b||!input){setTimeout(mountV233,150);return;}
    if(b.dataset.netkeibaEntryRouteV233)return;
    b.dataset.netkeibaEntryRouteV233='1';

    b.addEventListener('click',async function(ev){
      const raw=String(input.value||'').trim();
      if(!isNetkeibaRaceEntryV233(raw))return;
      if(typeof window.importFromNetkeibaV108!=='function')return;

      ev.preventDefault();
      ev.stopImmediatePropagation();
      b.disabled=true;
      try{
        if(st)st.textContent='① netkeiba出馬表を取得中…';
        try{localStorage.setItem('keiba_last_jra_url_v40',raw);}catch(e){}
        await window.importFromNetkeibaV108(raw);
      }catch(e){
        if(st)st.innerHTML='<span class="warn">'+String(e&&e.message||e)+'</span>';
      }finally{
        b.disabled=false;
      }
    },true);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountV233,{once:true});
  else mountV233();
})();

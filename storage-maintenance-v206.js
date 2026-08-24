(function(){
  'use strict';
  if(window.__keibaStorageMaintenanceV206)return;
  window.__keibaStorageMaintenanceV206=true;

  const MEMKEY='keiba_ai_memory_v19';
  const PROBE='__keiba_storage_probe_v206__';
  const CACHE_PREFIXES=[
    'keiba_netkeiba_past5_v144_',
    'keiba_horse_profile_v112_',
    'keiba_horse_profile_v127_',
    'keiba_horse_profile_v128_',
    'keiba_horse_profile_v129_',
    'keiba_current_race_class_v145_'
  ];
  const CACHE_KEYS=['keiba_jra_last_text_v27'];

  function hasHeadroom(){
    try{
      localStorage.setItem(PROBE,'x'.repeat(120000));
      localStorage.removeItem(PROBE);
      return true;
    }catch(e){
      try{localStorage.removeItem(PROBE);}catch(_){}
      return false;
    }
  }
  function pruneCaches(){
    let removed=0,freed=0;
    const keys=[];
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);if(k)keys.push(k);
    }
    keys.forEach(k=>{
      if(k===MEMKEY)return;
      const cache=CACHE_KEYS.includes(k)||CACHE_PREFIXES.some(p=>k.startsWith(p));
      if(!cache)return;
      try{
        const v=String(localStorage.getItem(k)||'');
        freed+=(k.length+v.length)*2;
        localStorage.removeItem(k);removed++;
      }catch(e){}
    });
    return {removed,freed};
  }
  function prepareStorage(){
    if(hasHeadroom())return {pruned:false,removed:0,freed:0};
    const r=pruneCaches();
    return {pruned:true,...r,ok:hasHeadroom()};
  }
  function mount(){
    const resultBtn=document.getElementById('fetchJraResult');
    if(!resultBtn){setTimeout(mount,150);return;}
    if(resultBtn.dataset.storageMaintenanceV206)return;
    resultBtn.dataset.storageMaintenanceV206='1';

    const initial=prepareStorage();
    if(initial.pruned){
      const s=document.getElementById('jraResultStatus');
      if(s&&initial.removed>0)s.textContent='Safari保存容量を確保するため一時キャッシュを整理しました。学習メモリは削除していません。';
    }

    resultBtn.addEventListener('click',function(){
      const r=prepareStorage();
      if(r.pruned){
        const s=document.getElementById('jraResultStatus');
        if(s&&r.removed>0)s.textContent='保存容量を確保してから確定結果を取り込みます。学習メモリは保持しています。';
      }
    },true);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
})();
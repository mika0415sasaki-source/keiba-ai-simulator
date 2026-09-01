(()=>{
  const API='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/netkeiba-horse-mobile';
  const wait=()=>{
    if(typeof loadNetkeibaHistories!=='function'||typeof horses==='undefined'||typeof scoreLocalHistory!=='function'){setTimeout(wait,80);return;}
    if(window.__netkeibaMobileRescueApplied)return;
    window.__netkeibaMobileRescueApplied=true;

    const base=loadNetkeibaHistories;
    const normRun=(r)=>({
      date:r?.date||'', venue:r?.venue||r?.course||'', surface:r?.surface||'',
      distance:+(r?.distance??r?.dist)||0, going:r?.going||'', rank:+(r?.rank??r?.pos)||0,
      last3f:Number.isFinite(+(r?.last3f??r?.last3))?+(r?.last3f??r?.last3):null,
      jockey:r?.jockey||'', passage:Array.isArray(r?.passage)?r.passage:[],
      field_size:+(r?.field_size||0)||null, source:r?.source||'netkeiba-mobile'
    });
    const apply=(h,rr)=>{
      const p=rr?.profile||{};
      if(p.sire)h.sire=p.sire;
      if(p.dam)h.dam=p.dam;
      if(p.damsire)h.damsire=p.damsire;
      const rows=(rr?.history||[]).map(normRun).filter(x=>x.rank&&x.distance).slice(0,5);
      if(!rows.length)return false;
      h.history=rows;
      h.histScores=scoreLocalHistory(rows);
      h.histScores.available=true;
      h.netkeibaVia='netkeiba-mobile-id';
      h.netkeibaRejected=false;
      h.netkeibaError='';
      try{if(typeof mergeNetkeibaWithJra==='function')mergeNetkeibaWithJra(h)}catch(e){console.warn(e)}
      return true;
    };
    const refreshUi=()=>{
      try{if(typeof renderHorses==='function')renderHorses()}catch(e){}
      try{if(typeof evalAll==='function')evalAll()}catch(e){}
      try{if(typeof renderPaceReason==='function')renderPaceReason()}catch(e){}
    };

    loadNetkeibaHistories=async function(opts={}){
      const res=await base(opts);
      let missing=(horses||[]).filter(h=>!(h.history||[]).length);
      if(!missing.length)return res;
      const items=missing.map(h=>({name:h.name,id:String(h.netkeiba_horse_id||h.horse_id||'').trim()})).filter(x=>x.id);
      if(!items.length)return res;
      try{
        const r=await fetch(API+'?t='+Date.now(),{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','Cache-Control':'no-cache'},body:JSON.stringify({items})});
        const j=await r.json().catch(()=>({results:[]}));
        if(r.ok){
          for(const rr of j.results||[]){const h=(horses||[]).find(x=>String(x.name).trim()===String(rr.name).trim());if(h)apply(h,rr)}
          refreshUi();
          const ok=(horses||[]).filter(h=>(h.history||[]).length).length;
          const totalRuns=(horses||[]).reduce((n,h)=>n+Math.min(5,(h.history||[]).length),0);
          const jraN=(horses||[]).filter(h=>(h.jra_history||[]).length).length;
          const hc=document.getElementById('histCount');if(hc)hc.textContent='netkeiba '+ok+'/'+horses.length+'頭・合計'+totalRuns+'走 / JRA照合 '+jraN+'頭';
          if(!opts?.silent&&typeof status==='function')status('histStatus','netkeiba '+ok+'/'+horses.length+'頭・合計'+totalRuns+'走を使用。');
          try{if(typeof saveImportedHorses==='function')await saveImportedHorses(horses)}catch(e){}
          return {...(res||{}),ok,total:horses.length,totalRuns};
        }
      }catch(e){console.warn('netkeiba mobile rescue',e)}
      return res;
    };
  };
  wait();
})();

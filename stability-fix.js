(()=>{
 const MOBILE='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/netkeiba-horse-mobile';
 const wait=()=>{
  if(typeof jraImport!=='function'||typeof loadNetkeibaHistories!=='function'||typeof renderHorses!=='function'){setTimeout(wait,80);return}
  if(window.__stabilityFixApplied)return;window.__stabilityFixApplied=true;
  const valid=x=>{x=String(x||'').trim();return x&&!/^(父:|母:|母父:|父|母|母父|―|-)$/.test(x)&&!/^\[/.test(x)&&x.length<40};
  async function mobileFill(list){
   const items=(list||[]).map(h=>({name:h.name,id:String(h.netkeiba_horse_id||h.horse_id||'')})).filter(x=>x.id);
   if(!items.length)return;
   try{
    const r=await fetch(MOBILE,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({items})});
    const j=await r.json();if(!r.ok)return;
    for(const rr of j.results||[]){
     const h=(list||[]).find(x=>x.name===rr.name);if(!h)continue;
     const p=rr.profile||{};
     if(valid(p.sire))h.sire=p.sire;
     if(valid(p.dam))h.dam=p.dam;
     if(valid(p.damsire))h.damsire=p.damsire;
     if((!h.history||!h.history.length)&&Array.isArray(rr.history)&&rr.history.length){
      h.history=rr.history.slice(0,5);
      try{h.histScores=scoreLocalHistory(h.history);h.histScores.available=true;mergeNetkeibaWithJra(h)}catch(e){}
      h.netkeibaVia='netkeiba-mobile-id';h.netkeibaRejected=false;h.netkeibaError='';
     }
    }
   }catch(e){console.warn('mobileFill',e)}
  }
  const baseImport=jraImport;
  jraImport=async function(url){const j=await baseImport(url);if(/netkeiba\.com/i.test(String(url||''))){await mobileFill(j.horses||[]);for(const h of j.horses||[]){if(!valid(h.sire))h.sire='';if(!valid(h.dam))h.dam='';if(!valid(h.damsire))h.damsire='';}}return j};
  const baseHist=loadNetkeibaHistories;
  loadNetkeibaHistories=async function(opts={}){const res=await baseHist(opts);await mobileFill(horses);renderHorses();try{evalAll();if(typeof renderPaceReason==='function')renderPaceReason()}catch(e){};const ok=horses.filter(h=>(h.history||[]).length).length,totalRuns=horses.reduce((n,h)=>n+Math.min(5,(h.history||[]).length),0),jraN=horses.filter(h=>(h.jra_history||[]).length).length;const hc=document.getElementById('histCount');if(hc)hc.textContent=`netkeiba ${ok}/${horses.length}頭・合計${totalRuns}走 / JRA照合 ${jraN}頭`;if(!opts.silent&&typeof status==='function')status('histStatus',`netkeiba ${ok}/${horses.length}頭・合計${totalRuns}走を使用。`);return {...res,ok,total:horses.length,totalRuns}};
 };
 wait();
})();
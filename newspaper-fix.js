(()=>{
  const NEWSPAPER_API='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/netkeiba-newspaper-v1';
  const wait=()=>{
    if(!window.__coreFixApplied||typeof jraImport!=='function'||typeof loadNetkeibaHistories!=='function'||!document.getElementById('raceUrl')){setTimeout(wait,80);return;}
    if(window.__newspaperFixApplied)return;
    window.__newspaperFixApplied=true;

    const isNk=u=>/netkeiba\.com/i.test(String(u||''));
    const nm=v=>String(v||'').trim();
    const n=v=>Number.isFinite(+v)?+v:null;

    async function fetchPaper(url){
      const r=await fetch(NEWSPAPER_API,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','Cache-Control':'no-cache'},body:JSON.stringify({url})});
      const j=await r.json().catch(()=>({error:'競馬新聞APIの応答を読めません'}));
      if(!r.ok)throw new Error(j.error||'競馬新聞取得エラー');
      return j;
    }

    function applyPaperRow(h,p){
      if(!h||!p)return;
      if(p.horse_id){h.horse_id=p.horse_id;h.netkeiba_horse_id=p.horse_id;}
      if(p.sire)h.sire=p.sire;
      if(p.dam)h.dam=p.dam;
      if(p.damsire)h.damsire=p.damsire;
      if(['逃','先','差','追'].includes(p.style))h.style=p.style;
      if(Array.isArray(p.history)&&p.history.length){
        h.history=p.history.slice(0,5);
        try{h.histScores=scoreLocalHistory(h.history);h.histScores.available=true;}catch(e){}
        h.netkeibaVia='競馬新聞';h.netkeibaRejected=false;h.netkeibaError='';
        try{mergeNetkeibaWithJra(h)}catch(e){}
      }
      const o=n(p.forecast_odds),pop=n(p.forecast_popularity);
      if(o!==null){h.forecast_odds=o;h.odds=o;}
      if(pop!==null){h.forecast_popularity=pop;h.popularity=pop;}
    }

    async function overlayFromPaper(list,url){
      const j=await fetchPaper(url);
      const mp=new Map((j.horses||[]).map(x=>[nm(x.name),x]));
      for(const h of list||[]){const p=mp.get(nm(h.name));if(p)applyPaperRow(h,p)}
      return j;
    }

    const baseImport=jraImport;
    jraImport=async function(url){
      const j=await baseImport(url);
      if(j&&Array.isArray(j.horses)&&isNk(url)){
        try{await overlayFromPaper(j.horses,url)}catch(e){console.warn('newspaper overlay import',e)}
      }
      return j;
    };

    const baseLoad=loadNetkeibaHistories;
    loadNetkeibaHistories=async function({silent=false,force=false}={}){
      const url=document.getElementById('raceUrl')?.value||'';
      if(!isNk(url))return baseLoad({silent,force});
      if(!horses.length){if(!silent)status('histStatus','先に出馬表を取り込んでください。',true);return {ok:0,total:0};}
      try{
        if(!silent)status('histStatus','netkeiba競馬新聞から全頭データを取得中…');
        const j=await overlayFromPaper(horses,url);
        let missing=horses.filter(h=>!(h.history||[]).length);
        if(missing.length){
          try{await baseLoad({silent:true,force:false})}catch(e){console.warn('history fallback',e)}
        }
        renderHorses();
        try{evalAll()}catch(e){}
        try{renderPaceReason()}catch(e){}
        const ok=horses.filter(h=>(h.history||[]).length).length;
        const totalRuns=horses.reduce((s,h)=>s+Math.min(5,(h.history||[]).length),0);
        const hc=document.getElementById('histCount');
        if(hc)hc.textContent='netkeiba競馬新聞 '+ok+'/'+horses.length+'頭・合計'+totalRuns+'走 / JRA照合 0頭';
        if(!silent)status('histStatus','netkeiba競馬新聞 '+ok+'/'+horses.length+'頭・合計'+totalRuns+'走を使用。');
        return {ok,total:horses.length,totalRuns,source:'newspaper',paper:j.paper_url||''};
      }catch(e){
        console.warn('newspaper history',e);
        return baseLoad({silent,force});
      }
    };

    function repairDisplayedLabels(){
      if(!isNk(document.getElementById('raceUrl')?.value))return;
      document.querySelectorAll('.card').forEach(el=>{
        let s=el.innerHTML;
        s=s.replace(/予想単勝\s*([0-9.]+)倍\s*\/\s*予想(\d+)番人気/g,'予想単勝 $1倍 / 予想$2番人気');
        if(s!==el.innerHTML)el.innerHTML=s;
      });
    }
    let t=0;new MutationObserver(()=>{clearTimeout(t);t=setTimeout(repairDisplayedLabels,80)}).observe(document.body,{subtree:true,childList:true});
  };
  wait();
})();

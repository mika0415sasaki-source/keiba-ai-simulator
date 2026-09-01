(()=>{
  const NETKEIBA_RACE_IMPORT='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/netkeiba-race-import';
  const MEMORY_API_URL='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/keiba-memory-v55';
  const wait=()=>{
    if(!window.__independentPatchApplied||typeof jraImport!=='function'||!document.getElementById('raceUrl')){setTimeout(wait,40);return;}
    if(window.__forecastOddsFixApplied)return;
    window.__forecastOddsFixApplied=true;

    const baseJraImport=jraImport;
    async function saveHorses(list){
      try{await fetch(MEMORY_API_URL,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','Cache-Control':'no-cache'},body:JSON.stringify({action:'save_horses',horses:list})})}catch(e){console.warn('save_horses',e)}
    }

    jraImport=async function(url){
      const s=String(url||'').trim();
      if(!/netkeiba\.com/i.test(s))return baseJraImport(url);

      const r=await fetch(NETKEIBA_RACE_IMPORT,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','Cache-Control':'no-cache'},body:JSON.stringify({url:s})});
      const j=await r.json().catch(()=>({error:'netkeiba出馬表の応答を読み込めません'}));
      if(!r.ok)throw new Error(j.error||'netkeiba出馬表取込エラー');

      window.__preentryMode=true;
      j.horses=(j.horses||[]).map((h,i)=>{
        const fo=Number.isFinite(+h.forecast_odds)?+h.forecast_odds:(Number.isFinite(+h.odds)?+h.odds:null);
        const fp=Number.isFinite(+h.forecast_popularity)?+h.forecast_popularity:(Number.isFinite(+h.popularity)?+h.popularity:null);
        return {...h,no:i+1,odds:fo,popularity:fp,forecast_odds:fo,forecast_popularity:fp,jra_history:[],provisional:true,provisional_no:true,odds_type:'forecast'};
      });
      await saveHorses(j.horses);
      j.meta={...(j.meta||{}),source:'netkeiba',provisional:true,odds_type:'forecast'};
      return j;
    };

    const relabel=()=>{
      if(!(window.__preentryMode||/netkeiba\.com/i.test(String(document.getElementById('raceUrl')?.value||''))))return;
      document.querySelectorAll('#raceStatus,#evidence,#ranking,.card').forEach(el=>{
        let s=el.innerHTML;
        s=s.replace(/実オッズ\s*：\s*単勝/g,'予想オッズ：単勝')
           .replace(/オッズ\s*：\s*単勝/g,'予想オッズ：単勝')
           .replace(/単勝\s*([0-9.]+)倍\s*\/\s*(\d+)番人気/g,'予想単勝 $1倍 / 予想$2番人気');
        if(s!==el.innerHTML)el.innerHTML=s;
      });
    };
    new MutationObserver(()=>setTimeout(relabel,10)).observe(document.body,{subtree:true,childList:true});
  };
  wait();
})();

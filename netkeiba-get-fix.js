(()=>{
  const API='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/netkeiba-race-import';
  const wait=()=>{
    if(typeof jraImport!=='function'||!document.getElementById('raceUrl')){setTimeout(wait,80);return;}
    if(window.__netkeibaGetFixApplied)return;
    window.__netkeibaGetFixApplied=true;
    const base=jraImport;
    jraImport=async function(url){
      const s=String(url||'').trim();
      if(!/netkeiba\.com/i.test(s)) return base(url);
      const r=await fetch(API+'?url='+encodeURIComponent(s)+'&t='+Date.now(),{method:'GET',cache:'no-store'});
      let j={};
      try{j=await r.json()}catch{throw new Error('netkeiba出馬表の応答を読み込めません')}
      if(!r.ok)throw new Error(j.error||'netkeiba出馬表取込エラー');
      window.__preentryMode=true;
      try{oddsCache={race_id:'',win:{},wide:{},trio:{},fetched_at:null}}catch(e){}
      j.horses=(j.horses||[]).map((h,i)=>{
        const fo=Number.isFinite(+h.forecast_odds)?+h.forecast_odds:(Number.isFinite(+h.odds)?+h.odds:null);
        return {...h,no:i+1,forecast_odds:fo,odds:fo,forecast_popularity:h.forecast_popularity??h.popularity??null,popularity:h.popularity??h.forecast_popularity??null,jra_history:[],provisional:true,provisional_no:true};
      });
      if(typeof saveImportedHorses==='function'){try{await saveImportedHorses(j.horses)}catch(e){}}
      j.meta={...(j.meta||{}),source:'netkeiba',provisional:true,odds_type:'forecast'};
      return j;
    };
  };
  wait();
})();

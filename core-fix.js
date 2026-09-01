(()=>{
  const RACE_API='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/netkeiba-race-import';
  const HIST_API='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/netkeiba-horse-history-v2';
  const FALLBACK_API='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/keiba-netkeiba-fallback';
  const MEMORY_API='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/keiba-memory-v55';
  const wait=()=>{
    if(!window.__independentPatchApplied||typeof jraImport!=='function'||typeof loadNetkeibaHistories!=='function'||typeof renderHorses!=='function'||!document.getElementById('raceUrl')){setTimeout(wait,60);return}
    if(window.__coreFixApplied)return; window.__coreFixApplied=true;

    const isNk=u=>/netkeiba\.com/i.test(String(u||''));
    const n=v=>Number.isFinite(+v)?+v:null;
    const validHist=r=>r&&n(r.rank)>0&&n(r.distance)>0;
    const score=(h)=>{try{h.histScores=scoreLocalHistory(h.history||[]);h.histScores.available=(h.history||[]).length>0}catch(e){}};
    const merge=(h)=>{try{mergeNetkeibaWithJra(h)}catch(e){}};
    function apply(h,rows,via){
      const seen=new Set(),out=[];
      for(const r of (rows||[])){
        if(!validHist(r))continue;
        const x={...r,rank:+r.rank,distance:+r.distance,last3f:Number.isFinite(+r.last3f)?+r.last3f:null,passage:Array.isArray(r.passage)?r.passage:[],source:r.source||via};
        const k=[x.date,x.venue,x.surface,x.distance,x.rank].join('|');if(seen.has(k))continue;seen.add(k);out.push(x);if(out.length>=5)break;
      }
      if(!out.length)return false;
      h.history=out;h.netkeibaVia=via;h.netkeibaRejected=false;h.netkeibaError='';score(h);merge(h);return true;
    }
    async function saveHorses(list){try{await fetch(MEMORY_API,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'save_horses',horses:list})})}catch(e){console.warn(e)}}

    const baseJraImport=jraImport;
    jraImport=async function(url){
      const s=String(url||'').trim();
      if(!isNk(s)){window.__preentryMode=false;return baseJraImport(url)}
      const r=await fetch(RACE_API+'?url='+encodeURIComponent(s)+'&t='+Date.now(),{method:'GET',cache:'no-store',headers:{'Cache-Control':'no-cache'}});
      const j=await r.json().catch(()=>({error:'netkeiba出馬表の応答を読めません'}));
      if(!r.ok)throw new Error(j.error||'netkeiba出馬表取込エラー');
      window.__preentryMode=true;
      try{oddsCache={race_id:'',win:{},wide:{},trio:{},fetched_at:null}}catch(e){}
      j.horses=(j.horses||[]).map((h,i)=>{
        const fo=n(h.forecast_odds??h.odds),fp=n(h.forecast_popularity??h.popularity);
        return {...h,no:i+1,forecast_odds:fo,odds:fo,forecast_popularity:fp,popularity:fp,jra_history:[],provisional:true,provisional_no:true,odds_type:'forecast'};
      });
      // 重要：人気順はnetkeiba掲載値をそのまま使う。オッズ順から作り直さない。
      await saveHorses(j.horses);
      j.meta={...(j.meta||{}),source:'netkeiba',provisional:true,odds_type:'forecast'};
      return j;
    };

    loadNetkeibaHistories=async function({silent=false,force=false}={}){
      if(!horses.length){if(!silent&&typeof status==='function')status('histStatus','先に出馬表を取り込んでください。',true);return {ok:0,total:0}}
      if(!silent&&typeof status==='function')status('histStatus','netkeiba過去5走を全頭確認中…');
      try{
        // 1) 出馬表から取れた馬IDで全頭を直接取得
        const items=horses.map(h=>({name:h.name,id:String(h.netkeiba_horse_id||h.horse_id||'')}));
        try{
          const r=await fetch(HIST_API,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','Cache-Control':'no-cache'},body:JSON.stringify({items})});
          const j=await r.json();
          if(r.ok)for(const rr of j.results||[]){const h=horses.find(x=>x.name===rr.name);if(h&&rr.available)apply(h,rr.history,'netkeiba-id-v2')}
        }catch(e){console.warn('history-v2',e)}

        // 2) ID直取得で残った馬だけ既存の検索系で救済
        let missing=horses.filter(h=>(h.history||[]).length<1);
        if(missing.length){
          try{
            const horse_ids={};for(const h of missing){const id=String(h.netkeiba_horse_id||h.horse_id||'');if(id)horse_ids[h.name]=id}
            const r=await fetch(FALLBACK_API,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({names:missing.map(h=>h.name),race_url:document.getElementById('raceUrl').value,horse_ids})});
            const j=await r.json();if(r.ok)for(const rr of j.results||[]){const h=horses.find(x=>x.name===rr.name);if(h&&rr.available)apply(h,rr.history,rr.via||'fallback')}
          }catch(e){console.warn('history-fallback',e)}
        }

        renderHorses();try{evalAll();if(typeof renderPaceReason==='function')renderPaceReason()}catch(e){}
        const ok=horses.filter(h=>(h.history||[]).length>0).length,totalRuns=horses.reduce((a,h)=>a+Math.min(5,(h.history||[]).length),0),jraN=horses.filter(h=>(h.jra_history||[]).length>0).length;
        const hc=document.getElementById('histCount');if(hc)hc.textContent=`netkeiba ${ok}/${horses.length}頭・合計${totalRuns}走 / JRA照合 ${jraN}頭`;
        if(!silent&&typeof status==='function')status('histStatus',`netkeiba ${ok}/${horses.length}頭・合計${totalRuns}走を使用。`);
        return {ok,total:horses.length,totalRuns};
      }catch(e){if(!silent&&typeof status==='function')status('histStatus','netkeiba取得処理でエラー：'+(e.message||String(e)),true);return {ok:0,total:horses.length,error:e}}
    };

    // ラベルは表示時だけ一度変換。人気値そのものは変更しない。
    function relabel(){
      if(!isNk(document.getElementById('raceUrl')?.value))return;
      document.querySelectorAll('.card').forEach(el=>{
        let s=el.innerHTML;
        s=s.replace(/単勝\s*([0-9.]+)倍\s*\/\s*(\d+)番人気/g,'予想単勝 $1倍 / 予想$2番人気');
        s=s.replace(/単勝\s*([0-9.]+)倍\s*\/\s*人気未確定/g,'予想単勝 $1倍 / 予想人気未確定');
        if(s!==el.innerHTML)el.innerHTML=s;
      });
    }
    let t=0;new MutationObserver(()=>{clearTimeout(t);t=setTimeout(relabel,40)}).observe(document.body,{subtree:true,childList:true});
  };
  wait();
})();

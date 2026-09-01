(()=>{
 const RACE_API='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/netkeiba-race-import';
 const HIST_API='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/netkeiba-horse-history-v3';
 const FORECAST_API='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/netkeiba-forecast-v2';
 const MEMORY_API='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/keiba-memory-v55';
 const wait=()=>{
  if(!window.__independentPatchApplied||typeof jraImport!=='function'||typeof loadNetkeibaHistories!=='function'||typeof renderHorses!=='function'||!document.getElementById('raceUrl')){setTimeout(wait,60);return}
  if(window.__coreFixApplied)return;window.__coreFixApplied=true;
  const isNk=u=>/netkeiba\.com/i.test(String(u||''));
  const num=v=>Number.isFinite(+v)?+v:null;
  const baseImport=jraImport;
  async function saveHorses(list){try{await fetch(MEMORY_API,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'save_horses',horses:list})})}catch(e){console.warn(e)}}
  function applyHistory(h,rows,via){
   const out=[],seen=new Set();
   for(const r of rows||[]){const rank=num(r.rank),distance=num(r.distance);if(!rank||!distance)continue;const x={...r,rank,distance,last3f:num(r.last3f),passage:Array.isArray(r.passage)?r.passage:[],source:r.source||via};const k=[x.date,x.venue,x.surface,x.distance,x.rank].join('|');if(seen.has(k))continue;seen.add(k);out.push(x);if(out.length===5)break}
   if(!out.length)return false;h.history=out;h.netkeibaVia=via;h.netkeibaRejected=false;h.netkeibaError='';try{h.histScores=scoreLocalHistory(out);h.histScores.available=true;mergeNetkeibaWithJra(h)}catch(e){}return true;
  }
  async function refreshForecast(url,list){
   try{const r=await fetch(FORECAST_API,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','Cache-Control':'no-cache'},body:JSON.stringify({url,names:list.map(h=>h.name)})});const j=await r.json();if(!r.ok)return;for(const rr of j.results||[]){const h=list.find(x=>x.name===rr.name);if(!h)continue;const o=num(rr.odds),p=num(rr.popularity);if(o!==null){h.forecast_odds=o;h.odds=o}if(p!==null){h.forecast_popularity=p;h.popularity=p}}}catch(e){console.warn('forecast',e)}
  }
  jraImport=async function(url){
   const s=String(url||'').trim();if(!isNk(s)){window.__preentryMode=false;return baseImport(url)}
   const r=await fetch(RACE_API+'?url='+encodeURIComponent(s)+'&t='+Date.now(),{method:'GET',cache:'no-store',headers:{'Cache-Control':'no-cache'}});const j=await r.json().catch(()=>({error:'netkeiba出馬表の応答を読めません'}));if(!r.ok)throw new Error(j.error||'netkeiba出馬表取込エラー');window.__preentryMode=true;try{oddsCache={race_id:'',win:{},wide:{},trio:{},fetched_at:null}}catch(e){}
   j.horses=(j.horses||[]).map((h,i)=>({...h,no:i+1,jra_history:[],provisional:true,provisional_no:true,odds_type:'forecast'}));
   await refreshForecast(s,j.horses);
   for(const h of j.horses){const o=num(h.forecast_odds??h.odds),p=num(h.forecast_popularity??h.popularity);h.forecast_odds=o;h.odds=o;h.forecast_popularity=p;h.popularity=p}
   await saveHorses(j.horses);j.meta={...(j.meta||{}),source:'netkeiba',provisional:true,odds_type:'forecast'};return j;
  };
  loadNetkeibaHistories=async function({silent=false}={}){
   if(!horses.length){if(!silent&&typeof status==='function')status('histStatus','先に出馬表を取り込んでください。',true);return {ok:0,total:0}}
   if(!silent&&typeof status==='function')status('histStatus','netkeiba過去5走を全頭確認中…');
   try{
    const items=horses.map(h=>({name:h.name,id:String(h.netkeiba_horse_id||h.horse_id||'')}));const r=await fetch(HIST_API,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','Cache-Control':'no-cache'},body:JSON.stringify({items})});const j=await r.json();if(r.ok)for(const rr of j.results||[]){const h=horses.find(x=>x.name===rr.name);if(h&&rr.available)applyHistory(h,rr.history,'netkeiba-table-v3')}
    renderHorses();try{evalAll();if(typeof renderPaceReason==='function')renderPaceReason()}catch(e){}
    const ok=horses.filter(h=>(h.history||[]).length>0).length,totalRuns=horses.reduce((a,h)=>a+Math.min(5,(h.history||[]).length),0),jraN=horses.filter(h=>(h.jra_history||[]).length>0).length;const hc=document.getElementById('histCount');if(hc)hc.textContent=`netkeiba ${ok}/${horses.length}頭・合計${totalRuns}走 / JRA照合 ${jraN}頭`;if(!silent&&typeof status==='function')status('histStatus',`netkeiba ${ok}/${horses.length}頭・合計${totalRuns}走を使用。`);return {ok,total:horses.length,totalRuns}
   }catch(e){if(!silent&&typeof status==='function')status('histStatus','netkeiba取得処理でエラー：'+(e.message||String(e)),true);return {ok:0,total:horses.length,error:e}}
  };
  function relabel(){if(!isNk(document.getElementById('raceUrl')?.value))return;document.querySelectorAll('.card').forEach(el=>{let s=el.innerHTML;s=s.replace(/単勝\s*([0-9.]+)倍\s*\/\s*(\d+)番人気/g,'予想単勝 $1倍 / 予想$2番人気').replace(/単勝\s*([0-9.]+)倍\s*\/\s*人気未確定/g,'予想単勝 $1倍 / 予想人気未確定');if(s!==el.innerHTML)el.innerHTML=s})}
  let t=0;new MutationObserver(()=>{clearTimeout(t);t=setTimeout(relabel,50)}).observe(document.body,{subtree:true,childList:true});
 };
 wait();
})();
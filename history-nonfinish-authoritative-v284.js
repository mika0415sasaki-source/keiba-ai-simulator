(()=>{
  if(window.__historyNonfinishAuthoritativeV284Safe)return;
  window.__historyNonfinishAuthoritativeV284Safe=true;
  const API='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/netkeiba-completed-history-v1';
  const clean=v=>String(v||'').normalize('NFKC').replace(/[\s　]+/g,'').trim();
  const list=()=>{try{if(typeof horses!=='undefined'&&Array.isArray(horses))return horses}catch(_){}return Array.isArray(window.horses)?window.horses:[]};
  const horseId=h=>String(h?.netkeiba_horse_id||h?.horse_id||'').replace(/\D/g,'');
  const canonical=new Map();let busy=false,lastKey='',lastSync=0;
  const KNOWN={'サムシングスイート':[{date:'2026/04/26',venue:'東京',status:'取消',race_name:'フローラS'}],'ロングトールサリー':[{date:'2026/04/18',venue:'阪神',status:'取消',race_name:'3歳1勝クラス'}]};
  function dateParts(v){const s=String(v||'').normalize('NFKC').replace(/[.\-年]/g,'/').replace(/月/g,'/').replace(/日/g,'');const m=s.match(/(?:(20\d{2})\/)?(\d{1,2})\/(\d{1,2})/);return m?{y:m[1]||'',m:String(+m[2]).padStart(2,'0'),d:String(+m[3]).padStart(2,'0')}:null}
  function sameDate(a,b){const x=dateParts(a),y=dateParts(b);return !!x&&!!y&&x.m===y.m&&x.d===y.d&&(!x.y||!y.y||x.y===y.y)}
  function venue(v){const s=clean(v).replace(/^\d+回?/,'').replace(/\d+日$/,'');const vs=['札幌','函館','福島','新潟','東京','中山','中京','京都','阪神','小倉','門別','盛岡','水沢','浦和','船橋','大井','川崎','金沢','笠松','名古屋','園田','姫路','高知','佐賀'];return vs.find(x=>s.includes(x))||s}
  function sameRun(run,ex){if(!run||!ex||!sameDate(run.date,ex.date))return false;const a=venue(run.venue||run.course),b=venue(ex.venue||ex.course);return !(a&&b&&a!==b)}
  function cloneRows(rows){return (rows||[]).map(r=>({...r,passage:Array.isArray(r.passage)?[...r.passage]:[]}))}
  function score(h){try{if(typeof scoreLocalHistory==='function'&&Array.isArray(h.history)&&h.history.length){h.histScores=scoreLocalHistory(h.history);if(h.histScores)h.histScores.available=true}}catch(_){} }
  function purgeKnown(h){const xs=KNOWN[clean(h?.name)]||[];if(!xs.length)return false;let changed=false;for(const field of ['history','jra_history']){if(!Array.isArray(h[field]))continue;const before=h[field].length;h[field]=h[field].filter(run=>!xs.some(ex=>sameRun(run,ex)));if(h[field].length!==before)changed=true}h.nonfinish_history=[...(Array.isArray(h.nonfinish_history)?h.nonfinish_history:[]),...xs].filter((x,i,a)=>a.findIndex(y=>sameRun(x,y))===i);if(changed)score(h);return changed}
  function enforceHorse(h){purgeKnown(h);const row=canonical.get(clean(h?.name));if(!row)return false;h.history=cloneRows(row.history).slice(0,5);const excluded=cloneRows(row.excluded_runs);h.nonfinish_history=excluded;if(Array.isArray(h.jra_history)&&excluded.length)h.jra_history=h.jra_history.filter(run=>!excluded.some(ex=>sameRun(run,ex)));score(h);return true}
  function enforceAll(){let changed=false;for(const h of list())if(enforceHorse(h))changed=true;return changed}
  async function sync(force=false){
    if(busy)return false;const hs=list();if(!hs.length)return false;for(const h of hs)purgeKnown(h);
    const items=hs.map(h=>({name:h.name,id:horseId(h)})).filter(x=>/^\d{10}$/.test(x.id));if(!items.length)return false;
    const key=items.map(x=>clean(x.name)+':'+x.id).join('|');if(!force&&key===lastKey&&Date.now()-lastSync<60000){enforceAll();return true}
    busy=true;const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),8000);
    try{const r=await fetch(API,{method:'POST',cache:'no-store',signal:ac.signal,headers:{'Content-Type':'application/json','Cache-Control':'no-cache'},body:JSON.stringify({items})});const j=await r.json().catch(()=>({results:[]}));if(!r.ok)throw new Error(j?.error||('HTTP '+r.status));for(const row of j.results||[]){const combined=[...(Array.isArray(row?.excluded_runs)?row.excluded_runs:[]),...(KNOWN[clean(row?.name)]||[])].filter(Boolean);const history=Array.isArray(row?.history)?row.history:[];if(combined.length&&history.length)canonical.set(clean(row.name),{history,excluded_runs:combined})}lastKey=key;lastSync=Date.now();enforceAll();return true}catch(e){console.warn('history nonfinish authoritative v284 safe',e);enforceAll();return false}finally{clearTimeout(timer);busy=false}
  }
  function wrapRender(){try{if(typeof renderHorses!=='function'||renderHorses.__historyNonfinishAuthoritativeV284Safe)return;const original=renderHorses;const wrapped=function(){enforceAll();return original.apply(this,arguments)};wrapped.__historyNonfinishAuthoritativeV284Safe=true;renderHorses=wrapped;try{window.renderHorses=wrapped}catch(_){}}catch(_){} }
  function wrapEval(){try{if(typeof evalAll!=='function'||evalAll.__historyNonfinishAuthoritativeV284Safe)return;const original=evalAll;const wrapped=function(){enforceAll();return original.apply(this,arguments)};wrapped.__historyNonfinishAuthoritativeV284Safe=true;evalAll=wrapped;try{window.evalAll=wrapped}catch(_){}}catch(_){} }
  function install(){wrapRender();wrapEval();enforceAll()}
  let syncTimer=0;const schedule=()=>{clearTimeout(syncTimer);syncTimer=setTimeout(()=>sync(false),500)};
  window.__syncCompletedHistoryV284=sync;install();
  addEventListener('keiba-data-updated',()=>{install();schedule()});
  addEventListener('pageshow',install);
})();
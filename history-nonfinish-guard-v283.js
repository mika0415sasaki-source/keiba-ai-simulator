(()=>{
  if(window.__historyNonfinishGuardV283)return;
  window.__historyNonfinishGuardV283=true;

  const STATUS_API='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/netkeiba-horse-history-v3';
  const clean=v=>String(v||'').normalize('NFKC').replace(/[\s　]+/g,'').trim();
  const list=()=>{try{if(typeof horses!=='undefined'&&Array.isArray(horses))return horses}catch(_){}return Array.isArray(window.horses)?window.horses:[]};
  const horseId=h=>String(h?.netkeiba_horse_id||h?.horse_id||'').trim();
  const excludedByName=new Map();
  let busy=false,lastKey='',lastSync=0,rerendering=false,reevaluating=false;

  function dateParts(v){
    const s=String(v||'').normalize('NFKC').replace(/[.\-年]/g,'/').replace(/月/g,'/').replace(/日/g,'');
    const m=s.match(/(?:(20\d{2})\/)?(\d{1,2})\/(\d{1,2})/);
    return m?{y:m[1]||'',m:String(+m[2]).padStart(2,'0'),d:String(+m[3]).padStart(2,'0')}:null;
  }
  function sameDate(a,b){
    const x=dateParts(a),y=dateParts(b);if(!x||!y)return false;
    return x.m===y.m&&x.d===y.d&&(!x.y||!y.y||x.y===y.y);
  }
  function venue(v){
    const s=clean(v).replace(/^\d+回?/,'').replace(/\d+日$/,'');
    const vs=['札幌','函館','福島','新潟','東京','中山','中京','京都','阪神','小倉','門別','盛岡','水沢','浦和','船橋','大井','川崎','金沢','笠松','名古屋','園田','姫路','高知','佐賀'];
    return vs.find(x=>s.includes(x))||s;
  }
  function sameRun(run,excluded){
    if(!run||!excluded||!sameDate(run.date,excluded.date))return false;
    const a=venue(run.venue||run.course),b=venue(excluded.venue||excluded.course);
    if(a&&b&&a!==b)return false;
    return true;
  }
  function statusText(v){
    const s=String(v||'').normalize('NFKC').replace(/\s+/g,'');
    if(/取消|出走取消/.test(s)||s==='取')return'取消';
    if(/除外|競走除外/.test(s)||s==='除')return'除外';
    if(/中止|競走中止/.test(s)||s==='中')return'中止';
    if(/失格/.test(s)||s==='失')return'失格';
    return s||'非完走';
  }

  function purgeHorse(h){
    const excluded=excludedByName.get(clean(h?.name))||[];
    if(!excluded.length)return false;
    let changed=false;
    for(const field of ['history','jra_history']){
      if(!Array.isArray(h[field]))continue;
      const before=h[field].length;
      h[field]=h[field].filter(run=>!excluded.some(ex=>sameRun(run,ex)));
      if(h[field].length!==before)changed=true;
    }
    h.nonfinish_history=excluded.map(ex=>({...ex,status:statusText(ex.status)}));
    if(changed){
      try{
        if(typeof scoreLocalHistory==='function'&&Array.isArray(h.history)&&h.history.length){
          h.histScores=scoreLocalHistory(h.history);if(h.histScores)h.histScores.available=true;
        }
      }catch(_){}
    }
    return changed;
  }
  function applyCached(){
    let changed=false;
    for(const h of list())if(purgeHorse(h))changed=true;
    return changed;
  }

  async function recoverCompletedRuns(){
    try{
      if(typeof window.__recoverRaceDataV271!=='function')return false;
      const ok=await window.__recoverRaceDataV271(true);
      applyCached();
      return !!ok;
    }catch(_){return false}
  }

  async function sync(force=false){
    if(busy)return false;
    const hs=list();
    const items=hs.map(h=>({name:h.name,id:horseId(h)})).filter(x=>/^\d{10}$/.test(x.id));
    if(!items.length)return false;
    const key=items.map(x=>clean(x.name)+':'+x.id).join('|');
    if(!force&&key===lastKey&&Date.now()-lastSync<60000){applyCached();return true}
    busy=true;
    try{
      const r=await fetch(STATUS_API,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','Cache-Control':'no-cache'},body:JSON.stringify({items})});
      const j=await r.json().catch(()=>({results:[]}));
      if(!r.ok)throw new Error(j?.error||('HTTP '+r.status));
      excludedByName.clear();
      for(const row of j.results||[]){
        const xs=(row?.excluded_runs||[]).filter(ex=>/取消|除外|中止|失格|列ずれ疑い/.test(String(ex?.status||'')));
        if(xs.length)excludedByName.set(clean(row.name),xs);
      }
      lastKey=key;lastSync=Date.now();
      const changed=applyCached();
      if(changed){
        let ok=await recoverCompletedRuns();
        if(!ok)setTimeout(()=>recoverCompletedRuns(),2200);
      }
      applyCached();
      return true;
    }catch(e){console.warn('history nonfinish guard v283',e);return false}
    finally{busy=false}
  }

  function wrapRender(){
    try{
      if(typeof renderHorses!=='function'||renderHorses.__historyNonfinishGuardV283)return;
      const original=renderHorses;
      const wrapped=function(){
        applyCached();
        const value=original.apply(this,arguments);
        const changed=applyCached();
        if(changed&&!rerendering){
          rerendering=true;
          try{original.apply(this,arguments)}catch(_){}
          rerendering=false;
        }
        return value;
      };
      wrapped.__historyNonfinishGuardV283=true;wrapped.__original=original;
      renderHorses=wrapped;try{window.renderHorses=wrapped}catch(_){}
    }catch(_){}
  }
  function wrapEval(){
    try{
      if(typeof evalAll!=='function'||evalAll.__historyNonfinishGuardV283)return;
      const original=evalAll;
      const wrapped=function(){
        applyCached();
        const value=original.apply(this,arguments);
        const changed=applyCached();
        if(changed&&!reevaluating){
          reevaluating=true;
          try{original.apply(this,arguments)}catch(_){}
          reevaluating=false;
        }
        return value;
      };
      wrapped.__historyNonfinishGuardV283=true;wrapped.__original=original;
      evalAll=wrapped;try{window.evalAll=wrapped}catch(_){}
    }catch(_){}
  }
  function install(){wrapRender();wrapEval();applyCached()}

  window.__reconcileNonFinishV283=sync;
  document.addEventListener('click',e=>{
    const t=e.target;if(!t)return;
    if(t.id==='importRace'||t.id==='importHist'||t.id==='analyze'||/出馬表取込|過去5走を再取得|AI分析/.test(String(t.textContent||''))){
      setTimeout(()=>sync(true),900);
      setTimeout(()=>sync(false),4200);
    }
  },true);

  let tries=0;const tick=()=>{tries++;install();if(tries<50)setTimeout(tick,400)};setTimeout(tick,80);
  setTimeout(()=>sync(true),1400);
  setTimeout(()=>sync(false),5200);
})();
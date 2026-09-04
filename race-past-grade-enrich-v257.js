(()=>{
  if(window.__racePastGradeEnrichV261)return;
  window.__racePastGradeEnrichV261=true;
  const API='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/netkeiba-race-past-grades-v1';
  const clean=v=>String(v||'').normalize('NFKC').replace(/[\s　]+/g,'').trim();
  const missing=v=>{const s=clean(v);return !s||/格情報なし|格未取得|未取得|不明|中立/.test(s)};
  const dateKey=v=>{const s=String(v||'').replace(/[.\-]/g,'/');const m=s.match(/(?:(20\d{2})\/)?(\d{1,2})\/(\d{1,2})/);return m?`${String(m[2]).padStart(2,'0')}/${String(m[3]).padStart(2,'0')}`:''};
  const list=()=>{try{if(typeof horses!=='undefined'&&Array.isArray(horses))return horses}catch(_){}return Array.isArray(window.horses)?window.horses:[]};
  const sameRun=(a,b)=>dateKey(a?.date)&&dateKey(a?.date)===dateKey(b?.date)&&(!b?.venue||clean(a?.venue||a?.course)===clean(b?.venue))&&(!b?.distance||Number(a?.distance||0)===Number(b?.distance||0));
  const sortHist=arr=>[...(arr||[])].sort((a,b)=>String(b?.date||'').localeCompare(String(a?.date||'')));
  let busy=false,lastSig='',lastRows=[];
  function applyRows(rows){
    const hs=list(); if(!hs.length||!Array.isArray(rows))return false;
    let changed=false;
    for(const h of hs){
      const src=rows.find(x=>clean(x?.name)===clean(h?.name));
      if(!src||!Array.isArray(src.runs)||!Array.isArray(h.history))continue;
      const hist=sortHist(h.history);
      const past=[...src.runs];
      let horseChanged=false;
      for(let i=0;i<hist.length;i++){
        const run=hist[i];
        let m=past.find(x=>sameRun(run,x));
        // netkeiba shutuba_past is latest-run order. If the parsed cell omits date/venue,
        // use the same ordinal only; this changes grade/name fields and never replaces the run itself.
        if(!m&&past[i])m=past[i];
        if(!m)continue;
        if((!run.race_name||/未取得|不明/.test(String(run.race_name)))&&m.race_name){run.race_name=m.race_name;horseChanged=true}
        if(missing(run.grade)&&m.grade){run.grade=m.grade;horseChanged=true}
      }
      if(horseChanged){
        changed=true;
        if(typeof scoreLocalHistory==='function'&&h.history.length){try{h.histScores=scoreLocalHistory(h.history);h.histScores.available=true}catch(_){}}
      }
    }
    return changed;
  }
  async function fetchAndApply(force=false){
    if(busy)return false;
    const hs=list(); if(!hs.length)return false;
    const url=String(document.getElementById('raceUrl')?.value||'');
    if(!/netkeiba\.com/i.test(url))return false;
    const sig=url+'|'+hs.map(h=>clean(h?.name)+':'+(h?.history?.length||0)).join(',');
    if(!force&&sig===lastSig&&lastRows.length){const changed=applyRows(lastRows);if(changed&&typeof renderHorses==='function')try{renderHorses()}catch(_){}return changed}
    busy=true;
    try{
      const r=await fetch(API,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({url})});
      const j=await r.json().catch(()=>({rows:[]}));
      if(!r.ok||!Array.isArray(j.rows))return false;
      lastSig=sig;lastRows=j.rows;
      const changed=applyRows(j.rows);
      if(changed&&typeof renderHorses==='function')try{renderHorses()}catch(_){}
      return changed;
    }catch(e){console.warn('race past grade enrich',e);return false}
    finally{busy=false}
  }
  // Persist for the lifetime of the page. Import usually happens well after initial page load.
  setInterval(()=>{fetchAndApply(false)},3000);
  document.addEventListener('click',e=>{
    const t=e.target;
    if(t&&((t.id&&/import|load|analy/i.test(t.id))||(t.textContent&&/出馬表|取込|読込|AI分析/.test(t.textContent))))setTimeout(()=>fetchAndApply(true),1200);
  },true);
  setTimeout(()=>fetchAndApply(true),1200);
})();

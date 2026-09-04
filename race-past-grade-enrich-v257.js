(()=>{
  if(window.__racePastGradeEnrichV264)return;
  window.__racePastGradeEnrichV264=true;

  const API='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/netkeiba-race-past-grades-v1';
  const clean=v=>String(v||'').normalize('NFKC').replace(/[\s　]+/g,'').trim();
  const missing=v=>{const s=clean(v);return !s||/格情報なし|格未取得|未取得|不明|中立/.test(s)};
  const dateKey=v=>{const s=String(v||'').replace(/[.\-]/g,'/');const m=s.match(/(?:(20\d{2})\/)?(\d{1,2})\/(\d{1,2})/);return m?`${String(m[2]).padStart(2,'0')}/${String(m[3]).padStart(2,'0')}`:''};
  const list=()=>{try{if(typeof horses!=='undefined'&&Array.isArray(horses))return horses}catch(_){}return Array.isArray(window.horses)?window.horses:[]};
  const sameRun=(a,b)=>dateKey(a?.date)&&dateKey(a?.date)===dateKey(b?.date)&&(!b?.venue||clean(a?.venue||a?.course)===clean(b?.venue))&&(!b?.distance||Number(a?.distance||0)===Number(b?.distance||0));
  const sortHist=arr=>[...(arr||[])].sort((a,b)=>String(b?.date||'').localeCompare(String(a?.date||'')));

  function sourceRaceId(url){
    try{
      if(typeof raceIdFromUrl==='function'){
        const id=String(raceIdFromUrl(url)||'');
        if(/^20\d{10}$/.test(id))return id;
      }
    }catch(_){}
    let s=String(url||'');
    for(let i=0;i<3;i++){try{s=decodeURIComponent(s)}catch(_){break}}
    let m=s.match(/(?:race_id[=:_-]*|\/race\/)(20\d{10})/i)||s.match(/\b(20\d{10})\b/);
    if(m)return m[1];
    m=s.match(/sw01ddd(?:10|01)?(\d{2})(20\d{2})(\d{2})(\d{2})(\d{2})(?:20\d{6})?/i);
    if(m)return `${m[2]}${m[1]}${m[3]}${m[4]}${m[5]}`;
    m=s.match(/pw01(?:dde|sde)(?:10|01)?(\d{2})(20\d{2})(\d{2})(\d{2})(\d{2})(?:20\d{6})?/i);
    if(m)return `${m[2]}${m[1]}${m[3]}${m[4]}${m[5]}`;
    return '';
  }

  let busy=false,lastSig='',lastRows=[];

  function applyRows(rows){
    const hs=list();
    if(!hs.length||!Array.isArray(rows))return false;
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
        // shutuba_past は最新走順。日付等が取れないセルだけ同じ順番で補完する。
        // 過去走そのものは置換せず、レース名と格だけを足す。
        if(!m&&past[i])m=past[i];
        if(!m)continue;
        if((!run.race_name||/未取得|不明/.test(String(run.race_name)))&&m.race_name){run.race_name=m.race_name;horseChanged=true}
        if(missing(run.grade)&&m.grade){run.grade=m.grade;horseChanged=true}
      }
      if(horseChanged){
        changed=true;
        if(typeof scoreLocalHistory==='function'&&h.history.length){
          try{h.histScores=scoreLocalHistory(h.history);h.histScores.available=true}catch(_){}
        }
      }
    }
    return changed;
  }

  async function fetchAndApply(force=false){
    if(busy)return false;
    const hs=list();
    if(!hs.length)return false;
    const inputUrl=String(document.getElementById('raceUrl')?.value||'');
    const rid=sourceRaceId(inputUrl);
    if(!rid)return false;
    const sig=rid+'|'+hs.map(h=>clean(h?.name)+':'+(h?.history?.length||0)).join(',');
    if(!force&&sig===lastSig&&lastRows.length){
      const changed=applyRows(lastRows);
      if(changed&&typeof renderHorses==='function')try{renderHorses()}catch(_){}
      return changed;
    }
    busy=true;
    try{
      // APIにはURLではなく12桁race_idを渡す。
      // これでnetkeiba URLでもJRA URLでも同じ shutuba_past を参照する。
      const r=await fetch(API,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','Cache-Control':'no-cache'},body:JSON.stringify({race_id:rid})});
      const j=await r.json().catch(()=>({rows:[]}));
      if(!r.ok||!Array.isArray(j.rows))return false;
      lastSig=sig;
      lastRows=j.rows;
      const changed=applyRows(j.rows);
      if(changed&&typeof renderHorses==='function')try{renderHorses()}catch(_){}
      return changed;
    }catch(e){
      console.warn('race past grade enrich',e);
      return false;
    }finally{busy=false}
  }

  // 出馬表取込後・過去5走再取得後のどちらでも格補完を走らせる。
  setInterval(()=>{fetchAndApply(false)},3000);
  document.addEventListener('click',e=>{
    const t=e.target;
    if(t&&((t.id&&/import|load|analy/i.test(t.id))||(t.textContent&&/出馬表|過去5走|取込|読込|AI分析/.test(t.textContent)))){
      setTimeout(()=>fetchAndApply(true),1400);
    }
  },true);
  setTimeout(()=>fetchAndApply(true),1200);
})();

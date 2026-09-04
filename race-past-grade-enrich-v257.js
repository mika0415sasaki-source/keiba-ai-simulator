(()=>{
  if(window.__racePastGradeEnrichV257)return;
  window.__racePastGradeEnrichV257=true;
  const API='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/netkeiba-race-past-grades-v1';
  const clean=v=>String(v||'').normalize('NFKC').replace(/[\s　]+/g,'').trim();
  const dateKey=v=>{const s=String(v||'').replace(/[.\-]/g,'/');const m=s.match(/(?:(20\d{2})\/)?(\d{1,2})\/(\d{1,2})/);return m?`${String(m[2]).padStart(2,'0')}/${String(m[3]).padStart(2,'0')}`:''};
  const list=()=>{try{if(typeof horses!=='undefined'&&Array.isArray(horses))return horses}catch(_){}return Array.isArray(window.horses)?window.horses:[]};
  const sameRun=(a,b)=>dateKey(a?.date)&&dateKey(a?.date)===dateKey(b?.date)&&clean(a?.venue||a?.course)===clean(b?.venue)&&Number(a?.distance||0)===Number(b?.distance||0);
  async function run(){
    const hs=list(); if(!hs.length)return false;
    const url=String(document.getElementById('raceUrl')?.value||'');
    if(!/netkeiba\.com/i.test(url))return false;
    const r=await fetch(API,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({url})});
    const j=await r.json().catch(()=>({rows:[]})); if(!r.ok||!Array.isArray(j.rows))return false;
    let changed=false;
    for(const h of hs){
      const src=j.rows.find(x=>clean(x?.name)===clean(h?.name));
      if(!src||!Array.isArray(src.runs)||!Array.isArray(h.history))continue;
      let horseChanged=false;
      for(const run of h.history){
        const m=src.runs.find(x=>sameRun(run,x)); if(!m)continue;
        if(!run.race_name&&m.race_name){run.race_name=m.race_name;horseChanged=true}
        if(!run.grade&&m.grade){run.grade=m.grade;horseChanged=true}
      }
      if(horseChanged){
        changed=true;
        if(typeof scoreLocalHistory==='function'&&h.history.length){try{h.histScores=scoreLocalHistory(h.history);h.histScores.available=true}catch(_){}}
      }
    }
    if(changed&&typeof renderHorses==='function')renderHorses();
    return changed;
  }
  let n=0;const tick=async()=>{n++;try{if(await run())return}catch(e){console.warn('race past grade enrich',e)}if(n<30)setTimeout(tick,700)};setTimeout(tick,900);
})();

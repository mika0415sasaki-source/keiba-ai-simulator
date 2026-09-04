(()=>{
  if(window.__horseIdResolverV270)return;
  window.__horseIdResolverV270=true;

  const ID_API='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/netkeiba-race-horse-ids-v1';
  const HIST_API='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/netkeiba-horse-history-v4';
  const clean=v=>String(v||'').normalize('NFKC').replace(/[\s　]+/g,'').trim();
  const list=()=>{try{if(typeof horses!=='undefined'&&Array.isArray(horses))return horses}catch(_){}return Array.isArray(window.horses)?window.horses:[]};
  const raceUrl=()=>String(document.getElementById('raceUrl')?.value||'');
  const validNo=v=>Number.isFinite(+v)&&+v>=1&&+v<=18?+v:null;

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

  const dateNumber=v=>{
    const m=String(v||'').normalize('NFKC').match(/(20\d{2})[\/.\-年](\d{1,2})[\/.\-月](\d{1,2})/);
    return m?(+m[1]*10000+(+m[2])*100+(+m[3])):0;
  };
  const dateKey=v=>{
    const s=String(v||'').normalize('NFKC').replace(/[.\-]/g,'/');
    const m=s.match(/(?:(20\d{2})\/)?(\d{1,2})\/(\d{1,2})/);
    return m?`${m[1]||''}/${String(+m[2]).padStart(2,'0')}/${String(+m[3]).padStart(2,'0')}`:'';
  };
  const currentRaceDate=()=>{
    try{
      const vals=[raceMeta?.race_date,raceMeta?.date,raceMeta?.raceDate].filter(Boolean);
      for(const v of vals){const n=dateNumber(v);if(n)return n}
    }catch(_){}
    return 0;
  };
  const nonFinish=r=>/出走取消|取消|競走除外|除外|競走中止|中止|失格/.test([
    r?.status,r?.result_status,r?.finish_status,r?.rank_text,r?.result,r?.remarks,r?.note
  ].filter(Boolean).join(' ').normalize('NFKC'));

  function sameRun(a,b){
    if(!a||!b)return false;
    const da=dateKey(a.date),db=dateKey(b.date);
    if(!da||!db)return false;
    const sa=da.split('/'),sb=db.split('/');
    if(sa[1]!==sb[1]||sa[2]!==sb[2])return false;
    if(sa[0]&&sb[0]&&sa[0]!==sb[0])return false;
    const ad=+a.distance||0,bd=+b.distance||0;
    if(ad&&bd&&ad!==bd)return false;
    const av=clean(a.venue||a.course),bv=clean(b.venue||b.course);
    if(av&&bv&&av!==bv)return false;
    return true;
  }

  function rowQuality(r){
    if(!r)return 0;
    return [
      Number.isFinite(+(r.rank??r.pos))&&+(r.rank??r.pos)>0,
      !!clean(r.venue||r.course),
      !!clean(r.surface),
      Number.isFinite(+(r.distance??r.dist))&&+(r.distance??r.dist)>0,
      !!clean(r.going),
      Number.isFinite(+r.last3f),
      !!clean(r.jockey),
      !!clean(r.race_name),
      !!clean(r.grade)
    ].filter(Boolean).length;
  }
  function historyQuality(rows){
    const a=(rows||[]).filter(Boolean).slice(0,5);
    return a.length?a.reduce((n,r)=>n+rowQuality(r),0)/(a.length*9):0;
  }

  function authoritativeRows(rows){
    const cutoff=currentRaceDate();
    const out=[],seen=[];
    for(const r of [...(rows||[])].sort((a,b)=>dateNumber(b?.date)-dateNumber(a?.date))){
      if(!r||nonFinish(r))continue;
      const rank=Number(r.rank??r.pos),dist=Number(r.distance??r.dist);
      if(!Number.isFinite(rank)||rank<=0||!Number.isFinite(dist)||dist<=0)continue;
      const dn=dateNumber(r.date);
      if(cutoff&&dn&&dn>=cutoff)continue;
      if(seen.some(x=>sameRun(x,r)))continue;
      seen.push(r);out.push({...r});
      if(out.length>=5)break;
    }
    return out;
  }

  function fillMissing(target,source){
    if(!target||!source)return target;
    const textFields=['venue','surface','going','jockey','race_name','grade'];
    const numFields=['rank','distance','last3f','field_size','body_weight'];
    for(const k of textFields)if(!clean(target[k])&&clean(source[k]))target[k]=source[k];
    for(const k of numFields)if((!Number.isFinite(+target[k])||+target[k]<=0)&&Number.isFinite(+source[k])&&+source[k]>0)target[k]=source[k];
    if((!Array.isArray(target.passage)||!target.passage.length)&&Array.isArray(source.passage)&&source.passage.length)target.passage=[...source.passage];
    return target;
  }

  function mergeExactHistory(h,rows,id){
    const fresh=authoritativeRows(rows);
    if(!fresh.length)return false;
    const current=Array.isArray(h.history)?h.history:[];
    const jra=Array.isArray(h.jra_history)?h.jra_history:[];
    const merged=fresh.map(r=>{
      const z={...r};
      const old=current.find(x=>sameRun(x,r));if(old)fillMissing(z,old);
      const jr=jra.find(x=>sameRun(x,r));if(jr)fillMissing(z,jr);
      return z;
    });
    if(merged.length<5){
      for(const old of current){
        if(merged.some(x=>sameRun(x,old)))continue;
        const corroborated=h.netkeibaExactHistory||jra.some(x=>sameRun(x,old));
        if(!corroborated)continue;
        merged.push({...old});if(merged.length>=5)break;
      }
    }
    const next=merged.slice(0,5);
    const currentQ=historyQuality(current),nextQ=historyQuality(next);
    if(current.length>=5&&currentQ>nextQ+.08&&fresh.length<5)return false;
    h.history=next;
    h.netkeiba_horse_id=id;h.horse_id=id;
    h.netkeibaExactHorseId=true;h.netkeibaExactHistory=true;h.netkeibaRejected=false;h.netkeibaError='';
    try{if(typeof mergeNetkeibaWithJra==='function')mergeNetkeibaWithJra(h)}catch(_){}
    if(typeof scoreLocalHistory==='function'&&h.history?.length){try{h.histScores=scoreLocalHistory(h.history);h.histScores.available=true}catch(_){}}
    return true;
  }

  function needsEnrichment(h){
    const rows=Array.isArray(h.history)?h.history:[];
    return rows.length<5||historyQuality(rows)<.92||!String(h.netkeiba_horse_id||h.horse_id||'').trim();
  }

  function updateCounters(hs){
    const ok=hs.filter(h=>(h.history||[]).length).length;
    const totalRuns=hs.reduce((sum,h)=>sum+Math.min(5,(h.history||[]).length),0);
    const jraN=hs.filter(h=>(h.jra_history||[]).length).length;
    const count=document.getElementById('histCount');
    if(count)count.textContent=`netkeiba ${ok}/${hs.length}頭・合計${totalRuns}走 / JRA照合 ${jraN}頭`;
    const rs=document.getElementById('raceStatus');
    if(rs&&rs.innerHTML){
      rs.innerHTML=rs.innerHTML
        .replace(/netkeiba5走\s*\d+\/\d+頭/g,`netkeiba5走 ${ok}/${hs.length}頭`)
        .replace(/JRA前4走\s*\d+頭/g,`JRA前4走 ${jraN}頭`);
    }
    return ok;
  }

  let busy=false,lastSig='';
  async function run(force=false){
    if(busy)return false;
    const hs=list();if(!hs.length)return false;
    const rid=sourceRaceId(raceUrl());if(!rid)return false;
    const sig=rid+'|'+hs.map(h=>`${h.no}:${clean(h.name)}`).join(',');
    if(!force&&sig===lastSig&&!hs.some(needsEnrichment))return true;
    busy=true;
    try{
      const a=await fetch(ID_API,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','Cache-Control':'no-cache'},body:JSON.stringify({race_id:rid})});
      const ids=await a.json().catch(()=>({rows:[]}));
      if(!a.ok||!Array.isArray(ids.rows)||!ids.rows.length)throw new Error(ids?.error||'出馬表の馬IDを取得できません');
      const byName=new Map(ids.rows.map(x=>[clean(x?.name),x]));
      const targets=[];
      for(const h of hs){
        const row=byName.get(clean(h.name));if(!row)continue;
        const sourceNo=validNo(row.no??row.horse_no),localNo=validNo(h.no);
        if(sourceNo&&localNo&&sourceNo!==localNo)continue;
        const id=String(row.id||'').toLowerCase();if(!/^[0-9a-z]{10}$/.test(id))continue;
        h.netkeiba_horse_id=id;h.horse_id=id;h.netkeibaExactHorseId=true;
        if(needsEnrichment(h))targets.push({name:h.name,id});
      }
      if(targets.length){
        const r=await fetch(HIST_API,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','Cache-Control':'no-cache'},body:JSON.stringify({items:targets})});
        const j=await r.json().catch(()=>({results:[]}));if(!r.ok)throw new Error(j?.error||'本人過去走を取得できません');
        for(const h of hs){
          const id=String(h.netkeiba_horse_id||'').toLowerCase();if(!id)continue;
          const row=(j.results||[]).find(x=>clean(x?.name)===clean(h.name)&&String(x?.id||'').toLowerCase()===id);
          if(row?.available&&Array.isArray(row.history)&&row.history.length)mergeExactHistory(h,row.history,id);
        }
      }
      lastSig=sig;updateCounters(hs);
      if(typeof renderHorses==='function')try{renderHorses()}catch(_){}
      return true;
    }catch(e){console.warn('exact history enrichment',e);return false}finally{busy=false}
  }
  window.__refreshExactHorseHistoriesV270=run;

  function wrapHistoryLoader(){
    try{
      if(typeof loadNetkeibaHistories!=='function')return false;
      if(loadNetkeibaHistories.__exactRosterV270)return true;
      const original=loadNetkeibaHistories;
      const wrapped=async function(...args){const value=await original.apply(this,args);try{await run(true)}catch(_){};return value};
      wrapped.__exactRosterV270=true;wrapped.__original=original;loadNetkeibaHistories=wrapped;try{window.loadNetkeibaHistories=wrapped}catch(_){}return true;
    }catch(_){return false}
  }

  document.addEventListener('click',e=>{
    const t=e.target;if(!t)return;
    if(t.id==='importRace'||t.id==='importHist'||t.id==='analyze'||/出馬表取込|過去5走を再取得/.test(String(t.textContent||''))){
      setTimeout(()=>run(false),1100);setTimeout(()=>run(false),3600);
    }
  },true);

  let tries=0;const tick=async()=>{tries++;wrapHistoryLoader();const hs=list();if(hs.length)await run(false).catch(()=>{});if(tries<30)setTimeout(tick,700)};setTimeout(tick,350);
})();
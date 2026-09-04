(()=>{
  if(window.__horseIdResolverV268)return;
  window.__horseIdResolverV268=true;

  const ID_API='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/netkeiba-race-horse-ids-v1';
  const HIST_API='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/netkeiba-horse-history-v4';
  const clean=v=>String(v||'').normalize('NFKC').replace(/[\s　]+/g,'').trim();
  const list=()=>{try{if(typeof horses!=='undefined'&&Array.isArray(horses))return horses}catch(_){}return Array.isArray(window.horses)?window.horses:[]};
  const raceUrl=()=>String(document.getElementById('raceUrl')?.value||'');

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

  function authoritativeRows(rows){
    const cutoff=currentRaceDate();
    const out=[],seen=new Set();
    for(const r of [...(rows||[])].sort((a,b)=>dateNumber(b?.date)-dateNumber(a?.date))){
      if(!r||nonFinish(r))continue;
      const rank=Number(r.rank??r.pos),dist=Number(r.distance??r.dist);
      if(!Number.isFinite(rank)||rank<=0||!Number.isFinite(dist)||dist<=0)continue;
      const dn=dateNumber(r.date);
      if(cutoff&&dn&&dn>=cutoff)continue;
      const key=[dn||String(r.date||''),clean(r.venue||r.course),clean(r.surface),dist,rank].join('|');
      if(seen.has(key))continue;
      seen.add(key);
      out.push({...r});
      if(out.length>=5)break;
    }
    return out;
  }

  function applyExact(h,rows,id){
    const fresh=authoritativeRows(rows);
    if(!fresh.length)return false;
    // Exact race-card ID is authoritative. Never merge it behind a cached/name-search history.
    h.history=[];
    if(typeof window.__applyHistoryV57==='function'){
      try{window.__applyHistoryV57(h,fresh,'netkeiba本人履歴・出馬表ID');}
      catch(_){h.history=fresh.slice(0,5)}
    }else h.history=fresh.slice(0,5);
    h.netkeiba_horse_id=id;
    h.horse_id=id;
    h.netkeibaExactHorseId=true;
    h.netkeibaExactHistory=true;
    h.netkeibaRejected=false;
    h.netkeibaError='';
    if(typeof scoreLocalHistory==='function'&&h.history?.length){
      try{h.histScores=scoreLocalHistory(h.history);h.histScores.available=true}catch(_){}
    }
    return true;
  }

  function updateCounters(hs){
    const ok=hs.filter(h=>h.netkeibaExactHistory&&(h.history||[]).length).length;
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

  let busy=false,lastSig='',lastOk=0;
  async function run(force=false){
    if(busy)return false;
    const hs=list();
    if(!hs.length)return false;
    const rid=sourceRaceId(raceUrl());
    if(!rid)return false;
    const sig=rid+'|'+hs.map(h=>`${h.no}:${clean(h.name)}`).join(',');
    if(!force&&sig===lastSig&&lastOk===hs.length)return true;
    busy=true;
    try{
      const a=await fetch(ID_API,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','Cache-Control':'no-cache'},body:JSON.stringify({race_id:rid})});
      const ids=await a.json().catch(()=>({rows:[]}));
      if(!a.ok||!Array.isArray(ids.rows)||!ids.rows.length)throw new Error(ids?.error||'出馬表の馬IDを取得できません');

      const byName=new Map(ids.rows.map(x=>[clean(x?.name),String(x?.id||'').toLowerCase()]));
      const items=[];
      for(const h of hs){
        const id=byName.get(clean(h.name));
        if(!id||!/^[0-9a-z]{10}$/.test(id))continue;
        h.netkeiba_horse_id=id;
        h.horse_id=id;
        h.netkeibaExactHorseId=true;
        items.push({name:h.name,id});
      }
      if(!items.length)throw new Error('出走馬とnetkeiba馬IDを照合できません');

      const r=await fetch(HIST_API,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','Cache-Control':'no-cache'},body:JSON.stringify({items})});
      const j=await r.json().catch(()=>({results:[]}));
      if(!r.ok)throw new Error(j?.error||'本人過去走を取得できません');
      let changed=false;
      for(const h of hs){
        const id=String(h.netkeiba_horse_id||'').toLowerCase();
        if(!id)continue;
        const row=(j.results||[]).find(x=>clean(x?.name)===clean(h.name)&&String(x?.id||'').toLowerCase()===id);
        if(row?.available&&Array.isArray(row.history)&&row.history.length)changed=applyExact(h,row.history,id)||changed;
      }
      lastSig=sig;
      lastOk=updateCounters(hs);
      if(changed&&typeof renderHorses==='function')try{renderHorses()}catch(_){}
      return lastOk>0;
    }catch(e){
      console.warn('exact horse-id history resolver',e);
      return false;
    }finally{busy=false}
  }
  window.__refreshExactHorseHistoriesV268=run;

  function wrapHistoryLoader(){
    try{
      if(typeof loadNetkeibaHistories!=='function')return false;
      if(loadNetkeibaHistories.__exactRosterV268)return true;
      const original=loadNetkeibaHistories;
      const wrapped=async function(...args){
        const value=await original.apply(this,args);
        try{await run(true)}catch(_){}
        return value;
      };
      wrapped.__exactRosterV268=true;
      wrapped.__original=original;
      loadNetkeibaHistories=wrapped;
      try{window.loadNetkeibaHistories=wrapped}catch(_){}
      return true;
    }catch(_){return false}
  }

  document.addEventListener('click',e=>{
    const t=e.target;
    if(!t)return;
    if(t.id==='importRace'||t.id==='importHist'||t.id==='analyze'||/出馬表取込|過去5走を再取得/.test(String(t.textContent||''))){
      setTimeout(()=>run(true),900);
      setTimeout(()=>run(true),3500);
    }
  },true);

  let tries=0;
  const tick=async()=>{
    tries++;
    wrapHistoryLoader();
    const hs=list();
    if(hs.length){
      await run(false).catch(()=>{});
      if(lastOk===hs.length)return;
    }
    if(tries<30)setTimeout(tick,700);
  };
  setTimeout(tick,300);
})();
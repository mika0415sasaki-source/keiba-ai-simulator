(()=>{
  if(window.__historyRefreshV252)return;
  window.__historyRefreshV252=true;

  const HISTORY_API='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/netkeiba-horse-history-v3';
  const domestic=['札幌','函館','福島','新潟','東京','中山','中京','京都','阪神','小倉'];
  const clean=v=>String(v||'').normalize('NFKC').replace(/[\s　]+/g,'').trim();
  const isDomesticVenue=v=>{
    const s=clean(v);
    return domestic.some(name=>s.includes(name));
  };
  const validLast3f=v=>{
    if(v==null||v==='')return false;
    const n=Number(v);
    return Number.isFinite(n)&&n>=20&&n<=60;
  };
  const explicitNonFinish=run=>{
    const values=[run?.status,run?.result_status,run?.finish_status,run?.rank_text,run?.result,run?.remarks,run?.note,run?.race_name,run?.source]
      .filter(v=>v!=null&&v!=='').map(v=>String(v).normalize('NFKC'));
    const text=values.join(' ');
    return /出走取消|取消|競走除外|除外|競走中止|中止|失格/.test(text)||values.some(v=>/^\s*取\s*$/.test(v));
  };
  const shouldDrop=run=>{
    if(!run)return true;
    if(explicitNonFinish(run))return true;
    const venue=String(run?.venue||run?.course||'');
    const rank=Number(run?.rank??run?.pos);
    const passage=Array.isArray(run?.passage)
      ? run.passage.filter(x=>Number.isFinite(Number(x)))
      : String(run?.corners||'').split(/[-‐－→]/).filter(x=>/^\d+$/.test(x));
    if(isDomesticVenue(venue)&&Number.isFinite(rank)&&rank>0&&!validLast3f(run?.last3f??run?.last3)&&passage.length===0)return true;
    return false;
  };
  const currentList=()=>{
    try{if(typeof horses!=='undefined'&&Array.isArray(horses))return horses;}catch(_){}
    return Array.isArray(window.horses)?window.horses:[];
  };
  const horseId=h=>String(h?.netkeiba_horse_id||h?.horse_id||'').replace(/\D/g,'');
  const runKey=run=>{
    const d=String(run?.date||'').replace(/\D/g,'');
    const mmdd=d.length>=4?d.slice(-4):d;
    const venue=clean(run?.venue||run?.course||'');
    const surface=clean(run?.surface||'');
    const distance=Number(run?.distance??run?.dist)||0;
    const rank=Number(run?.rank??run?.pos)||0;
    return `${mmdd}|${venue}|${surface}|${distance}|${rank}`;
  };
  const copyGradeMeta=(target,source)=>{
    if(!target||!source)return target;
    const fields=['grade','race_grade','class_name','race_class','class','race_name','raceName','title','race'];
    for(const field of fields){
      if((target[field]==null||target[field]==='')&&source[field]!=null&&source[field]!=='')target[field]=source[field];
    }
    return target;
  };
  const enrichOnlySameRows=(fresh,oldRows,jraRows)=>{
    const refs=[...(oldRows||[]),...(jraRows||[])];
    const map=new Map();
    for(const r of refs||[]){const k=runKey(r);if(k&&!map.has(k))map.set(k,r);}
    return (fresh||[]).map(r=>{
      const cloned={...r};
      const ref=map.get(runKey(cloned));
      if(ref)copyGradeMeta(cloned,ref);
      return cloned;
    });
  };

  const sanitize=(list)=>{
    for(const h of list||[]){
      if(!h||!Array.isArray(h.history))continue;
      h.history=h.history.filter(run=>!shouldDrop(run)).slice(0,5);
      if(typeof scoreLocalHistory==='function'&&h.history.length){
        try{h.histScores=scoreLocalHistory(h.history);h.histScores.available=true;}catch(_){}
      }
    }
  };

  const wrapRender=()=>{
    try{
      if(typeof renderHorses!=='function'||renderHorses.__genericHistoryGuardV252)return false;
      const original=renderHorses;
      const wrapped=function(...args){sanitize(currentList());return original.apply(this,args);};
      wrapped.__genericHistoryGuardV252=true;
      wrapped.__original=original;
      renderHorses=wrapped;
      try{window.renderHorses=wrapped;}catch(_){}
      return true;
    }catch(_){return false;}
  };

  async function refillFromHistoryApi(list){
    const items=(list||[]).map(h=>({name:h?.name,id:horseId(h)})).filter(x=>x.name&&/^\d{10}$/.test(x.id));
    if(!items.length)return 0;
    const response=await fetch(HISTORY_API,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({items})});
    const value=await response.json().catch(()=>({results:[]}));
    if(!response.ok)throw new Error(value?.error||('HTTP '+response.status));
    const rows=Array.isArray(value.results)?value.results:[];
    let updated=0;
    for(const h of list||[]){
      const row=rows.find(x=>clean(x?.name)===clean(h?.name));
      if(!row||!Array.isArray(row.history))continue;
      const oldHistory=Array.isArray(h.history)?h.history.slice():[];
      const jraHistory=Array.isArray(h.jra_history)?h.jra_history.slice():[];
      let valid=row.history.filter(run=>!shouldDrop(run)).slice(0,5);
      if(!valid.length)continue;
      // レースの選択・順番・件数は一切変更しない。
      // 同一レースと確認できる既存データから「格・レース名」だけ補完する。
      valid=enrichOnlySameRows(valid,oldHistory,jraHistory);
      h.history=[];
      if(typeof window.__applyHistoryV57==='function'){
        try{window.__applyHistoryV57(h,valid,'netkeiba正常完走5走');}
        catch(_){h.history=valid;}
      }else h.history=valid;
      h.history=(h.history||[]).filter(run=>!shouldDrop(run)).slice(0,5);
      if(typeof scoreLocalHistory==='function'&&h.history.length){
        try{h.histScores=scoreLocalHistory(h.history);h.histScores.available=true;}catch(_){}
      }
      updated++;
    }
    return updated;
  }

  const run=async()=>{
    try{
      const url=String(document.getElementById('raceUrl')?.value||'');
      if(!/netkeiba\.com/i.test(url))return false;
      const list=currentList();
      if(!list.length)return false;
      wrapRender();
      await refillFromHistoryApi(list).catch(e=>console.warn('history refill',e));
      sanitize(list);
      if(typeof renderHorses==='function')renderHorses();
      return true;
    }catch(e){
      console.warn('history refresh v252',e);
      return false;
    }
  };

  let tries=0;
  const tick=async()=>{
    tries++;
    wrapRender();
    if(await run())return;
    if(tries<30)setTimeout(tick,500);
  };
  setTimeout(tick,500);

  let checks=0;
  const guard=setInterval(()=>{
    checks++;
    wrapRender();
    sanitize(currentList());
    if(checks>=20)clearInterval(guard);
  },1000);
})();

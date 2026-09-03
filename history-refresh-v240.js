(()=>{
  if(window.__historyRefreshV247)return;
  window.__historyRefreshV247=true;

  const HISTORY_API='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/netkeiba-horse-history-v3';
  const clean=v=>String(v||'').normalize('NFKC').replace(/[\s　]+/g,'').trim();

  // 取消・除外・中止・失格の判定は、取得側（Supabase）を正とする。
  // フロント側では明示的な非完走ステータスだけを最終ガードとして除外する。
  // 「上がり無し＋通過順無し」だけで正常な過去走を落とさない。
  const explicitNonFinish=run=>{
    if(!run)return true;
    const values=[
      run?.status,run?.result_status,run?.finish_status,run?.rank_text,
      run?.result,run?.remarks,run?.note
    ].filter(v=>v!=null&&v!=='').map(v=>String(v).normalize('NFKC').trim());
    const text=values.join(' ');
    return /出走取消|取消|競走除外|除外|競走中止|中止|失格/.test(text)
      || values.some(v=>/^(取|除|中|失)$/.test(v));
  };
  const shouldDrop=run=>!run||explicitNonFinish(run);

  const currentList=()=>{
    try{if(typeof horses!=='undefined'&&Array.isArray(horses))return horses;}catch(_){}
    return Array.isArray(window.horses)?window.horses:[];
  };
  const horseId=h=>String(h?.netkeiba_horse_id||h?.horse_id||'').replace(/\D/g,'');

  const recalc=h=>{
    if(typeof scoreLocalHistory==='function'&&Array.isArray(h?.history)&&h.history.length){
      try{h.histScores=scoreLocalHistory(h.history);h.histScores.available=true;}catch(_){}
    }
  };

  const sanitize=list=>{
    for(const h of list||[]){
      if(!h||!Array.isArray(h.history))continue;
      h.history=h.history.filter(run=>!shouldDrop(run)).slice(0,5);
      recalc(h);
    }
  };

  const wrapRender=()=>{
    try{
      if(typeof renderHorses!=='function'||renderHorses.__genericHistoryGuardV247)return false;
      const original=renderHorses;
      const wrapped=function(...args){
        sanitize(currentList());
        return original.apply(this,args);
      };
      wrapped.__genericHistoryGuardV247=true;
      wrapped.__original=original;
      renderHorses=wrapped;
      try{window.renderHorses=wrapped;}catch(_){}
      return true;
    }catch(_){return false;}
  };

  async function refillFromHistoryApi(list){
    const items=(list||[])
      .map(h=>({name:h?.name,id:horseId(h)}))
      .filter(x=>x.name&&/^\d{10}$/.test(x.id));
    if(!items.length)return 0;

    const response=await fetch(HISTORY_API,{
      method:'POST',cache:'no-store',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({items})
    });
    const value=await response.json().catch(()=>({results:[]}));
    if(!response.ok)throw new Error(value?.error||('HTTP '+response.status));
    const rows=Array.isArray(value.results)?value.results:[];
    let updated=0;

    for(const h of list||[]){
      const row=rows.find(x=>clean(x?.name)===clean(h?.name));
      if(!row||!Array.isArray(row.history))continue;

      // Supabase側は取消等を除外した上で最大10走を返す。
      // その先頭から正常な5走をそのまま採用する。
      const valid=row.history.filter(run=>!shouldDrop(run)).slice(0,5);
      if(!valid.length)continue;

      h.history=[];
      if(typeof window.__applyHistoryV57==='function'){
        try{window.__applyHistoryV57(h,valid,'netkeiba正常完走5走');}
        catch(_){h.history=valid.slice();}
      }else{
        h.history=valid.slice();
      }

      // applyHistory内の旧ルールや保存データ混入で件数が減った場合は、
      // APIが返した正常5走を優先して復元する。
      const after=(h.history||[]).filter(run=>!shouldDrop(run)).slice(0,5);
      if(after.length<valid.length)h.history=valid.slice(0,5);
      else h.history=after;
      recalc(h);
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
      await refillFromHistoryApi(list).catch(e=>console.warn('history refill v247',e));
      sanitize(list);
      if(typeof renderHorses==='function')renderHorses();
      return true;
    }catch(e){
      console.warn('history refresh v247',e);
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

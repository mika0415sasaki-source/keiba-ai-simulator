(()=>{
  if(window.__historyRefreshV244)return;
  window.__historyRefreshV244=true;

  const domestic=['札幌','函館','福島','新潟','東京','中山','中京','京都','阪神','小倉'];
  const cancelledByHorse={
    'サムシングスイート':new Set(['20260426','0426']),
    'ロングトールサリー':new Set(['20260418','0418'])
  };
  const clean=v=>String(v||'').replace(/[\s　]+/g,'').trim();
  const dateKey=v=>String(v||'').replace(/\D/g,'');
  const isDomesticVenue=v=>{
    const s=clean(v);
    return domestic.some(name=>s.includes(name));
  };
  const validLast3f=v=>{
    if(v==null||v==='')return false;
    const n=Number(v);
    return Number.isFinite(n)&&n>=20&&n<=60;
  };
  const shouldDrop=(h,run)=>{
    const name=clean(h?.name);
    const d=dateKey(run?.date);
    const known=cancelledByHorse[name];
    if(known&&(known.has(d)||known.has(d.slice(-4))))return true;

    const venue=String(run?.venue||'');
    const rank=Number(run?.rank);
    const passage=Array.isArray(run?.passage)?run.passage:[];
    const text=[run?.status,run?.rank_text,run?.race_name,run?.source].filter(Boolean).join(' ');
    if(/取消|出走取消|競走除外|除外|中止|失格|(^|\s)取($|\s)/.test(text))return true;

    // 国内戦で着順だけ存在し、上がり・通過順が両方無い行は
    // netkeibaの取消行を列ずれで着順として誤読した可能性が高い。
    if(isDomesticVenue(venue)&&Number.isFinite(rank)&&rank>0&&!validLast3f(run?.last3f)&&passage.length===0)return true;
    return false;
  };
  const sanitize=(list)=>{
    let removed=0;
    for(const h of list||[]){
      if(!h||!Array.isArray(h.history))continue;
      const before=h.history.length;
      h.history=h.history.filter(run=>!shouldDrop(h,run));
      removed+=before-h.history.length;
      if(typeof scoreLocalHistory==='function'&&h.history.length){
        try{h.histScores=scoreLocalHistory(h.history);h.histScores.available=true;}catch(_){}
      }
    }
    return removed;
  };
  const currentList=()=>{
    try{
      if(typeof horses!=='undefined'&&Array.isArray(horses))return horses;
    }catch(_){}
    return Array.isArray(window.horses)?window.horses:[];
  };

  // 以後どの非同期処理が過去走を再投入しても、画面描画直前に必ず除外する。
  const wrapRender=()=>{
    try{
      if(typeof renderHorses!=='function'||renderHorses.__cancelGuard)return false;
      const original=renderHorses;
      const wrapped=function(...args){
        sanitize(currentList());
        return original.apply(this,args);
      };
      wrapped.__cancelGuard=true;
      wrapped.__original=original;
      renderHorses=wrapped;
      try{window.renderHorses=wrapped;}catch(_){}
      return true;
    }catch(_){return false;}
  };

  const run=async()=>{
    try{
      const url=String(document.getElementById('raceUrl')?.value||'');
      if(!/netkeiba\.com/i.test(url))return false;
      const list=currentList();
      if(!list.length)return false;
      wrapRender();
      if(typeof loadNetkeibaHistories==='function'){
        for(const h of list){if(h&&Array.isArray(h.history))h.history=[];}
        await loadNetkeibaHistories({silent:false,force:true}).catch(()=>{});
      }
      sanitize(list);
      if(typeof renderHorses==='function')renderHorses();
      return true;
    }catch(e){
      console.warn('history refresh v244',e);
      return false;
    }
  };

  let tries=0;
  const tick=async()=>{
    tries++;
    wrapRender();
    sanitize(currentList());
    if(await run())return;
    if(tries<30)setTimeout(tick,500);
  };
  setTimeout(tick,500);

  // 他の非同期取得が後から古い行を戻すケースに備え、短時間だけ再確認する。
  let checks=0;
  const guard=setInterval(()=>{
    checks++;
    wrapRender();
    const list=currentList();
    const removed=sanitize(list);
    if(removed&&typeof renderHorses==='function')renderHorses();
    if(checks>=20)clearInterval(guard);
  },1000);
})();

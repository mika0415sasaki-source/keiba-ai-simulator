(()=>{
  if(window.__historyRefreshV242)return;
  window.__historyRefreshV242=true;

  const domestic=new Set(['札幌','函館','福島','新潟','東京','中山','中京','京都','阪神','小倉']);
  const validLast3f=v=>{
    const n=Number(v);
    return Number.isFinite(n)&&n>=20&&n<=60;
  };
  const sanitize=(list)=>{
    let removed=0;
    for(const h of list||[]){
      if(!h||!Array.isArray(h.history))continue;
      const before=h.history.length;
      h.history=h.history.filter(run=>{
        const venue=String(run?.venue||'');
        const rank=Number(run?.rank);
        const passage=Array.isArray(run?.passage)?run.passage:[];
        const suspicious=domestic.has(venue)&&Number.isFinite(rank)&&rank>0&&!validLast3f(run?.last3f)&&passage.length===0;
        return !suspicious;
      });
      removed+=before-h.history.length;
      if(typeof scoreLocalHistory==='function'&&h.history.length){
        try{h.histScores=scoreLocalHistory(h.history);h.histScores.available=true;}catch(_){}
      }
    }
    return removed;
  };

  const run=async()=>{
    try{
      const url=String(document.getElementById('raceUrl')?.value||'');
      if(!/netkeiba\.com/i.test(url))return false;
      if(!Array.isArray(window.horses)&&typeof horses==='undefined')return false;
      const list=(typeof horses!=='undefined'&&Array.isArray(horses))?horses:window.horses;
      if(!list?.length)return false;
      if(typeof loadNetkeibaHistories!=='function')return false;

      for(const h of list){if(h&&Array.isArray(h.history))h.history=[];}
      await loadNetkeibaHistories({silent:false,force:true});

      // netkeibaの取消行が馬番を着順として誤読された場合、
      // JRA国内戦なのに「着順あり・上がりなし・通過順なし」という不可能な完走行になる。
      // その行は評価対象から除外し、誤った着順を表示しない。
      const removed=sanitize(list);
      if(removed&&typeof loadNetkeibaHistories==='function'){
        // 取り除いた後にもう一度取得し、取得側が正常なら5走目まで補充する。
        await loadNetkeibaHistories({silent:true,force:true}).catch(()=>{});
        sanitize(list);
      }
      if(typeof renderHorses==='function')renderHorses();
      return true;
    }catch(e){
      console.warn('history refresh v242',e);
      return false;
    }
  };

  let tries=0;
  const tick=async()=>{
    tries++;
    if(await run())return;
    if(tries<30)setTimeout(tick,500);
  };
  setTimeout(tick,700);
})();

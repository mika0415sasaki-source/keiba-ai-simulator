(()=>{
  if(window.__historyRefreshV243)return;
  window.__historyRefreshV243=true;

  const domestic=['札幌','函館','福島','新潟','東京','中山','中京','京都','阪神','小倉'];
  const isDomesticVenue=v=>{
    const s=String(v||'').replace(/\s+/g,'');
    return domestic.some(name=>s===name||s.startsWith(name)||s.includes(name));
  };
  const validLast3f=v=>{
    if(v==null||v==='')return false;
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
        const raceName=String(run?.race_name||'');
        const source=String(run?.source||'');
        const explicitStatus=/取消|出走取消|競走除外|除外|中止|失格|(^|\s)取($|\s)/.test([run?.status,run?.rank_text,raceName,source].filter(Boolean).join(' '));
        const suspicious=isDomesticVenue(venue)&&Number.isFinite(rank)&&rank>0&&!validLast3f(run?.last3f)&&passage.length===0;
        return !(explicitStatus||suspicious);
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
      sanitize(list);
      if(typeof renderHorses==='function')renderHorses();
      return true;
    }catch(e){
      console.warn('history refresh v243',e);
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

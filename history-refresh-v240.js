(()=>{
  if(window.__historyRefreshV241)return;
  window.__historyRefreshV241=true;

  const run=async()=>{
    try{
      const url=String(document.getElementById('raceUrl')?.value||'');
      if(!/netkeiba\.com/i.test(url))return false;
      if(!Array.isArray(window.horses)&&typeof horses==='undefined')return false;
      const list=(typeof horses!=='undefined'&&Array.isArray(horses))?horses:window.horses;
      if(!list?.length)return false;
      if(typeof loadNetkeibaHistories!=='function')return false;

      // complete25: netkeiba の取消表記「取」も含めて再取得する。
      // 保存済みの誤った着順（取消行の馬番を着順と誤認したもの）を残さない。
      for(const h of list){
        if(h&&Array.isArray(h.history))h.history=[];
      }
      await loadNetkeibaHistories({silent:false,force:true});
      if(typeof renderHorses==='function')renderHorses();
      return true;
    }catch(e){
      console.warn('history refresh v241',e);
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

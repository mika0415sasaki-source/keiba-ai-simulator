(()=>{
  if(window.__historyRefreshV240)return;
  window.__historyRefreshV240=true;

  const run=async()=>{
    try{
      const url=String(document.getElementById('raceUrl')?.value||'');
      if(!/netkeiba\.com/i.test(url))return false;
      if(!Array.isArray(window.horses)&&typeof horses==='undefined')return false;
      const list=(typeof horses!=='undefined'&&Array.isArray(horses))?horses:window.horses;
      if(!list?.length)return false;
      if(typeof loadNetkeibaHistories!=='function')return false;

      // complete23 以前の保存済み過去走をそのまま信用せず、
      // netkeiba の現行テーブルを必ず再取得して取消・除外行を排除する。
      await loadNetkeibaHistories({silent:false,force:true});
      if(typeof renderHorses==='function')renderHorses();
      return true;
    }catch(e){
      console.warn('history refresh v240',e);
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

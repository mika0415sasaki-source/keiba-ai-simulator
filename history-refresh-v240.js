(()=>{
  if(window.__historyRefreshV245)return;
  window.__historyRefreshV245=true;

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
    const values=[
      run?.status,run?.result_status,run?.finish_status,run?.rank_text,
      run?.result,run?.remarks,run?.note,run?.race_name,run?.source
    ].filter(v=>v!=null&&v!=='').map(v=>String(v).normalize('NFKC'));
    const text=values.join(' ');
    return /出走取消|取消|競走除外|除外|競走中止|中止|失格/.test(text)
      || values.some(v=>/^\s*取\s*$/.test(v));
  };
  const shouldDrop=run=>{
    if(!run)return true;
    if(explicitNonFinish(run))return true;

    const venue=String(run?.venue||run?.course||'');
    const rank=Number(run?.rank??run?.pos);
    const passage=Array.isArray(run?.passage)
      ? run.passage.filter(x=>Number.isFinite(Number(x)))
      : String(run?.corners||'').split(/[-‐－→]/).filter(x=>/^\d+$/.test(x));

    // JRA国内の完走馬には通常「上がり3F」か「通過順」の少なくとも一方が残る。
    // 取消・除外行で列がずれ、馬番等が着順として誤読された場合は
    // 「着順だけ数値・上がり無し・通過順無し」になるため、完走扱いしない。
    if(isDomesticVenue(venue)&&Number.isFinite(rank)&&rank>0&&!validLast3f(run?.last3f??run?.last3)&&passage.length===0){
      return true;
    }
    return false;
  };
  const sanitize=(list)=>{
    let removed=0;
    for(const h of list||[]){
      if(!h||!Array.isArray(h.history))continue;
      const before=h.history.length;
      h.history=h.history.filter(run=>!shouldDrop(run));
      removed+=before-h.history.length;
      if(typeof scoreLocalHistory==='function'&&h.history.length){
        try{h.histScores=scoreLocalHistory(h.history);h.histScores.available=true;}catch(_){}
      }
    }
    return removed;
  };
  const currentList=()=>{
    try{if(typeof horses!=='undefined'&&Array.isArray(horses))return horses;}catch(_){}
    return Array.isArray(window.horses)?window.horses:[];
  };

  // 画面描画直前にも共通チェックを掛ける。
  // 後から別API・保存メモリが古い誤データを戻しても表示させない。
  const wrapRender=()=>{
    try{
      if(typeof renderHorses!=='function'||renderHorses.__genericHistoryGuard)return false;
      const original=renderHorses;
      const wrapped=function(...args){
        sanitize(currentList());
        return original.apply(this,args);
      };
      wrapped.__genericHistoryGuard=true;
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
        // 旧キャッシュを捨てて現行取得処理から再構築。
        for(const h of list){if(h&&Array.isArray(h.history))h.history=[];}
        await loadNetkeibaHistories({silent:false,force:true}).catch(()=>{});
      }
      sanitize(list);
      if(typeof renderHorses==='function')renderHorses();
      return true;
    }catch(e){
      console.warn('history refresh v245',e);
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

  // 読込直後に複数の非同期処理が走るため、短時間だけ共通ガードを再実行。
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

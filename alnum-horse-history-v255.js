(()=>{
  if(window.__alnumHorseHistoryV255)return;
  window.__alnumHorseHistoryV255=true;
  const API='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/netkeiba-horse-history-v4';
  const clean=v=>String(v||'').normalize('NFKC').replace(/[\s　]+/g,'').trim();
  const horseId=h=>String(h?.netkeiba_horse_id||h?.horse_id||'').trim().toLowerCase().replace(/[^0-9a-z]/g,'');
  const isAlnum=id=>/^[0-9a-z]{10}$/.test(id)&&/[a-z]/.test(id);
  const list=()=>{try{if(typeof horses!=='undefined'&&Array.isArray(horses))return horses}catch(_){}return Array.isArray(window.horses)?window.horses:[]};
  const apply=(h,rows)=>{
    if(!Array.isArray(rows)||!rows.length)return false;
    if(typeof window.__applyHistoryV57==='function'){
      try{window.__applyHistoryV57(h,rows,'netkeiba英数字ID本人履歴');}
      catch(_){h.history=rows.slice(0,5)}
    }else h.history=rows.slice(0,5);
    if(typeof scoreLocalHistory==='function'&&h.history?.length){try{h.histScores=scoreLocalHistory(h.history);h.histScores.available=true}catch(_){}}
    return true;
  };
  async function run(){
    const hs=list();
    const items=hs.map(h=>({name:h?.name,id:horseId(h)})).filter(x=>x.name&&isAlnum(x.id));
    if(!items.length)return false;
    const r=await fetch(API,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({items})});
    const j=await r.json().catch(()=>({results:[]}));
    if(!r.ok)return false;
    let changed=false;
    for(const h of hs){
      const id=horseId(h);if(!isAlnum(id))continue;
      const row=(j.results||[]).find(x=>clean(x?.name)===clean(h?.name)&&String(x?.id||'')===id);
      if(row?.available&&Array.isArray(row.history)&&row.history.length){changed=apply(h,row.history)||changed}
    }
    if(changed&&typeof renderHorses==='function')renderHorses();
    return changed;
  }
  let n=0;const tick=async()=>{n++;try{if(await run())return}catch(e){console.warn('alnum history',e)}if(n<20)setTimeout(tick,600)};setTimeout(tick,700);
})();

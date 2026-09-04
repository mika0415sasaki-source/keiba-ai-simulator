(()=>{
  if(window.__horseIdResolverV256)return;
  window.__horseIdResolverV256=true;
  const ID_API='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/netkeiba-race-horse-ids-v1';
  const HIST_API='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/netkeiba-horse-history-v4';
  const clean=v=>String(v||'').normalize('NFKC').replace(/[\s　]+/g,'').trim();
  const list=()=>{try{if(typeof horses!=='undefined'&&Array.isArray(horses))return horses}catch(_){}return Array.isArray(window.horses)?window.horses:[]};
  const apply=(h,rows)=>{
    if(!Array.isArray(rows)||!rows.length)return false;
    if(typeof window.__applyHistoryV57==='function'){
      try{window.__applyHistoryV57(h,rows,'netkeiba本人履歴・正規ID');}
      catch(_){h.history=rows.slice(0,5)}
    }else h.history=rows.slice(0,5);
    if(typeof scoreLocalHistory==='function'&&h.history?.length){try{h.histScores=scoreLocalHistory(h.history);h.histScores.available=true}catch(_){}}
    return true;
  };
  async function run(){
    const hs=list(); if(!hs.length)return false;
    const url=String(document.getElementById('raceUrl')?.value||'');
    if(!/netkeiba\.com/i.test(url))return false;
    const a=await fetch(ID_API,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({url})});
    const ids=await a.json().catch(()=>({rows:[]})); if(!a.ok||!Array.isArray(ids.rows)||!ids.rows.length)return false;
    const byName=new Map(ids.rows.map(x=>[clean(x.name),String(x.id||'').toLowerCase()]));
    let idChanged=false;
    for(const h of hs){const id=byName.get(clean(h.name));if(id){h.netkeiba_horse_id=id;h.horse_id=id;idChanged=true}}
    const items=hs.map(h=>({name:h.name,id:String(h.netkeiba_horse_id||h.horse_id||'').toLowerCase()})).filter(x=>x.name&&/^[0-9a-z]{10}$/.test(x.id));
    if(!items.length)return idChanged;
    const r=await fetch(HIST_API,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({items})});
    const j=await r.json().catch(()=>({results:[]})); if(!r.ok)return idChanged;
    let changed=false;
    for(const h of hs){const row=(j.results||[]).find(x=>clean(x?.name)===clean(h.name)&&String(x?.id||'').toLowerCase()===String(h.netkeiba_horse_id||'').toLowerCase());if(row?.available&&Array.isArray(row.history)&&row.history.length){changed=apply(h,row.history)||changed}}
    if(changed&&typeof renderHorses==='function')renderHorses();
    return changed||idChanged;
  }
  let n=0;const tick=async()=>{n++;try{if(await run())return}catch(e){console.warn('horse id resolver',e)}if(n<20)setTimeout(tick,600)};setTimeout(tick,500);
})();
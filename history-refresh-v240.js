(()=>{
  if(window.__historyRefreshV254)return;
  window.__historyRefreshV254=true;

  const HISTORY_API='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/netkeiba-horse-history-v3';
  const jraVenues=['札幌','函館','福島','新潟','東京','中山','中京','京都','阪神','小倉'];
  const clean=v=>String(v||'').normalize('NFKC').replace(/[\s　]+/g,'').trim();
  const isJraVenue=v=>{
    const s=clean(v);
    return jraVenues.some(name=>s.includes(name));
  };
  const explicitNonFinish=run=>{
    const values=[run?.status,run?.result_status,run?.finish_status,run?.rank_text,run?.result,run?.remarks,run?.note,run?.race_name,run?.source]
      .filter(v=>v!=null&&v!=='').map(v=>String(v).normalize('NFKC'));
    const text=values.join(' ');
    return /出走取消|取消|競走除外|除外|競走中止|中止|失格/.test(text)||values.some(v=>/^\s*取\s*$/.test(v));
  };
  const shouldDrop=run=>!run||explicitNonFinish(run);
  const currentList=()=>{
    try{if(typeof horses!=='undefined'&&Array.isArray(horses))return horses;}catch(_){}
    return Array.isArray(window.horses)?window.horses:[];
  };
  // Keep alphanumeric netkeiba IDs intact. New two-year-olds can use IDs such as 000a....
  const horseId=h=>String(h?.netkeiba_horse_id||h?.horse_id||'').trim().toLowerCase().replace(/[^0-9a-z]/g,'');
  const isTwoYearOld=h=>/2/.test(String(h?.sex_age||h?.age||''));
  const verifiedJraRows=h=>(Array.isArray(h?.jra_history)?h.jra_history:[])
    .filter(r=>!shouldDrop(r)&&isJraVenue(r?.venue||r?.course));
  const hasNonJraRows=rows=>(rows||[]).some(r=>r&&!isJraVenue(r?.venue||r?.course));

  const normalizeGrade=v=>{
    const s=String(v||'').normalize('NFKC').toUpperCase()
      .replace(/Ｇ/g,'G').replace(/Ⅲ/g,'III').replace(/Ⅱ/g,'II').replace(/Ⅰ/g,'I')
      .replace(/３/g,'3').replace(/２/g,'2').replace(/１/g,'1').replace(/\s+/g,'');
    if(/JPN3|JPNIII|G3|GIII/.test(s))return 'G3';
    if(/JPN2|JPNII(?!I)|G2|GII(?!I)/.test(s))return 'G2';
    if(/JPN1|JPNI(?!I)|G1|GI(?!I)/.test(s))return 'G1';
    if(/リステッド|(?:^|[^A-Z])L(?:$|[^A-Z])/.test(s))return 'L';
    if(/オープン|OPEN|OP/.test(s))return 'OP';
    if(/3勝/.test(s))return '3勝';
    if(/2勝/.test(s))return '2勝';
    if(/1勝/.test(s))return '1勝';
    if(/未勝利|新馬/.test(s))return '未勝利・新馬';
    return '';
  };
  const gradeMissing=v=>{
    const s=clean(v);
    return !s||/^(格)?(情報)?(なし|無し|未取得|不明|中立)$/.test(s)||/格情報なし|格未取得/.test(s);
  };
  const gradeSourceText=r=>{
    const direct=[r?.race_name,r?.raceName,r?.title,r?.race,r?.class_name,r?.race_class,r?.class,r?.category,r?.race_type,r?.condition,r?.conditions,r?.remarks,r?.note,r?.result].filter(Boolean).join(' ');
    let all='';
    try{all=Object.entries(r||{}).filter(([,v])=>typeof v==='string'||typeof v==='number').map(([k,v])=>`${k}:${v}`).join(' ')}catch(_){}
    return `${direct} ${all}`;
  };
  const preserveGrade=rows=>(rows||[]).map(r=>{
    const x={...r};
    if(gradeMissing(x.grade)){
      const g=normalizeGrade(gradeSourceText(x));
      if(g)x.grade=g;
      else if(gradeMissing(x.grade))x.grade='';
    }
    return x;
  });

  const applyRows=(h,rows,via)=>{
    const cleanRows=preserveGrade((rows||[]).filter(r=>!shouldDrop(r))).slice(0,5);
    if(!cleanRows.length)return false;
    h.history=[];
    if(typeof window.__applyHistoryV57==='function'){
      try{window.__applyHistoryV57(h,cleanRows,via);}catch(_){h.history=cleanRows;}
    }else h.history=cleanRows;
    h.history=preserveGrade((h.history||[]).filter(r=>!shouldDrop(r))).slice(0,5);
    if(typeof scoreLocalHistory==='function'&&h.history.length){
      try{h.histScores=scoreLocalHistory(h.history);h.histScores.available=true;}catch(_){}
    }
    return true;
  };

  const sanitize=(list)=>{
    for(const h of list||[]){
      if(!h)continue;
      const jra=verifiedJraRows(h);
      if(isTwoYearOld(h)&&jra.length&&Array.isArray(h.history)&&hasNonJraRows(h.history)){
        applyRows(h,jra,'JRA照合済み本人履歴');
        continue;
      }
      if(Array.isArray(h.history)){
        h.history=preserveGrade(h.history.filter(r=>!shouldDrop(r))).slice(0,5);
        if(typeof scoreLocalHistory==='function'&&h.history.length){
          try{h.histScores=scoreLocalHistory(h.history);h.histScores.available=true;}catch(_){}
        }
      }
    }
  };

  const wrapRender=()=>{
    try{
      if(typeof renderHorses!=='function'||renderHorses.__historyGuardV254)return false;
      const original=renderHorses;
      const wrapped=function(...args){sanitize(currentList());return original.apply(this,args);};
      wrapped.__historyGuardV254=true;
      wrapped.__original=original;
      renderHorses=wrapped;
      try{window.renderHorses=wrapped;}catch(_){}
      return true;
    }catch(_){return false;}
  };

  async function refillFromHistoryApi(list){
    const items=(list||[]).map(h=>({name:h?.name,id:horseId(h)})).filter(x=>x.name&&/^[0-9a-z]{10}$/.test(x.id));
    if(!items.length)return 0;
    const response=await fetch(HISTORY_API,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({items})});
    const value=await response.json().catch(()=>({results:[]}));
    if(!response.ok)throw new Error(value?.error||('HTTP '+response.status));
    const rows=Array.isArray(value.results)?value.results:[];
    let updated=0;
    for(const h of list||[]){
      const row=rows.find(x=>clean(x?.name)===clean(h?.name));
      if(!row||!Array.isArray(row.history))continue;
      const fetched=row.history.filter(r=>!shouldDrop(r));
      const jra=verifiedJraRows(h);
      if(isTwoYearOld(h)&&jra.length&&hasNonJraRows(fetched)){
        if(applyRows(h,jra,'JRA照合済み本人履歴'))updated++;
        continue;
      }
      if(fetched.length&&applyRows(h,fetched,'netkeiba本人履歴'))updated++;
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
    }catch(e){console.warn('history refresh v254',e);return false;}
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

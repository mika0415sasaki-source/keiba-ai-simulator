(()=>{
  if(window.__historyGradeUnifiedV263)return;
  window.__historyGradeUnifiedV263=true;

  const ID_API='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/netkeiba-race-horse-ids-v1';
  const HISTORY_V4_API='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/netkeiba-horse-history-v4';
  const FALLBACK_API='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/keiba-netkeiba-fallback';
  const GRADE_API='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/netkeiba-race-past-grades-v1';
  const MEMORY_API='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/keiba-memory-v55';

  const clean=v=>String(v??'').normalize('NFKC').replace(/[\s　]+/g,'').trim();
  const validId=v=>/^[0-9a-z]{10}$/.test(String(v||'').toLowerCase());
  const horseId=h=>String(h?.netkeiba_horse_id||h?.horse_id||'').toLowerCase().replace(/[^0-9a-z]/g,'');
  const currentList=()=>{
    try{if(typeof horses!=='undefined'&&Array.isArray(horses))return horses}catch(_){}
    return Array.isArray(window.horses)?window.horses:[];
  };
  const showStatus=(message,isError=false)=>{
    try{
      if(typeof status==='function')return status('histStatus',message,isError);
      const el=document.getElementById('histStatus');
      if(el)el.innerHTML=`<div class="status ${isError?'err':'ok'}">${message}</div>`;
    }catch(_){}
  };

  function raceIdFromAny(url){
    try{
      if(typeof raceIdFromUrl==='function'){
        const id=String(raceIdFromUrl(url)||'');
        if(/^20\d{10}$/.test(id))return id;
      }
    }catch(_){}
    let s=String(url||'');
    for(let i=0;i<3;i++){try{s=decodeURIComponent(s)}catch(_){break}}
    let m=s.match(/(?:race_id[=:_-]*|\/race\/)(20\d{10})/i)||s.match(/\b(20\d{10})\b/);
    if(m)return m[1];
    m=s.match(/sw01ddd(?:10|01)?(\d{2})(20\d{2})(\d{2})(\d{2})(\d{2})(?:20\d{6})?/i);
    if(m)return `${m[2]}${m[1]}${m[3]}${m[4]}${m[5]}`;
    return '';
  }
  const netkeibaRaceUrl=url=>{
    const id=raceIdFromAny(url);
    return id?`https://race.netkeiba.com/race/shutuba.html?race_id=${id}`:'';
  };

  function normalizeGrade(value){
    const s=String(value??'').normalize('NFKC').toUpperCase()
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
    if(/ハンデ/.test(s))return '海外ハンデ';
    return '';
  }
  const gradeSourceText=r=>[
    r?.grade,r?.race_grade,r?.class_name,r?.race_class,r?.class,
    r?.race_name,r?.raceName,r?.title,r?.race,r?.category,r?.race_type,
    r?.condition,r?.conditions,r?.remarks,r?.note,r?.result,r?.source
  ].filter(v=>v!=null&&v!=='').join(' ');
  const normalizeRun=r=>{
    if(!r||typeof r!=='object')return null;
    const x={...r};
    const raceName=String(x.race_name||x.raceName||x.title||x.race||'').trim();
    if(raceName)x.race_name=raceName;
    const grade=normalizeGrade(gradeSourceText(x));
    if(grade)x.grade=grade;
    else if(!normalizeGrade(x.grade))x.grade='';
    return x;
  };
  const nonFinish=r=>{
    const text=[r?.status,r?.result_status,r?.finish_status,r?.rank_text,r?.result,r?.remarks,r?.note]
      .filter(Boolean).join(' ').normalize('NFKC');
    return /出走取消|取消|競走除外|除外|競走中止|中止|失格/.test(text)||/^\s*取\s*$/.test(text);
  };
  const dateKey=v=>{
    const s=String(v||'').replace(/[.\-]/g,'/');
    const m=s.match(/(?:(20\d{2})\/)?(\d{1,2})\/(\d{1,2})/);
    return m?`${String(m[2]).padStart(2,'0')}/${String(m[3]).padStart(2,'0')}`:'';
  };
  const sameRun=(a,b)=>{
    const da=dateKey(a?.date),db=dateKey(b?.date);
    if(da&&db&&da!==db)return false;
    const ad=Number(a?.distance||0),bd=Number(b?.distance||0);
    if(ad&&bd&&ad!==bd)return false;
    const av=clean(a?.venue||a?.course),bv=clean(b?.venue||b?.course);
    if(av&&bv&&av!==bv)return false;
    return !!(da||db||ad||bd||av||bv);
  };
  const sortRows=rows=>[...(rows||[])].filter(r=>r&&!nonFinish(r)).map(normalizeRun).filter(Boolean)
    .sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));

  function mergeJraMissing(h){
    const jra=Array.isArray(h?.jra_history)?h.jra_history:[];
    if(!jra.length||!Array.isArray(h?.history))return;
    for(const r of h.history){
      const jr=jra.find(x=>sameRun(r,x));
      if(!jr)continue;
      for(const k of ['rank','venue','surface','distance','going','last3f','jockey','passage','field_size']){
        const missing=(k==='rank'||k==='distance'||k==='last3f')
          ? !Number.isFinite(+r[k])||+r[k]<=0
          : k==='passage'?!Array.isArray(r[k])||!r[k].length:!r[k];
        const available=(k==='rank'||k==='distance'||k==='last3f')
          ? Number.isFinite(+jr[k])&&+jr[k]>0
          : k==='passage'?Array.isArray(jr[k])&&jr[k].length:!!jr[k];
        if(missing&&available)r[k]=jr[k];
      }
    }
  }

  function applyHistory(h,rows,via){
    const cleanRows=sortRows(rows).slice(0,5);
    if(!cleanRows.length)return false;
    h.history=[];
    if(typeof window.__applyHistoryV57==='function'){
      try{window.__applyHistoryV57(h,cleanRows,via)}catch(_){h.history=cleanRows}
    }else h.history=cleanRows;
    h.history=sortRows(h.history).slice(0,5);
    mergeJraMissing(h);
    if(typeof scoreLocalHistory==='function'&&h.history.length){
      try{h.histScores=scoreLocalHistory(h.history);h.histScores.available=true}catch(_){}
    }
    h.netkeibaVia=via;
    h.netkeibaRejected=false;
    h.netkeibaError='';
    return true;
  }

  async function postJson(url,body,timeoutMs=15000){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),timeoutMs);
    try{
      const r=await fetch(url,{method:'POST',cache:'no-store',signal:controller.signal,headers:{'Content-Type':'application/json','Cache-Control':'no-cache'},body:JSON.stringify(body)});
      const j=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(j?.error||`HTTP ${r.status}`);
      return j;
    }finally{clearTimeout(timer)}
  }

  async function resolveIds(hs,nkUrl){
    if(!nkUrl)return 0;
    const j=await postJson(ID_API,{url:nkUrl},12000);
    const rows=Array.isArray(j?.rows)?j.rows:[];
    const byName=new Map(rows.map(x=>[clean(x?.name),String(x?.id||'').toLowerCase()]));
    let n=0;
    for(const h of hs){
      const id=byName.get(clean(h?.name));
      if(validId(id)){
        h.netkeiba_horse_id=id;
        h.horse_id=id;
        n++;
      }
    }
    return n;
  }

  async function fetchExactHistories(hs){
    const items=hs.map(h=>({name:h?.name,id:horseId(h)})).filter(x=>x.name&&validId(x.id));
    if(!items.length)return new Set();
    const j=await postJson(HISTORY_V4_API,{items},18000);
    const results=Array.isArray(j?.results)?j.results:[];
    const loaded=new Set();
    for(const h of hs){
      const id=horseId(h);
      const row=results.find(x=>clean(x?.name)===clean(h?.name)&&String(x?.id||'').toLowerCase()===id);
      if(row?.available&&Array.isArray(row.history)&&row.history.length&&applyHistory(h,row.history,'netkeiba本人履歴・統合取得'))loaded.add(clean(h.name));
    }
    return loaded;
  }

  async function fetchFallbackHistories(hs,nkUrl,loaded){
    const need=hs.filter(h=>!loaded.has(clean(h?.name)));
    if(!need.length)return;
    const horse_ids={};
    for(const h of need){const id=horseId(h);if(validId(id))horse_ids[h.name]=id}
    const race_date=typeof raceMeta==='object'?(raceMeta?.race_date||raceMeta?.date||raceMeta?.raceDate||''):'';
    const j=await postJson(FALLBACK_API,{names:need.map(h=>h.name),race_url:nkUrl,race_date,horse_ids},18000);
    const rows=Array.isArray(j)?j:(Array.isArray(j?.results)?j.results:[]);
    for(const row of rows){
      const h=need.find(x=>clean(x.name)===clean(row?.name));
      if(!h||!row?.available||!Array.isArray(row.history)||!row.history.length)continue;
      const expected=horseId(h),received=String(row?.id||row?.horse_id||row?.netkeiba_horse_id||'').toLowerCase();
      if(expected&&received&&expected!==received)continue;
      if(applyHistory(h,row.history,'netkeiba本人履歴・フォールバック'))loaded.add(clean(h.name));
    }
  }

  async function enrichGrades(hs,nkUrl){
    if(!nkUrl)return false;
    const j=await postJson(GRADE_API,{url:nkUrl},12000);
    const rows=Array.isArray(j?.rows)?j.rows:[];
    let changed=false;
    for(const h of hs){
      const src=rows.find(x=>clean(x?.name)===clean(h?.name));
      if(!src||!Array.isArray(src.runs)||!Array.isArray(h.history))continue;
      const past=[...src.runs];
      const hist=sortRows(h.history);
      for(let i=0;i<hist.length;i++){
        const run=hist[i];
        const match=past.find(x=>sameRun(run,x))||past[i];
        if(!match)continue;
        const raceName=String(match.race_name||match.raceName||match.title||match.race||'').trim();
        const grade=normalizeGrade(gradeSourceText(match));
        if(raceName&&(!run.race_name||/未取得|不明/.test(String(run.race_name)))){run.race_name=raceName;changed=true}
        if(grade&&normalizeGrade(run.grade)!==grade){run.grade=grade;changed=true}
      }
      h.history=hist.slice(0,5);
      mergeJraMissing(h);
      if(typeof scoreLocalHistory==='function'&&h.history.length){
        try{h.histScores=scoreLocalHistory(h.history);h.histScores.available=true}catch(_){}
      }
    }
    return changed;
  }

  let loading=null;
  async function unifiedLoad({silent=false}={}){
    if(loading)return loading;
    const hs=currentList();
    if(!hs.length){if(!silent)showStatus('先に出馬表を取り込んでください。',true);return {ok:0,total:0,totalRuns:0}}
    loading=(async()=>{
      const inputUrl=String(document.getElementById('raceUrl')?.value||'');
      const nkUrl=netkeibaRaceUrl(inputUrl);
      if(!nkUrl){
        if(!silent)showStatus('レースIDを取得できませんでした。出馬表URLを確認してください。',true);
        return {ok:0,total:hs.length,totalRuns:0};
      }
      if(!silent)showStatus('過去5走を取得中…');
      try{
        try{await resolveIds(hs,nkUrl)}catch(e){console.warn('unified id resolve',e)}
        const loaded=await fetchExactHistories(hs).catch(e=>{console.warn('unified exact history',e);return new Set()});
        await fetchFallbackHistories(hs,nkUrl,loaded).catch(e=>console.warn('unified fallback history',e));
        await enrichGrades(hs,nkUrl).catch(e=>console.warn('unified grade enrich',e));

        if(typeof renderHorses==='function')renderHorses();
        try{if(typeof evalAll==='function')evalAll()}catch(e){console.warn('unified evaluation',e)}
        try{if(typeof renderPaceReason==='function')renderPaceReason()}catch(_){}

        const ok=hs.filter(h=>Array.isArray(h.history)&&h.history.length).length;
        const totalRuns=hs.reduce((n,h)=>n+Math.min(5,(h.history||[]).length),0);
        const graded=hs.reduce((n,h)=>n+(h.history||[]).filter(r=>normalizeGrade(r.grade||r.race_name)).length,0);
        const count=document.getElementById('histCount');
        if(count)count.textContent=`netkeiba ${ok}/${hs.length}頭・合計${totalRuns}走 / レース格 ${graded}/${totalRuns}走`;
        if(!silent)showStatus(`netkeiba本人過去走 ${ok}/${hs.length}頭・合計${totalRuns}走を取得。レース格 ${graded}/${totalRuns}走を反映しました。`,ok===0);
        setTimeout(()=>fetch(MEMORY_API,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'save_horses',horses:hs})}).catch(()=>{}),0);
        return {ok,total:hs.length,totalRuns,graded};
      }catch(e){
        if(!silent)showStatus('過去5走取得エラー：'+(e?.message||String(e)),true);
        return {ok:0,total:hs.length,totalRuns:0,error:e};
      }
    })();
    try{return await loading}finally{loading=null}
  }

  const install=()=>{
    if(typeof renderHorses!=='function'||typeof scoreLocalHistory!=='function'||!document.getElementById('raceUrl')){setTimeout(install,80);return}
    window.loadNetkeibaHistories=unifiedLoad;
    try{loadNetkeibaHistories=unifiedLoad}catch(_){}
  };
  install();
})();

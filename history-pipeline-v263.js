(()=>{
  if(window.__historyPipelineV263)return;

  const ID_API='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/netkeiba-race-horse-ids-v1';
  const HISTORY_V3_API='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/netkeiba-horse-history-v3';
  const HISTORY_V4_API='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/netkeiba-horse-history-v4';
  const FALLBACK_API='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/keiba-netkeiba-fallback';

  const clean=v=>String(v||'').normalize('NFKC').replace(/[\s　]+/g,'').trim();
  const list=()=>{
    try{if(typeof horses!=='undefined'&&Array.isArray(horses))return horses}catch(_){}
    return Array.isArray(window.horses)?window.horses:[];
  };
  const horseId=h=>String(h?.netkeiba_horse_id||h?.horse_id||'').trim().toLowerCase().replace(/[^0-9a-z]/g,'');
  const isValidId=id=>/^[0-9a-z]{10}$/.test(String(id||''));
  const isNumericId=id=>/^\d{10}$/.test(String(id||''));
  const isAlnumId=id=>isValidId(id)&&/[a-z]/.test(String(id));
  const isMissingGrade=v=>!clean(v)||/格情報なし|格未取得|未取得|不明|中立/.test(clean(v));
  const nonFinish=r=>{
    const text=[r?.status,r?.result_status,r?.finish_status,r?.rank_text,r?.result,r?.remarks,r?.note]
      .filter(v=>v!=null&&v!=='').map(v=>String(v).normalize('NFKC')).join(' ');
    return /出走取消|取消|競走除外|除外|競走中止|中止|失格/.test(text)||/^\s*(取|除|中|失)\s*$/.test(String(r?.rank_text||''));
  };
  const safeRows=rows=>(Array.isArray(rows)?rows:[]).filter(r=>r&&!nonFinish(r)).slice(0,5);
  const responseRows=j=>Array.isArray(j?.results)?j.results:Array.isArray(j?.rows)?j.rows:[];

  function showStatus(message,isError=false){
    try{
      if(typeof status==='function'){status('histStatus',message,isError);return}
    }catch(_){}
    const el=document.getElementById('histStatus');
    if(el){el.innerHTML=message;el.className='status '+(isError?'err':'ok')}
  }

  function currentRaceId(){
    const url=String(document.getElementById('raceUrl')?.value||'');
    try{
      if(typeof raceIdFromUrl==='function'){
        const id=String(raceIdFromUrl(url)||'');
        if(/^20\d{10}$/.test(id))return id;
      }
    }catch(_){}
    const m=url.match(/(?:race_id[=:_-]*|\/race\/)(20\d{10})/i)||url.match(/\b(20\d{10})\b/);
    return m?.[1]||'';
  }

  async function post(url,body,timeout=15000){
    const ac=new AbortController();
    const timer=setTimeout(()=>ac.abort(),timeout);
    try{
      const r=await fetch(url,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','Cache-Control':'no-cache'},body:JSON.stringify(body),signal:ac.signal});
      const j=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(j?.error||('HTTP '+r.status));
      return j;
    }finally{clearTimeout(timer)}
  }

  async function resolveCurrentRaceIds(hs){
    const rid=currentRaceId();
    if(!rid)return {raceId:'',count:0};
    const j=await post(ID_API,{race_id:rid},10000);
    const byName=new Map((j?.rows||[]).map(x=>[clean(x?.name),String(x?.id||'').toLowerCase()]));
    let count=0;
    for(const h of hs){
      const id=byName.get(clean(h?.name));
      if(!isValidId(id))continue;
      h.netkeiba_horse_id=id;
      h.horse_id=id;
      h.netkeiba_id_source='current-race-card';
      count++;
    }
    window.__historyPipelineV263Debug={...(window.__historyPipelineV263Debug||{}),raceId:rid,resolvedIds:Object.fromEntries([...byName])};
    return {raceId:rid,count};
  }

  function normalizeGradeFallback(row){
    if(!row||!isMissingGrade(row.grade))return row;
    const s=String(row.race_name||row.raceName||row.title||row.race||'').normalize('NFKC').toUpperCase().replace(/\s+/g,'');
    let g='';
    if(/JPN3|JPNIII|G3|GIII/.test(s))g='G3';
    else if(/JPN2|JPNII(?!I)|G2|GII(?!I)/.test(s))g='G2';
    else if(/JPN1|JPNI(?!I)|G1|GI(?!I)/.test(s))g='G1';
    else if(/リステッド|(?:^|[^A-Z])L(?:$|[^A-Z])/.test(s))g='L';
    else if(/オープン|OPEN|OP/.test(s))g='OP';
    else if(/3勝/.test(s))g='3勝';
    else if(/2勝/.test(s))g='2勝';
    else if(/1勝/.test(s))g='1勝';
    else if(/未勝利|新馬/.test(s))g='未勝利・新馬';
    return g?{...row,grade:g}:row;
  }

  function applyAuthoritative(h,rows,via){
    const safe=safeRows(rows).map(normalizeGradeFallback);
    if(!safe.length)return false;

    // The current race card ID is the identity authority. Do not merge stale
    // same-name history back into this horse; let V57 add only JRA blank-field
    // supplements to these authoritative netkeiba rows.
    h.history=[];
    h.histScores=null;
    h.netkeibaRejected=false;
    h.netkeibaError='';
    if(typeof window.__applyHistoryV57==='function'){
      try{window.__applyHistoryV57(h,safe,via)}catch(_){h.history=safe}
    }else h.history=safe;
    if(typeof scoreLocalHistory==='function'&&Array.isArray(h.history)&&h.history.length){
      try{h.histScores=scoreLocalHistory(h.history);h.histScores.available=true}catch(_){}
    }
    return true;
  }

  function fallbackLooksPlausible(h,rows){
    const safe=safeRows(rows);
    if(!safe.length)return false;
    const is2=/2/.test(String(h?.sex_age||h?.age||''));
    if(!is2)return true;
    const jra=['札幌','函館','福島','新潟','東京','中山','中京','京都','阪神','小倉'];
    const nonJra=safe.some(r=>{
      const v=clean(r?.venue||r?.course);
      return v&&!jra.some(x=>v.includes(x));
    });
    return !nonJra;
  }

  async function fetchByResolvedIds(hs){
    const numeric=hs.filter(h=>isNumericId(horseId(h))).map(h=>({name:h.name,id:horseId(h)}));
    const alnum=hs.filter(h=>isAlnumId(horseId(h))).map(h=>({name:h.name,id:horseId(h)}));
    const calls=[];
    if(numeric.length)calls.push(post(HISTORY_V3_API,{items:numeric},15000).then(j=>responseRows(j)).catch(e=>{console.warn('history v3',e);return[]}));
    else calls.push(Promise.resolve([]));
    if(alnum.length)calls.push(post(HISTORY_V4_API,{items:alnum},15000).then(j=>responseRows(j)).catch(e=>{console.warn('history v4',e);return[]}));
    else calls.push(Promise.resolve([]));
    const [r3,r4]=await Promise.all(calls);
    return [...r3,...r4];
  }

  async function fallbackForUnresolved(hs){
    if(!hs.length)return [];
    const names=hs.map(h=>h.name);
    const horse_ids={};
    for(const h of hs){const id=horseId(h);if(isValidId(id))horse_ids[h.name]=id}
    const race_date=typeof raceMeta==='object'?(raceMeta?.race_date||raceMeta?.date||raceMeta?.raceDate||''):'';
    const j=await post(FALLBACK_API,{names,race_url:String(document.getElementById('raceUrl')?.value||''),race_date,horse_ids},18000);
    return responseRows(j);
  }

  let loadingPromise=null;
  async function pipeline({silent=false,force=false}={}){
    if(loadingPromise)return loadingPromise;
    loadingPromise=(async()=>{
      const hs=list();
      if(!hs.length){if(!silent)showStatus('先に出馬表を取り込んでください。',true);return {ok:0,total:0,totalRuns:0}}
      if(!silent)showStatus('netkeiba本人IDを出馬表から照合して過去5走を取得中…');

      let idInfo={raceId:'',count:0};
      try{idInfo=await resolveCurrentRaceIds(hs)}catch(e){console.warn('race card id resolve',e)}

      const direct=await fetchByResolvedIds(hs);
      const directByName=new Map(direct.filter(x=>x?.available&&Array.isArray(x?.history)&&x.history.length).map(x=>[clean(x.name),x]));
      let ok=0,totalRuns=0;
      const unresolved=[];

      for(const h of hs){
        const row=directByName.get(clean(h.name));
        if(row&&applyAuthoritative(h,row.history,'netkeiba本人履歴・出馬表ID')){
          ok++; totalRuns+=h.history?.length||0;
        }else unresolved.push(h);
      }

      if(unresolved.length){
        let fallback=[];
        try{fallback=await fallbackForUnresolved(unresolved)}catch(e){console.warn('history fallback',e)}
        const fbByName=new Map(fallback.map(x=>[clean(x?.name),x]));
        for(const h of unresolved){
          const row=fbByName.get(clean(h.name));
          const rows=safeRows(row?.history||row?.rows||[]);
          if(row?.available&&fallbackLooksPlausible(h,rows)&&applyAuthoritative(h,rows,'netkeiba本人履歴・名前fallback')){
            ok++; totalRuns+=h.history?.length||0;
          }else if(Array.isArray(h?.jra_history)&&h.jra_history.length){
            // JRA rows are a last-resort display/evaluation source only. They are
            // never used to overwrite a successful current-race-ID netkeiba result.
            const jr=safeRows(h.jra_history).map(normalizeGradeFallback);
            h.history=jr.slice(0,5);
            if(typeof scoreLocalHistory==='function'&&h.history.length){try{h.histScores=scoreLocalHistory(h.history);h.histScores.available=true}catch(_){}}
          }
        }
      }

      const histCount=document.getElementById('histCount');
      if(histCount)histCount.textContent=`netkeiba ${ok}/${hs.length}頭 / 出馬表ID ${idInfo.count}/${hs.length}頭`;
      try{if(typeof renderHorses==='function')renderHorses()}catch(_){}
      try{if(typeof evalAll==='function')evalAll()}catch(_){}

      window.__historyPipelineV263Debug={
        ...(window.__historyPipelineV263Debug||{}),
        raceId:idInfo.raceId,
        idResolved:idInfo.count,
        direct:direct.map(x=>({name:x?.name,id:x?.id,available:x?.available,runs:(x?.history||[]).map(r=>({date:r.date,race_name:r.race_name,grade:r.grade}))})),
        ok,total:hs.length
      };

      if(!silent)showStatus(`netkeiba過去走 ${ok}/${hs.length}頭を取得。現在の出馬表から馬IDを照合して本人履歴を取得しました。`);
      return {ok,total:hs.length,totalRuns};
    })();
    try{return await loadingPromise}finally{loadingPromise=null}
  }

  function install(){
    if(!window.__independentHistoryFixV57||typeof window.__applyHistoryV57!=='function'||typeof document.getElementById!=='function'){
      setTimeout(install,80);return;
    }
    window.__historyPipelineV263=true;
    window.loadNetkeibaHistories=pipeline;
    try{loadNetkeibaHistories=pipeline}catch(_){}

    // Re-bind the explicit refresh button because the base page may have stored
    // a handler before this pipeline was installed.
    const btn=document.getElementById('importHist');
    if(btn)btn.onclick=()=>pipeline({silent:false,force:true});
  }

  install();
})();

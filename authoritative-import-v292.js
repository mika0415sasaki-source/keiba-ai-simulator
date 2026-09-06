(()=>{
  if(window.__authoritativeImportV292)return;
  window.__authoritativeImportV292=true;

  const JRA_ENDPOINT='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/jra-import';
  const NK_HISTORY_ENDPOINT='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/keiba-netkeiba-fallback';
  const NK_IDS_ENDPOINT='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/netkeiba-race-horse-ids-v1';
  const state={importController:null,historyController:null,importing:false,historyLoading:false};

  const el=id=>document.getElementById(id);
  const norm=s=>String(s||'').normalize('NFKC').replace(/[\s　]+/g,'').trim();
  const setStatus=(id,msg,isErr=false)=>{
    const box=el(id); if(!box)return;
    box.innerHTML=`<div class="status ${isErr?'err':'ok'}">${String(msg||'').replace(/\n/g,'<br>')}</div>`;
  };
  const setSelect=(id,value)=>{
    if(value==null||value==='')return;
    const s=el(id); if(!s)return;
    [...s.options].forEach(o=>o.selected=String(o.value)===String(value));
  };
  const raceIdFromAny=raw=>{
    let s=String(raw||'');
    for(let i=0;i<3;i++){try{s=decodeURIComponent(s)}catch(_){break}}
    let m=s.match(/(?:race_id[=:_-]*|\/race\/)(20\d{10})/i)||s.match(/\b(20\d{10})\b/);
    if(m)return m[1];
    m=s.match(/pw01(?:dde|sde)(?:10|01)?(\d{2})(20\d{2})(\d{2})(\d{2})(\d{2})/i);
    if(m)return `${m[2]}${m[1]}${m[3]}${m[4]}${m[5]}`;
    m=s.match(/sw01ddd(?:10|01)?(\d{2})(20\d{2})(\d{2})(\d{2})(\d{2})/i);
    if(m)return `${m[2]}${m[1]}${m[3]}${m[4]}${m[5]}`;
    return '';
  };
  const fetchJson=async(url,body,controller,timeoutMs)=>{
    const timer=setTimeout(()=>controller.abort('timeout'),timeoutMs);
    try{
      const r=await fetch(url,{method:'POST',cache:'no-store',signal:controller.signal,headers:{'Content-Type':'application/json','Cache-Control':'no-cache'},body:JSON.stringify(body)});
      const j=await r.json().catch(()=>({error:`応答JSONを読めません (${r.status})`}));
      if(!r.ok)throw new Error(j.error||`通信エラー (${r.status})`);
      return j;
    }catch(e){
      if(controller.signal.aborted){
        const reason=controller.signal.reason;
        if(reason==='user')throw new Error('中断しました。');
        throw new Error('通信が規定時間を超えたため中断しました。もう一度実行できます。');
      }
      throw e;
    }finally{clearTimeout(timer)}
  };

  function safeRender(){
    try{if(typeof renderHorses==='function')renderHorses()}catch(e){console.warn('renderHorses',e)}
    try{if(typeof renderPaceReason==='function')renderPaceReason()}catch(e){console.warn('renderPaceReason',e)}
    try{if(typeof evalAll==='function')evalAll()}catch(e){console.warn('evalAll',e)}
  }

  function applyJra(j,url){
    const list=Array.isArray(j?.horses)?j.horses:[];
    if(list.length<2)throw new Error('JRAから出走馬を取得できませんでした。');
    raceMeta={...(j.meta||{})};
    raceMeta.race_id=raceIdFromAny(url)||raceMeta.race_id||'';
    raceMeta.source_url=url;
    horses=list.map(h=>({
      ...h,
      no:+h.no,
      history:[],
      histScores:null,
      jra_history:Array.isArray(h.jra_history)?h.jra_history:[],
      netkeiba_horse_id:String(h.netkeiba_horse_id||h.horse_id||'')
    }));
    evaluated=[];
    try{oddsCache={race_id:raceMeta.race_id||'',win:{},wide:{},trio:{},fetched_at:null}}catch(_){}
    for(const h of horses){
      try{if(+h.odds>0)oddsCache.win[String(+h.no)]={odds:+h.odds,popularity:null,source:'JRA'}}catch(_){}
    }
    if(raceMeta.race_name&&el('raceName'))el('raceName').value=raceMeta.race_name;
    setSelect('venue',raceMeta.venue);
    setSelect('surface',raceMeta.surface);
    setSelect('distance',raceMeta.distance);
    setSelect('going',raceMeta.going);
    const jr=horses.filter(h=>h.jra_history.length).length;
    if(el('histCount'))el('histCount').textContent=`netkeiba 0/${horses.length}頭 / JRA照合 ${jr}頭`;
    safeRender();
  }

  async function directImport(){
    const btn=el('importRace');
    if(state.importing){
      if(state.importController)state.importController.abort('user');
      state.importing=false;
      if(btn)btn.textContent='出馬表取込';
      setStatus('raceStatus','JRA出馬表の取得を中断しました。');
      return;
    }
    const url=String(el('raceUrl')?.value||'').trim();
    if(!url){setStatus('raceStatus','JRAの出馬表URLを入れてください。',true);return}
    state.importing=true;
    state.importController=new AbortController();
    if(btn){btn.disabled=false;btn.textContent='取得中（押すと中断）'}
    setStatus('raceStatus','JRA出馬表を取得しています。最大12秒で必ず終了します。');
    try{
      const j=await fetchJson(JRA_ENDPOINT,{url},state.importController,12000);
      applyJra(j,url);
      setStatus('raceStatus',`${horses.length}頭の出馬表を取得しました。画面操作はこの時点で可能です。\nnetkeiba過去5走は続けて取得します。`);
      setTimeout(()=>directHistory(true),0);
    }catch(e){
      setStatus('raceStatus',e?.message||String(e),true);
    }finally{
      state.importing=false;
      state.importController=null;
      if(btn){btn.disabled=false;btn.textContent='出馬表取込'}
    }
  }

  async function resolveRaceIds(raceId,controller){
    if(!raceId)return {};
    try{
      const j=await fetchJson(NK_IDS_ENDPOINT,{race_id:raceId},controller,12000);
      const out={};
      for(const r of (j.rows||[])){
        const id=String(r.id||r.netkeiba_horse_id||'').trim();
        if(!id)continue;
        if(r.name)out[norm(r.name)]=id;
        if(r.no)out[`#${+r.no}`]=id;
      }
      return out;
    }catch(e){
      if(controller.signal.aborted)throw e;
      console.warn('netkeiba race id map fallback',e);
      return {};
    }
  }

  function mergeHistoryResponse(j,idMap){
    const rows=Array.isArray(j?.rows)?j.rows:(Array.isArray(j?.results)?j.results:[]);
    const byName=new Map(rows.map(r=>[norm(r.name),r]));
    let ok=0,totalRuns=0;
    horses=horses.map(h=>{
      const r=byName.get(norm(h.name));
      const hist=Array.isArray(r?.history)?r.history.slice(0,5):[];
      if(hist.length){ok++;totalRuns+=hist.length}
      const nid=String(r?.id||idMap[norm(h.name)]||idMap[`#${+h.no}`]||h.netkeiba_horse_id||'');
      return {...h,history:hist,histScores:null,netkeiba_horse_id:nid,history_source:hist.length?'netkeiba':'jra'};
    });
    const jr=horses.filter(h=>(h.jra_history||[]).length).length;
    if(el('histCount'))el('histCount').textContent=`netkeiba ${ok}/${horses.length}頭・合計${totalRuns}走 / JRA照合 ${jr}頭`;
    safeRender();
    return {ok,totalRuns,jr};
  }

  async function directHistory(auto=false){
    const btn=el('importHist');
    if(state.historyLoading){
      if(auto)return;
      if(state.historyController)state.historyController.abort('user');
      state.historyLoading=false;
      if(btn)btn.textContent='過去5走を再取得';
      setStatus('histStatus','過去5走の取得を中断しました。');
      return;
    }
    if(!Array.isArray(horses)||!horses.length){
      if(!auto)setStatus('histStatus','先に出馬表を取り込んでください。',true);
      return;
    }
    state.historyLoading=true;
    state.historyController=new AbortController();
    if(btn){btn.disabled=false;btn.textContent=auto?'過去5走取得中（押すと中断）':'取得中（押すと中断）'}
    setStatus('histStatus','netkeiba馬IDを照合しています…');
    try{
      const url=String(el('raceUrl')?.value||raceMeta?.source_url||'');
      const rid=raceMeta?.race_id||raceIdFromAny(url);
      const idMap=await resolveRaceIds(rid,state.historyController);
      const horseIds={};
      for(const h of horses){
        const id=idMap[norm(h.name)]||idMap[`#${+h.no}`]||h.netkeiba_horse_id||'';
        if(id)horseIds[h.name]=id;
      }
      setStatus('histStatus',`netkeiba過去5走を取得しています… 馬ID照合 ${Object.keys(horseIds).length}/${horses.length}頭`);
      const j=await fetchJson(NK_HISTORY_ENDPOINT,{
        names:horses.map(h=>h.name),race_url:url,race_date:raceMeta?.race_date||'',race_id:rid,horse_ids:horseIds
      },state.historyController,26000);
      const result=mergeHistoryResponse(j,idMap);
      if(result.ok>0)setStatus('histStatus',`netkeiba過去5走 ${result.ok}/${horses.length}頭・合計${result.totalRuns}走を取得しました。`);
      else setStatus('histStatus','netkeiba過去5走は0頭でした。JRA前4走は保持しています。',true);
    }catch(e){
      setStatus('histStatus',e?.message||String(e),true);
    }finally{
      state.historyLoading=false;
      state.historyController=null;
      if(btn){btn.disabled=false;btn.textContent='過去5走を再取得'}
    }
  }

  document.addEventListener('click',e=>{
    const target=e.target?.closest?.('#importRace,#importHist');
    if(!target)return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    if(target.id==='importRace')directImport();
    else directHistory(false);
  },true);

  const unlock=()=>{
    const a=el('importRace'),h=el('importHist');
    if(a&&!state.importing){a.disabled=false;if(/準備中|取得中/.test(a.textContent||''))a.textContent='出馬表取込'}
    if(h&&!state.historyLoading){h.disabled=false;if(/準備中|取得中/.test(h.textContent||''))h.textContent='過去5走を再取得'}
    document.documentElement.dataset.importController='v292';
  };
  unlock();
  addEventListener('keiba-patches-ready',()=>setTimeout(unlock,0));
  addEventListener('pageshow',unlock);
  window.__keibaDirectImportV292={directImport,directHistory,state};
})();

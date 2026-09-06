(()=>{
  if(window.__authoritativeImportV293)return;
  window.__authoritativeImportV293=true;

  const JRA_ENDPOINT='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/jra-import';
  const NK_RACE_ENDPOINT='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/netkeiba-race-import';
  const NK_HISTORY_ENDPOINT='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/keiba-netkeiba-fallback';
  const NK_IDS_ENDPOINT='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/netkeiba-race-horse-ids-v1';

  const state={importController:null,historyController:null,importing:false,historyLoading:false};
  const el=id=>document.getElementById(id);
  const norm=s=>String(s||'').normalize('NFKC').replace(/[\s　]+/g,'').trim();
  const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const setStatus=(id,msg,isErr=false)=>{const box=el(id);if(!box)return;box.innerHTML=`<div class="status ${isErr?'err':'ok'}">${esc(msg).replace(/\n/g,'<br>')}</div>`};
  const setSelect=(id,value)=>{if(value==null||value==='')return;const s=el(id);if(!s)return;[...s.options].forEach(o=>o.selected=String(o.value)===String(value))};

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
        if(controller.signal.reason==='user')throw new Error('中断しました。');
        throw new Error('通信が規定時間を超えたため中断しました。');
      }
      throw e;
    }finally{clearTimeout(timer)}
  };

  function safeRender(){
    try{if(typeof renderHorses==='function')renderHorses()}catch(e){console.warn('renderHorses',e)}
    try{if(typeof renderPaceReason==='function')renderPaceReason()}catch(e){console.warn('renderPaceReason',e)}
    try{if(typeof evalAll==='function')evalAll()}catch(e){console.warn('evalAll',e)}
  }

  function applyBootstrap(j,sourceUrl,rid){
    const list=Array.isArray(j?.horses)?j.horses:[];
    if(list.length<2)throw new Error('出走馬データを取得できませんでした。');
    raceMeta={...(j.meta||{}),race_id:rid||j?.meta?.race_id||'',source_url:sourceUrl,bootstrap_source:j?.source||'netkeiba'};
    horses=list.map(h=>({
      ...h,
      no:+(h.no||h.horse_no||0),
      history:Array.isArray(h.history)?h.history:[],
      histScores:null,
      jra_history:Array.isArray(h.jra_history)?h.jra_history:[],
      netkeiba_horse_id:String(h.netkeiba_horse_id||h.horse_id||'')
    })).filter(h=>h.no&&h.name).sort((a,b)=>a.no-b.no);
    evaluated=[];
    try{oddsCache={race_id:raceMeta.race_id||'',win:{},wide:{},trio:{},fetched_at:null}}catch(_){}
    for(const h of horses){try{if(+h.odds>0)oddsCache.win[String(+h.no)]={odds:+h.odds,popularity:h.popularity||null,source:'netkeiba'}}catch(_){}}
    if(raceMeta.race_name&&el('raceName'))el('raceName').value=raceMeta.race_name;
    setSelect('venue',raceMeta.venue);setSelect('surface',raceMeta.surface);setSelect('distance',raceMeta.distance);setSelect('going',raceMeta.going);
    const jr=horses.filter(h=>(h.jra_history||[]).length).length;
    if(el('histCount'))el('histCount').textContent=`netkeiba 0/${horses.length}頭 / JRA照合 ${jr}頭`;
    safeRender();
  }

  function mergeJra(j){
    if(!Array.isArray(j?.horses)||!j.horses.length)return;
    const byNo=new Map(j.horses.map(h=>[+h.no,h]));
    const byName=new Map(j.horses.map(h=>[norm(h.name),h]));
    horses=horses.map(h=>{
      const x=byNo.get(+h.no)||byName.get(norm(h.name));
      if(!x)return h;
      return {...h,
        jra_history:Array.isArray(x.jra_history)?x.jra_history:h.jra_history,
        body_weight:x.body_weight??h.body_weight,
        weight:x.weight??x.body_weight??h.weight,
        body_weight_change:x.body_weight_change??h.body_weight_change,
        carried_weight:x.carried_weight??h.carried_weight,
        jockey:x.jockey||h.jockey,
        odds:x.odds??h.odds
      };
    });
    raceMeta={...raceMeta,...(j.meta||{}),race_id:raceMeta.race_id,source_url:raceMeta.source_url};
    safeRender();
  }

  async function backgroundJra(url){
    const ac=new AbortController();
    try{
      const j=await fetchJson(JRA_ENDPOINT,{url},ac,7000);
      mergeJra(j);
      const jr=horses.filter(h=>(h.jra_history||[]).length).length;
      setStatus('raceStatus',`${horses.length}頭の出馬表を取得済み。JRA公式前4走も ${jr}/${horses.length}頭 補完しました。`);
    }catch(e){
      console.warn('JRA background enrichment skipped',e);
      setStatus('raceStatus',`${horses.length}頭の出馬表を取得済み。JRA公式の追加照合は通信できなかったためスキップしました。予想はnetkeiba過去走で続行できます。`);
    }
  }

  async function directImport(){
    const btn=el('importRace');
    if(state.importing){if(state.importController)state.importController.abort('user');return}
    const url=String(el('raceUrl')?.value||'').trim();
    if(!url){setStatus('raceStatus','JRAの出馬表URLを入れてください。',true);return}
    const rid=raceIdFromAny(url);
    if(!rid){setStatus('raceStatus','このURLからレースIDを判定できません。JRAの出馬表URLを貼り直してください。',true);return}

    state.importing=true;state.importController=new AbortController();
    if(btn){btn.disabled=false;btn.textContent='取得中（押すと中断）'}
    setStatus('raceStatus','JRA URLからレースIDを判定しました。出走馬を取得しています…');
    try{
      const nkUrl=`https://race.netkeiba.com/race/shutuba.html?race_id=${rid}`;
      const j=await fetchJson(NK_RACE_ENDPOINT,{url:nkUrl},state.importController,10000);
      applyBootstrap(j,url,rid);
      setStatus('raceStatus',`${horses.length}頭の出馬表を取得しました。操作できます。\n過去5走を続けて取得します。`);
      setTimeout(()=>directHistory(true),0);
      setTimeout(()=>backgroundJra(url),50);
    }catch(e){
      setStatus('raceStatus',`出走馬の取得に失敗しました：${e?.message||String(e)}`,true);
    }finally{
      state.importing=false;state.importController=null;
      if(btn){btn.disabled=false;btn.textContent='出馬表取込'}
    }
  }

  async function resolveMissingIds(rid,controller){
    const out={};
    for(const h of horses){if(h.netkeiba_horse_id){out[norm(h.name)]=h.netkeiba_horse_id;out[`#${+h.no}`]=h.netkeiba_horse_id}}
    if(Object.keys(out).length>=horses.length*2)return out;
    try{
      const j=await fetchJson(NK_IDS_ENDPOINT,{race_id:rid},controller,9000);
      for(const r of (j.rows||[])){
        const id=String(r.id||r.netkeiba_horse_id||'').trim();if(!id)continue;
        if(r.name)out[norm(r.name)]=id;if(r.no)out[`#${+r.no}`]=id;
      }
    }catch(e){if(controller.signal.aborted)throw e;console.warn('id resolve skipped',e)}
    return out;
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
      return {...h,history:hist,histScores:null,netkeiba_horse_id:nid,history_source:hist.length?'netkeiba':((h.jra_history||[]).length?'jra':'none')};
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
      return;
    }
    if(!Array.isArray(horses)||!horses.length){if(!auto)setStatus('histStatus','先に出馬表を取り込んでください。',true);return}
    state.historyLoading=true;state.historyController=new AbortController();
    if(btn){btn.disabled=false;btn.textContent=auto?'過去5走取得中（押すと中断）':'取得中（押すと中断）'}
    try{
      const url=String(el('raceUrl')?.value||raceMeta?.source_url||'');
      const rid=raceMeta?.race_id||raceIdFromAny(url);
      setStatus('histStatus','netkeiba過去5走を取得しています…');
      const idMap=await resolveMissingIds(rid,state.historyController);
      const horseIds={};
      for(const h of horses){const id=idMap[norm(h.name)]||idMap[`#${+h.no}`]||h.netkeiba_horse_id||'';if(id)horseIds[h.name]=id}
      const j=await fetchJson(NK_HISTORY_ENDPOINT,{names:horses.map(h=>h.name),race_url:url,race_date:raceMeta?.race_date||'',race_id:rid,horse_ids:horseIds},state.historyController,24000);
      const result=mergeHistoryResponse(j,idMap);
      if(result.ok>0)setStatus('histStatus',`netkeiba過去5走 ${result.ok}/${horses.length}頭・合計${result.totalRuns}走を取得しました。`);
      else setStatus('histStatus','netkeiba過去5走は0頭でした。取得できたJRA前4走だけを使用します。',true);
    }catch(e){
      setStatus('histStatus',e?.message||String(e),true);
    }finally{
      state.historyLoading=false;state.historyController=null;
      if(btn){btn.disabled=false;btn.textContent='過去5走を再取得'}
    }
  }

  document.addEventListener('click',e=>{
    const target=e.target?.closest?.('#importRace,#importHist');if(!target)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    if(target.id==='importRace')directImport();else directHistory(false);
  },true);

  const unlock=()=>{
    const a=el('importRace'),h=el('importHist');
    if(a&&!state.importing){a.disabled=false;if(/準備中|取得中/.test(a.textContent||''))a.textContent='出馬表取込'}
    if(h&&!state.historyLoading){h.disabled=false;if(/準備中|取得中/.test(h.textContent||''))h.textContent='過去5走を再取得'}
    document.documentElement.dataset.importController='v293';
  };
  unlock();addEventListener('keiba-patches-ready',()=>setTimeout(unlock,0));addEventListener('pageshow',unlock);
  window.__keibaDirectImportV293={directImport,directHistory,state};
})();
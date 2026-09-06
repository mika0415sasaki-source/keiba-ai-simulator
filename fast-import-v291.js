(()=>{
  if(window.__fastImportV291)return;
  window.__fastImportV291=true;

  const sleep=ms=>new Promise((_,reject)=>setTimeout(()=>reject(new Error('TIMEOUT')),ms));
  const timeout=async(p,ms,msg)=>{
    try{return await Promise.race([Promise.resolve(p),sleep(ms)])}
    catch(e){if(String(e?.message||e)==='TIMEOUT')throw new Error(msg);throw e}
  };
  const horseList=()=>{try{return Array.isArray(horses)?horses:[]}catch(_){return Array.isArray(window.horses)?window.horses:[]}};
  const originalJraImport=typeof jraImport==='function'?jraImport:null;
  const originalLoadMemory=typeof loadMemoryForHorses==='function'?loadMemoryForHorses:null;
  const originalLoadHist=typeof loadNetkeibaHistories==='function'?loadNetkeibaHistories:null;
  const originalOddsApi=typeof oddsApi==='function'?oddsApi:null;

  // netkeiba過去走取得は必ずタイムアウトさせ、馬IDが既にある場合はAPIへ渡す。
  try{
    nkFallback=async function(names,race_url){
      const ids={};
      for(const h of horseList()){
        const id=String(h?.netkeiba_horse_id||h?.horse_id||'').trim();
        if(h?.name&&id)ids[h.name]=id;
      }
      const ac=new AbortController();
      const timer=setTimeout(()=>ac.abort(),18000);
      try{
        const r=await fetch(NK_FALLBACK_API,{
          method:'POST',cache:'no-store',signal:ac.signal,
          headers:{'Content-Type':'application/json','Cache-Control':'no-cache'},
          body:JSON.stringify({names,race_url,race_date:raceMeta?.race_date||'',horse_ids:ids})
        });
        const j=await r.json().catch(()=>({error:'netkeiba過去走APIの応答を読み込めません'}));
        if(!r.ok)throw new Error(j.error||'netkeiba過去走取得エラー');
        if(!Array.isArray(j.rows)&&Array.isArray(j.results))j.rows=j.results;
        if(!Array.isArray(j.results)&&Array.isArray(j.rows))j.results=j.rows;
        return j;
      }catch(e){
        if(e?.name==='AbortError')throw new Error('netkeiba過去5走の取得が18秒を超えたため中断しました。もう一度「過去5走を再取得」を押してください。');
        throw e;
      }finally{clearTimeout(timer)}
    };
    try{window.nkFallback=nkFallback}catch(_){}
  }catch(e){console.warn('nk fallback fast patch',e)}

  function applyMeta(j,url){
    raceMeta=j?.meta||{};
    try{raceMeta.race_id=raceIdFromUrl(url)||raceMeta.race_id||''}catch(_){}
    try{oddsCache={race_id:'',win:{},wide:{},trio:{},fetched_at:null}}catch(_){}
    horses=(j?.horses||[]).map(h=>({...h,history:[],histScores:null,jra_history:h.jra_history||[]}));
    for(const h of horseList()){
      try{if(Number.isFinite(+h.odds)&&+h.odds>0)oddsCache.win[String(+h.no)]={odds:+h.odds,popularity:null,source:'JRA出馬表'}}catch(_){}
    }
    if(j?.meta?.race_name)document.getElementById('raceName').value=j.meta.race_name;
    if(j?.meta?.venue)[...document.getElementById('venue').options].forEach(o=>o.selected=o.value===j.meta.venue);
    if(j?.meta?.surface)[...document.getElementById('surface').options].forEach(o=>o.selected=o.value===j.meta.surface);
    try{const d=inferRaceDistance(j);if(d)[...document.getElementById('distance').options].forEach(o=>o.selected=+o.value===+d)}catch(_){}
    if(j?.meta?.going)[...document.getElementById('going').options].forEach(o=>o.selected=o.value===j.meta.going);
  }

  function renderBase(){
    try{renderHorses()}catch(e){console.warn('render horses',e)}
    try{renderPaceReason()}catch(e){console.warn('pace',e)}
    try{evalAll()}catch(e){console.warn('eval base',e)}
  }

  function summaryStatus(prefix='取込完了'){
    const hs=horseList();
    const nk=hs.filter(h=>(h.history||[]).length>0).length;
    const jr=hs.filter(h=>(h.jra_history||[]).length>0).length;
    let winN=0,trioN=0;
    try{winN=hs.filter(h=>winOddsFor(h)).length;trioN=Object.keys(oddsCache?.trio||{}).length}catch(_){}
    status('raceStatus',`${prefix}<br>${hs.length}頭 / JRA前4走 ${jr}頭 / netkeiba5走 ${nk}/${hs.length}頭<br>単勝オッズ ${winN}/${hs.length}頭・3連複 ${trioN}点`);
  }

  function startBackground(){
    // 学習メモリは表示を止めない。取得後だけ再評価。
    if(originalLoadMemory){
      timeout(originalLoadMemory(),5000,'学習メモリ取得をスキップ').then(()=>{renderBase()}).catch(()=>{});
    }
    // 過去5走も自動取得するが、出馬表表示は待たせない。
    if(originalLoadHist){
      originalLoadHist({silent:true,force:true}).then(r=>{
        renderBase();
        const ok=Number(r?.ok||0);
        const hs=horseList();
        if(ok>0)status('histStatus',`netkeiba過去5走 ${ok}/${hs.length}頭を取得しました。`);
        summaryStatus('出馬表取込完了・過去走更新済み');
      }).catch(e=>{
        status('histStatus',e?.message||String(e),true);
        summaryStatus('出馬表取込完了・過去走は手動再取得できます');
      });
    }
    if(originalOddsApi){
      timeout(originalOddsApi({force:true}),7000,'オッズ取得をスキップ').then(()=>{try{evalAll()}catch(_){};summaryStatus('出馬表取込完了')}).catch(()=>{});
    }
  }

  async function fastImport(){
    const btn=document.getElementById('importRace');
    if(btn?.dataset.busy==='1')return;
    const url=String(document.getElementById('raceUrl')?.value||'').trim();
    if(!url){status('raceStatus','JRAの出馬表URLを入れてください。',true);return}
    if(!originalJraImport){status('raceStatus','出馬表取込機能の初期化に失敗しました。ページを再読み込みしてください。',true);return}
    if(btn){btn.dataset.busy='1';btn.disabled=true;btn.textContent='取得中…'}
    try{
      status('raceStatus','JRA出馬表を取得中…');
      const j=await timeout(originalJraImport(url),14000,'JRA出馬表の取得が14秒を超えました。通信を中断したので、もう一度「出馬表取込」を押せます。');
      if(!j||!Array.isArray(j.horses)||j.horses.length<2)throw new Error('出走馬データを取得できませんでした。');
      applyMeta(j,url);
      // ここが重要：メモリ・過去走・オッズを待たずに即表示する。
      renderBase();
      status('raceStatus',`${horseList().length}頭の基本出馬表を取り込みました。<br>過去5走・学習メモリ・オッズはバックグラウンドで取得します。画面はそのまま操作できます。`);
      startBackground();
    }catch(e){
      status('raceStatus',e?.message||String(e),true);
    }finally{
      if(btn){btn.dataset.busy='0';btn.disabled=false;btn.textContent='出馬表取込'}
    }
  }

  async function manualHist(){
    const btn=document.getElementById('importHist');
    if(btn?.dataset.busy==='1')return;
    if(!horseList().length){status('histStatus','先に出馬表を取り込んでください。',true);return}
    if(!originalLoadHist){status('histStatus','過去走取得機能の初期化に失敗しました。',true);return}
    if(btn){btn.dataset.busy='1';btn.disabled=true;btn.textContent='取得中…'}
    try{
      status('histStatus','netkeiba過去5走を取得中…');
      const r=await timeout(originalLoadHist({silent:false,force:true}),22000,'過去5走の取得が22秒を超えました。通信を中断しました。もう一度押して再取得できます。');
      renderBase();
      const hs=horseList();
      const ok=hs.filter(h=>(h.history||[]).length>0).length;
      document.getElementById('histCount').textContent=`netkeiba ${ok}/${hs.length}頭 / JRA照合 ${hs.filter(h=>(h.jra_history||[]).length>0).length}頭`;
      if(ok>0)status('histStatus',`netkeiba過去5走 ${ok}/${hs.length}頭を取得しました。`);
      else status('histStatus','netkeiba過去5走を取得できませんでした。JRA前4走はそのまま利用できます。',true);
    }catch(e){
      status('histStatus',e?.message||String(e),true);
    }finally{
      if(btn){btn.dataset.busy='0';btn.disabled=false;btn.textContent='過去5走を再取得'}
    }
  }

  const install=()=>{
    const a=document.getElementById('importRace');
    const h=document.getElementById('importHist');
    if(a)a.onclick=fastImport;
    if(h)h.onclick=manualHist;
    return !!a;
  };
  install();
  addEventListener('keiba-patches-ready',install);
  addEventListener('pageshow',install);
})();

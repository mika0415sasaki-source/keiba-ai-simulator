(()=>{
  if(window.__fastRaceImportV361)return;
  window.__fastRaceImportV361=true;

  const JRA_ENDPOINT='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/jra-import';
  const NK_RACE_ENDPOINT='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/netkeiba-race-import';
  const el=id=>document.getElementById(id);
  const norm=s=>String(s||'').normalize('NFKC').replace(/[\s　]+/g,'').trim();
  let busy=false,seq=0,controller=null;

  function ridFrom(raw){
    let s=String(raw||'');
    for(let i=0;i<3;i++){try{s=decodeURIComponent(s)}catch(_){break}}
    let m=s.match(/(?:race_id[=:_-]*|\/race\/)(20\d{10})/i)||s.match(/\b(20\d{10})\b/);
    if(m)return m[1];
    m=s.match(/sw01ddd(?:10|01)?(\d{2})(20\d{2})(\d{2})(\d{2})(\d{2})/i);
    if(m)return `${m[2]}${m[1]}${m[3]}${m[4]}${m[5]}`;
    m=s.match(/pw01(?:dde|sde)(?:10|01)?(\d{2})(20\d{2})(\d{2})(\d{2})(\d{2})/i);
    if(m)return `${m[2]}${m[1]}${m[3]}${m[4]}${m[5]}`;
    return '';
  }

  function show(msg,err=false){
    try{if(typeof status==='function'){status('raceStatus',msg,err);return}}catch(_){}
    const box=el('raceStatus');if(box)box.innerHTML=`<div class="status ${err?'err':'ok'}">${msg}</div>`;
  }

  function setSelect(id,value){
    const x=el(id);if(!x||value==null||value==='')return;
    [...x.options].forEach(o=>o.selected=String(o.value)===String(value));
  }

  async function fetchJson(url,body,signal,timeoutMs){
    const ac=new AbortController();
    const relay=()=>ac.abort(signal?.reason||'cancel');
    if(signal){if(signal.aborted)relay();else signal.addEventListener('abort',relay,{once:true})}
    const timer=setTimeout(()=>ac.abort('timeout'),timeoutMs);
    try{
      const r=await fetch(url,{method:'POST',cache:'no-store',signal:ac.signal,headers:{'Content-Type':'application/json','Cache-Control':'no-cache'},body:JSON.stringify(body)});
      const j=await r.json().catch(()=>({error:`応答JSONを読めません (${r.status})`}));
      if(!r.ok)throw new Error(j.error||`通信エラー (${r.status})`);
      if(!Array.isArray(j?.horses)||j.horses.length<2)throw new Error('出走馬データが不足しています。');
      return j;
    }finally{
      clearTimeout(timer);
      if(signal)signal.removeEventListener('abort',relay);
    }
  }

  function applyRace(j,sourceUrl,rid,source){
    const list=j.horses||[];
    const oldByNo=new Map((Array.isArray(horses)?horses:[]).map(h=>[+h.no,h]));
    const oldByName=new Map((Array.isArray(horses)?horses:[]).map(h=>[norm(h.name),h]));
    raceMeta={...(raceMeta||{}),...(j.meta||{}),race_id:rid||j?.meta?.race_id||'',source_url:sourceUrl,fast_import_source:source};
    horses=list.map((h,i)=>{
      const no=+(h.no||h.horse_no||i+1);
      const old=oldByNo.get(no)||oldByName.get(norm(h.name))||{};
      return {...old,...h,no,
        history:Array.isArray(old.history)&&old.history.length?old.history:(Array.isArray(h.history)?h.history:[]),
        histScores:old.histScores||h.histScores||null,
        jra_history:Array.isArray(h.jra_history)&&h.jra_history.length?h.jra_history:(Array.isArray(old.jra_history)?old.jra_history:[]),
        legacyMemory:old.legacyMemory||h.legacyMemory||null,
        netkeiba_horse_id:String(h.netkeiba_horse_id||h.horse_id||old.netkeiba_horse_id||old.horse_id||'')
      };
    }).filter(h=>h.no&&h.name).sort((a,b)=>a.no-b.no);
    evaluated=[];
    try{oddsCache={race_id:rid||'',win:{},wide:{},trio:{},fetched_at:null}}catch(_){}
    for(const h of horses){
      const o=Number(h.odds);if(Number.isFinite(o)&&o>0){try{oddsCache.win[String(+h.no)]={odds:o,popularity:h.popularity||null,source}}catch(_){}}
    }
    if(raceMeta.race_name&&el('raceName'))el('raceName').value=raceMeta.race_name;
    setSelect('venue',raceMeta.venue);setSelect('surface',raceMeta.surface);setSelect('distance',raceMeta.distance);setSelect('going',raceMeta.going);
    try{if(typeof renderHorses==='function')renderHorses()}catch(_){}
    try{if(typeof renderPaceReason==='function')renderPaceReason()}catch(_){}
    try{dispatchEvent(new Event('keiba-data-updated'))}catch(_){}
  }

  function mergeOfficial(j,rid,sourceUrl){
    if(!Array.isArray(j?.horses)||!j.horses.length)return;
    const byNo=new Map(j.horses.map(h=>[+h.no,h]));
    const byName=new Map(j.horses.map(h=>[norm(h.name),h]));
    horses=horses.map(h=>{
      const x=byNo.get(+h.no)||byName.get(norm(h.name));
      if(!x)return h;
      return {...h,...x,
        history:h.history||[],histScores:h.histScores||null,legacyMemory:h.legacyMemory||null,
        jra_history:Array.isArray(x.jra_history)?x.jra_history:(h.jra_history||[]),
        netkeiba_horse_id:String(h.netkeiba_horse_id||h.horse_id||x.netkeiba_horse_id||x.horse_id||'')
      };
    });
    raceMeta={...(raceMeta||{}),...(j.meta||{}),race_id:rid||raceMeta?.race_id||'',source_url:sourceUrl,official_jra_merged:true};
    if(raceMeta.race_name&&el('raceName'))el('raceName').value=raceMeta.race_name;
    setSelect('venue',raceMeta.venue);setSelect('surface',raceMeta.surface);setSelect('distance',raceMeta.distance);setSelect('going',raceMeta.going);
    try{if(typeof renderHorses==='function')renderHorses()}catch(_){}
    try{if(typeof renderPaceReason==='function')renderPaceReason()}catch(_){}
    try{dispatchEvent(new Event('keiba-data-updated'))}catch(_){}
  }

  function scheduleBackground(mySeq){
    const run=async()=>{
      if(mySeq!==seq||!Array.isArray(horses)||!horses.length)return;
      try{if(typeof loadMemoryForHorses==='function')await loadMemoryForHorses()}catch(_){}
      if(mySeq!==seq)return;
      try{if(typeof loadNetkeibaHistories==='function')await loadNetkeibaHistories({silent:true,force:false})}catch(e){console.warn('history background',e)}
      if(mySeq!==seq)return;
      try{if(typeof oddsApi==='function')await oddsApi({force:true})}catch(e){console.warn('odds background',e)}
      if(mySeq!==seq)return;
      try{if(typeof evalAll==='function')evalAll()}catch(_){}
      const n=horses.length,nk=horses.filter(h=>(h.history||[]).length).length,jr=horses.filter(h=>(h.jra_history||[]).length).length,mem=horses.filter(h=>h.legacyMemory).length;
      show(`${n}頭の出馬表を取得済み。<br>保存データ ${mem}/${n}頭・netkeiba5走 ${nk}/${n}頭・JRA照合 ${jr}/${n}頭<br>AI分析できます。`);
    };
    if('requestIdleCallback'in window)requestIdleCallback(()=>run(),{timeout:350});else setTimeout(run,120);
  }

  async function fastImport(){
    const btn=el('importRace');
    if(busy){try{controller?.abort('user')}catch(_){};return}
    const url=String(el('raceUrl')?.value||'').trim();
    if(!url){show('JRAの出馬表URLを入れてください。',true);return}
    const rid=ridFrom(url);
    if(!rid){show('URLからレースIDを判定できません。',true);return}
    const mySeq=++seq;busy=true;controller=new AbortController();
    if(btn){btn.disabled=false;btn.textContent='取得中（押すと中断）'}
    show('出走馬を高速取得中…');

    const nkUrl=`https://race.netkeiba.com/race/shutuba.html?race_id=${rid}`;
    const jraP=fetchJson(JRA_ENDPOINT,{url},controller.signal,6500).then(j=>({source:'JRA',j}));
    const nkP=fetchJson(NK_RACE_ENDPOINT,{url:nkUrl},controller.signal,6500).then(j=>({source:'netkeiba',j}));
    let winner=null;
    try{
      winner=await Promise.any([jraP,nkP]);
      if(mySeq!==seq)return;
      applyRace(winner.j,url,rid,winner.source);
      show(`${horses.length}頭の出馬表を取得しました。画面は操作できます。<br>保存済み過去走をバックグラウンドで復元中…`);
      scheduleBackground(mySeq);

      // netkeibaが先着した場合だけ、JRA公式は画面を止めずに後から統合する。
      if(winner.source!=='JRA'){
        jraP.then(x=>{if(mySeq===seq){mergeOfficial(x.j,rid,url)}}).catch(()=>{});
      }
    }catch(e){
      if(mySeq===seq)show(controller.signal.aborted&&controller.signal.reason==='user'?'取得を中断しました。':`出馬表取得に失敗しました：${e?.message||String(e)}`,true);
    }finally{
      if(mySeq===seq){busy=false;controller=null;if(btn){btn.disabled=false;btn.textContent='出馬表取込'}}
    }
  }

  document.addEventListener('click',e=>{
    const target=e.target?.closest?.('#importRace');if(!target)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    fastImport();
  },true);

  document.documentElement.dataset.fastRaceImport='v361';
})();
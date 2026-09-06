(()=>{
  if(window.__authoritativeImportV294)return;
  window.__authoritativeImportV294=true;

  const JRA_ENDPOINT='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/jra-import';
  const NK_RACE_ENDPOINT='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/netkeiba-race-import';
  const NK_HISTORY_ENDPOINT='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/keiba-netkeiba-fallback';
  const NK_IDS_ENDPOINT='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/netkeiba-race-horse-ids-v1';
  const state={importing:false,historyLoading:false,importController:null,historyController:null,seq:0};
  const el=id=>document.getElementById(id);
  const norm=s=>String(s||'').normalize('NFKC').replace(/[\s　]+/g,'').trim();
  const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const status=(id,msg,err=false)=>{const x=el(id);if(x)x.innerHTML=`<div class="status ${err?'err':'ok'}">${esc(msg).replace(/\n/g,'<br>')}</div>`};
  const select=(id,v)=>{const x=el(id);if(!x||v==null||v==='')return;[...x.options].forEach(o=>o.selected=String(o.value)===String(v))};
  const ridFrom=raw=>{
    let s=String(raw||'');for(let i=0;i<3;i++){try{s=decodeURIComponent(s)}catch(_){break}}
    let m=s.match(/(?:race_id[=:_-]*|\/race\/)(20\d{10})/i)||s.match(/\b(20\d{10})\b/);if(m)return m[1];
    m=s.match(/sw01ddd(?:10|01)?(\d{2})(20\d{2})(\d{2})(\d{2})(\d{2})/i);if(m)return `${m[2]}${m[1]}${m[3]}${m[4]}${m[5]}`;
    m=s.match(/pw01(?:dde|sde)(?:10|01)?(\d{2})(20\d{2})(\d{2})(\d{2})(\d{2})/i);if(m)return `${m[2]}${m[1]}${m[3]}${m[4]}${m[5]}`;
    return '';
  };
  async function fetchJson(url,body,controller,ms){
    let timer;
    try{
      timer=setTimeout(()=>{try{controller.abort('timeout')}catch(_){}},ms);
      const r=await fetch(url,{method:'POST',cache:'no-store',signal:controller.signal,headers:{'Content-Type':'application/json','Cache-Control':'no-cache'},body:JSON.stringify(body)});
      const j=await r.json().catch(()=>({error:`応答JSONを読めません (${r.status})`}));
      if(!r.ok)throw new Error(j.error||`通信エラー (${r.status})`);
      return j;
    }catch(e){
      if(controller.signal.aborted){
        if(controller.signal.reason==='user')throw new Error('中断しました。');
        throw new Error('通信が規定時間を超えたため中断しました。');
      }
      if(String(e?.message||e).includes('Load failed'))throw new Error('通信に失敗しました。再実行できます。');
      throw e;
    }finally{if(timer)clearTimeout(timer)}
  }
  function render(){
    try{if(typeof renderHorses==='function')renderHorses()}catch(_){}
    try{if(typeof renderPaceReason==='function')renderPaceReason()}catch(_){}
    try{if(typeof evalAll==='function')evalAll()}catch(_){}
    try{dispatchEvent(new Event('keiba-data-updated'))}catch(_){}
  }
  function applyRace(j,sourceUrl,rid){
    const list=Array.isArray(j?.horses)?j.horses:[];if(list.length<2)throw new Error('出走馬データを取得できませんでした。');
    raceMeta={...(j.meta||{}),race_id:rid||j?.meta?.race_id||'',source_url:sourceUrl};
    horses=list.map(h=>({...h,no:+(h.no||h.horse_no||0),history:[],histScores:null,jra_history:Array.isArray(h.jra_history)?h.jra_history:[],netkeiba_horse_id:String(h.netkeiba_horse_id||h.horse_id||'')})).filter(h=>h.no&&h.name).sort((a,b)=>a.no-b.no);
    evaluated=[];
    try{oddsCache={race_id:raceMeta.race_id||'',win:{},wide:{},trio:{},fetched_at:null}}catch(_){}
    for(const h of horses){try{if(+h.odds>0)oddsCache.win[String(+h.no)]={odds:+h.odds,popularity:h.popularity||null,source:'出馬表'}}catch(_){}}
    if(raceMeta.race_name&&el('raceName'))el('raceName').value=raceMeta.race_name;
    select('venue',raceMeta.venue);select('surface',raceMeta.surface);select('distance',raceMeta.distance);select('going',raceMeta.going);
    if(el('histCount'))el('histCount').textContent=`netkeiba 0/${horses.length}頭 / JRA照合 ${horses.filter(h=>h.jra_history.length).length}頭`;
    render();
  }
  async function importRace(){
    const btn=el('importRace');
    if(state.importing){
      try{state.importController?.abort('user')}catch(_){}
      state.importing=false;
      if(btn){btn.disabled=false;btn.textContent='出馬表取込'}
      status('raceStatus','中断しました。');
      return;
    }
    const url=String(el('raceUrl')?.value||'').trim();if(!url){status('raceStatus','JRAの出馬表URLを入れてください。',true);return}
    const rid=ridFrom(url);if(!rid){status('raceStatus','URLからレースIDを判定できません。',true);return}
    const mySeq=++state.seq;state.importing=true;state.importController=new AbortController();
    if(btn){btn.disabled=false;btn.textContent='取得中（押すと中断）'}
    status('raceStatus','出走馬を取得しています。ほかの処理は開始しません。');
    try{
      let j=null;
      try{j=await fetchJson(JRA_ENDPOINT,{url},state.importController,6500)}catch(e){if(state.importController.signal.aborted)throw e}
      if(!j||!Array.isArray(j.horses)||j.horses.length<2){
        const nkUrl=`https://race.netkeiba.com/race/shutuba.html?race_id=${rid}`;
        j=await fetchJson(NK_RACE_ENDPOINT,{url:nkUrl},state.importController,9000);
      }
      if(mySeq!==state.seq)return;
      applyRace(j,url,rid);
      status('raceStatus',`${horses.length}頭の出馬表を取得しました。\n次に「過去5走を再取得」を押してください。`);
    }catch(e){if(mySeq===state.seq)status('raceStatus',e?.message||String(e),true)}
    finally{
      if(mySeq===state.seq){state.importing=false;state.importController=null;if(btn){btn.disabled=false;btn.textContent='出馬表取込'}}
    }
  }
  async function idMap(rid,controller){
    const out={};for(const h of horses){const id=String(h.netkeiba_horse_id||'');if(id){out[norm(h.name)]=id;out[`#${+h.no}`]=id}}
    if(Object.keys(out).length>=horses.length*2)return out;
    try{const j=await fetchJson(NK_IDS_ENDPOINT,{race_id:rid},controller,7000);for(const r of (j.rows||[])){const id=String(r.id||r.netkeiba_horse_id||'');if(id){if(r.name)out[norm(r.name)]=id;if(r.no)out[`#${+r.no}`]=id}}}catch(e){if(controller.signal.aborted)throw e}
    return out;
  }
  async function importHistory(){
    const btn=el('importHist');
    if(state.historyLoading){
      try{state.historyController?.abort('user')}catch(_){}
      state.historyLoading=false;
      if(btn){btn.disabled=false;btn.textContent='過去5走を再取得'}
      status('histStatus','中断しました。');return;
    }
    if(!Array.isArray(horses)||!horses.length){status('histStatus','先に出馬表を取り込んでください。',true);return}
    const mySeq=++state.seq;state.historyLoading=true;state.historyController=new AbortController();
    if(btn){btn.disabled=false;btn.textContent='取得中（押すと中断）'}
    status('histStatus','netkeiba過去5走を取得しています。');
    try{
      const url=String(el('raceUrl')?.value||raceMeta?.source_url||'');const rid=raceMeta?.race_id||ridFrom(url);
      const map=await idMap(rid,state.historyController);const horse_ids={};
      for(const h of horses){const id=map[norm(h.name)]||map[`#${+h.no}`]||h.netkeiba_horse_id||'';if(id)horse_ids[h.name]=id}
      const j=await fetchJson(NK_HISTORY_ENDPOINT,{names:horses.map(h=>h.name),race_url:url,race_date:raceMeta?.race_date||'',race_id:rid,horse_ids},state.historyController,22000);
      if(mySeq!==state.seq)return;
      const rows=Array.isArray(j?.rows)?j.rows:(Array.isArray(j?.results)?j.results:[]);const by=new Map(rows.map(r=>[norm(r.name),r]));
      let ok=0,runs=0;
      horses=horses.map(h=>{const r=by.get(norm(h.name));const hist=Array.isArray(r?.history)?r.history.slice(0,5):[];if(hist.length){ok++;runs+=hist.length}return {...h,history:hist,histScores:null,netkeiba_horse_id:String(r?.id||h.netkeiba_horse_id||'')}});
      if(el('histCount'))el('histCount').textContent=`netkeiba ${ok}/${horses.length}頭・合計${runs}走 / JRA照合 ${horses.filter(h=>(h.jra_history||[]).length).length}頭`;
      render();
      status('histStatus',ok?`netkeiba過去5走 ${ok}/${horses.length}頭・合計${runs}走を取得しました。`:'過去5走を取得できませんでした。',!ok);
    }catch(e){if(mySeq===state.seq)status('histStatus',e?.message||String(e),true)}
    finally{if(mySeq===state.seq){state.historyLoading=false;state.historyController=null;if(btn){btn.disabled=false;btn.textContent='過去5走を再取得'}}}
  }
  function replaceButton(id,handler){
    const old=el(id);if(!old)return null;
    const neu=old.cloneNode(true);old.replaceWith(neu);
    neu.disabled=false;
    neu.textContent=id==='importRace'?'出馬表取込':'過去5走を再取得';
    neu.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();handler()});
    return neu;
  }
  function install(){
    replaceButton('importRace',importRace);replaceButton('importHist',importHistory);
    document.documentElement.dataset.importController='v294';
  }
  install();
  addEventListener('pageshow',()=>{if(document.documentElement.dataset.importController!=='v294')install()});
  window.__keibaImportV294={state,importRace,importHistory};
})();
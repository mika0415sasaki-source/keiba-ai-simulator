(()=>{
  if(window.__authoritativeImportV295)return;
  window.__authoritativeImportV295=true;

  const JRA_ENDPOINT='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/jra-import';
  const NK_RACE_ENDPOINT='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/netkeiba-race-import';
  const ENRICH_ENDPOINT='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/keiba-race-enrich-v1';
  const MEMORY_ENDPOINT='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/keiba-memory-v55';

  const state={importing:false,historyLoading:false,importController:null,historyController:null,seq:0};
  const el=id=>document.getElementById(id);
  const norm=s=>String(s||'').normalize('NFKC').replace(/[\s　]+/g,'').trim();
  const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const setStatus=(id,msg,err=false)=>{const x=el(id);if(x)x.innerHTML=`<div class="status ${err?'err':'ok'}">${esc(msg).replace(/\n/g,'<br>')}</div>`};
  const setSelect=(id,v)=>{const x=el(id);if(!x||v==null||v==='')return;[...x.options].forEach(o=>o.selected=String(o.value)===String(v))};
  const isNk=u=>/netkeiba\.com/i.test(String(u||''));

  function ridFrom(raw){
    let s=String(raw||'');for(let i=0;i<3;i++){try{s=decodeURIComponent(s)}catch(_){break}}
    let m=s.match(/(?:race_id[=:_-]*|\/race\/)(20\d{10})/i)||s.match(/\b(20\d{10})\b/);if(m)return m[1];
    m=s.match(/sw01ddd(?:10|01)?(\d{2})(20\d{2})(\d{2})(\d{2})(\d{2})/i);if(m)return `${m[2]}${m[1]}${m[3]}${m[4]}${m[5]}`;
    m=s.match(/pw01(?:dde|sde)(?:10|01)?(\d{2})(20\d{2})(\d{2})(\d{2})(\d{2})/i);if(m)return `${m[2]}${m[1]}${m[3]}${m[4]}${m[5]}`;
    return '';
  }

  async function fetchJson(url,body,controller,ms){
    let timer;
    try{
      timer=setTimeout(()=>{try{controller.abort('timeout')}catch(_){}},ms);
      const r=await fetch(url,{method:'POST',cache:'no-store',signal:controller.signal,headers:{'Content-Type':'application/json','Cache-Control':'no-cache'},body:JSON.stringify(body)});
      const j=await r.json().catch(()=>({error:`応答JSONを読めません (${r.status})`}));
      if(!r.ok)throw new Error(j.error||`通信エラー (${r.status})`);
      return j;
    }catch(e){
      if(controller.signal.aborted){if(controller.signal.reason==='user')throw new Error('中断しました。');throw new Error('通信が規定時間を超えたため中断しました。')}
      if(String(e?.message||e).includes('Load failed'))throw new Error('通信に失敗しました。再実行できます。');
      throw e;
    }finally{if(timer)clearTimeout(timer)}
  }

  function render(){
    try{if(typeof renderHorses==='function')renderHorses()}catch(e){console.warn('renderHorses',e)}
    try{if(typeof evalAll==='function')evalAll()}catch(e){console.warn('evalAll',e)}
    try{renderPaceReasonV295()}catch(e){console.warn('pace',e)}
    try{dispatchEvent(new Event('keiba-data-updated'))}catch(_){}
  }

  function styleFromRows(rows){
    const vals=(rows||[]).filter(r=>Array.isArray(r?.passage)&&r.passage.length&&+r.passage[0]>0).map(r=>Math.max(1,+r.passage[0])/Math.max(2,+r.field_size||16));
    if(!vals.length)return '';
    vals.sort((a,b)=>a-b);const x=vals[Math.floor(vals.length/2)];
    return x<=.16?'逃':x<=.38?'先':x<=.72?'差':'追';
  }
  function horseStyle(h){
    const a=styleFromRows(h?.history);if(a)return a;
    const b=styleFromRows(h?.jra_history);if(b)return b;
    return ['逃','先','差','追'].includes(h?.style)?h.style:'';
  }
  function renderPaceReasonV295(){
    const box=el('paceReason');if(!box)return;
    if(!Array.isArray(horses)||!horses.length){box.innerHTML='出馬表取込後に自動判定します。';return}
    const styles=horses.map(h=>horseStyle(h));
    const known=styles.filter(Boolean).length;
    if(known<Math.ceil(horses.length*.6)){
      raceMeta.autoPace='ミドル';
      box.innerHTML=`<b>適用ペース：判定待ち</b><br>脚質データ ${known}/${horses.length}頭<br>過去5走取得後に自動判定します。`;
      return;
    }
    const escN=styles.filter(x=>x==='逃').length,lead=styles.filter(x=>x==='先').length,diff=styles.filter(x=>x==='差').length,clos=styles.filter(x=>x==='追').length;
    let auto=escN>=2||escN+lead>=Math.max(5,Math.ceil(known*.5))?'ハイ':escN===0&&lead<=2?'スロー':'ミドル';
    const manual=el('pace')?.value||'自動',applied=manual==='自動'?auto:manual;
    raceMeta.autoPace=auto;
    horses.forEach((h,i)=>{if(styles[i])h.style=styles[i]});
    box.innerHTML=`<b>適用ペース：${applied}</b><br>逃げ ${escN}頭 / 先行 ${lead}頭 / 差し ${diff}頭 / 追込 ${clos}頭 / 不明 ${horses.length-known}頭<br>${manual==='自動'?`過去走の通過順から脚質判定 → ${auto}想定`:'手動設定をAI分析へ反映'}`;
  }
  try{renderPaceReason=renderPaceReasonV295;window.renderPaceReason=renderPaceReasonV295}catch(_){}

  function applyRace(j,sourceUrl,rid){
    const list=Array.isArray(j?.horses)?j.horses:[];if(list.length<2)throw new Error('出走馬データを取得できませんでした。');
    raceMeta={...(j.meta||{}),race_id:rid||j?.meta?.race_id||'',source_url:sourceUrl};
    horses=list.map((h,i)=>({...h,no:+(h.no||h.horse_no||i+1),history:Array.isArray(h.history)?h.history:[],histScores:null,jra_history:Array.isArray(h.jra_history)?h.jra_history:[],netkeiba_horse_id:String(h.netkeiba_horse_id||h.horse_id||'')})).filter(h=>h.no&&h.name).sort((a,b)=>a.no-b.no);
    evaluated=[];
    try{oddsCache={race_id:raceMeta.race_id||'',win:{},wide:{},trio:{},fetched_at:null}}catch(_){}
    for(const h of horses){try{if(+h.odds>0)oddsCache.win[String(+h.no)]={odds:+h.odds,popularity:h.popularity||null,source:'出馬表'}}catch(_){}}
    if(raceMeta.race_name&&el('raceName'))el('raceName').value=raceMeta.race_name;
    setSelect('venue',raceMeta.venue);setSelect('surface',raceMeta.surface);setSelect('distance',raceMeta.distance);setSelect('going',raceMeta.going);
    updateHistoryCount();render();
  }

  function updateHistoryCount(){
    if(!Array.isArray(horses))return;
    const ok=horses.filter(h=>(h.history||[]).length).length,runs=horses.reduce((s,h)=>s+Math.min(5,(h.history||[]).length),0),jr=horses.filter(h=>(h.jra_history||[]).length).length;
    if(el('histCount'))el('histCount').textContent=`netkeiba ${ok}/${horses.length}頭・合計${runs}走 / JRA照合 ${jr}頭`;
  }

  async function hydrateMemory(){
    if(!Array.isArray(horses)||!horses.length)return;
    const ac=new AbortController();
    try{
      const j=await fetchJson(MEMORY_ENDPOINT,{action:'horse_memory',names:horses.map(h=>h.name)},ac,4000);
      const map=new Map((j.rows||[]).map(r=>[norm(r.horse_name),r.memory_json||{}]));
      let changed=false;
      horses=horses.map(h=>{
        const mem=map.get(norm(h.name))||{},p=mem.profile||{};const z={...h};
        const id=String(z.netkeiba_horse_id||z.horse_id||mem.netkeiba_horse_id||p.netkeiba_horse_id||'');
        if(id){z.netkeiba_horse_id=id;z.horse_id=id}
        for(const k of ['sire','dam','damsire'])if(!z[k]&&p[k]){z[k]=p[k];changed=true}
        if(!z.sex_age&&p.sex_age)z.sex_age=p.sex_age;
        if(!z.jockey&&p.jockey)z.jockey=p.jockey;
        return z;
      });
      if(changed)render();
    }catch(e){console.warn('memory hydrate skipped',e)}
  }

  async function importRace(){
    const btn=el('importRace');
    if(state.importing){try{state.importController?.abort('user')}catch(_){};return}
    const url=String(el('raceUrl')?.value||'').trim();if(!url){setStatus('raceStatus','JRA または netkeiba の出馬表URLを入れてください。',true);return}
    const rid=ridFrom(url);if(!rid){setStatus('raceStatus','URLからレースIDを判定できません。',true);return}
    const mySeq=++state.seq;state.importing=true;state.importController=new AbortController();
    if(btn){btn.disabled=false;btn.textContent='取得中（押すと中断）'}
    setStatus('raceStatus','出走馬を取得しています。');
    try{
      let j=null;
      if(isNk(url)){
        j=await fetchJson(NK_RACE_ENDPOINT,{url},state.importController,9000);
      }else{
        try{j=await fetchJson(JRA_ENDPOINT,{url},state.importController,6500)}catch(e){if(state.importController.signal.aborted)throw e}
        if(!j||!Array.isArray(j.horses)||j.horses.length<2){
          j=await fetchJson(NK_RACE_ENDPOINT,{url:`https://race.netkeiba.com/race/shutuba.html?race_id=${rid}`},state.importController,9000);
        }
      }
      if(mySeq!==state.seq)return;
      applyRace(j,url,rid);
      setStatus('raceStatus',`${horses.length}頭の出馬表を取得しました。\n血統は保存データから補完中です。次に「過去5走を再取得」を押してください。`);
      setTimeout(()=>hydrateMemory(),0);
    }catch(e){if(mySeq===state.seq)setStatus('raceStatus',e?.message||String(e),true)}
    finally{if(mySeq===state.seq){state.importing=false;state.importController=null;if(btn){btn.disabled=false;btn.textContent='出馬表取込'}}}
  }

  function mergeEnrichment(j){
    const rows=Array.isArray(j?.horses)?j.horses:[];const byId=new Map(rows.map(r=>[String(r.netkeiba_horse_id||r.horse_id||''),r]));const byName=new Map(rows.map(r=>[norm(r.name),r]));
    let ok=0,runs=0,ped=0,sty=0;
    horses=horses.map(h=>{
      const x=byId.get(String(h.netkeiba_horse_id||h.horse_id||''))||byName.get(norm(h.name));if(!x)return h;
      const z={...h};
      if(Array.isArray(x.history)&&x.history.length){z.history=x.history.slice(0,5);z.histScores=null;ok++;runs+=z.history.length}
      for(const k of ['sire','dam','damsire'])if(x[k])z[k]=x[k];
      if(['逃','先','差','追'].includes(x.style))z.style=x.style;
      if(x.netkeiba_horse_id||x.horse_id){z.netkeiba_horse_id=String(x.netkeiba_horse_id||x.horse_id);z.horse_id=z.netkeiba_horse_id}
      if(z.sire&&z.dam&&z.damsire)ped++;
      if(horseStyle(z))sty++;
      return z;
    });
    updateHistoryCount();render();
    return {ok,runs,ped,sty};
  }

  async function importHistory(){
    const btn=el('importHist');
    if(state.historyLoading){try{state.historyController?.abort('user')}catch(_){};return}
    if(!Array.isArray(horses)||!horses.length){setStatus('histStatus','先に出馬表を取り込んでください。',true);return}
    const mySeq=++state.seq;state.historyLoading=true;state.historyController=new AbortController();
    if(btn){btn.disabled=false;btn.textContent='取得中（押すと中断）'}
    setStatus('histStatus','netkeiba競馬新聞から過去走・脚質・血統を一括取得しています。');
    try{
      await hydrateMemory();
      const url=String(el('raceUrl')?.value||raceMeta?.source_url||'');const rid=raceMeta?.race_id||ridFrom(url);
      const j=await fetchJson(ENRICH_ENDPOINT,{race_id:rid,url},state.historyController,9000);
      if(mySeq!==state.seq)return;
      const r=mergeEnrichment(j);
      setStatus('histStatus',`過去走 ${r.ok}/${horses.length}頭・合計${r.runs}走 / 血統 ${r.ped}/${horses.length}頭 / 脚質 ${r.sty}/${horses.length}頭 を取得しました。`,r.ok===0);
    }catch(e){if(mySeq===state.seq)setStatus('histStatus',e?.message||String(e),true)}
    finally{if(mySeq===state.seq){state.historyLoading=false;state.historyController=null;if(btn){btn.disabled=false;btn.textContent='過去5走を再取得'}}}
  }

  function replaceButton(id,handler,label){const old=el(id);if(!old)return;const neu=old.cloneNode(true);old.replaceWith(neu);neu.disabled=false;neu.textContent=label;neu.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();handler()})}
  function install(){
    replaceButton('importRace',importRace,'出馬表取込');replaceButton('importHist',importHistory,'過去5走を再取得');
    const input=el('raceUrl');if(input)input.placeholder='JRA または netkeiba の出馬表URL';
    const panel=input?.closest('.panel'),h2=panel?.querySelector('h2');if(h2)h2.textContent='出馬表・枠前分析';
    document.documentElement.dataset.importController='v295';
    renderPaceReasonV295();
  }
  install();
  addEventListener('pageshow',()=>{if(document.documentElement.dataset.importController!=='v295')install()});
  window.__keibaImportV295={state,importRace,importHistory,hydrateMemory,renderPaceReason:renderPaceReasonV295};
})();
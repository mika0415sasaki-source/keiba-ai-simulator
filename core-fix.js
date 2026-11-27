(()=>{
 const wait=()=>{
  if(typeof jraImport!=='function'||typeof renderHorses!=='function'||!document.getElementById('raceUrl')){setTimeout(wait,60);return}
  if(window.__coreFixApplied)return;
  window.__coreFixApplied=true;
  document.documentElement.dataset.coreFixApplied='true';
  const bootCount=document.getElementById('histCount');if(bootCount)bootCount.textContent='騎手相性用全履歴：自動取得処理を準備しました';

  const BULK_API='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/netkeiba-newspaper-v2';
  const MEMORY_API_URL='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/keiba-memory-v55';
  const isNk=u=>/netkeiba\.com/i.test(String(u||''));
  const clean=v=>String(v??'').trim();
  // 騎手名は照合専用に正規化。既知の略記だけを同一視し、部分一致は使わない。
  const jockeyKey=v=>{
   const n=clean(v).normalize('NFKC').replace(/[\s　.．・･]/g,'').replace(/^[△▲☆★◇]/,'');
   const aliases={'Cルメール':'ルメール','Jモレイラ':'モレイラ','Lトーレス':'トーレス','Aプーシャ':'プーシャ','Aプーシャン':'プーシャ','プーシャン':'プーシャ','Mバルザロ':'バルザロ','Mバルザローナ':'バルザロ','バルザローナ':'バルザロ','バルザロー':'バルザロ','バルザロ':'バルザロ','Cデム':'Cデムーロ','Cデムー':'Cデムーロ','Mデム':'Mデムーロ','Mデムー':'Mデムーロ','ビュイッ':'ビュイック','Wビュイッ':'ビュイック','Wビュイック':'ビュイック','ウィリアムビュイック':'ビュイック','Rムーア':'ムーア','Cスミヨン':'スミヨン','マーカン':'Tマーカンド','Tマーカン':'Tマーカンド','マーカンド':'Tマーカンド','Tマーカンド':'Tマーカンド','Jマクドナルド':'マクドナルド','Zパートン':'パートン','Mディー':'ディー','Dレーン':'レーン','Pギュイヨ':'ギュイヨ','Mパスキエ':'パスキエ','Mムルザバ':'ムルザバ','ムルザバエフ':'ムルザバ','Aルクーヴ':'ルクーヴ','ルクーヴル':'ルクーヴ','Oオシェア':'オシェア','Oマーフィ':'マーフィ','Oマーフィー':'マーフィ','マーフィー':'マーフィ','Dマクモナグル':'マクモナグル','マクモナ':'マクモナグル','鮫島駿':'鮫島克駿','横山典':'横山典弘','坂井':'坂井瑠星','丹内':'丹内祐次','古川吉':'古川吉洋','戸崎圭':'戸崎圭太','岩田望':'岩田望来','吉田隼':'吉田隼人','三浦':'三浦皇成','北村友':'北村友一','川田':'川田将雅','幸':'幸英明','田口':'田口貫太','松山':'松山弘平','藤懸':'藤懸貴志','菅原明':'菅原明良','浜中':'浜中俊','西村淳':'西村淳也'};
   return aliases[n]||n;
  };
  // 短縮名は履歴内で候補が1名に確定できる場合だけ一致させる。横山など曖昧な姓だけでは結合しない。
  const jockeySame=(a,b,names=[])=>{
   const ka=jockeyKey(a),kb=jockeyKey(b);
   if(!ka||!kb)return false;
   if(ka===kb)return true;
   const isJapanese=s=>/^[\u3040-\u30ff\u3400-\u9fffー]+$/u.test(s);
   if(!isJapanese(ka)||!isJapanese(kb))return false;
   const short=ka.length<kb.length?ka:kb,long=ka.length<kb.length?kb:ka;
   if(short.length<2||!long.startsWith(short))return false;
   const candidates=new Set([ka,kb,...(Array.isArray(names)?names:[])].map(jockeyKey).filter(x=>x&&x!==short&&x.length>short.length&&x.startsWith(short)));
   return candidates.size===1&&candidates.has(long);
  };
  window.__keibaJockeyKey=jockeyKey;
  window.__keibaJockeySame=jockeySame;
  const alignJockeyHistory=(h,rows)=>{
   if(!Array.isArray(rows))return [];
   const names=rows.map(r=>r?.jockey||r?.rider||r?.jockey_name||r?.rider_name||'');
   return rows.map(r=>{
    if(!r||typeof r!=='object')return r;
    return jockeySame(h?.jockey,r.jockey||r.rider||r.jockey_name||r.rider_name||'',names)?{...r,jockey:clean(h.jockey),jockey_raw:clean(r.jockey_raw||r.jockey||r.rider||r.jockey_name||r.rider_name)}:r;
   });
  };
  const first=(...v)=>{for(const x of v){const s=clean(x);if(s&&s!=='-'&&s!=='—')return s}return ''};
  const ridFrom=u=>(String(u||'').match(/race_id[=\/:_-]*(20\d{10})/i)||String(u||'').match(/\b(20\d{10})\b/)||[])[1]||'';
  const validPed=v=>{const s=clean(v);if(!s||s.length<2||s.length>40)return'';if(/[�□■◆◇]/.test(s)||/^TOP$/i.test(s)||/^Image$/i.test(s)||/母:父|父:|母父:|データベース/.test(s))return'';if((s.match(/[・･]/g)||[]).length>=2)return'';return s};

  function normalizeHorse(h,i){
   if(!h)return h;
   const p=h.pedigree&&typeof h.pedigree==='object'?h.pedigree:{};
   const b=h.blood&&typeof h.blood==='object'?h.blood:{};
   h.no=+(h.no||i+1);
   h.name=clean(h.name);
   h.sex_age=first(h.sex_age,h.sexage,h.age);
   h.jockey=first(h.jockey,h.rider).replace(/^替/,'').replace(/\s+(5\d(?:\.\d)?|6[0-2](?:\.\d)?)$/,'').trim();

   const rawWeight=Number.isFinite(+h.weight)?+h.weight:null;
   const cw=Number.isFinite(+h.carried_weight)?+h.carried_weight:(rawWeight!==null&&rawWeight<100?rawWeight:null);
   h.carried_weight=cw;
   if(Number.isFinite(+h.body_weight)&&+h.body_weight>=300)h.body_weight=+h.body_weight;
   else if(rawWeight!==null&&rawWeight>=300)h.body_weight=rawWeight;
   else h.body_weight=null;

   h.sire=validPed(first(h.sire,h.father,h.sire_name,h.father_name,p.sire,p.father,b.sire,b.father));
   h.dam=validPed(first(h.dam,h.mother,h.dam_name,h.mother_name,p.dam,p.mother,b.dam,b.mother));
   h.damsire=validPed(first(h.damsire,h.dam_sire,h.broodmare_sire,h.maternal_grandsire,h.damsire_name,p.damsire,p.dam_sire,p.broodmare_sire,b.damsire,b.dam_sire));
   h.history=Array.isArray(h.history)?h.history.slice(0,5):[];
   if(!h.last_body_weight){const r=h.history.find(x=>Number.isFinite(+x.body_weight)&&+x.body_weight>=300);if(r)h.last_body_weight=+r.body_weight}
   if(h.history.length){h.histScores=scoreLocalHistory(h.history);h.histScores.available=true;h.netkeibaRejected=false;h.netkeibaError='';try{mergeNetkeibaWithJra(h)}catch(_){} }
   return h;
  }

  function saveLater(list){setTimeout(()=>fetch(MEMORY_API_URL,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'save_horses',horses:list})}).catch(()=>{}),0)}

  const JOCKEY_HISTORY_API='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/keiba-jockey-history-snapshot-preview-v1';
  async function fetchJockeyHistory(){
   const names=horses.map(h=>h.name);
   const horse_ids=Object.fromEntries(horses.map(h=>[clean(h.name),clean(h.netkeiba_horse_id||h.horse_id||'')]).filter(([name,id])=>name&&/^\d{10}$/.test(id)));
   let result={rows:[],error:''};
   try{
    const r=await fetch(JOCKEY_HISTORY_API,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({names,horse_ids,race_url:document.getElementById('raceUrl')?.value||'',race_date:raceMeta?.race_date||''})});
    result=await r.json().catch(()=>({rows:[],error:'騎手相性APIの応答を読めません'}));
    if(!r.ok)throw new Error(result.error||'騎手相性用全履歴の取得エラー');
   }catch(e){result={rows:[],error:e.message||String(e)}}
   const byName=new Map((result.rows||[]).map(x=>[clean(x.name||x.horse_name),x]));
   for(const h of horses){
    const row=byName.get(clean(h.name));
    h.jockey_history=alignJockeyHistory(h,Array.isArray(row?.history)?row.history:[]);
    h.jockey_history_loaded=row?.available===true&&h.jockey_history.length>0;
    h.jockey_history_error=h.jockey_history_loaded?'':clean(row?.error||result.error||'全履歴を取得できませんでした');
   }
   const loaded=horses.filter(h=>h.jockey_history_loaded===true).length;
   const runs=horses.reduce((n,h)=>n+(Array.isArray(h.jockey_history)?h.jockey_history.length:0),0);
   const missing=horses.filter(h=>!h.jockey_history_loaded);
   const reason=missing.length?' / 未取得 '+missing.length+'頭（'+missing.slice(0,4).map(h=>h.name+': '+h.jockey_history_error).join('、')+(missing.length>4?'、ほか'+(missing.length-4)+'頭':'')+'）':'';
   const d=result.diagnostics||{};const stages=d.stage_counts&&typeof d.stage_counts==='object'?Object.entries(d.stage_counts).map(([k,v])=>k+':'+v+'頭').join(' / '):'未返却';const cvDiag=Array.isArray(d.cherwinia_markand_rows)?'・チェルヴィニアのマーカン履歴 '+d.cherwinia_markand_rows.map(x=>x.date+':'+x.rank+'着/'+(x.field_size??'頭数—')+'頭').join('、'):'';
   const fsSamples=Array.isArray(d.field_size_missing_samples)?'・未取得例 '+d.field_size_missing_samples.slice(0,8).map(x=>x.horse+'['+x.examples.slice(0,1).map(r=>r.date+' '+JSON.stringify(r.debug?.rawCells||[])).join('')+']').join(' / '):'';
   const diag=' / 対象日 '+(result.cutoff??'未判定')+' / 馬ID確認 '+(d.id_found??'?')+'/'+names.length+'頭・出走表抽出ID '+(d.race_id_matches??'?')+'件・頭数取得 '+(d.field_size_runs??'?')+'/'+((d.field_size_runs??0)+(d.field_size_missing_runs??0))+'走・未取得馬 '+(d.field_size_missing_horses??'?')+'頭'+fsSamples+cvDiag+'・処理 '+(d.request_ms??'?')+'ms・段階 '+stages;
   return {loaded,runs,reason,diag};
  }

  function jockeyCardDisplaySummary(){
    const roster=Array.isArray(horses)?horses:[];
    const cards=[...document.querySelectorAll('#horses .card')];
    let shown=0,matched=0,neutral=0,missing=0;
    for(const h of roster){
     const history=Array.isArray(h.jockey_history)?h.jockey_history:[];
     const jockey=jockeyKey(h.jockey);
     const jockeyNames=history.map(r=>r?.jockey||r?.rider||r?.jockey_name||r?.rider_name||'');const matchedRows=jockey?history.filter(r=>jockeySame(h.jockey,r?.jockey||r?.rider||r?.jockey_name||r?.rider_name||'',jockeyNames)&&Number.isFinite(+r.rank)&&+r.rank>0):[];
     const samples=matchedRows.length;
     const card=cards.find(el=>(el.querySelector('.rank')?.textContent||'').includes(h.name));
     const line=card?[...card.querySelectorAll(':scope > .small')].find(el=>el.textContent.includes('騎手相性：')):null;
     if(line)shown++;
     if(samples>0)matched++;
     else if(history.length)neutral++;
     else missing++;
    }
    try{renderJockeyDiagnostics()}catch(_){}
    return ' / カード相性表示 '+shown+'/'+roster.length+'頭（照合あり '+matched+'頭・該当騎乗なし '+neutral+'頭・履歴未取得 '+missing+'頭）';
   }

  function renderJockeyDiagnostics(){
   const count=document.getElementById('histCount');if(!count)return;
   let panel=document.getElementById('jockeyDiagPanel');
   if(!panel){
    panel=document.createElement('details');panel.id='jockeyDiagPanel';panel.style.cssText='margin-top:10px;padding:9px 11px;border:1px solid #33445f;border-radius:8px;color:#dce7fb;font-size:12px;line-height:1.65';
    const summary=document.createElement('summary');summary.textContent='騎手相性の照合詳細（全馬）';summary.style.cssText='cursor:pointer;font-weight:600';
    const body=document.createElement('div');body.className='jockey-diag-body';body.style.cssText='margin-top:9px;display:grid;gap:8px';
    panel.append(summary,body);(count.parentElement||count).after(panel);
   }
   const body=panel.querySelector('.jockey-diag-body');if(!body)return;body.replaceChildren();
   for(const h of (Array.isArray(horses)?horses:[])){
    const section=document.createElement('section');section.style.cssText='padding:7px 0;border-top:1px solid #26364e';
    const allRows=Array.isArray(h.jockey_history)?h.jockey_history:[];const firstDate=allRows[0]?.date||allRows[0]?.race_date||'';const lastDate=allRows[allRows.length-1]?.date||allRows[allRows.length-1]?.race_date||'';
    const nameCounts=new Map();let withJockey=0;for(const rr of allRows){const raw=String(rr?.jockey||rr?.rider||rr?.jockey_name||rr?.rider_name||'').trim();if(raw){withJockey++;nameCounts.set(raw,(nameCounts.get(raw)||0)+1)}}const currentKey=jockeyKey(h.jockey);const historyNames=allRows.map(rr=>rr?.jockey||rr?.rider||rr?.jockey_name||rr?.rider_name||'');const matchedRows=allRows.filter(rr=>currentKey&&jockeySame(h.jockey,rr?.jockey||rr?.rider||rr?.jockey_name||rr?.rider_name||'',historyNames));const matched=matchedRows.length;const validRank=matchedRows.filter(rr=>Number.isFinite(+rr?.rank)&&+rr.rank>0).length;const rankSamples=matchedRows.slice(0,8).map(rr=>String(rr?.rank??'空')+'['+typeof rr?.rank+']').join('、')||'なし';const rawNames=[...nameCounts.entries()].sort((x,y)=>y[1]-x[1]).slice(0,12).map(([name,count])=>name+'×'+count).join('・')||'（騎手名なし）';
    const heading=document.createElement('div');heading.style.fontWeight='600';heading.textContent=(h.no||'')+' '+(h.name||'馬名不明')+' ／ 全履歴取得 '+allRows.length+'走'+(firstDate?'（'+firstDate+(lastDate&&lastDate!==firstDate?'〜'+lastDate:'')+'）':'')+' ／ 現騎手 '+(h.jockey||'未設定')+'：全履歴一致 '+matched+'件（着順有効 '+validRank+'件）／ 騎手名あり '+withJockey+'件 ／ 全履歴モデル照合 '+(h.jockeyFullHistoryMatchedV1??'未計測')+'件・頭数有効 '+(h.jockeyFullHistorySamplesV1??'未計測')+'件・点数 '+(Number.isFinite(+h.jockeyFullHistoryScoreV1)?Number(h.jockeyFullHistoryScoreV1).toFixed(1):'未計測');
    const modelDiag=document.createElement('div');modelDiag.style.cssText='color:#b9c9e3;font-size:11px';
    const fmt=v=>v==null||v===''?'—':Number.isFinite(Number(v))?Number(v).toFixed(1):'—';
    modelDiag.textContent=Number(h.jockeyFullHistorySamplesV1||0)===0?'全履歴モデル内訳：頭数有効な一致履歴なし（初期値65.0点・評価対象外）':'全履歴モデル内訳：相対着順 '+fmt(h.jockeyFullHistoryRelativeFinishV1)+' / 複勝圏率 '+fmt(h.jockeyFullHistoryPodiumRateV1)+'%（頭数基準 '+fmt(h.jockeyFullHistoryExpectedPodiumRateV1)+'%） / 安定度減点 '+fmt(h.jockeyFullHistoryConsistencyPenaltyV1)+' / 上限適用前 '+fmt(h.jockeyFullHistoryRawScoreV1)+'点';
    section.appendChild(heading);section.appendChild(modelDiag);
    const namesLine=document.createElement('div');namesLine.style.cssText='color:#8fa6c7;font-size:11px';namesLine.textContent='全履歴内の騎手名：'+rawNames+' ／ 現騎手の着順値：'+rankSamples+' ／ データ項目：'+(allRows[0]?Object.keys(allRows[0]).join(', '):'なし');section.appendChild(namesLine);
    body.appendChild(section);
   }
  }

  // 外部の履歴取得処理から診断パネルを表示できるようにする。
  window.__renderJockeyDiagnostics=()=>{try{renderJockeyDiagnostics()}catch(e){console.warn('jockey diagnostics render',e)}};

  window.__fetchJockeyHistoryForCurrentRace=fetchJockeyHistory;

  async function bulkFetch(url){
   const rid=ridFrom(url);if(!rid)throw new Error('netkeibaのrace_idを取得できません');
   const r=await fetch(BULK_API,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','Cache-Control':'no-cache'},body:JSON.stringify({url,race_id:rid})});
   const j=await r.json().catch(()=>({error:'競馬新聞APIの応答を読めません'}));
   if(!r.ok||!j.ok)throw new Error(j.error||'競馬新聞一括取得エラー');
   return j;
  }

  function trackJockeyHistoryFetch(promise){
   window.__jockeyHistoryCaptureStatus='loading';
   const tracked=Promise.resolve(promise).then(value=>{
    window.__jockeyHistoryCaptureStatus=Array.isArray(horses)&&horses.length&&horses.every(h=>h.jockey_history_loaded===true)?'complete':'partial';
    return value;
   },error=>{
    window.__jockeyHistoryCaptureStatus='error';
    throw error;
   });
   window.__jockeyHistoryFetchPromise=tracked;
   tracked.finally(()=>{if(window.__jockeyHistoryFetchPromise===tracked)window.__jockeyHistoryFetchPromise=null}).catch(()=>{});
   return tracked;
  }
  function startJockeyHistoryFetch(factory){
   if(window.__jockeyHistoryFetchPromise)return window.__jockeyHistoryFetchPromise;
   return trackJockeyHistoryFetch(factory());
  }

  async function fastHistory({silent=false}={}){
   if(!horses.length)return {ok:0,total:0,totalRuns:0};
   const url=clean(document.getElementById('raceUrl')?.value);
   if(!silent)status('histStatus','netkeiba競馬新聞から全頭データを一括取得中…');
   const j=await bulkFetch(url);
   const byId=new Map((j.horses||[]).map(x=>[clean(x.netkeiba_horse_id||x.horse_id),x]));
   const byName=new Map((j.horses||[]).map(x=>[clean(x.name),x]));
   horses=horses.map((h,i)=>{
    const x=byId.get(clean(h.netkeiba_horse_id||h.horse_id))||byName.get(clean(h.name));
    if(!x)return normalizeHorse(h,i);
    const z={...h};
    if(Array.isArray(x.history)&&x.history.length)z.history=x.history.slice(0,5);
    if(validPed(x.sire))z.sire=validPed(x.sire);
    if(validPed(x.dam))z.dam=validPed(x.dam);
    if(validPed(x.damsire))z.damsire=validPed(x.damsire);
    if(['逃','先','差','追'].includes(x.style))z.style=x.style;
    const resolvedHorseId=clean(x.netkeiba_horse_id||x.horse_id||'');
    if(/^\d{10}$/.test(resolvedHorseId))z.netkeiba_horse_id=resolvedHorseId;
    if(clean(x.jockey))z.jockey=clean(x.jockey);
    if(Number.isFinite(+x.carried_weight))z.carried_weight=+x.carried_weight;
    if(Number.isFinite(+x.body_weight)&&+x.body_weight>=300)z.body_weight=+x.body_weight;
    if(Number.isFinite(+x.last_body_weight)&&+x.last_body_weight>=300)z.last_body_weight=+x.last_body_weight;
    z.netkeiba_source='newspaper_master';
    return normalizeHorse(z,i);
   });
   renderHorses();try{evalAll()}catch(_){};try{if(typeof renderPaceReason==='function')renderPaceReason()}catch(_){};fixCards();saveLater(horses);
   const ok=horses.filter(h=>(h.history||[]).length).length,totalRuns=horses.reduce((n,h)=>n+Math.min(5,(h.history||[]).length),0),jraN=horses.filter(h=>(h.jra_history||[]).length).length;
   const jockey=await fetchJockeyHistory();
   // 確率モデルが実際に参照する全履歴騎手相性関数を、取得完了後の各馬データへ直接適用する。
   // 旧jockeyComboScoreとは別系統のため、実モデル側の診断値もここで確定させる。
   try{
    const fullCombo=window.jockeyFullHistoryComboScore;
    if(typeof fullCombo==='function')for(const h of horses||[])fullCombo(h);
   }catch(e){console.warn('jockey full-history model refresh',e)}
   // 全履歴取得後、確率・分析更新より先に全履歴騎手相性モデルを各馬へ明示適用する。
   // 出馬表取込直後（全履歴取得前）に作られた古い騎手相性診断値を残さない。
   try{
    const combo=window.jockeyComboScore;
    if(typeof combo==='function'&&combo.__baseline20260910V358===true){
     for(const h of horses||[])combo(h);
    }
   }catch(e){console.warn('jockey full-history refresh',e)}
   try{window.__refreshRankingProbabilityV337?.()}catch(e){console.warn('jockey probability refresh',e)}
   try{if(typeof evalAll==='function')evalAll()}catch(e){console.warn('jockey analysis refresh',e)}
   try{if(typeof renderHorses==='function')renderHorses()}catch(e){console.warn('jockey card rerender',e)}
   const hc=document.getElementById('histCount');if(hc)hc.textContent='netkeiba '+ok+'/'+horses.length+'頭・合計'+totalRuns+'走 / JRA照合 '+jraN+'頭 / 騎手相性用全履歴 '+jockey.loaded+'/'+horses.length+'頭・計'+jockey.runs+'走'+jockey.reason+jockeyCardDisplaySummary()+jockey.diag;
   const displayDiag=jockeyCardDisplaySummary();
   status('histStatus','騎手相性表示確認：'+displayDiag);
   if(!silent){const ped=horses.filter(h=>h.sire&&h.dam&&h.damsire).length,sty=horses.filter(h=>['逃','先','差','追'].includes(h.style)).length;status('histStatus',`netkeiba ${ok}/${horses.length}頭・合計${totalRuns}走を取得。血統 ${ped}/${horses.length}頭・脚質 ${sty}/${horses.length}頭。${displayDiag}`)}
   return {ok,total:horses.length,totalRuns};
  }

  const originalJraImport=jraImport;
  jraImport=async function(url){
   const s=clean(url);
   if(!isNk(s)){window.__preentryMode=false;return originalJraImport(url)}
   window.__preentryMode=true;
   try{oddsCache={race_id:'',win:{},wide:{},trio:{},fetched_at:null}}catch(_){}
   let base=await originalJraImport(s);
   if(base&&Array.isArray(base.horses))base.horses=base.horses.map(normalizeHorse);
   // 出馬表表示を先に完了し、その後に競馬新聞1ページだけで全頭を補完。
   const scheduled=new Promise((resolve,reject)=>setTimeout(()=>fastHistory({silent:true}).then(resolve,reject),120));
   startJockeyHistoryFetch(()=>scheduled).catch(e=>console.warn('newspaper enrichment',e));
   return base;
  };

  loadNetkeibaHistories=async function({silent=false,force=false}={}){
   if(!horses.length){if(!silent)status('histStatus','先に出馬表を取り込んでください。',true);return {ok:0,total:0,totalRuns:0}}
   if(isNk(document.getElementById('raceUrl')?.value)){
    try{return await startJockeyHistoryFetch(()=>fastHistory({silent}))}catch(e){if(!silent)status('histStatus','競馬新聞取得エラー：'+(e.message||String(e)),true);return {ok:0,total:horses.length,totalRuns:0,error:e}}
   }
   horses=horses.map(normalizeHorse);renderHorses();try{evalAll()}catch(_){};fixCards();
   const ok=horses.filter(h=>(h.history||[]).length).length,totalRuns=horses.reduce((n,h)=>n+Math.min(5,(h.history||[]).length),0);
   const jockey=await startJockeyHistoryFetch(()=>fetchJockeyHistory());
   try{window.__refreshRankingProbabilityV337?.()}catch(e){console.warn('jockey probability refresh',e)}
   try{if(typeof evalAll==='function')evalAll()}catch(e){console.warn('jockey analysis refresh',e)}
   try{if(typeof renderHorses==='function')renderHorses()}catch(e){console.warn('jockey card rerender',e)}
   const jraN=horses.filter(h=>(h.jra_history||[]).length).length;
   const hc=document.getElementById('histCount');if(hc)hc.textContent='netkeiba '+ok+'/'+horses.length+'頭・合計'+totalRuns+'走 / JRA照合 '+jraN+'頭 / 騎手相性用全履歴 '+jockey.loaded+'/'+horses.length+'頭・計'+jockey.runs+'走'+jockey.reason+jockeyCardDisplaySummary();
   return {ok,total:horses.length,totalRuns,jockeyLoaded:jockey.loaded,jockeyRuns:jockey.runs};
  };

  function weightLabel(h){
   const cur=Number.isFinite(+h.body_weight)&&+h.body_weight>=300?Math.round(+h.body_weight):null;
   const prev=Number.isFinite(+h.last_body_weight)&&+h.last_body_weight>=300?Math.round(+h.last_body_weight):null;
   return cur?`${cur}kg`:(prev?`前走${prev}kg`:'馬体重未発表');
  }

  function fixCards(){
   if(!isNk(document.getElementById('raceUrl')?.value))return;
   try{horses.forEach((h,i)=>normalizeHorse(h,i))}catch(_){}
   const cards=[...document.querySelectorAll('#horses .card')];
   cards.forEach(card=>{
    const title=card.querySelector('.rank')?.textContent||'';const h=horses.find(x=>title.includes(x.name));if(!h)return;
    const smalls=card.querySelectorAll(':scope > .small');
    // Horse-card first line is owned by current-data-v370; do not overwrite it here.
    if(smalls[1])smalls[1].textContent=`脚質推定：${['逃','先','差','追'].includes(h.style)?h.style:'未取得'}　父：${validPed(h.sire)||'未取得'}　母：${validPed(h.dam)||'未取得'}　母父：${validPed(h.damsire)||'未取得'}`;
   });
   document.querySelectorAll('#ranking .card').forEach(el=>{let s=el.innerHTML;s=s.replace(/予想単勝\s*([0-9.]+)倍\s*\/\s*予想\d+番人気/g,'予想単勝 $1倍 / 人気未確定');if(s!==el.innerHTML)el.innerHTML=s});
  }

  function attachWeightAnalysis(){
   horses.forEach(h=>{
    const cur=Number.isFinite(+h.body_weight)&&+h.body_weight>=300?+h.body_weight:null;
    const prev=Number.isFinite(+h.last_body_weight)&&+h.last_body_weight>=300?+h.last_body_weight:null;
    h.previous_body_weight=prev;
    h.body_weight_change=cur&&prev?cur-prev:null;
    h.weight_condition=cur&&prev?Math.abs(cur-prev)/prev:null;
   });
  }
  const baseEval=typeof evalAll==='function'?evalAll:null;
  if(baseEval){evalAll=function(){attachWeightAnalysis();return baseEval.apply(this,arguments)}}

  let timer=0;new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(fixCards,80)}).observe(document.body,{subtree:true,childList:true});setTimeout(fixCards,200);
 };
 wait();
})();
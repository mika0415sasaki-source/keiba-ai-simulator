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

  const JOCKEY_HISTORY_API='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/keiba-jockey-history-test-v1';
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
    h.jockey_history=Array.isArray(row?.history)?row.history:[];
    h.jockey_history_loaded=row?.available===true&&h.jockey_history.length>0;
    h.jockey_history_error=h.jockey_history_loaded?'':clean(row?.error||result.error||'全履歴を取得できませんでした');
   }
   const loaded=horses.filter(h=>h.jockey_history_loaded===true).length;
   const runs=horses.reduce((n,h)=>n+(Array.isArray(h.jockey_history)?h.jockey_history.length:0),0);
   const missing=horses.filter(h=>!h.jockey_history_loaded);
   const reason=missing.length?' / 未取得 '+missing.length+'頭（'+missing.slice(0,4).map(h=>h.name+': '+h.jockey_history_error).join('、')+(missing.length>4?'、ほか'+(missing.length-4)+'頭':'')+'）':'';
   const d=result.diagnostics||{};const stages=d.stage_counts&&typeof d.stage_counts==='object'?Object.entries(d.stage_counts).map(([k,v])=>k+':'+v+'頭').join(' / '):'未返却';const cvDiag=Array.isArray(d.cherwinia_markand_rows)?'・チェルヴィニアのマーカン履歴 '+d.cherwinia_markand_rows.map(x=>x.date+':'+x.rank+'着/'+(x.field_size??'頭数—')+'頭').join('、'):'';
   const fsSamples=Array.isArray(d.field_size_missing_samples)?'・未取得例 '+d.field_size_missing_samples.slice(0,8).map(x=>x.horse+'['+x.examples.slice(0,1).map(r=>r.date+' '+JSON.stringify(r.debug?.rawCells||[])).join('')+']').join(' / '):'';
   const diag=' / 馬ID確認 '+(d.id_found??'?')+'/'+names.length+'頭・出走表抽出ID '+(d.race_id_matches??'?')+'件・頭数取得 '+(d.field_size_runs??'?')+'/'+((d.field_size_runs??0)+(d.field_size_missing_runs??0))+'走・未取得馬 '+(d.field_size_missing_horses??'?')+'頭'+fsSamples+cvDiag+'・処理 '+(d.request_ms??'?')+'ms・段階 '+stages;
   return {loaded,runs,reason,diag};
  }

  function jockeyCardDisplaySummary(){
   const roster=Array.isArray(horses)?horses:[];
   const cards=[...document.querySelectorAll('#horses .card')];
   let shown=0,matched=0,neutral=0,missing=0,cherwinia='';
   for(const h of roster){
    const history=Array.isArray(h.jockey_history)?h.jockey_history:[];
    const jockey=clean(h.jockey).replace(/\s+/g,'');
    const matchedRows=jockey?history.filter(r=>String(r.jockey||'').replace(/\s+/g,'').includes(jockey)&&Number.isFinite(+r.rank)&&+r.rank>0):[];
    const samples=matchedRows.length;
    const card=cards.find(el=>(el.querySelector('.rank')?.textContent||'').includes(h.name));
    const line=card?[...card.querySelectorAll(':scope > .small')].find(el=>el.textContent.includes('騎手相性：')):null;
    if(line)shown++;
    if(samples>0)matched++;
    else if(history.length)neutral++;
    else missing++;
    if(h.name==='チェルヴィニア'){
     const names=[...new Set(history.map(r=>clean(r.jockey)).filter(Boolean))];
     cherwinia=' / チェルヴィニア照合診断（現騎手 '+(jockey||'未設定')+'・履歴 '+history.length+'走・一致 '+samples+'件・履歴内騎手名 '+(names.join('、')||'なし')+'）';
    }
   }
   return ' / カード相性表示 '+shown+'/'+roster.length+'頭（照合あり '+matched+'頭・該当騎乗なし '+neutral+'頭・履歴未取得 '+missing+'頭）'+cherwinia;
  }

  window.__fetchJockeyHistoryForCurrentRace=fetchJockeyHistory;

  async function bulkFetch(url){
   const rid=ridFrom(url);if(!rid)throw new Error('netkeibaのrace_idを取得できません');
   const r=await fetch(BULK_API,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','Cache-Control':'no-cache'},body:JSON.stringify({url,race_id:rid})});
   const j=await r.json().catch(()=>({error:'競馬新聞APIの応答を読めません'}));
   if(!r.ok||!j.ok)throw new Error(j.error||'競馬新聞一括取得エラー');
   return j;
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
   setTimeout(()=>fastHistory({silent:true}).catch(e=>console.warn('newspaper enrichment',e)),120);
   return base;
  };

  loadNetkeibaHistories=async function({silent=false,force=false}={}){
   if(!horses.length){if(!silent)status('histStatus','先に出馬表を取り込んでください。',true);return {ok:0,total:0,totalRuns:0}}
   if(isNk(document.getElementById('raceUrl')?.value)){
    try{return await fastHistory({silent})}catch(e){if(!silent)status('histStatus','競馬新聞取得エラー：'+(e.message||String(e)),true);return {ok:0,total:horses.length,totalRuns:0,error:e}}
   }
   horses=horses.map(normalizeHorse);renderHorses();try{evalAll()}catch(_){};fixCards();
   const ok=horses.filter(h=>(h.history||[]).length).length,totalRuns=horses.reduce((n,h)=>n+Math.min(5,(h.history||[]).length),0);
   const jockey=await fetchJockeyHistory();
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
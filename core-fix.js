(()=>{
 const wait=()=>{
  if(!window.__independentPatchApplied||typeof jraImport!=='function'||typeof renderHorses!=='function'||typeof scoreLocalHistory!=='function'||!document.getElementById('raceUrl')){setTimeout(wait,60);return}
  if(window.__coreFixApplied)return;
  window.__coreFixApplied=true;

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
    if(clean(x.jockey))z.jockey=clean(x.jockey);
    if(Number.isFinite(+x.carried_weight))z.carried_weight=+x.carried_weight;
    if(Number.isFinite(+x.body_weight)&&+x.body_weight>=300)z.body_weight=+x.body_weight;
    if(Number.isFinite(+x.last_body_weight)&&+x.last_body_weight>=300)z.last_body_weight=+x.last_body_weight;
    z.netkeiba_source='newspaper_master';
    return normalizeHorse(z,i);
   });
   renderHorses();try{evalAll()}catch(_){};try{if(typeof renderPaceReason==='function')renderPaceReason()}catch(_){};fixCards();saveLater(horses);
   const ok=horses.filter(h=>(h.history||[]).length).length,totalRuns=horses.reduce((n,h)=>n+Math.min(5,(h.history||[]).length),0),jraN=horses.filter(h=>(h.jra_history||[]).length).length;
   const hc=document.getElementById('histCount');if(hc)hc.textContent='netkeiba '+ok+'/'+horses.length+'頭・合計'+totalRuns+'走 / JRA照合 '+jraN+'頭';
   if(!silent){const ped=horses.filter(h=>h.sire&&h.dam&&h.damsire).length,sty=horses.filter(h=>['逃','先','差','追'].includes(h.style)).length;status('histStatus',`netkeiba ${ok}/${horses.length}頭・合計${totalRuns}走を取得。血統 ${ped}/${horses.length}頭・脚質 ${sty}/${horses.length}頭。`)}
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
   return {ok,total:horses.length,totalRuns};
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
    if(smalls[0]){
      const ageWeight=[h.sex_age||'',weightLabel(h)].filter(Boolean).join(' / ');
      const parts=[ageWeight,h.jockey||'騎手未取得',Number.isFinite(+h.carried_weight)?`斤量${(+h.carried_weight).toFixed(1)}kg`:'' ].filter(Boolean);
      smalls[0].textContent=parts.join('　');
    }
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
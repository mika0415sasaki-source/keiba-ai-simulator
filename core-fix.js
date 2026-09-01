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

  function normalizeHorse(h,i){
   if(!h)return h;
   const p=h.pedigree&&typeof h.pedigree==='object'?h.pedigree:{};
   const b=h.blood&&typeof h.blood==='object'?h.blood:{};
   h.no=+(h.no||i+1);
   h.name=clean(h.name);
   h.sex_age=first(h.sex_age,h.sexage,h.age);
   h.jockey=first(h.jockey,h.rider).replace(/^替/,'').replace(/\s+(5\d(?:\.\d)?|6[0-2](?:\.\d)?)$/,'').trim();
   const cw=Number.isFinite(+h.carried_weight)?+h.carried_weight:(Number.isFinite(+h.weight)?+h.weight:null);
   h.carried_weight=cw;h.weight=cw;
   h.sire=first(h.sire,h.father,h.sire_name,h.father_name,p.sire,p.father,b.sire,b.father);
   h.dam=first(h.dam,h.mother,h.dam_name,h.mother_name,p.dam,p.mother,b.dam,b.mother);
   h.damsire=first(h.damsire,h.dam_sire,h.broodmare_sire,h.maternal_grandsire,h.damsire_name,p.damsire,p.dam_sire,p.broodmare_sire,b.damsire,b.dam_sire);
   h.history=Array.isArray(h.history)?h.history.slice(0,5):[];
   if(h.history.length){h.histScores=scoreLocalHistory(h.history);h.histScores.available=true;h.netkeibaRejected=false;h.netkeibaError='';try{mergeNetkeibaWithJra(h)}catch(_){} }
   return h;
  }

  async function bulkFetch(url){
   const rid=ridFrom(url);if(!rid)throw new Error('netkeibaのrace_idを取得できません');
   const r=await fetch(BULK_API,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','Cache-Control':'no-cache'},body:JSON.stringify({url,race_id:rid})});
   const j=await r.json().catch(()=>({error:'netkeiba一括取得の応答を読めません'}));
   if(!r.ok||!j.ok)throw new Error(j.error||'netkeiba一括取得エラー');
   j.horses=(j.horses||[]).map(normalizeHorse);
   j.meta={...(j.meta||{}),source:'netkeiba-bulk-v2',provisional:true};
   return j;
  }

  function saveLater(list){setTimeout(()=>fetch(MEMORY_API_URL,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'save_horses',horses:list})}).catch(()=>{}),0)}

  const originalJraImport=jraImport;
  jraImport=async function(url){
   const s=clean(url);
   if(!isNk(s)){window.__preentryMode=false;return originalJraImport(url)}
   window.__preentryMode=true;
   try{oddsCache={race_id:'',win:{},wide:{},trio:{},fetched_at:null}}catch(_){}
   // 競馬新聞APIがnetkeiba側で404になっても、出馬表取込そのものは絶対に止めない。
   // まず高速で安定している既存のnetkeiba-race-importを使い、競馬新聞は補助扱いにする。
   let base=await originalJraImport(s);
   if(base&&Array.isArray(base.horses))base.horses=base.horses.map(normalizeHorse);
   // 補助取得はバックグラウンド。失敗しても画面・出馬表を壊さない。
   setTimeout(async()=>{
    try{
      const extra=await bulkFetch(s);
      if(!extra||!Array.isArray(extra.horses)||!extra.horses.length||!Array.isArray(horses)||!horses.length)return;
      const mp=new Map(extra.horses.map(x=>[clean(x.netkeiba_horse_id||x.horse_id||x.name),x]));
      horses=horses.map((h,i)=>{
        const k=clean(h.netkeiba_horse_id||h.horse_id||h.name);
        const x=mp.get(k)||extra.horses.find(y=>clean(y.name)===clean(h.name));
        return normalizeHorse(x?{...h,...x}:h,i);
      });
      renderHorses();try{evalAll()}catch(_){};try{if(typeof renderPaceReason==='function')renderPaceReason()}catch(_){};fixCards();saveLater(horses);
    }catch(e){console.warn('optional netkeiba newspaper enrichment skipped',e)}
   },0);
   return base;
  };

  // 自動読込では重い個別再検索をしない。既に取れた過去走だけ即表示する。
  const originalLoadNetkeibaHistories=loadNetkeibaHistories;
  loadNetkeibaHistories=async function({silent=false,force=false}={}){
   if(!horses.length){if(!silent)status('histStatus','先に出馬表を取り込んでください。',true);return {ok:0,total:0,totalRuns:0}}
   if(force&&isNk(document.getElementById('raceUrl')?.value)){
    // 手動の「再取得」だけ従来の補完処理を許可する。
    try{return await originalLoadNetkeibaHistories({silent,force:true})}catch(e){if(!silent)status('histStatus','再取得に失敗：'+(e.message||String(e)),true)}
   }
   horses=horses.map(normalizeHorse);renderHorses();try{evalAll()}catch(_){};try{if(typeof renderPaceReason==='function')renderPaceReason()}catch(_){}
   const ok=horses.filter(h=>(h.history||[]).length).length,totalRuns=horses.reduce((n,h)=>n+Math.min(5,(h.history||[]).length),0),jraN=horses.filter(h=>(h.jra_history||[]).length).length;
   const hc=document.getElementById('histCount');if(hc)hc.textContent='netkeiba '+ok+'/'+horses.length+'頭・合計'+totalRuns+'走 / JRA照合 '+jraN+'頭';
   if(!silent)status('histStatus','netkeiba '+ok+'/'+horses.length+'頭・合計'+totalRuns+'走を使用。');fixCards();return {ok,total:horses.length,totalRuns};
  };

  function fixCards(){
   if(!isNk(document.getElementById('raceUrl')?.value))return;
   try{horses.forEach((h,i)=>normalizeHorse(h,i))}catch(_){}
   const cards=[...document.querySelectorAll('#horses .card')];
   cards.forEach(card=>{
    const title=card.querySelector('.rank')?.textContent||'';const h=horses.find(x=>title.includes(x.name));if(!h)return;
    const smalls=card.querySelectorAll(':scope > .small');
    if(smalls[0]){const parts=[h.sex_age||'',h.jockey||'',Number.isFinite(+h.carried_weight)?`斤量${(+h.carried_weight).toFixed(1)}kg`:'' ].filter(Boolean);smalls[0].textContent=parts.join('　')}
   });
   // 枠前で人気順位がソースに無い場合は数値を作らない。
   document.querySelectorAll('#ranking .card').forEach(el=>{let s=el.innerHTML;s=s.replace(/予想単勝\s*([0-9.]+)倍\s*\/\s*予想\d+番人気/g,'予想単勝 $1倍 / 人気未確定');if(s!==el.innerHTML)el.innerHTML=s});
  }
  let timer=0;new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(fixCards,80)}).observe(document.body,{subtree:true,childList:true});setTimeout(fixCards,200);
 };
 wait();
})();
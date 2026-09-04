(()=>{
  if(window.__dataIntegrityV271)return;
  window.__dataIntegrityV271=true;

  const ROSTER_API='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/netkeiba-race-horse-ids-v1';
  const HIST_API='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/netkeiba-horse-history-v4';
  const FALLBACK_API='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/keiba-netkeiba-fallback';
  const clean=v=>String(v||'').normalize('NFKC').replace(/[\s　]+/g,'').trim();
  const validNo=v=>Number.isInteger(+v)&&+v>=1&&+v<=18?+v:null;
  const list=()=>{try{if(typeof horses!=='undefined'&&Array.isArray(horses))return horses}catch(_){}return Array.isArray(window.horses)?window.horses:[]};
  const inputUrl=()=>String(document.getElementById('raceUrl')?.value||'');
  const isNk=u=>/netkeiba\.com/i.test(String(u||''));

  function raceId(url){
    try{if(typeof raceIdFromUrl==='function'){const x=String(raceIdFromUrl(url)||'');if(/^20\d{10}$/.test(x))return x}}catch(_){}
    let s=String(url||'');for(let i=0;i<3;i++){try{s=decodeURIComponent(s)}catch(_){break}}
    return (s.match(/(?:race_id[=:_-]*|\/race\/)(20\d{10})/i)||s.match(/\b(20\d{10})\b/)||[])[1]||'';
  }
  function dateKey(v){const s=String(v||'').replace(/[.\-]/g,'/');const m=s.match(/(?:(20\d{2})\/)?(\d{1,2})\/(\d{1,2})/);return m?`${m[1]||''}/${String(+m[2]).padStart(2,'0')}/${String(+m[3]).padStart(2,'0')}`:''}
  function sameRun(a,b){
    if(!a||!b)return false;const da=dateKey(a.date),db=dateKey(b.date);if(!da||!db)return false;
    const aa=da.split('/'),bb=db.split('/');if(aa[1]!==bb[1]||aa[2]!==bb[2])return false;if(aa[0]&&bb[0]&&aa[0]!==bb[0])return false;
    const ad=+a.distance||0,bd=+b.distance||0;if(ad&&bd&&ad!==bd)return false;
    const av=clean(a.venue||a.course),bv=clean(b.venue||b.course);if(av&&bv&&av!==bv)return false;return true;
  }
  function richer(target,source){
    if(!target||!source)return target;
    for(const k of ['venue','surface','going','jockey','race_name','grade'])if(!clean(target[k])&&clean(source[k]))target[k]=source[k];
    for(const k of ['rank','distance','last3f','field_size','body_weight'])if((!Number.isFinite(+target[k])||+target[k]<=0)&&Number.isFinite(+source[k])&&+source[k]>0)target[k]=source[k];
    if((!Array.isArray(target.passage)||!target.passage.length)&&Array.isArray(source.passage)&&source.passage.length)target.passage=[...source.passage];
    return target;
  }
  function normalizeRuns(rows){
    const out=[];for(const r of rows||[]){if(!r)continue;if(/取消|除外|中止|失格/.test(String(r.status||r.result_status||r.rank_text||'')))continue;const rank=+(r.rank??r.pos)||0,dist=+(r.distance??r.dist)||0;if(!rank||!dist)continue;const z={...r,rank,distance:dist};const old=out.find(x=>sameRun(x,z));if(old)richer(old,z);else out.push(z)}
    out.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));return out.slice(0,5);
  }
  function mergeHistory(h,fresh){
    const current=normalizeRuns(h.history||[]),exact=normalizeRuns(fresh||[]),jra=normalizeRuns(h.jra_history||[]),out=[];
    for(const r of exact){const z={...r};const old=current.find(x=>sameRun(x,z));if(old)richer(z,old);const jr=jra.find(x=>sameRun(x,z));if(jr)richer(z,jr);out.push(z)}
    for(const r of current){if(out.some(x=>sameRun(x,r)))continue;const z={...r};const jr=jra.find(x=>sameRun(x,z));if(jr)richer(z,jr);out.push(z);if(out.length>=5)break}
    h.history=out.slice(0,5);
    try{if(typeof mergeNetkeibaWithJra==='function')mergeNetkeibaWithJra(h)}catch(_){}
    try{if(typeof scoreLocalHistory==='function'&&h.history.length){h.histScores=scoreLocalHistory(h.history);h.histScores.available=true}}catch(_){}
  }

  let rosterCache={rid:'',rows:[],at:0},busy=false;
  async function fetchRoster(url,force=false){
    const rid=raceId(url);if(!rid)return[];
    if(!force&&rosterCache.rid===rid&&rosterCache.rows.length&&Date.now()-rosterCache.at<60000)return rosterCache.rows;
    const r=await fetch(ROSTER_API,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','Cache-Control':'no-cache'},body:JSON.stringify({race_id:rid})});
    const j=await r.json().catch(()=>({rows:[]}));if(!r.ok||!Array.isArray(j.rows)||!j.rows.length)throw new Error(j?.error||'出馬表の馬IDを取得できません');
    rosterCache={rid,rows:j.rows,at:Date.now()};return j.rows;
  }
  function applyRosterTo(list0,rows,url){
    if(!Array.isArray(list0)||!list0.length||!Array.isArray(rows)||!rows.length)return list0;
    const byName=new Map(rows.map(r=>[clean(r.name),r]));
    for(const h of list0){
      const r=byName.get(clean(h.name));if(!r)continue;const id=String(r.id||'').toLowerCase();if(id){h.netkeiba_horse_id=id;h.horse_id=id;h.netkeibaExactHorseId=true}
      const no=validNo(r.no??r.horse_no);if(isNk(url)&&no){h.no=no;h.horse_no=no;h.provisional_no=false}
    }
    if(isNk(url)&&list0.every(h=>validNo(h.no))){list0.sort((a,b)=>+a.no-+b.no)}
    return list0;
  }
  function applyCachedRoster(){const hs=list();if(!hs.length||!rosterCache.rows.length)return;applyRosterTo(hs,rosterCache.rows,inputUrl())}

  async function recoverHistories(force=false){
    if(busy)return false;const hs=list();if(!hs.length)return false;busy=true;
    try{
      const url=inputUrl();const rows=await fetchRoster(url,force).catch(()=>[]);if(rows.length)applyRosterTo(hs,rows,url);
      const byName=new Map(rows.map(r=>[clean(r.name),r]));const items=[];
      for(const h of hs){const rr=byName.get(clean(h.name));const id=String(rr?.id||h.netkeiba_horse_id||h.horse_id||'').toLowerCase();if(/^[0-9a-z]{10}$/.test(id)){h.netkeiba_horse_id=id;h.horse_id=id;items.push({name:h.name,id})}}
      if(items.length){
        const r=await fetch(HIST_API,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','Cache-Control':'no-cache'},body:JSON.stringify({items})});
        const j=await r.json().catch(()=>({results:[]}));if(r.ok){for(const h of hs){const id=String(h.netkeiba_horse_id||'').toLowerCase();const x=(j.results||[]).find(v=>clean(v?.name)===clean(h.name)&&String(v?.id||'').toLowerCase()===id);if(x?.available&&Array.isArray(x.history)&&x.history.length)mergeHistory(h,x.history)}}
      }
      let need=hs.filter(h=>(h.history||[]).length<5);
      if(need.length){
        const ids={};for(const h of need){const id=String(h.netkeiba_horse_id||h.horse_id||'');if(id)ids[h.name]=id}
        const fr=await fetch(FALLBACK_API,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','Cache-Control':'no-cache'},body:JSON.stringify({names:need.map(h=>h.name),race_url:url,race_date:(typeof raceMeta==='object'&&(raceMeta?.race_date||raceMeta?.date||raceMeta?.raceDate))||'',horse_ids:ids})});
        const fj=await fr.json().catch(()=>({results:[]}));if(fr.ok){for(const h of need){const x=(fj.results||[]).find(v=>clean(v?.name)===clean(h.name));if(!x?.available||!Array.isArray(x.history)||!x.history.length)continue;const exactId=String(h.netkeiba_horse_id||h.horse_id||'');const jra=h.jra_history||[];const corroborated=!!exactId||isNk(url)||x.history.some(a=>jra.some(b=>sameRun(a,b)));if(corroborated)mergeHistory(h,x.history)}}
      }
      applyCachedRoster();
      const ok=hs.filter(h=>(h.history||[]).length).length,total=hs.reduce((n,h)=>n+Math.min(5,(h.history||[]).length),0),jraN=hs.filter(h=>(h.jra_history||[]).length).length;
      const hc=document.getElementById('histCount');if(hc)hc.textContent=`netkeiba ${ok}/${hs.length}頭・合計${total}走 / JRA照合 ${jraN}頭`;
      const rs=document.getElementById('raceStatus');if(rs&&rs.innerHTML){rs.innerHTML=rs.innerHTML.replace(/netkeiba5走\s*\d+\/\d+頭/g,`netkeiba5走 ${ok}/${hs.length}頭`).replace(/JRA前4走\s*\d+頭/g,`JRA前4走 ${jraN}頭`)}
      try{if(typeof renderHorses==='function')renderHorses()}catch(_){};try{if(typeof evalAll==='function')evalAll()}catch(_){};applyCachedRoster();return true;
    }catch(e){console.warn('data integrity v271',e);return false}finally{busy=false}
  }
  window.__recoverRaceDataV271=recoverHistories;

  function wrapJraImport(){
    try{
      if(typeof jraImport!=='function'||jraImport.__dataIntegrityV271)return false;
      const original=jraImport;
      const wrapped=async function(url){const value=await original.apply(this,arguments);try{const rows=await fetchRoster(url,true);if(Array.isArray(value?.horses))applyRosterTo(value.horses,rows,url)}catch(_){}return value};
      wrapped.__dataIntegrityV271=true;wrapped.__original=original;jraImport=wrapped;try{window.jraImport=wrapped}catch(_){}return true;
    }catch(_){return false}
  }
  function wrapRenderer(){
    try{if(typeof renderHorses==='function'&&!renderHorses.__dataIntegrityV271){const original=renderHorses;const wrapped=function(){applyCachedRoster();const v=original.apply(this,arguments);applyCachedRoster();return v};wrapped.__dataIntegrityV271=true;wrapped.__original=original;renderHorses=wrapped;try{window.renderHorses=wrapped}catch(_){}}}catch(_){}
    try{if(typeof evalAll==='function'&&!evalAll.__dataIntegrityV271){const original=evalAll;const wrapped=function(){applyCachedRoster();const v=original.apply(this,arguments);applyCachedRoster();return v};wrapped.__dataIntegrityV271=true;wrapped.__original=original;evalAll=wrapped;try{window.evalAll=wrapped}catch(_){}}}catch(_){}
  }
  function install(){wrapJraImport();wrapRenderer();applyCachedRoster()}

  document.addEventListener('click',e=>{const t=e.target;if(!t)return;if(t.id==='importRace'||t.id==='importHist'||/出馬表取込|過去5走を再取得/.test(String(t.textContent||''))){setTimeout(()=>recoverHistories(true),1200);setTimeout(()=>recoverHistories(false),4200)}},true);
  let tries=0;const tick=()=>{tries++;install();if(tries<40)setTimeout(tick,400)};setTimeout(tick,80);
})();
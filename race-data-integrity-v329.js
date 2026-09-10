(()=>{
  if(window.__raceDataIntegrityV329)return;
  window.__raceDataIntegrityV329=true;

  const FORECAST_API='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/netkeiba-forecast-v2';
  const el=id=>document.getElementById(id);
  const norm=s=>String(s||'').normalize('NFKC').replace(/[\s　]+/g,'').trim();
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const ACTIVE_BAD=/取消|出走取消|競走除外|除外|競走中止|中止|失格/;
  const TURN={札幌:'右',函館:'右',福島:'右',新潟:'左',東京:'左',中山:'右',中京:'左',京都:'右',阪神:'右',小倉:'右'};
  let oddsBusy=false,lastOddsRid='',lastOddsAt=0;

  function activeHorses(){
    try{return (Array.isArray(horses)?horses:[]).filter(h=>!ACTIVE_BAD.test(String(h?.status||h?.result_status||'')))}catch(_){return[]}
  }
  function rid(){
    try{if(typeof raceIdFromUrl==='function'){const x=raceIdFromUrl(el('raceUrl')?.value||raceMeta?.source_url||'');if(x)return x}}catch(_){}
    let s=String(el('raceUrl')?.value||raceMeta?.source_url||'');for(let i=0;i<3;i++){try{s=decodeURIComponent(s)}catch(_){break}}
    return (s.match(/(?:race_id[=:_-]*|\/race\/)(20\d{10})/i)||s.match(/\b(20\d{10})\b/)||[])[1]||String(raceMeta?.race_id||'');
  }
  function clearUnsafeMarket(){
    const hs=activeHorses();
    for(const h of hs){
      h.odds=null;h.popularity=null;h.winOdds=null;h.forecast_odds=null;h.forecast_popularity=null;
      h.netkeiba_actual_odds=null;h.netkeiba_actual_popularity=null;h.netkeiba_forecast_odds=null;h.netkeiba_forecast_popularity=null;
    }
    try{oddsCache={race_id:rid(),win:{},wide:{},trio:{},fetched_at:null,integrity_v329:false,odds_type:'unavailable'}}catch(_){}
  }
  function ensureTrustedMarket(){
    try{
      if(oddsCache?.integrity_v329===true)return true;
      clearUnsafeMarket();return false;
    }catch(_){return false}
  }
  function derivedRanks(rows){
    const sorted=[...rows].sort((a,b)=>a.odds-b.odds||a.no-b.no),out=new Map();
    sorted.forEach((r,i)=>out.set(r.no,i+1));return out;
  }
  async function safeOddsApi(opts={}){
    const race=rid(),hs=activeHorses();if(!race||!hs.length){clearUnsafeMarket();return oddsCache}
    const now=Date.now();if(oddsBusy)return oddsCache;
    if(oddsCache?.integrity_v329===true&&lastOddsRid===race&&now-lastOddsAt<15000&&!opts?.force)return oddsCache;
    oddsBusy=true;
    try{
      const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),9000);
      let j;
      try{
        const r=await fetch(FORECAST_API,{method:'POST',cache:'no-store',signal:ac.signal,headers:{'Content-Type':'application/json','Cache-Control':'no-cache'},body:JSON.stringify({url:`https://race.netkeiba.com/race/shutuba.html?race_id=${race}`,names:hs.map(h=>h.name),numbers:hs.map(h=>+h.no)})});
        j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j?.error||`HTTP ${r.status}`);
      }finally{clearTimeout(timer)}
      const byNo=new Map((Array.isArray(j?.results)?j.results:[]).map(x=>[+x.horse_number,x]));
      const rows=hs.map(h=>{const x=byNo.get(+h.no);return {h,no:+h.no,odds:Number(x?.odds)}});
      if(rows.some(x=>!Number.isFinite(x.odds)||x.odds<=1)){
        clearUnsafeMarket();lastOddsRid=race;lastOddsAt=now;return oddsCache;
      }
      const ranks=derivedRanks(rows),type=String(j?.odds_type||'').toLowerCase()==='forecast'?'forecast':'actual',win={};
      for(const x of rows){
        const p=ranks.get(x.no)||null,source=type==='forecast'?'netkeiba予想オッズAPI':'netkeiba実オッズAPI';
        win[String(x.no)]={odds:x.odds,popularity:p,source};
        x.h.odds=x.odds;x.h.popularity=p;x.h.winOdds=x.odds;
        if(type==='forecast'){x.h.forecast_odds=x.odds;x.h.forecast_popularity=p;x.h.netkeiba_forecast_odds=x.odds;x.h.netkeiba_forecast_popularity=p}
        else{x.h.netkeiba_actual_odds=x.odds;x.h.netkeiba_actual_popularity=p}
      }
      oddsCache={race_id:race,win,wide:{},trio:{},fetched_at:new Date().toISOString(),integrity_v329:true,odds_type:type,source:type==='forecast'?'netkeiba予想オッズAPI':'netkeiba実オッズAPI'};
      window.__safeMarketTypeV329=type;lastOddsRid=race;lastOddsAt=Date.now();return oddsCache;
    }catch(e){console.warn('safe odds v329',e);clearUnsafeMarket();return oddsCache}
    finally{oddsBusy=false}
  }

  function marketFor(h){
    if(oddsCache?.integrity_v329!==true)return {odds:null,popularity:null};
    const v=oddsCache?.win?.[String(+h.no)];const o=Number(v?.odds??v),p=Number(v?.popularity);
    return {odds:Number.isFinite(o)&&o>1?o:null,popularity:Number.isInteger(p)&&p>=1?p:null};
  }
  function marketText(h){
    const m=marketFor(h);if(!m.odds)return '単勝オッズ未取得';
    const pre=oddsCache?.odds_type==='forecast'?'予想単勝':'単勝';return `${pre} ${m.odds.toFixed(1)}倍${m.popularity?` / ${m.popularity}番人気`:''}`;
  }
  function patchMarketDom(){
    if(!Array.isArray(evaluated)||!evaluated.length)return;
    document.querySelectorAll('#ranking .ranking-card .summary-market').forEach((node,i)=>{const h=evaluated[i];if(h)node.textContent=marketText(h)});
    document.querySelectorAll('#rows tr').forEach((tr,i)=>{
      const h=evaluated[i],cell=[...tr.querySelectorAll('td')].find(td=>td.getAttribute('data-label')==='単勝オッズ・人気');if(h&&cell)cell.textContent=marketText(h);
    });
    const box=el('evidence');if(box){
      const n=activeHorses().length,ok=oddsCache?.integrity_v329===true?Object.keys(oddsCache.win||{}).length:0,label=oddsCache?.odds_type==='forecast'?'予想単勝':'単勝';
      let s=box.innerHTML;
      s=s.replace(/オッズ：単勝\s*\d+頭・ワイド\s*\d+点・3連複\s*\d+点反映(?:（[^<]*）)?/g,ok===n&&n?`オッズ：${label} ${ok}/${n}頭（整合確認済み） / ワイド 0点 / 3連複 0点`:'オッズ：単勝未取得（不完全・不整合データは使用しません）');
      box.innerHTML=s;
    }
  }

  function applyCourseMeta(){
    try{const venue=el('venue')?.value||raceMeta?.venue||'',turn=TURN[String(venue).replace(/競馬場$/,'')];if(turn){raceMeta.turn=turn;raceMeta.direction=turn;raceMeta.course_direction=turn}}catch(_){}
  }
  function courseDetail(venue,surface,dist,turn){
    if(venue==='阪神'&&surface==='芝'&&dist===2000)return '右回り・内回り。コーナー4回とゴール前の急坂を考慮し、内回り向きの機動力と持続力をコース適性へ反映。';
    if(venue==='阪神'&&surface==='芝'&&dist===1800)return '右回り・外回り。外回りの直線とゴール前の急坂を考慮し、末脚の持続力をコース適性へ反映。';
    if(venue==='中山'&&surface==='芝'&&dist===2200)return '右回り・外回り。起伏とコーナーで長く脚を使う持続力をコース適性へ反映。';
    return `${turn}回り。同競馬場・同${surface}実績をコース適性へ反映し、距離適性は別指数で評価。`;
  }
  function patchCourseProfile(){
    const box=el('courseProfile');if(!box)return;applyCourseMeta();
    const venue=el('venue')?.value||'',surface=el('surface')?.value||'',dist=+(el('distance')?.value||0),turn=TURN[venue]||raceMeta?.turn||'—';
    const w1=typeof weights==='object'&&weights?Number(weights.speed)*100:NaN,w2=typeof weights==='object'&&weights?Number(weights.last3f)*100:NaN,w3=typeof weights==='object'&&weights?Number(weights.course)*100:NaN;
    const weightsText=[Number.isFinite(w1)?`近走 ${w1.toFixed(1)}%`:'',Number.isFinite(w2)?`上がり ${w2.toFixed(1)}%`:'',Number.isFinite(w3)?`コース ${w3.toFixed(1)}%`:''].filter(Boolean).join(' / ');
    box.innerHTML=`<b>コース・馬場補正：</b> ${esc(venue)} ${esc(surface)}${dist}m・${esc(turn)}回り<br>JRAコース基礎補正：${esc(courseDetail(venue,surface,dist,turn))}${weightsText?`<br>最終指数の主ウェイト：${esc(weightsText)}`:''}`;
  }

  function historyWeight(r){
    const raw=r?.body_weight??r?.horse_weight??r?.bodyWeight??r?.horseWeight??null,w=Number(raw),chgRaw=r?.body_weight_change??r?.horse_weight_change??r?.bodyWeightChange??null,chg=Number(chgRaw);
    if(!Number.isFinite(w)||w<300||w>700)return '馬体重 —';
    return `馬体重 ${Math.round(w)}kg${Number.isFinite(chg)?` (${chg>=0?'+':''}${Math.round(chg)})`:''}`;
  }
  function findHorseForCard(card){const t=norm(card?.querySelector('.rank')?.textContent||'');try{return (Array.isArray(horses)?horses:[]).find(h=>t.includes(norm(h.name)))||null}catch(_){return null}}
  function patchHistoryWeights(){
    for(const card of document.querySelectorAll('#horses .card')){
      const h=findHorseForCard(card);if(!h)continue;const runs=(Array.isArray(h.history)&&h.history.length?h.history:(h.jra_history||[])).slice(0,5),rows=card.querySelectorAll('.hist-row');
      rows.forEach((row,i)=>{const r=runs[i];if(!r)return;const last=row.lastElementChild;if(!last)return;let mark=last.querySelector('.prev-body-weight-v329');if(!mark){mark=document.createElement('span');mark.className='prev-body-weight-v329';mark.style.cssText='display:block;margin-top:2px;color:#9fb0cf;font-size:10px';last.appendChild(mark)}mark.textContent=historyWeight(r)});
    }
  }

  function wrap(name,before,after){
    try{const old=window[name];if(typeof old!=='function'||old.__v329)return;const fn=function(...args){before?.();const out=old.apply(this,args);after?.();return out};fn.__v329=true;fn.__original=old;window[name]=fn;try{if(name==='evalAll')evalAll=fn;else if(name==='renderAnalysis')renderAnalysis=fn;else if(name==='renderHorses')renderHorses=fn}catch(_){}}catch(e){console.warn('wrap v329 '+name,e)}
  }

  try{oddsApi=safeOddsApi;window.oddsApi=safeOddsApi}catch(_){}
  wrap('renderHorses',null,patchHistoryWeights);
  wrap('renderAnalysis',()=>{applyCourseMeta();ensureTrustedMarket()},()=>{patchCourseProfile();patchMarketDom()});
  wrap('evalAll',()=>{applyCourseMeta();ensureTrustedMarket()},()=>{patchCourseProfile();patchMarketDom()});

  for(const id of ['venue','surface','distance'])el(id)?.addEventListener('change',()=>{applyCourseMeta();setTimeout(()=>{try{if(Array.isArray(horses)&&horses.length)evalAll()}catch(_){};patchCourseProfile()},0)});
  addEventListener('keiba-data-updated',()=>setTimeout(async()=>{applyCourseMeta();ensureTrustedMarket();patchHistoryWeights();patchCourseProfile();try{await safeOddsApi({force:true});if(Array.isArray(horses)&&horses.length)evalAll()}catch(_){}},80));
  document.addEventListener('click',e=>{const t=e.target;if(!t)return;if(t.id==='analyze'||t.id==='make'||/AI分析/.test(String(t.textContent||'')))setTimeout(async()=>{try{await safeOddsApi({force:true});if(Array.isArray(horses)&&horses.length)evalAll()}catch(_){}},80)},true);

  applyCourseMeta();ensureTrustedMarket();patchHistoryWeights();patchCourseProfile();
  document.documentElement.dataset.raceDataIntegrity='v329';
})();

(()=>{
  if(window.__courseScoreCorrectionV360)return;
  window.__courseScoreCorrectionV360=true;

  const el=id=>document.getElementById(id);
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const TURN={札幌:'右',函館:'右',福島:'右',新潟:'左',東京:'左',中山:'右',中京:'左',京都:'右',阪神:'右',小倉:'右'};
  const REC=[1.30,1.18,1.08,1.00,.94];

  function routeOf(venue,surface,dist){
    venue=String(venue||'').replace(/競馬場$/,'');surface=String(surface||'');dist=+dist||0;
    if(surface!=='芝')return null;
    if(venue==='阪神'){
      if([1200,1400,2000,2200,3000].includes(dist))return'内';
      if([1600,1800,2400].includes(dist))return'外';
    }
    if(venue==='中山'){
      if([1600,2200].includes(dist))return'外';
      if([1800,2000].includes(dist))return'内';
    }
    if(venue==='新潟'){
      if([1600,1800,2000].includes(dist))return'外';
      if([1200,1400,2200].includes(dist))return'内';
    }
    return null;
  }

  function currentCourse(){
    const venue=String(el('venue')?.value||'').replace(/競馬場$/,''),surface=String(el('surface')?.value||''),dist=+(el('distance')?.value||0);
    return{venue,surface,dist,turn:TURN[venue]||'',route:routeOf(venue,surface,dist)};
  }

  function similarity(r,cur){
    const venue=String(r?.venue||r?.course||'').replace(/競馬場$/,''),surface=String(r?.surface||''),dist=+(r?.distance||0);
    if(!venue||!surface||!dist)return null;
    const turn=TURN[venue]||'',route=routeOf(venue,surface,dist);
    let s=28;
    s+=surface===cur.surface?12:-14;
    if(venue===cur.venue)s+=23;
    const diff=Math.abs(dist-cur.dist);
    if(dist===cur.dist)s+=18;else if(diff<=200)s+=11;else if(diff<=400)s+=5;else s-=5;
    if(turn&&cur.turn&&turn===cur.turn)s+=5;
    if(route&&cur.route)s+=route===cur.route?9:-6;
    if(venue===cur.venue&&surface===cur.surface&&dist===cur.dist)s+=8;
    return clamp(s,10,100);
  }

  function performance(r){
    const rank=Math.max(1,+r?.rank||1);
    const field=Number.isFinite(+r?.field_size)&&+r.field_size>=rank&&+r.field_size>=2?+r.field_size:16;
    return clamp(100-((rank-1)/Math.max(1,field-1))*75,25,100);
  }

  function courseScore(rows){
    const cur=currentCourse();
    const valid=(Array.isArray(rows)?rows:[]).filter(r=>r&&!/取消|除外|中止|失格/.test(String(r?.status||r?.result_status||r?.rank_text||''))&&Number.isFinite(+r?.rank)&&+r.rank>0).slice(0,5);
    let n=0,d=0,count=0;
    valid.forEach((r,i)=>{
      const sim=similarity(r,cur);if(!Number.isFinite(sim))return;
      const perf=performance(r);
      // コース形状が近いほど、そのレースで実際に走れたかどうかを強く反映する。
      // 「同コースを走っただけ」で100点にはせず、着順/頭数も必ず評価へ入れる。
      const relevance=.25+.75*(sim/100);
      const value=50+(perf-50)*relevance;
      const w=(REC[i]||.9)*(.45+.55*(sim/100));
      n+=value*w;d+=w;count++;
    });
    return count&&d?clamp(n/d,20,100):50;
  }

  function patchScoreLocalHistory(){
    try{
      const old=window.scoreLocalHistory;
      if(typeof old!=='function'||old.__courseV360)return false;
      const fn=function(rows){
        const out=old.apply(this,arguments)||{};
        return{...out,course:courseScore(rows),course_v330:false,course_v360:true};
      };
      fn.__courseV360=true;fn.__original=old;
      window.scoreLocalHistory=fn;try{scoreLocalHistory=fn}catch(_){}
      return true;
    }catch(e){console.warn('course v360 install',e);return false}
  }

  function histKey(h,cur){
    const rows=(Array.isArray(h?.history)&&h.history.length?h.history:(Array.isArray(h?.jra_history)?h.jra_history:[])).slice(0,5);
    return [cur.venue,cur.surface,cur.dist,...rows.map(r=>[r?.date,r?.venue||r?.course,r?.surface,r?.distance,r?.rank,r?.field_size].join(':'))].join('|');
  }

  function recalcHistScores(force=false){
    try{
      if(!Array.isArray(horses)||typeof scoreLocalHistory!=='function')return;
      const cur=currentCourse();
      horses=horses.map(h=>{
        const z={...h};
        const rows=(Array.isArray(z.history)&&z.history.length)?z.history:(Array.isArray(z.jra_history)?z.jra_history:[]);
        if(!rows.length)return z;
        const key=histKey(z,cur);
        if(!force&&z.__courseKeyV360===key&&z.histScores?.course_v360)return z;
        z.histScores=scoreLocalHistory(rows);
        if(z.histScores)z.histScores.available=true;
        z.__courseKeyV360=key;
        return z;
      });
    }catch(e){console.warn('course v360 recalc',e)}
  }

  function refreshOnce(){
    recalcHistScores(true);
    try{if(Array.isArray(horses)&&horses.length&&typeof evalAll==='function')evalAll()}catch(_){}
  }

  function start(){
    if(!patchScoreLocalHistory())return setTimeout(start,60);
    recalcHistScores(true);
    document.documentElement.dataset.courseScore='v360-performance';
  }
  start();

  addEventListener('keiba-data-updated',()=>setTimeout(refreshOnce,120));
  ['venue','surface','distance'].forEach(id=>el(id)?.addEventListener('change',()=>setTimeout(refreshOnce,0)));
})();
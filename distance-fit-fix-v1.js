(()=>{
  if(window.__distanceFitFixV1)return;
  window.__distanceFitFixV1=true;
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  function targetDistance(){return +(document.getElementById('distance')?.value||0)}
  function performance(r){
    const rank=Math.max(1,+r?.rank||1);
    const field=Number.isFinite(+r?.field_size)&&+r.field_size>=rank&&+r.field_size>=2?+r.field_size:16;
    return clamp(100-((rank-1)/Math.max(1,field-1))*75,25,100);
  }
  function distanceFitScore(rows){
    const target=targetDistance();
    const valid=(Array.isArray(rows)?rows:[]).filter(r=>r&&!/取消|除外|中止|失格/.test(String(r?.status||r?.result_status||r?.rank_text||''))&&Number.isFinite(+r?.rank)&&+r.rank>0&&Number.isFinite(+r?.distance)&&+r.distance>0).slice(0,5);
    if(!target||!valid.length)return 50;
    let n=0,d=0;
    valid.forEach((r,i)=>{
      const diff=Math.abs(+r.distance-target);
      // Exact distance is 100% relevant.  A 200m gap is still useful evidence,
      // but it must not be able to become a 100 score merely because the horse won.
      const relevance=diff===0?1:diff<=200?.75:diff<=400?.50:diff<=600?.30:.18;
      const perf=performance(r);
      const value=50+(perf-50)*relevance;
      const rec=[1.30,1.18,1.08,1.00,.94][i]||.9;
      n+=value*rec;d+=rec;
    });
    return d?+clamp(n/d,20,100).toFixed(1):50;
  }
  function patch(){
    try{
      const old=window.scoreLocalHistory;
      if(typeof old!=='function'||old.__distanceFitFixV1)return false;
      const fn=function(rows){
        const out=old.apply(this,arguments)||{};
        return {...out,distance:distanceFitScore(rows),distance_fit_v1:true};
      };
      fn.__distanceFitFixV1=true;fn.__original=old;
      window.scoreLocalHistory=fn;try{scoreLocalHistory=fn}catch(_){}
      return true;
    }catch(e){console.warn('distance fit v1 install',e);return false}
  }
  function recalc(){
    try{
      if(!Array.isArray(horses)||typeof scoreLocalHistory!=='function')return;
      horses=horses.map(h=>{
        const z={...h},rows=(Array.isArray(z.history)&&z.history.length)?z.history:(Array.isArray(z.jra_history)?z.jra_history:[]);
        if(!rows.length)return z;
        z.histScores=scoreLocalHistory(rows);if(z.histScores)z.histScores.available=true;return z;
      });
      try{if(typeof evalAll==='function')evalAll()}catch(_){}
    }catch(e){console.warn('distance fit recalc',e)}
  }
  function start(){if(!patch())return setTimeout(start,80);recalc();document.documentElement.dataset.distanceFit='v1'}
  start();
  addEventListener('keiba-data-updated',()=>setTimeout(recalc,150));
  ['distance','venue','surface'].forEach(id=>document.getElementById(id)?.addEventListener('change',()=>setTimeout(recalc,80)));
})();
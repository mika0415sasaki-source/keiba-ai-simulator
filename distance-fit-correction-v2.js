(()=>{
  if(window.__distanceFitCorrectionV2)return;
  window.__distanceFitCorrectionV2=true;
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const validRows=rows=>(Array.isArray(rows)?rows:[]).filter(r=>r&&Number.isFinite(+r.rank)&&+r.rank>0&&Number.isFinite(+r.distance)&&+r.distance>0).slice(0,5);
  function install(){
    const old=window.scoreLocalHistory;
    if(typeof old!=='function')return false;
    if(old.__distanceFitCorrectionV2)return true;
    const fn=function(rows){
      const out=old.apply(this,arguments)||{};
      const target=+(document.getElementById('distance')?.value||0);
      if(!target)return out;
      const rr=validRows(rows);
      if(!rr.length)return {...out,distance:50,distance_feature_v2:true};
      let n=0,d=0;
      rr.forEach((r,i)=>{
        const rank=+r.rank;
        const field=Math.max(rank,Number.isFinite(+r.field_size)&&+r.field_size>=2?+r.field_size:16);
        const performance=clamp(100-((rank-1)/Math.max(1,field-1))*65,35,100);
        const diff=Math.abs(+r.distance-target);
        const proximity=diff===0?1:diff<=200?.75:diff<=400?.50:diff<=600?.30:.18;
        const w=([1,.82,.68,.56,.46][i]||.4);
        n+=performance*proximity*w;
        d+=w;
      });
      return {...out,distance:+(d?n/d:50).toFixed(1),distance_feature_v2:true};
    };
    fn.__distanceFitCorrectionV2=true;
    fn.__original=old;
    window.scoreLocalHistory=fn;
    try{scoreLocalHistory=fn}catch(_){}
    try{
      if(Array.isArray(horses)){
        horses=horses.map(h=>{const z={...h},r=Array.isArray(z.history)&&z.history.length?z.history:(Array.isArray(z.jra_history)?z.jra_history:[]);if(r.length)z.histScores=fn(r);return z});
        if(typeof evalAll==='function')evalAll();
      }
    }catch(e){console.warn('distance fit recalc',e)}
    document.documentElement.dataset.distanceFit='v2';
    return true;
  }
  let tries=0;
  const timer=setInterval(()=>{tries++;if(install()||tries>80)clearInterval(timer)},80);
  install();
})();
(()=>{
  if(window.__courseShapeCorrectionV1)return;
  window.__courseShapeCorrectionV1=true;
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const venueKey=v=>String(v||'').normalize('NFKC').replace(/競馬場$/,'').trim();
  function inferredLayout(venue,surface,distance){
    const v=venueKey(venue),s=String(surface||''),d=+distance||0;
    if(s!=='芝')return '';
    if(v==='阪神'){
      if([1200,1400,2000,2200,3000].includes(d))return'内';
      if([1600,1800,2400,2600].includes(d))return'外';
    }
    if(v==='京都'){
      if([1400,1600,1800,2200,2400,3000,3200].includes(d))return'外';
      if([2000].includes(d))return'内';
    }
    if(v==='中山'){
      if([2200,2600,3200,4000].includes(d))return'外';
      if([1800,2000,2500,3600].includes(d))return'内';
    }
    if(v==='新潟'){
      if([1400,1600,1800,2000,3000,3200].includes(d))return'外';
      if([1200,1400,2200,2400].includes(d))return'内';
    }
    return '';
  }
  function rowMeta(r){
    const venue=venueKey(r?.venue||r?.course||r?.courseVenue||r?.race_venue);
    const surface=String(r?.surface||r?.track_surface||'');
    const distance=+r?.distance||+r?.dist||0;
    let layout=String(r?.course_layout||r?.layout||r?.route||'').normalize('NFKC');
    if(!layout)layout=inferredLayout(venue,surface,distance);
    return{venue,surface,distance,layout};
  }
  function currentMeta(){
    const venue=venueKey(document.getElementById('venue')?.value);
    const surface=String(document.getElementById('surface')?.value||'');
    const distance=+(document.getElementById('distance')?.value||0);
    let layout='';
    try{layout=String(window.raceMeta?.course_layout||window.raceMeta?.layout||window.raceMeta?.route||'').normalize('NFKC')}catch(_){}
    if(!layout)layout=inferredLayout(venue,surface,distance);
    return{venue,surface,distance,layout};
  }
  function install(){
    const old=window.scoreLocalHistory;
    if(typeof old!=='function')return false;
    if(old.__courseShapeCorrectionV1)return true;
    const fn=function(rows){
      const out=old.apply(this,arguments)||{};
      const cur=currentMeta();
      if(!Number.isFinite(+out.course)||!cur.venue||!cur.surface||!cur.distance||!cur.layout)return out;
      const rr=(Array.isArray(rows)?rows:[]).filter(r=>r&&Number.isFinite(+r.rank)&&+r.rank>0).slice(0,5);
      let penalty=0,weight=0;
      rr.forEach((r,i)=>{
        const m=rowMeta(r);
        if(!m.venue||!m.surface||!m.distance||m.venue!==cur.venue||m.surface!==cur.surface||!m.layout)return;
        const w=([1.30,1.18,1.08,1.00,.94][i]||.9);
        const diff=Math.abs(m.distance-cur.distance);
        if(m.layout!==cur.layout){
          const p=diff<=200?9:diff<=400?7:5;
          penalty+=p*w;weight+=w;
        }
      });
      const adjusted=weight?clamp(+out.course-(penalty/weight),20,100):+out.course;
      return{...out,course:+adjusted.toFixed(1),course_shape_v1:true};
    };
    fn.__courseShapeCorrectionV1=true;
    fn.__original=old;
    window.scoreLocalHistory=fn;
    try{scoreLocalHistory=fn}catch(_){}
    try{
      if(Array.isArray(horses)){
        horses=horses.map(h=>{const z={...h},r=Array.isArray(z.history)&&z.history.length?z.history:(Array.isArray(z.jra_history)?z.jra_history:[]);if(r.length)z.histScores=fn(r);return z});
        if(typeof evalAll==='function')evalAll();
      }
    }catch(e){console.warn('course shape recalc',e)}
    document.documentElement.dataset.courseShape='v1';
    return true;
  }
  let tries=0;
  const timer=setInterval(()=>{tries++;if(install()||tries>100)clearInterval(timer)},80);
  install();
})();

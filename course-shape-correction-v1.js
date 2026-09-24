(()=>{
  if(window.__courseShapeCorrectionV1)return;
  window.__courseShapeCorrectionV1=true;
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const venueKey=v=>String(v||'').normalize('NFKC').replace(/競馬場$/,'').trim();
  function inferredLayout(venue,surface,distance){
    const v=venueKey(venue),s=String(surface||''),d=+distance||0;
    if(s!=='芝')return '';
    if(v==='阪神'){
      if(d===1600||d===1800)return'外';
      if(d===2000||d===2200)return'内';
      if(d===2400)return'外';
    }
    if(v==='京都'){
      if(d===1400||d===1600||d===1800||d===2200||d===2400||d===3000||d===3200)return'外';
      if(d===2000)return'内';
    }
    if(v==='中山'){
      if(d===2200||d===2500||d===2600||d===3200||d===3600||d===4000)return d===2200||d===2600||d===3200||d===4000?'外':'内';
      if(d===1800||d===2000)return'内';
    }
    return '';
  }
  function rowMeta(r){
    const venue=venueKey(r?.venue||r?.courseVenue||r?.race_venue);
    const surface=String(r?.surface||'');
    const distance=+r?.distance||0;
    let layout=String(r?.course_layout||r?.layout||'').normalize('NFKC');
    if(!layout)layout=inferredLayout(venue,surface,distance);
    return{venue,surface,distance,layout};
  }
  function currentMeta(){
    const venue=venueKey(document.getElementById('venue')?.value);
    const surface=String(document.getElementById('surface')?.value||'');
    const distance=+(document.getElementById('distance')?.value||0);
    let layout='';
    try{layout=String(window.raceMeta?.course_layout||window.raceMeta?.layout||'').normalize('NFKC')}catch(_){}
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
      if(!Number.isFinite(+out.course)||!cur.venue||!cur.surface||!cur.distance)return out;
      const rr=(Array.isArray(rows)?rows:[]).filter(r=>r&&Number.isFinite(+r.rank)&&+r.rank>0).slice(0,5);
      let penalty=0,weight=0;
      rr.forEach((r,i)=>{
        const m=rowMeta(r);
        if(!m.venue||!m.surface||!m.distance||m.venue!==cur.venue||m.surface!==cur.surface||!m.layout||!cur.layout)return;
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
  const timer=setInterval(()=>{tries++;if(install()||tries>80)clearInterval(timer)},80);
  install();
})();

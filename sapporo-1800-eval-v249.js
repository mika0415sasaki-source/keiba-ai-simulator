(()=>{
  if(window.__sapporo1800EvalV249)return;
  window.__sapporo1800EvalV249=true;

  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const normVenue=v=>String(v||'').replace(/競馬場/g,'').trim();
  const completedRows=rows=>(rows||[]).filter(r=>!r?.status&&Number.isFinite(Number(r?.rank))&&Number(r.rank)>0).slice(0,5);

  function isTarget(){
    const venue=String(document.getElementById('venue')?.value||'');
    const surface=String(document.getElementById('surface')?.value||'');
    const dist=Number(document.getElementById('distance')?.value||0);
    return venue==='札幌'&&surface==='芝'&&dist===1800;
  }

  function sapporo1800CourseScore(rows){
    const rr=completedRows(rows);
    if(!rr.length)return null;
    const recency=[1.00,0.86,0.72,0.60,0.50];
    let num=0,den=0;
    rr.forEach((r,i)=>{
      let s=42;
      const venue=normVenue(r?.venue);
      const surface=String(r?.surface||'');
      const distance=Number(r?.distance);
      if(surface==='芝')s+=8; else s-=10;
      if(Number.isFinite(distance)){
        const d=Math.abs(distance-1800);
        s+=d===0?14:d<=200?10:d<=400?4:-6;
      }
      if(venue==='札幌')s+=24;
      else if(venue==='函館')s+=14;
      else if(['福島','小倉'].includes(venue))s+=10;
      else if(venue==='中山')s+=7;
      else if(['京都','阪神'].includes(venue))s+=3;

      const passage=Array.isArray(r?.passage)?r.passage.map(Number).filter(Number.isFinite):[];
      if(passage.length){
        const early=passage[0];
        const late=passage[passage.length-1];
        if(early<=4)s+=8;
        else if(early<=8)s+=4;
        if(late<=4)s+=5;
        const rank=Number(r.rank);
        if(Number.isFinite(rank)){
          if(rank<=late+1)s+=4;
          else if(rank>=late+5)s-=4;
        }
      }

      const rank=Number(r.rank);
      if(Number.isFinite(rank))s+=clamp(8-(rank-1)*1.2,-4,8);
      s=clamp(s,20,100);
      const w=recency[i]||0.5;
      num+=s*w;den+=w;
    });
    return den?clamp(num/den,20,100):null;
  }

  function patchScoreLocalHistory(){
    try{
      if(typeof scoreLocalHistory!=='function'||scoreLocalHistory.__sapporo1800EvalV249)return false;
      const original=scoreLocalHistory;
      const wrapped=function(rows){
        const out=original.apply(this,arguments);
        if(!isTarget()||!out||out.available===false)return out;
        const c=sapporo1800CourseScore(rows);
        if(Number.isFinite(c))out.course=c;
        return out;
      };
      wrapped.__sapporo1800EvalV249=true;
      wrapped.__original=original;
      scoreLocalHistory=wrapped;
      try{window.scoreLocalHistory=wrapped;}catch(_){}
      return true;
    }catch(e){console.warn('sapporo1800 score patch',e);return false;}
  }

  function recalcCurrent(){
    if(!isTarget())return;
    try{
      const list=(typeof horses!=='undefined'&&Array.isArray(horses))?horses:(Array.isArray(window.horses)?window.horses:[]);
      for(const h of list){
        const rows=(Array.isArray(h?.history)&&h.history.length)?h.history:(Array.isArray(h?.jra_history)?h.jra_history:[]);
        if(rows.length&&typeof scoreLocalHistory==='function'){
          try{h.histScores=scoreLocalHistory(rows);if(h.histScores)h.histScores.available=true;}catch(_){}
        }
      }
      try{if(typeof evalAll==='function'&&list.length)evalAll();}catch(_){}
    }catch(e){console.warn('sapporo1800 recalc',e);}
  }

  function install(){
    patchScoreLocalHistory();
    setTimeout(recalcCurrent,0);
  }
  setTimeout(install,100);
  setTimeout(install,500);
  setTimeout(install,1500);
  document.addEventListener('change',e=>{
    if(['venue','surface','distance'].includes(e.target?.id))setTimeout(()=>{patchScoreLocalHistory();recalcCurrent();},0);
  });
})();

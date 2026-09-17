(()=>{
  if(window.__scoreScaleGuardV1)return;
  window.__scoreScaleGuardV1=true;
  const cap=(v,max)=>Number.isFinite(+v)?Math.min(+v,max):v;
  function capHistory(out){
    if(!out||typeof out!=='object')return out;
    const z={...out};
    if(Number.isFinite(+z.speed))z.speed=cap(z.speed,97.5);
    if(Number.isFinite(+z.last3f))z.last3f=cap(z.last3f,98.5);
    return z;
  }
  function apply(){
    try{
      if(Array.isArray(horses)){
        horses=horses.map(h=>{
          if(!h?.histScores)return h;
          const z={...h,histScores:capHistory(h.histScores)};
          return z;
        });
      }
      if(Array.isArray(evaluated)){
        evaluated=evaluated.map(e=>{
          const z={...e};
          if(Number.isFinite(+z.gradeScore))z.gradeScore=cap(z.gradeScore,98.5);
          if(Number.isFinite(+z.score))z.score=cap(z.score,99);
          if(Number.isFinite(+z.baseScore))z.baseScore=cap(z.baseScore,99);
          return z;
        });
      }
    }catch(e){console.warn('score scale guard v1',e)}
  }
  let oldHistory=null;try{oldHistory=window.scoreLocalHistory}catch(_){}
  if(typeof oldHistory==='function'&&!oldHistory.__scoreScaleGuardV1){
    const fn=function(...args){return capHistory(oldHistory.apply(this,args)||{})};
    fn.__scoreScaleGuardV1=true;fn.__original=oldHistory;
    try{window.scoreLocalHistory=fn;scoreLocalHistory=fn}catch(_){}
  }
  let oldEval=null;try{oldEval=window.evalAll}catch(_){}
  if(typeof oldEval==='function'&&!oldEval.__scoreScaleGuardV1){
    const fn=function(...args){const out=oldEval.apply(this,args);apply();return out};
    fn.__scoreScaleGuardV1=true;fn.__original=oldEval;
    try{window.evalAll=fn;evalAll=fn}catch(_){}
  }
  apply();
  addEventListener('keiba-data-updated',()=>setTimeout(apply,180));
  document.documentElement.dataset.scoreScaleGuard='v4';
})();

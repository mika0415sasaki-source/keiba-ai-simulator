(()=>{
  if(window.__scoreScaleGuardV1)return;
  window.__scoreScaleGuardV1=true;
  const cap=(v,max)=>Number.isFinite(+v)?Math.min(+v,max):v;
  function apply(){
    try{
      if(Array.isArray(horses)){
        horses=horses.map(h=>{
          if(!h?.histScores)return h;
          const z={...h,histScores:{...h.histScores}};
          if(Number.isFinite(+z.histScores.speed))z.histScores.speed=cap(z.histScores.speed,97.5);
          if(Number.isFinite(+z.histScores.last3f))z.histScores.last3f=cap(z.histScores.last3f,98.5);
          return z;
        });
      }
      if(Array.isArray(evaluated)){
        evaluated=evaluated.map(e=>{
          const z={...e};
          if(Number.isFinite(+z.gradeScore))z.gradeScore=cap(z.gradeScore,98.5);
          return z;
        });
      }
    }catch(e){console.warn('score scale guard v1',e)}
  }
  let old=null;try{old=window.evalAll}catch(_){}
  if(typeof old==='function'&&!old.__scoreScaleGuardV1){
    const fn=function(...args){const out=old.apply(this,args);apply();return out};
    fn.__scoreScaleGuardV1=true;fn.__original=old;
    try{window.evalAll=fn;evalAll=fn}catch(_){}
  }
  apply();
  addEventListener('keiba-data-updated',()=>setTimeout(apply,180));
  document.documentElement.dataset.scoreScaleGuard='v1';
})();

(()=>{
  if(window.__top3AxisSelectionV1)return;
  window.__top3AxisSelectionV1=true;

  let axisMode=false;

  const activeRows=()=>{
    try{return Array.isArray(evaluated)?evaluated:[]}
    catch(_){return Array.isArray(window.evaluated)?window.evaluated:[]}
  };

  const placeValue=h=>{
    const v=Number(h?.place);
    return Number.isFinite(v)?v:null;
  };

  function placeOrdered(rows){
    return rows
      .map((h,i)=>({h,i,p:placeValue(h)}))
      .sort((a,b)=>{
        const ap=a.p,bp=b.p;
        if(ap!==null&&bp!==null&&bp!==ap)return bp-ap;
        if(bp!==null&&ap===null)return -1;
        if(ap!==null&&bp===null)return 1;
        return a.i-b.i;
      })
      .map(x=>x.h);
  }

  function reorderForBet(){
    const rows=activeRows();
    if(rows.length<3)return false;
    const ranked=placeOrdered(rows);
    try{rows.splice(0,rows.length,...ranked)}catch(_){return false}
    window.__top3AxisSelectionAppliedV1=true;
    window.__top3AxisSelectionSnapshotV1=ranked.slice(0,3).map(h=>({no:+h.no,place:Number(h.place)}));
    return true;
  }

  function restore(rows){
    try{
      const current=activeRows();
      if(current.length===rows.length)current.splice(0,current.length,...rows);
    }catch(_){}
  }

  function wrapEval(){
    try{
      const old=window.evalAll;
      if(typeof old!=='function')return false;
      if(old.__top3AxisEvalV1)return true;
      const fn=function(...args){
        const out=old.apply(this,args);
        if(axisMode)reorderForBet();
        return out;
      };
      fn.__top3AxisEvalV1=true;
      fn.__original=old;
      window.evalAll=fn;
      try{evalAll=fn}catch(_){}
      return true;
    }catch(_){return false}
  }

  function wrapGenerate(){
    try{
      const old=window.generateTickets;
      if(typeof old!=='function')return false;
      if(old.__top3AxisGenerateV1)return true;
      const fn=function(...args){
        const before=activeRows().slice();
        // 券種判定・候補生成・後段の遅延処理がすべて3着内率順を参照できるよう、
        // 生成処理全体の間だけplace順を維持する。
        axisMode=true;
        try{
          const out=old.apply(this,args);
          // v323等の「生成後setTimeout」も終わってから元のAI順位へ戻す。
          setTimeout(()=>{axisMode=false;restore(before)},250);
          return out;
        }catch(e){
          axisMode=false;
          restore(before);
          throw e;
        }
      };
      try{Object.assign(fn,old)}catch(_){}
      fn.__top3AxisGenerateV1=true;
      fn.__original=old;
      window.generateTickets=fn;
      try{generateTickets=fn}catch(_){}
      return true;
    }catch(_){return false}
  }

  function settle(){
    wrapEval();
    wrapGenerate();
  }

  const timer=setInterval(settle,100);
  setTimeout(()=>clearInterval(timer),15000);
  addEventListener('keiba-patches-ready',()=>{setTimeout(settle,20);setTimeout(settle,300)},{once:true});
})();

(()=>{
  if(window.__top3AxisSelectionV1)return;
  window.__top3AxisSelectionV1=true;

  const numsKey=xs=>(xs||[]).map(Number).filter(Number.isFinite).sort((a,b)=>a-b).join('-');
  const evals=()=>{try{return Array.isArray(evaluated)?evaluated.slice(0,6):[]}catch(_){return[]}};
  const placeOf=h=>{const v=Number(h?.place);return Number.isFinite(v)?v:-1};

  function reorderPlan(plan){
    if(!plan||!Array.isArray(plan.candidates)||!Array.isArray(plan.picks))return false;
    const a=evals();if(a.length<3)return false;
    const byPlace=a.slice().sort((x,y)=>placeOf(y)-placeOf(x));
    const top1=+byPlace[0].no, top2=+byPlace[1].no;
    const type=String(plan.type||'');
    const isWide=type.includes('ワイド');
    const isAxis=type.includes('3連複1頭軸');
    if(!isWide&&!isAxis)return false;

    const old=plan.candidates.slice();
    const axisSet=new Set(isWide?[top1,top2]:[top1]);
    const inAxis=c=>(c.numbers||[]).some(n=>axisSet.has(+n));
    const axisCandidates=old.filter(inAxis);
    const otherCandidates=old.filter(c=>!inAxis(c));
    const ordered=[...axisCandidates,...otherCandidates];
    if(!ordered.length)return false;

    const oldPicks=new Map(plan.picks.map(p=>[numsKey(p.numbers),p]));
    const pickCount=plan.picks.length;
    const selected=ordered.slice(0,pickCount);
    if(selected.length!==pickCount)return false;

    const nextPicks=selected.map(c=>{
      const k=numsKey(c.numbers),oldPick=oldPicks.get(k);
      return oldPick?{...oldPick,numbers:c.numbers.slice().sort((x,y)=>x-y),odds:c.odds??oldPick.odds??null}: {
        numbers:c.numbers.slice().sort((x,y)=>x-y),
        odds:c.odds??null,
        stake:100
      };
    });

    const cap=Number(plan.budgetCap)||Number(plan.total)||0;
    let total=nextPicks.reduce((s,p)=>s+(Number(p.stake)||0),0);
    if(cap>0&&total>cap){
      for(let i=nextPicks.length-1;i>=0&&total>cap;i--){
        const s=Number(nextPicks[i].stake)||0;
        if(s>100){const cut=Math.min(s-100,Math.ceil((total-cap)/100)*100);nextPicks[i].stake=s-cut;total-=cut;}
      }
    }

    plan.candidates=ordered;
    plan.picks=nextPicks;
    plan.candidateCount=ordered.length;
    plan.recommendedCount=nextPicks.length;
    plan.total=total;
    plan.axisSelectionModel='3着内率連動: '+(isWide?'ワイド軸2頭':'3連複軸1頭');
    plan.axisNumbers=isWide?[top1,top2]:[top1];
    try{lastBetPlan=plan}catch(_){};window.lastBetPlan=plan;
    try{window.dispatchEvent(new CustomEvent('keiba-bet-plan-updated',{detail:plan}))}catch(_){}
    return true;
  }

  function install(){
    const g=window.generateTickets;
    if(typeof g!=='function')return false;
    if(g.__top3AxisFinalWrapped)return true;
    const wrapped=function(...args){
      const out=g.apply(this,args);
      try{reorderPlan(lastBetPlan||window.lastBetPlan)}catch(e){console.warn('top3 axis patch',e)}
      return out;
    };
    try{Object.assign(wrapped,g)}catch(_){}
    wrapped.__top3AxisFinalWrapped=true;
    window.generateTickets=wrapped;try{generateTickets=wrapped}catch(_){}
    return true;
  }

  let n=0;
  const t=setInterval(()=>{if(install()||++n>120)clearInterval(t)},100);
  addEventListener('keiba-patches-ready',()=>{setTimeout(install,50);setTimeout(()=>reorderPlan(lastBetPlan||window.lastBetPlan),120)});
})();

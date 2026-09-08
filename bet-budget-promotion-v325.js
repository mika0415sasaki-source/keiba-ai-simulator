(()=>{
  if(window.__betBudgetPromotionV326)return;
  window.__betBudgetPromotionV326=true;

  const key=nums=>(nums||[]).map(Number).filter(Number.isFinite).sort((a,b)=>a-b).join('-');
  const getPlan=()=>{try{return lastBetPlan||window.lastBetPlan||null}catch(_){return window.lastBetPlan||null}};
  const getEval=()=>{try{return Array.isArray(evaluated)?evaluated.slice(0,6):[]}catch(_){return[]}};

  function rankMap(){const m=new Map();getEval().forEach((h,i)=>m.set(+h.no,i));return m}
  function priority(c,type){
    const rm=rankMap(),r=(c.numbers||[]).map(n=>rm.get(+n)??99).sort((a,b)=>a-b);
    if(String(type||'').includes('ワイド')){
      if(r[0]===0&&r[1]===1)return 10000;
      if(r[0]<=1)return 8000-r[1]*100;
      return 1000-r.reduce((s,v)=>s+v,0)*10;
    }
    if(r.includes(0)&&r.includes(1))return 10000-r.reduce((s,v)=>s+v,0)*30;
    if((r.includes(0)||r.includes(1))&&r.includes(2)&&r.includes(3))return 8500-r.reduce((s,v)=>s+v,0)*25;
    if(r.includes(0)||r.includes(1))return 6500-r.reduce((s,v)=>s+v,0)*20;
    return 3000-r.reduce((s,v)=>s+v,0)*10;
  }

  function metrics(items,stakes,total){
    let red=0,deficit=0;
    for(let i=0;i<items.length;i++){
      const o=+items[i].odds||0;if(!o)continue;
      const d=Math.max(0,total-o*(+stakes[i]||0));
      if(d>0){red++;deficit+=d}
    }
    return {red,deficit};
  }

  // 予算は上限。候補は消さず、まず100円で昇格を試す。
  // 昇格で赤字買い目が増える候補は「候補」のまま残し、別候補を先に試す。
  // 昇格できる候補がなくなってからだけ増額し、増額でも赤字点数は増やさない。
  function optimize(candidates,current,cap,type){
    const currentKeys=new Set((current||[]).map(p=>key(p.numbers)));
    let selected=candidates.filter(c=>currentKeys.has(key(c.numbers)));
    if(!selected.length)selected=candidates.slice(0,Math.min(candidates.length,Math.max(1,Math.floor(cap/100))));

    // まず既存推奨を最低100円に戻して、候補昇格の余地を作る。
    let stakes=new Array(selected.length).fill(100);
    let total=selected.length*100;
    if(total>cap){
      selected=selected.slice(0,Math.max(1,Math.floor(cap/100)));
      stakes=new Array(selected.length).fill(100);
      total=selected.length*100;
    }

    // 候補昇格を最優先。赤字点数が増えない候補の中から、赤字幅→AI優先度で選ぶ。
    let guard=0;
    while(total+100<=cap&&selected.length<candidates.length&&guard++<100){
      const now=metrics(selected,stakes,total),selKeys=new Set(selected.map(c=>key(c.numbers))),opts=[];
      for(let i=0;i<candidates.length;i++){
        const c=candidates[i],k=key(c.numbers);if(selKeys.has(k))continue;
        const items=[...selected,c],st=[...stakes,100],nextTotal=total+100,m=metrics(items,st,nextTotal);
        opts.push({c,i,m,p:priority(c,type)});
      }
      const safe=opts.filter(o=>o.m.red<=now.red);
      if(!safe.length)break;
      safe.sort((a,b)=>a.m.red-b.m.red||a.m.deficit-b.m.deficit||b.p-a.p||a.i-b.i);
      selected.push(safe[0].c);stakes.push(100);total+=100;
    }

    // 候補昇格後に余った予算だけ増額。赤字点数を増やす増額はしない。
    const maxStake=300;
    guard=0;
    while(total+100<=cap&&guard++<200){
      const now=metrics(selected,stakes,total),opts=[];
      for(let i=0;i<selected.length;i++){
        if(stakes[i]>=maxStake)continue;
        const next=stakes.slice();next[i]+=100;
        const m=metrics(selected,next,total+100);
        if(m.red>now.red)continue;
        opts.push({i,m,p:priority(selected[i],type),stake:stakes[i]});
      }
      if(!opts.length)break;
      opts.sort((a,b)=>a.m.red-b.m.red||a.m.deficit-b.m.deficit||a.stake-b.stake||b.p-a.p||a.i-b.i);
      stakes[opts[0].i]+=100;total+=100;
    }

    return {selected,stakes,total};
  }

  function normalize(){
    const plan=getPlan();
    if(!plan||!Array.isArray(plan.candidates)||!plan.candidates.length)return false;
    if(plan.promotionSafeV326)return false;
    const cap=Math.max(100,Math.floor((+plan.budgetCap||+document.getElementById('budget')?.value||+plan.total||100)/100)*100);
    const candidates=plan.candidates.map(c=>({numbers:(c.numbers||[]).map(Number).sort((a,b)=>a-b),odds:+c.odds||null}));
    const current=Array.isArray(plan.picks)?plan.picks:[];
    const o=optimize(candidates,current,cap,plan.type);

    plan.picks=o.selected.map((c,i)=>({...c,stake:o.stakes[i]}));
    plan.total=o.total;
    plan.candidateCount=candidates.length;
    plan.recommendedCount=plan.picks.length;
    plan.budgetCap=cap;
    plan.promotionFirst=true;
    plan.promotionSafeV326=true;
    try{lastBetPlan=plan}catch(_){};window.lastBetPlan=plan;
    try{window.dispatchEvent(new CustomEvent('keiba-bet-plan-updated',{detail:plan}))}catch(_){}
    return true;
  }

  function install(){
    const g=window.generateTickets;
    if(typeof g!=='function'||g.__betBudgetPromotionV326)return false;
    const wrapped=function(...args){
      const out=g.apply(this,args);
      normalize();
      setTimeout(normalize,0);
      setTimeout(normalize,40);
      return out;
    };
    try{Object.assign(wrapped,g)}catch(_){}
    wrapped.__betBudgetPromotionV326=true;
    try{generateTickets=wrapped}catch(_){};window.generateTickets=wrapped;
    return true;
  }

  let tries=0;
  const timer=setInterval(()=>{tries++;if(install()||tries>120)clearInterval(timer)},100);
  addEventListener('keiba-patches-ready',()=>{setTimeout(install,30);setTimeout(normalize,100)},{once:true});
})();

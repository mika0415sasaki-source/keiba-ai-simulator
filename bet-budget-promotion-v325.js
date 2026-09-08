(()=>{
  if(window.__betBudgetPromotionV325)return;
  window.__betBudgetPromotionV325=true;

  const key=nums=>(nums||[]).map(Number).filter(Number.isFinite).sort((a,b)=>a-b).join('-');
  const getPlan=()=>{try{return lastBetPlan||window.lastBetPlan||null}catch(_){return window.lastBetPlan||null}};
  const getEval=()=>{try{return Array.isArray(evaluated)?evaluated.slice(0,6):[]}catch(_){return[]}};

  function rankMap(){
    const m=new Map();getEval().forEach((h,i)=>m.set(+h.no,i));return m;
  }

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
      const d=Math.max(0,total-o*stakes[i]);
      if(d>0){red++;deficit+=d}
    }
    return {red,deficit};
  }

  // 候補を先に100円ずつ昇格し、その後だけ追加配分する。
  // 追加100円で赤字点数が増えるなら、予算は上限として使い切らない。
  function allocate(items,cap,type){
    const maxStake=300,stakes=new Array(items.length).fill(100);
    let total=items.length*100;
    if(total>=cap)return {stakes,total};

    let guard=0;
    while(total+100<=cap&&guard++<100){
      const now=metrics(items,stakes,total),opts=[];
      for(let i=0;i<items.length;i++){
        if(stakes[i]>=maxStake)continue;
        const next=stakes.slice();next[i]+=100;
        const m=metrics(items,next,total+100);
        opts.push({i,red:m.red,deficit:m.deficit,known:(+items[i].odds||0)>0?1:0,p:priority(items[i],type)});
      }
      if(!opts.length)break;
      opts.sort((a,b)=>a.red-b.red||a.deficit-b.deficit||b.known-a.known||b.p-a.p||a.i-b.i);
      const best=opts[0];
      if(best.red>now.red)break;
      stakes[best.i]+=100;total+=100;
    }
    return {stakes,total};
  }

  function normalize(){
    const plan=getPlan();
    if(!plan||!Array.isArray(plan.candidates)||!plan.candidates.length)return false;
    const cap=Math.max(100,Math.floor((+plan.budgetCap||+document.getElementById('budget')?.value||+plan.total||100)/100)*100);
    const target=Math.min(plan.candidates.length,Math.max(1,Math.floor(cap/100)));
    const current=Array.isArray(plan.picks)?plan.picks:[];

    // 既に候補昇格が十分で、予算超過もなければ従来の良い配分をそのまま残す。
    if(current.length>=target&&(+plan.total||0)<=cap)return false;

    const items=plan.candidates.slice(0,target).map(c=>({numbers:(c.numbers||[]).map(Number).sort((a,b)=>a-b),odds:+c.odds||null}));
    const a=allocate(items,cap,plan.type);
    plan.picks=items.map((c,i)=>({...c,stake:a.stakes[i]}));
    plan.total=a.total;
    plan.candidateCount=plan.candidates.length;
    plan.recommendedCount=plan.picks.length;
    plan.budgetCap=cap;
    plan.promotionFirst=true;
    try{lastBetPlan=plan}catch(_){};window.lastBetPlan=plan;
    try{window.dispatchEvent(new CustomEvent('keiba-bet-plan-updated',{detail:plan}))}catch(_){}
    return true;
  }

  function install(){
    const g=window.generateTickets;
    if(typeof g!=='function'||g.__betBudgetPromotionV325)return false;
    const wrapped=function(...args){
      const out=g.apply(this,args);
      normalize();
      setTimeout(normalize,0);
      setTimeout(normalize,40);
      return out;
    };
    try{Object.assign(wrapped,g)}catch(_){}
    wrapped.__betBudgetPromotionV325=true;
    try{generateTickets=wrapped}catch(_){};window.generateTickets=wrapped;
    return true;
  }

  let tries=0;
  const timer=setInterval(()=>{tries++;if(install()||tries>120)clearInterval(timer)},100);
  addEventListener('keiba-patches-ready',()=>{setTimeout(install,30);setTimeout(normalize,100)},{once:true});
})();

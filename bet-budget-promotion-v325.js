(()=>{
  if(window.__betBudgetPromotionV327)return;
  window.__betBudgetPromotionV327=true;

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
    let red=0,deficit=0,worst=0;
    for(let i=0;i<items.length;i++){
      const o=+items[i].odds||0;if(!o)continue;
      const d=Math.max(0,total-o*(+stakes[i]||0));
      if(d>0){red++;deficit+=d;if(d>worst)worst=d}
    }
    return {red,deficit,worst};
  }

  // v327: 「赤字回避のために候補を消す」より、まず100円でカバーを優先。
  // 例: 20候補・予算2,000円なら20点すべて100円。1点を消して他を増額しない。
  // 候補を全部100円で買える予算がある場合は全候補を先に昇格し、余剰予算だけ増額する。
  // 予算不足時だけAI優先度で推奨点を絞り、未購入分は候補として表示に残す。
  function optimize(candidates,current,cap,type){
    const maxCount=Math.min(candidates.length,Math.max(1,Math.floor(cap/100)));
    const byKey=new Map(candidates.map(c=>[key(c.numbers),c]));
    const currentKeys=new Set((current||[]).map(p=>key(p.numbers)));

    // 既存推奨を尊重しつつ、100円単位で買える限り候補を先に昇格。
    let selected=candidates
      .filter(c=>currentKeys.has(key(c.numbers)))
      .sort((a,b)=>priority(b,type)-priority(a,type));
    if(selected.length>maxCount)selected=selected.slice(0,maxCount);

    const selectedKeys=new Set(selected.map(c=>key(c.numbers)));
    const remaining=candidates
      .filter(c=>!selectedKeys.has(key(c.numbers)))
      .sort((a,b)=>priority(b,type)-priority(a,type));
    for(const c of remaining){
      if(selected.length>=maxCount)break;
      selected.push(c);selectedKeys.add(key(c.numbers));
    }

    // capが候補数×100円以上なら、ここで必ず全候補が100円ずつ入る。
    let stakes=new Array(selected.length).fill(100);
    let total=selected.length*100;

    // 全候補を先にカバーした後だけ増額。
    // 増額先は「赤字点数→最大損失→赤字総額」を優先して改善し、同条件ならAI優先度を使う。
    const maxStake=300;
    let guard=0;
    while(total+100<=cap&&guard++<300){
      const opts=[];
      for(let i=0;i<selected.length;i++){
        if(stakes[i]>=maxStake)continue;
        const next=stakes.slice();next[i]+=100;
        const m=metrics(selected,next,total+100);
        opts.push({i,m,p:priority(selected[i],type),stake:stakes[i]});
      }
      if(!opts.length)break;
      opts.sort((a,b)=>a.m.red-b.m.red||a.m.worst-b.m.worst||a.m.deficit-b.m.deficit||a.stake-b.stake||b.p-a.p||a.i-b.i);
      stakes[opts[0].i]+=100;total+=100;
    }

    return {selected,stakes,total};
  }

  function normalize(){
    const plan=getPlan();
    if(!plan||!Array.isArray(plan.candidates)||!plan.candidates.length)return false;
    if(plan.coverageFirstV327)return false;
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
    plan.coverageFirst=true;
    plan.coverageFirstV327=true;
    try{lastBetPlan=plan}catch(_){};window.lastBetPlan=plan;
    try{window.dispatchEvent(new CustomEvent('keiba-bet-plan-updated',{detail:plan}))}catch(_){}
    return true;
  }

  function install(){
    const g=window.generateTickets;
    if(typeof g!=='function'||g.__betBudgetPromotionV327)return false;
    const wrapped=function(...args){
      const out=g.apply(this,args);
      normalize();
      setTimeout(normalize,0);
      setTimeout(normalize,40);
      return out;
    };
    try{Object.assign(wrapped,g)}catch(_){}
    wrapped.__betBudgetPromotionV327=true;
    try{generateTickets=wrapped}catch(_){};window.generateTickets=wrapped;
    return true;
  }

  let tries=0;
  const timer=setInterval(()=>{tries++;if(install()||tries>120)clearInterval(timer)},100);
  addEventListener('keiba-patches-ready',()=>{setTimeout(install,30);setTimeout(normalize,100)},{once:true});
})();

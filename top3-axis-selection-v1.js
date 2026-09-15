(()=>{
  if(window.__top3AxisSelectionV1)return;
  window.__top3AxisSelectionV1=true;

  const rows=()=>{try{return Array.isArray(evaluated)?evaluated:[]}catch(_){return[]}};
  const placeSorted=()=>rows().slice().sort((a,b)=>(Number(b?.place)||0)-(Number(a?.place)||0));
  const key=a=>(a||[]).map(Number).sort((x,y)=>x-y).join('-');
  const combos=(a,n)=>{const out=[];const rec=(i,p)=>{if(p.length===n){out.push(p.slice());return}for(let j=i;j<a.length;j++)rec(j+1,[...p,a[j]])};rec(0,[]);return out};

  function modeFromPlan(plan){
    const t=String(plan?.type||'');
    if(t.includes('ワイド'))return 'wide';
    if(t.includes('3連複'))return 'trio';
    return null;
  }

  function rebuild(plan){
    const a=placeSorted();
    if(a.length<3||!plan?.picks?.length)return false;
    const mode=modeFromPlan(plan);
    if(!mode)return false;

    const original=Array.isArray(plan.picks)?plan.picks.slice():[];
    const targetCount=original.length;
    const axisA=a[0],axisB=a[1];
    let candidates=[];

    if(mode==='wide'){
      // ワイドは3着内率1位・2位を軸側に固定し、同2頭から相手を展開。
      const pool=a.slice(2);
      candidates=[[axisA,axisB],...pool.flatMap(h=>[[axisA,h],[axisB,h]])];
    }else{
      // 3連複は3着内率1位・2位を軸2頭として固定し、3頭目を展開。
      candidates=poolFrom(a);
    }

    const seen=new Set(),pick=[];
    for(const c of candidates){
      const k=key(c.map(h=>h.no));
      if(!seen.has(k)){seen.add(k);pick.push(c)}
      if(pick.length>=targetCount)break;
    }
    if(pick.length<targetCount)return false;

    const stakes=original.map(p=>Number(p?.stake)||100);
    const oddsFor=(c)=>{
      try{return mode==='wide'?wideOddsFor(c):trioOddsFor(c)}catch(_){return null}
    };
    plan.picks=pick.map((c,i)=>({numbers:c.map(h=>+h.no).sort((x,y)=>x-y),stake:stakes[i],odds:oddsFor(c)||null}));
    plan.candidates=pick.map(c=>({numbers:c.map(h=>+h.no).sort((x,y)=>x-y),odds:oddsFor(c)||null}));
    plan.candidateCount=plan.candidates.length;
    plan.recommendedCount=plan.picks.length;
    plan.axisBasis='3着内率順';
    plan.axisNumbers=[+axisA.no,+axisB.no];
    try{lastBetPlan=plan}catch(_){};window.lastBetPlan=plan;
    try{window.dispatchEvent(new CustomEvent('keiba-bet-plan-updated',{detail:plan}))}catch(_){}
    return true;
  }

  function poolFrom(a){
    const A=a[0],B=a[1];
    return a.slice(2).map(h=>[A,B,h]);
  }

  function applyAfter(){
    try{
      const plan=lastBetPlan||window.lastBetPlan;
      if(!plan)return false;
      return rebuild(plan);
    }catch(_){return false}
  }

  function wrap(){
    const old=window.generateTickets;
    if(typeof old!=='function'||old.__top3AxisGenerateV2)return false;
    return true;
  }

  // 最終生成関数を直接ラップする。予算指定時に別パッチが10・15を確定しても、
  // 最後に3着内率1位・2位を軸として買い目を再構成する。
  function install(){
    const old=window.generateTickets;
    if(typeof old!=='function')return false;
    if(old.__top3AxisGenerateV2)return true;
    const fn=function(...args){
      const out=old.apply(this,args);
      setTimeout(applyAfter,0);
      setTimeout(applyAfter,180);
      return out;
    };
    try{Object.assign(fn,old)}catch(_){}
    fn.__top3AxisGenerateV2=true;
    fn.__original=old;
    window.generateTickets=fn;
    try{generateTickets=fn}catch(_){}
    return true;
  }

  let tries=0;
  const timer=setInterval(()=>{tries++;if(install()||tries>=150)clearInterval(timer)},100);
  addEventListener('keiba-patches-ready',()=>{setTimeout(install,30);setTimeout(install,300)});
})();

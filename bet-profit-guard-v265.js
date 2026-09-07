(function(){
  'use strict';
  if(window.__keibaBetProfitAdvisoryV310)return;
  window.__keibaBetProfitAdvisoryV310=true;

  const UNIT=100;
  const money=v=>Math.round(Number(v)||0).toLocaleString('ja-JP');
  const key=ns=>(ns||[]).map(Number).filter(Number.isFinite).sort((a,b)=>a-b).join('-');

  function getPlan(){
    try{return (typeof lastBetPlan!=='undefined')?lastBetPlan:null}catch(_){return null}
  }
  function requiredStake(total,odds){
    const o=Number(odds||0);
    if(!(o>0))return null;
    return Math.max(UNIT,Math.ceil((total/o)/UNIT)*UNIT);
  }

  function renderAdvisory(){
    const plan=getPlan();
    if(!plan||!Array.isArray(plan.picks)||!plan.picks.length)return false;
    const ticket=document.getElementById('ticket');
    const root=ticket?.firstElementChild;
    if(!root)return false;

    root.querySelectorAll('.v308-profit-advisory,.v310-profit-advisory').forEach(el=>el.remove());

    // ワイドは専用表示側で各買い目に黒字化目安を直接出すため、重複説明を追加しない。
    if(String(plan.type||'').includes('ワイド'))return true;

    const total=plan.picks.reduce((s,p)=>s+Math.max(0,Number(p.stake||0)),0) || Number(plan.total||0);
    if(!(total>0))return false;
    plan.total=total;

    const children=Array.from(root.children||[]);
    const label=children.find(el=>String(el.textContent||'').trim()==='購入内訳');
    if(!label)return false;

    const warnings=[];
    for(const p of plan.picks){
      const odds=Number(p.odds||0),stake=Number(p.stake||0);
      if(!(odds>0&&stake>0))continue;
      const ret=Math.round((odds*stake)/10)*10;
      const net=ret-total;
      if(net<0){
        const min=requiredStake(total,odds);
        warnings.push(`${key(p.numbers)}：黒字化 ${money(min)}円〜`);
      }
    }
    if(warnings.length){
      const box=document.createElement('div');
      box.className='small v310-profit-advisory';
      box.style.cssText='margin-top:9px;color:var(--w);line-height:1.5';
      box.innerHTML='<b>赤字見込み</b>　'+warnings.join(' / ');
      root.appendChild(box);
    }
    return true;
  }

  function install(){
    try{
      const original=window.generateTickets;
      if(typeof original!=='function'||original.__profitAdvisoryV310)return false;
      const wrapped=function(){
        const result=original.apply(this,arguments);
        try{queueMicrotask(renderAdvisory)}catch(_){setTimeout(renderAdvisory,0)}
        return (typeof currentTickets==='function')?currentTickets():result;
      };
      wrapped.__profitAdvisoryV310=true;
      wrapped.__previous=original;
      try{window.generateTickets=wrapped}catch(_){}
      try{generateTickets=wrapped}catch(_){}
      return true;
    }catch(e){console.warn('profit advisory v310',e);return false}
  }
  let tries=0;const tick=()=>{tries++;if(install()||tries>40)return;setTimeout(tick,200)};tick();
})();
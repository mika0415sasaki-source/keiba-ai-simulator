(function(){
  'use strict';
  if(window.__keibaBetProfitAdvisoryV308)return;
  window.__keibaBetProfitAdvisoryV308=true;

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

    const total=plan.picks.reduce((s,p)=>s+Math.max(0,Number(p.stake||0)),0) || Number(plan.total||0);
    if(!(total>0))return false;
    plan.total=total;

    const children=Array.from(root.children||[]);
    const label=children.find(el=>String(el.textContent||'').trim()==='購入内訳');
    if(!label)return false;

    root.querySelectorAll('.v308-profit-advisory').forEach(el=>el.remove());
    const note=document.createElement('div');
    note.className='small v308-profit-advisory';
    note.style.cssText='margin:8px 0;padding:8px 10px;border:1px solid var(--l);border-radius:10px;background:#0d1526;color:var(--s)';
    note.innerHTML='<b style="color:var(--t)">収支目安</b>：買い目はAI評価を優先して残します。赤字見込みでも自動削除しません。金額と黒字化目安だけ表示します。';
    label.parentNode.insertBefore(note,label);

    // 既存の購入内訳は消さず、各行の情報も変更しない。
    // 下に「赤字なら最低いくら必要か」だけ補足する。
    const warnings=[];
    for(const p of plan.picks){
      const odds=Number(p.odds||0),stake=Number(p.stake||0);
      if(!(odds>0&&stake>0))continue;
      const ret=Math.round((odds*stake)/10)*10;
      const net=ret-total;
      if(net<0){
        const min=requiredStake(total,odds);
        warnings.push(`${key(p.numbers)}：現在 ${money(stake)}円 → 払戻目安 ${money(ret)}円（${money(Math.abs(net))}円不足）／黒字化目安 ${money(min)}円以上`);
      }
    }
    if(warnings.length){
      const box=document.createElement('div');
      box.className='small v308-profit-advisory';
      box.style.cssText='margin-top:10px;padding:8px 10px;border:1px solid rgba(255,204,102,.55);border-radius:10px;background:rgba(255,204,102,.06);color:var(--w);line-height:1.55';
      box.innerHTML='<b>赤字見込みの買い目（自動除外しません）</b><br>'+warnings.join('<br>');
      root.appendChild(box);
    }
    return true;
  }

  function install(){
    try{
      const original=window.generateTickets;
      if(typeof original!=='function'||original.__profitAdvisoryV308)return false;
      const wrapped=function(){
        const result=original.apply(this,arguments);
        try{queueMicrotask(renderAdvisory)}catch(_){setTimeout(renderAdvisory,0)}
        return (typeof currentTickets==='function')?currentTickets():result;
      };
      wrapped.__profitAdvisoryV308=true;
      wrapped.__previous=original;
      try{window.generateTickets=wrapped}catch(_){}
      try{generateTickets=wrapped}catch(_){}
      return true;
    }catch(e){console.warn('profit advisory v308',e);return false}
  }
  let tries=0;const tick=()=>{tries++;if(install()||tries>40)return;setTimeout(tick,200)};tick();
})();
(function(){
  'use strict';
  if(window.__keibaBetProfitGuardV265)return;
  window.__keibaBetProfitGuardV265=true;

  const UNIT=100;
  const num=v=>Number(v);
  const money=v=>Math.round(Number(v)||0).toLocaleString('ja-JP');

  function getPlan(){
    try{return (typeof lastBetPlan!=='undefined')?lastBetPlan:null}catch(_){return null}
  }

  function getBudget(plan){
    const input=document.getElementById('budget');
    const raw=String(input?.value||'').trim();
    if(raw&&Number(raw)>0)return Math.max(UNIT,Math.floor(Number(raw)/UNIT)*UNIT);
    const t=Number(plan?.total||0);
    return t>0?Math.max(UNIT,Math.floor(t/UNIT)*UNIT):0;
  }

  function requiredStake(total,odds){
    const o=Number(odds||0);
    if(!(o>0))return UNIT;
    return Math.max(UNIT,Math.ceil((total/o)/UNIT)*UNIT);
  }

  function renderProtectedPlan(plan,total,droppedCount){
    const ticket=document.getElementById('ticket');
    const root=ticket?.firstElementChild;
    if(!root)return;

    const children=Array.from(root.children||[]);
    const label=children.find(el=>String(el.textContent||'').trim()==='購入内訳');
    if(!label)return;

    root.querySelectorAll('.v265-profit-note').forEach(el=>el.remove());
    const note=document.createElement('div');
    note.className='small v265-profit-note';
    note.style.margin='8px 0';
    note.style.color='var(--a)';
    note.innerHTML=`<b>試験・収支保護</b>：総予算${money(total)}円を基準に、的中しても赤字になる配分を再調整${droppedCount?`（低優先${droppedCount}点を除外）`:''}`;
    label.parentNode.insertBefore(note,label);

    let el=label.nextSibling;
    while(el){const next=el.nextSibling;el.remove();el=next}

    for(const p of plan.picks){
      const key=(p.numbers||[]).map(Number).sort((a,b)=>a-b).join('-');
      const odds=Number(p.odds||0);
      const stake=Number(p.stake||0);
      const ret=odds>0?Math.round((odds*stake)/10)*10:null;
      const net=ret==null?null:ret-total;
      const row=document.createElement('div');
      row.style.cssText='padding:6px 0;border-bottom:1px solid #2b4168';
      let pay='';
      if(ret!=null){
        const netText=net===0?'±0円':`${net<0?'−':'＋'}${money(Math.abs(net))}円`;
        const color=net<0?'var(--d)':(net===0?'var(--w)':'var(--a)');
        pay=`<span class="small" style="margin-left:8px">${odds.toFixed(1)}倍 / 払戻目安 ${money(ret)}円 / <b style="color:${color}">${netText}</b></span>`;
      }else{
        pay='<span class="small" style="margin-left:8px;color:var(--w)">オッズ未取得</span>';
      }
      row.innerHTML=`<div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><span>${key}${pay}</span><b>${money(stake)}円</b></div>`;
      root.appendChild(row);
    }

    const totalRow=document.createElement('div');
    totalRow.style.marginTop='10px';
    totalRow.innerHTML=`<b>${plan.picks.length}点 / 合計 ${money(total)}円</b>`;
    root.appendChild(totalRow);
  }

  function protect(){
    const plan=getPlan();
    if(!plan||!Array.isArray(plan.picks)||plan.picks.length<2)return false;
    if(!String(plan.type||'').includes('3連複'))return false;

    const total=getBudget(plan);
    if(!(total>=UNIT))return false;

    const src=plan.picks.map((p,i)=>({
      numbers:(p.numbers||[]).map(Number).filter(Number.isFinite).sort((a,b)=>a-b),
      odds:Number(p.odds||0),
      oldStake:Math.max(UNIT,Math.floor(Number(p.stake||UNIT)/UNIT)*UNIT),
      order:i
    }));

    // オッズが揃っていない時は推測で削らない。従来配分をそのまま残す。
    if(src.some(p=>!(p.odds>0)))return false;

    // 元のAI優先順を崩さず、各買い目が「総予算以上の払戻」になる最低額を算出。
    let kept=src.map(p=>({...p,stake:requiredStake(total,p.odds)}));
    let need=kept.reduce((s,p)=>s+p.stake,0);
    const dropped=[];

    // 全点を黒字/トントンにできない時だけ、AI優先順位の末尾から最小限削る。
    while(need>total&&kept.length>1){
      const p=kept.pop();
      dropped.push(p);
      need-=p.stake;
    }
    if(need>total)return false;

    // 余った予算は、まず従来配分に近づける。元ロジックの強弱をできるだけ残す。
    let remaining=total-need;
    for(const p of kept){
      if(remaining<UNIT)break;
      const desired=Math.max(p.stake,p.oldStake);
      const add=Math.min(remaining,Math.max(0,desired-p.stake));
      const rounded=Math.floor(add/UNIT)*UNIT;
      p.stake+=rounded;
      remaining-=rounded;
    }

    // それでも余れば上位3点へ順番に追加し、総予算をきっちり使う。
    let i=0;
    const topN=Math.max(1,Math.min(3,kept.length));
    while(remaining>=UNIT&&i<1000){
      kept[i%topN].stake+=UNIT;
      remaining-=UNIT;
      i++;
    }

    plan.picks=kept.map(p=>({numbers:p.numbers,stake:p.stake,odds:p.odds}));
    plan.total=plan.picks.reduce((s,p)=>s+Number(p.stake||0),0);
    renderProtectedPlan(plan,plan.total,dropped.length);
    return true;
  }

  const original=window.generateTickets;
  if(typeof original==='function'){
    window.generateTickets=function(){
      const result=original.apply(this,arguments);
      try{protect()}catch(e){console.warn('bet-profit-guard-v265',e)}
      try{return (typeof currentTickets==='function')?currentTickets():result}catch(_){return result}
    };
  }else{
    // 念のため、将来本体側で関数公開方法が変わった場合の表示用フォールバック。
    const mount=()=>{
      const ticket=document.getElementById('ticket');
      if(!ticket)return setTimeout(mount,200);
      let queued=false;
      new MutationObserver(()=>{
        if(queued)return;queued=true;
        queueMicrotask(()=>{queued=false;try{protect()}catch(e){console.warn('bet-profit-guard-v265',e)}});
      }).observe(ticket,{childList:true,subtree:true});
    };
    mount();
  }
})();

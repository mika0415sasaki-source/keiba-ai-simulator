(()=>{
  if(window.__betTicketSummaryV322)return;
  window.__betTicketSummaryV322=true;

  const el=id=>document.getElementById(id);
  const money=v=>Math.round(Number(v)||0).toLocaleString('ja-JP');
  const payout=(odds,stake)=>odds?Math.round((+odds)*stake/10)*10:null;
  const comboKey=nums=>(nums||[]).map(Number).filter(Number.isFinite).sort((a,b)=>a-b).join('-');
  const getEval=()=>{try{return Array.isArray(evaluated)?evaluated.slice(0,6):[]}catch(_){return[]}};
  const getPlan=()=>{try{return lastBetPlan||window.lastBetPlan||null}catch(_){return window.lastBetPlan||null}};
  const nC3=n=>n>=3?n*(n-1)*(n-2)/6:0;

  function summary(type,a,candidates,picks){
    const nos=a.map(h=>+h.no).filter(Number.isFinite);
    if(type.includes('ワイド')){
      const centers=nos.slice(0,2),others=nos.slice(2);
      return {
        line:`中心：${centers.join('・')}　相手：${others.join('・')}`,
        form:`買い方：ワイド　${centers.join('・')}－${others.join('・')}`,
        total:candidates.length||picks.length
      };
    }
    if(type.includes('1頭軸')){
      const axis=nos[0],others=nos.slice(1);
      return {
        line:`軸：${axis}　相手：${others.join('・')}`,
        form:`買い方：3連複1頭軸　${axis}－${others.join('・')}`,
        total:candidates.length||picks.length
      };
    }
    const centers=nos.slice(0,2),mains=nos.slice(2,4),supports=nos.slice(4,6);
    const fullBoxCount=nC3(nos.length);
    const isFullBoxCandidates=nos.length>=3&&candidates.length===fullBoxCount;
    let form;
    if(isFullBoxCandidates){
      form=picks.length===candidates.length
        ? `買い方：3連複${nos.length}頭BOX　${nos.join('・')}（${fullBoxCount}点）`
        : `買い方：3連複${nos.length}頭BOX候補からAI選定　${fullBoxCount}点中${picks.length}点購入`;
    }else{
      form=`買い方：3連複フォーメーション　${centers.join('・')}－${[...centers,...mains].join('・')}－${[...mains,...supports].join('・')}`;
    }
    return {
      line:`中心：${centers.join('・')}　本線：${mains.join('・')}　押さえ：${supports.join('・')}`,
      form,
      total:candidates.length||picks.length
    };
  }

  let writing=false,scheduled=0;
  function signature(plan){
    try{return JSON.stringify([
      plan.type||'',+plan.total||0,
      (plan.candidates||[]).map(p=>[comboKey(p.numbers),+p.odds||0]),
      (plan.picks||[]).map(p=>[comboKey(p.numbers),+p.stake||0,+p.odds||0])
    ])}catch(_){return String(Date.now())}
  }

  function render(force=false){
    const box=el('ticket'),plan=getPlan();
    if(!box||!plan||!Array.isArray(plan.picks)||!plan.picks.length)return false;
    const sig=signature(plan);
    if(!force&&box.querySelector('[data-bet-ticket-summary-v322]')&&box.dataset.betTicketSummarySig===sig)return true;

    const a=getEval(),type=String(plan.type||''),picks=plan.picks;
    const candidates=(Array.isArray(plan.candidates)&&plan.candidates.length?plan.candidates:picks).map(c=>({...c,numbers:(c.numbers||[]).map(Number)}));
    const title=type.includes('ワイド')?'ワイド・AI自動選定':type.includes('1頭軸')?'3連複1頭軸・AI自動選定':'3連複フォーメーション・AI自動選定';
    const total=+plan.total||picks.reduce((s,p)=>s+(+p.stake||0),0),s=summary(type,a,candidates,picks);
    const pickMap=new Map(picks.map(p=>[comboKey(p.numbers),p]));

    const rows=candidates.map(c=>{
      const k=comboKey(c.numbers),p=pickMap.get(k),od=+(p?.odds??c.odds)||0;
      if(p){
        const st=+p.stake||0,ret=od?payout(od,st):null,net=ret==null?null:ret-total;
        const meta=ret==null
          ? '<span class="small" style="margin-left:8px;color:var(--w)">オッズ未取得</span>'
          : `<span class="small" style="margin-left:8px">${od.toFixed(1)}倍 / 払戻 ${money(ret)}円 / <b style="color:${net<0?'var(--d)':'var(--a)'}">${net<0?'−':'＋'}${money(Math.abs(net))}円</b></span>`;
        return `<div style="padding:8px 0;border-bottom:1px solid #2b4168"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><span><b>${k}</b>${meta}</span><b>${money(st)}円</b></div></div>`;
      }
      const meta=od?`<span class="small" style="margin-left:8px">${od.toFixed(1)}倍</span>`:'<span class="small" style="margin-left:8px;color:var(--w)">オッズ未取得</span>';
      return `<div style="padding:8px 0;border-bottom:1px solid #243858;opacity:.88"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><span><b>${k}</b>${meta}</span><b class="small">候補</b></div></div>`;
    }).join('');

    writing=true;
    box.innerHTML=`<div class="card" style="margin-top:10px" data-bet-ticket-summary-v322>
      <b class="good">${title}</b>
      <div class="small" style="margin:9px 0 3px;white-space:nowrap;overflow-x:auto"><b>${s.line}</b></div>
      <div class="small" style="margin:3px 0 4px">${s.form}</div>
      <div style="margin:4px 0 11px"><b>合計${s.total}点　内推奨${picks.length}点　金額${money(total)}円</b></div>
      <div class="small" style="margin:8px 0"><b>買い目一覧</b></div>
      ${rows}
      <div style="margin-top:10px"><b>推奨${picks.length}点 / ${money(total)}円</b></div>
    </div>`;
    box.dataset.betTicketSummarySig=sig;writing=false;return true;
  }

  function schedule(delay=30,force=false){clearTimeout(scheduled);scheduled=setTimeout(()=>render(force),delay)}
  function watch(){
    const root=document.body||document.documentElement;if(!root)return;
    const obs=new MutationObserver(()=>{
      if(writing)return;const box=el('ticket'),plan=getPlan();
      if(!box||!plan||!Array.isArray(plan.picks)||!plan.picks.length)return;
      if(!box.querySelector('[data-bet-ticket-summary-v322]'))schedule(20,true);
      else if(box.dataset.betTicketSummarySig!==signature(plan))schedule(20,true);
    });
    obs.observe(root,{childList:true,subtree:true,characterData:true});
  }

  document.addEventListener('click',e=>{
    const t=e.target?.closest?.('button');if(!t)return;
    if(String(t.textContent||'').includes('AIで買い目生成')){
      setTimeout(()=>render(true),40);setTimeout(()=>render(true),140);setTimeout(()=>render(true),320);
    }
  },true);
  addEventListener('keiba-bet-plan-updated',()=>schedule(20,true));
  watch();
  addEventListener('keiba-patches-ready',()=>{schedule(80,true);setTimeout(()=>render(true),220)},{once:true});
})();

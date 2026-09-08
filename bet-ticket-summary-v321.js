(()=>{
  if(window.__betTicketSummaryV321)return;
  window.__betTicketSummaryV321=true;

  const el=id=>document.getElementById(id);
  const money=v=>Math.round(Number(v)||0).toLocaleString('ja-JP');
  const payout=(odds,stake)=>odds?Math.round((+odds)*stake/10)*10:null;
  const comboKey=nums=>(nums||[]).map(Number).filter(Number.isFinite).sort((a,b)=>a-b).join('-');
  const getEval=()=>{try{return Array.isArray(evaluated)?evaluated.slice(0,6):[]}catch(_){return[]}};
  const getPlan=()=>{try{return lastBetPlan||window.lastBetPlan||null}catch(_){return window.lastBetPlan||null}};

  function uniqueCombos(g1,g2,g3){
    const out=new Set();
    for(const a of g1)for(const b of g2)for(const c of g3){
      const nums=[+a,+b,+c];
      if(new Set(nums).size!==3)continue;
      out.add(nums.sort((x,y)=>x-y).join('-'));
    }
    return out;
  }
  function derivedCandidates(type,a){
    const nos=a.map(h=>+h.no).filter(Number.isFinite);
    if(type.includes('ワイド')){
      const c=nos.slice(0,2),o=nos.slice(2),out=[];
      if(c.length===2)out.push({numbers:[c[0],c[1]]});
      for(const h of o){for(const x of c)out.push({numbers:[x,h]})}
      return out;
    }
    if(type.includes('1頭軸')){
      const axis=nos[0],o=nos.slice(1),out=[];
      for(let i=0;i<o.length;i++)for(let j=i+1;j<o.length;j++)out.push({numbers:[axis,o[i],o[j]]});
      return out;
    }
    const centers=nos.slice(0,2),mains=nos.slice(2,4),supports=nos.slice(4,6);
    return [...uniqueCombos(centers,[...centers,...mains],[...mains,...supports])].map(k=>({numbers:k.split('-').map(Number)}));
  }
  function candidateList(plan,type,a){
    const raw=Array.isArray(plan.candidates)&&plan.candidates.length?plan.candidates:derivedCandidates(type,a);
    const seen=new Set(),out=[];
    for(const c of raw){const k=comboKey(c.numbers);if(!k||seen.has(k))continue;seen.add(k);out.push({...c,numbers:k.split('-').map(Number)})}
    return out;
  }

  function summary(type,a,candidates,picks){
    const nos=a.map(h=>+h.no).filter(Number.isFinite);
    if(type.includes('ワイド')){
      const centers=nos.slice(0,2),others=nos.slice(2);
      return {
        line:`中心：${centers.join('・')}　相手：${others.join('・')}`,
        form:`候補：${centers.join('-')} ＋ ${centers.join('・')}－${others.join('・')}`,
        total:candidates.length||picks.length
      };
    }
    if(type.includes('1頭軸')){
      const axis=nos[0],others=nos.slice(1);
      return {
        line:`軸：${axis}　相手：${others.join('・')}`,
        form:`${axis}－${others.join('・')}`,
        total:candidates.length||picks.length
      };
    }
    const centers=nos.slice(0,2),mains=nos.slice(2,4),supports=nos.slice(4,6);
    return {
      line:`中心：${centers.join('・')}　本線：${mains.join('・')}　押さえ：${supports.join('・')}`,
      form:`${centers.join('・')}－${[...centers,...mains].join('・')}－${[...mains,...supports].join('・')}`,
      total:candidates.length||picks.length
    };
  }

  let writing=false;
  let scheduled=0;
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
    if(!force&&box.querySelector('[data-bet-ticket-summary-v321]')&&box.dataset.betTicketSummarySig===sig)return true;

    const a=getEval(),type=String(plan.type||'');
    const candidates=candidateList(plan,type,a);
    const picks=plan.picks;
    const title=type.includes('ワイド')?'ワイド・AI自動選定':type.includes('1頭軸')?'3連複1頭軸・AI自動選定':'3連複フォーメーション・AI自動選定';
    const total=+plan.total||picks.reduce((s,p)=>s+(+p.stake||0),0);
    const s=summary(type,a,candidates,picks);
    const pickedKeys=new Set(picks.map(p=>comboKey(p.numbers)));
    const others=candidates.filter(c=>!pickedKeys.has(comboKey(c.numbers)));

    const rows=picks.map(p=>{
      const od=+p.odds||0,st=+p.stake||0,key=comboKey(p.numbers);
      const ret=od?payout(od,st):null,net=ret==null?null:ret-total;
      const meta=ret==null
        ? '<span class="small" style="margin-left:8px;color:var(--w)">オッズ未取得</span>'
        : `<span class="small" style="margin-left:8px">${od.toFixed(1)}倍 / 払戻 ${money(ret)}円 / <b style="color:${net<0?'var(--d)':'var(--a)'}">${net<0?'−':'＋'}${money(Math.abs(net))}円</b></span>`;
      return `<div style="padding:8px 0;border-bottom:1px solid #2b4168"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><span><b>${key}</b>${meta}</span><b>${money(st)}円</b></div></div>`;
    }).join('');

    const otherRows=others.map(c=>{
      const key=comboKey(c.numbers),od=+c.odds||0;
      const meta=od?`<span class="small" style="margin-left:8px">${od.toFixed(1)}倍</span>`:'<span class="small" style="margin-left:8px;color:var(--w)">オッズ未取得</span>';
      return `<div style="padding:7px 0;border-bottom:1px solid #243858"><div style="display:flex;justify-content:space-between;gap:10px"><span><b>${key}</b>${meta}</span><span class="small">候補</span></div></div>`;
    }).join('');
    const otherBlock=others.length?`<details style="margin-top:12px"><summary class="small" style="cursor:pointer"><b>その他候補 ${others.length}点</b></summary><div style="margin-top:6px">${otherRows}</div></details>`:'';

    writing=true;
    box.innerHTML=`<div class="card" style="margin-top:10px" data-bet-ticket-summary-v321>
      <b class="good">${title}</b>
      <div class="small" style="margin:9px 0 3px;white-space:nowrap;overflow-x:auto"><b>${s.line}</b></div>
      <div class="small" style="margin:3px 0 4px">${s.form}</div>
      <div style="margin:4px 0 11px"><b>合計${s.total}点　内推奨${picks.length}点　金額${money(total)}円</b></div>
      <div class="small" style="margin:8px 0"><b>購入内訳</b></div>
      ${rows}
      <div style="margin-top:10px"><b>推奨${picks.length}点 / ${money(total)}円</b></div>
      ${otherBlock}
    </div>`;
    box.dataset.betTicketSummarySig=sig;
    writing=false;
    return true;
  }

  function schedule(delay=30,force=false){clearTimeout(scheduled);scheduled=setTimeout(()=>render(force),delay)}
  function watch(){
    const root=document.body||document.documentElement;if(!root)return;
    const obs=new MutationObserver(()=>{
      if(writing)return;
      const box=el('ticket'),plan=getPlan();
      if(!box||!plan||!Array.isArray(plan.picks)||!plan.picks.length)return;
      if(!box.querySelector('[data-bet-ticket-summary-v321]'))schedule(20,true);
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

  watch();
  addEventListener('keiba-patches-ready',()=>{schedule(80,true);setTimeout(()=>render(true),220)},{once:true});
})();

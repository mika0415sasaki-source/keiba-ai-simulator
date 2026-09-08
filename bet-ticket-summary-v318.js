(()=>{
  if(window.__betTicketSummaryV318)return;
  window.__betTicketSummaryV318=true;

  const el=id=>document.getElementById(id);
  const money=v=>Math.round(Number(v)||0).toLocaleString('ja-JP');
  const getEval=()=>{try{return Array.isArray(evaluated)?evaluated.slice(0,6):[]}catch(_){return[]}};
  const payout=(odds,stake)=>odds?Math.round((+odds)*stake/10)*10:null;
  const comboKey=nums=>(nums||[]).map(Number).filter(Number.isFinite).sort((a,b)=>a-b).join('-');

  function uniqueCombos(g1,g2,g3){
    const out=new Set();
    for(const a of g1)for(const b of g2)for(const c of g3){
      const nums=[+a,+b,+c];
      if(new Set(nums).size!==3)continue;
      out.add(nums.sort((x,y)=>x-y).join('-'));
    }
    return out;
  }

  function summary(type,a,picks){
    const nos=a.map(h=>+h.no).filter(Number.isFinite);
    if(type.includes('ワイド')){
      const centers=nos.slice(0,2),others=nos.slice(2);
      const total=Math.max(picks.length,centers.length*others.length+1);
      return {
        line:`中心：${centers.join('・')}　相手：${others.join('・')}`,
        form:`${centers.join('・')}－${others.join('・')}`,
        total
      };
    }
    if(type.includes('1頭軸')){
      const axis=nos[0],others=nos.slice(1);
      const total=others.length>=2?(others.length*(others.length-1))/2:picks.length;
      return {
        line:`軸：${axis}　相手：${others.join('・')}`,
        form:`${axis}－${others.join('・')}`,
        total:Math.max(picks.length,total)
      };
    }

    const centers=nos.slice(0,2),mains=nos.slice(2,4),supports=nos.slice(4,6);
    const g1=centers;
    const g2=[...centers,...mains];
    const g3=[...mains,...supports];
    const base=uniqueCombos(g1,g2,g3);
    const pickKeys=picks.map(p=>comboKey(p.numbers));
    const fits=pickKeys.every(k=>base.has(k));

    if(fits){
      return {
        line:`中心：${centers.join('・')}　本線：${mains.join('・')}　押さえ：${supports.join('・')}`,
        form:`${g1.join('・')}－${g2.join('・')}－${g3.join('・')}`,
        total:base.size
      };
    }

    const all=uniqueCombos(nos.slice(0,4),nos,nos);
    return {
      line:`中心：${centers.join('・')}　本線：${mains.join('・')}　押さえ：${supports.join('・')}`,
      form:`${nos.slice(0,4).join('・')}－${nos.join('・')}－${nos.join('・')}`,
      total:Math.max(picks.length,all.size)
    };
  }

  function render(){
    const box=el('ticket');
    const plan=window.lastBetPlan;
    if(!box||!plan||!Array.isArray(plan.picks)||!plan.picks.length)return false;

    const a=getEval();
    const type=String(plan.type||'');
    const title=type.includes('ワイド')?'ワイド・AI自動選定':type.includes('1頭軸')?'3連複1頭軸・AI自動選定':'3連複フォーメーション・AI自動選定';
    const total=+plan.total||plan.picks.reduce((s,p)=>s+(+p.stake||0),0);
    const s=summary(type,a,plan.picks);

    const rows=plan.picks.map(p=>{
      const od=+p.odds||0,st=+p.stake||0,key=comboKey(p.numbers);
      const ret=od?payout(od,st):null;
      const net=ret==null?null:ret-total;
      const meta=ret==null
        ? '<span class="small" style="margin-left:8px;color:var(--w)">オッズ未取得</span>'
        : `<span class="small" style="margin-left:8px">${od.toFixed(1)}倍 / 払戻 ${money(ret)}円 / <b style="color:${net<0?'var(--d)':'var(--a)'}">${net<0?'−':'＋'}${money(Math.abs(net))}円</b></span>`;
      return `<div style="padding:8px 0;border-bottom:1px solid #2b4168"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><span><b>${key}</b>${meta}</span><b>${money(st)}円</b></div></div>`;
    }).join('');

    box.innerHTML=`<div class="card" style="margin-top:10px">
      <b class="good">${title}</b>
      <div class="small" style="margin:9px 0 4px;white-space:nowrap;overflow-x:auto"><b>${s.line}</b></div>
      <div class="small" style="margin:4px 0">${s.form}</div>
      <div style="margin:5px 0 11px"><b>合計${s.total}点　内推奨${plan.picks.length}点　金額${money(total)}円</b></div>
      <div class="small" style="margin:8px 0"><b>購入内訳</b></div>
      ${rows}
      <div style="margin-top:10px"><b>${plan.picks.length}点 / ${money(total)}円</b></div>
    </div>`;
    return true;
  }

  function install(){
    const g=window.generateTickets;
    if(typeof g!=='function'||g.__betTicketSummaryV318)return false;
    const wrapped=function(...args){
      const out=g.apply(this,args);
      setTimeout(render,40);
      return out;
    };
    Object.assign(wrapped,g);
    wrapped.__betTicketSummaryV318=true;
    try{generateTickets=wrapped}catch(_){}
    try{window.generateTickets=wrapped}catch(_){}
    return true;
  }

  let tries=0;
  const timer=setInterval(()=>{tries++;if(install()||tries>120)clearInterval(timer)},100);
  addEventListener('keiba-patches-ready',()=>setTimeout(install,80),{once:true});
})();

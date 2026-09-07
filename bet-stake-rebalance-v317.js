(()=>{
  if(window.__betStakeRebalanceV317)return;
  window.__betStakeRebalanceV317=true;

  const el=id=>document.getElementById(id);
  const money=v=>Math.round(Number(v)||0).toLocaleString('ja-JP');
  const capValue=()=>{
    const raw=String(el('budget')?.value||'').trim();
    if(!raw||!Number(raw))return null;
    return Math.max(100,Math.floor(Number(raw)/100)*100);
  };
  const getEval=()=>{try{return Array.isArray(evaluated)?evaluated.slice(0,6):[]}catch(_){return[]}};
  const rankMap=a=>{const m=new Map();a.forEach((h,i)=>m.set(+h.no,i));return m};
  const priority=(pick,a)=>{
    const rm=rankMap(a);
    const r=(pick.numbers||[]).map(n=>rm.get(+n)??99).sort((x,y)=>x-y);
    const rankSum=r.reduce((s,v)=>s+v,0);
    if((lastBetPlan?.type||'').includes('ワイド')){
      if(r[0]===0&&r[1]===1)return 10000;
      if(r[0]<=1)return 8000-r[1]*100;
      return 1000;
    }

    // 3連複は「中心2頭＋本線2頭」を最優先。
    // 押さえ11・9を含む組み合わせは残すが、資金の厚みは本線より下げる。
    const centers=r.filter(v=>v<=1).length;
    const mains=r.filter(v=>v===2||v===3).length;
    const supports=r.filter(v=>v===4||v===5).length;
    if(supports===0&&centers===2)return 12000-rankSum*20;
    if(supports===0&&centers===1&&mains===2)return 11500-rankSum*20;
    if(supports===1&&centers===2)return 10000-rankSum*18;
    if(supports===1&&centers===1&&mains===1)return 9000-rankSum*16;
    if(supports===1&&centers===0&&mains===2)return 7600-rankSum*14;
    if(supports===2&&centers===1)return 6500-rankSum*12;
    if(centers>=1)return 6200-rankSum*10;
    return 3000-rankSum*10;
  };
  const payout=(odds,stake)=>odds?Math.round((+odds)*stake/10)*10:null;

  function rebalance(){
    const cap=capValue();
    if(!cap||!lastBetPlan||!Array.isArray(lastBetPlan.picks)||!lastBetPlan.picks.length)return false;
    const a=getEval();
    const picks=lastBetPlan.picks;
    let total=picks.reduce((s,p)=>s+(+p.stake||0),0);
    if(total>=cap)return false;

    const order=picks.map((p,i)=>({i,p:priority(p,a)})).sort((x,y)=>y.p-x.p);
    let changed=false;

    // 既に選んだ買い目は消さない。残予算がある時だけ、総予算割れの買い目を黒字側へ寄せる。
    while(total+100<=cap){
      const reds=order.filter(o=>{
        const p=picks[o.i],od=+p.odds||0;
        return od>0&&payout(od,+p.stake||0)<cap;
      });
      if(!reds.length)break;
      let best=null;
      for(const o of reds){
        const p=picks[o.i],od=+p.odds||0,st=+p.stake||0;
        const need=Math.max(0,Math.ceil((cap/od-st)/100)*100);
        const canBlack=payout(od,st+100)>=cap;
        const score=(canBlack?100000:0)+o.p-(need||99999);
        if(!best||score>best.score)best={...o,score};
      }
      if(!best)break;
      picks[best.i].stake=(+picks[best.i].stake||0)+100;
      total+=100;changed=true;
    }

    // 残りは本線優先。押さえを本線と同じ厚さにはしない。
    const maxStake=Math.max(300,Math.min(600,Math.ceil(cap*.20/100)*100));
    while(total+100<=cap){
      const candidates=order.filter(o=>o.p>=7600&&(+picks[o.i].stake||0)<maxStake);
      if(!candidates.length)break;
      candidates.sort((x,y)=>(+picks[x.i].stake||0)-(+picks[y.i].stake||0)||y.p-x.p);
      const o=candidates[0];
      picks[o.i].stake=(+picks[o.i].stake||0)+100;
      total+=100;changed=true;
    }
    lastBetPlan.total=total;
    return changed;
  }

  function structure(type,a){
    if(!a.length)return '';
    if(type.includes('ワイド'))return `中心 ${a[0]?.no||''}・${a[1]?.no||''} ／ 相手 ${a.slice(2).map(h=>h.no).join('・')}`;
    if(type.includes('1頭軸'))return `軸 ${a[0]?.no||''} ／ 相手 ${a.slice(1).map(h=>h.no).join('・')}`;
    return `中心 ${a[0]?.no||''}・${a[1]?.no||''} ／ 本線 ${a[2]?.no||''}・${a[3]?.no||''} ／ 押さえ ${a.slice(4).map(h=>h.no).join('・')}`;
  }
  function rerender(){
    const box=el('ticket'),plan=lastBetPlan,cap=capValue();
    if(!box||!plan||!Array.isArray(plan.picks))return;
    const a=getEval(),type=String(plan.type||'');
    const title=type.includes('ワイド')?'ワイド・AI自動選定':type.includes('1頭軸')?'3連複1頭軸・AI自動選定':'3連複フォーメーション・AI自動選定';
    const why=type.includes('ワイド')?'混戦 → ワイド':type.includes('1頭軸')?'軸信頼度あり → 3連複':'混戦でも本線を作れる → 3連複';
    const total=plan.total||plan.picks.reduce((s,p)=>s+(+p.stake||0),0);
    const usage=cap&&total<cap?`予算上限 ${money(cap)}円 ／ 使用 ${money(total)}円`:`合計 ${money(total)}円`;
    const rows=plan.picks.map(p=>{
      const od=+p.odds||0,st=+p.stake||0,key=(p.numbers||[]).slice().sort((x,y)=>x-y).join('-');
      const ret=od?payout(od,st):null,net=ret==null?null:ret-total;
      const meta=ret==null
        ? '<span class="small" style="margin-left:8px;color:var(--w)">オッズ未取得</span>'
        : `<span class="small" style="margin-left:8px">${od.toFixed(1)}倍 / 払戻 ${money(ret)}円 / <b style="color:${net<0?'var(--d)':'var(--a)'}">${net<0?'−':'＋'}${money(Math.abs(net))}円</b></span>`;
      return `<div style="padding:8px 0;border-bottom:1px solid #2b4168"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><span><b>${key}</b>${meta}</span><b>${money(st)}円</b></div></div>`;
    }).join('');
    box.innerHTML=`<div class="card" style="margin-top:10px"><b class="good">${title}</b><div class="small" style="margin:8px 0 10px"><b>AI判断：${why}</b><br>${structure(type,a)}<br>${usage}</div><div class="small" style="margin:8px 0"><b>購入内訳</b></div>${rows}<div style="margin-top:10px"><b>${plan.picks.length}点 / ${money(total)}円</b></div></div>`;
  }
  function post(){if(rebalance())rerender()}
  function install(){
    const g=window.generateTickets;
    if(typeof g!=='function'||g.__betStakeRebalanceV317||!g.__betStrategyV315)return false;
    const wrapped=function(...args){
      const out=g.apply(this,args);
      setTimeout(post,0);
      return out;
    };
    wrapped.__betStrategyV315=true;
    wrapped.__betStakeRebalanceV317=true;
    try{generateTickets=wrapped}catch(_){}
    try{window.generateTickets=wrapped}catch(_){}
    return true;
  }
  let tries=0;
  const timer=setInterval(()=>{tries++;if(install()||tries>100)clearInterval(timer)},100);
  addEventListener('keiba-patches-ready',()=>setTimeout(install,40),{once:true});
})();

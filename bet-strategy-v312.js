(()=>{
  if(window.__betStrategyV312)return;
  window.__betStrategyV312=true;

  const el=id=>document.getElementById(id);
  const num=v=>Number.isFinite(+v)?+v:null;
  const cl=(v,a,b)=>Math.max(a,Math.min(b,v));
  const money=v=>Math.round(Number(v)||0).toLocaleString('ja-JP');
  const key=ns=>(ns||[]).map(Number).filter(Number.isFinite).sort((a,b)=>a-b).join('-');

  function marked(){
    try{return Array.isArray(evaluated)?evaluated.slice(0,Math.min(6,evaluated.length)):[]}catch(_){return[]}
  }

  function raceShape(){
    const hs=marked();
    if(hs.length<3)return {kind:'unknown',strongAxis:false,chaos:false,severeChaos:false};
    const top=hs[0],second=hs[1],third=hs[2],last=hs[hs.length-1];
    const s1=+top.score||0,s2=+second.score||0,s3=+third.score||0,s6=+last.score||0;
    const p1=+top.place||0,p2=+second.place||0,p3=+third.place||0;
    const gap12=s1-s2,gap13=s1-s3,spread=s1-s6;
    const close5=hs.filter(h=>s1-(+h.score||0)<=5).length;
    const close7=hs.filter(h=>s1-(+h.score||0)<=7).length;

    const strongAxis=(p1>=62&&(gap12>=2.8||gap13>=5))||(p1>=68&&gap13>=3.5)||(gap12>=5&&p1>=56);
    const stableCore=!strongAxis&&p1>=54&&p2>=46&&p3>=40&&gap13<=8;
    const severeChaos=(close5>=5&&spread<=6.5&&p1<58)||(close7>=6&&spread<=7.5&&p1<55&&gap12<3);
    const chaos=severeChaos||(close5>=4&&spread<=7&&p1<58&&gap12<3.2)||(gap12<2.5&&gap13<4.5&&p1<54&&p3>=38);
    const kind=strongAxis?'axis':chaos?'chaos':stableCore?'formation':'balanced';
    return {kind,strongAxis,stableCore,chaos,severeChaos,gap12,gap13,spread,close5,close7,p1,p2,p3};
  }

  function decision(){
    const raw=String(el('budget')?.value||'').trim();
    const hasBudget=raw!==''&&Number(raw)>0;
    const budget=hasBudget?Math.max(100,Math.floor(Number(raw)/100)*100):null;
    const shape=raceShape();
    if(!hasBudget)return {mode:'auto',budget,shape};

    // 券種は「予算だけ」で決めない。まずレース形状、その次に予算でカバー可能性を判断する。
    if(shape.severeChaos)return {mode:'wide',budget,shape};
    if(shape.strongAxis)return {mode:'trio',budget,shape};

    // 少額では3連複のカバーが薄くなるので、軸が明確でない限りワイド寄り。
    if(budget<=500)return {mode:shape.stableCore?'trio':'wide',budget,shape};

    // 600〜800円は通常の混戦ならワイド、上位の芯があるなら3連複。
    if(budget<=800)return {mode:shape.chaos?'wide':'trio',budget,shape};

    // 900円以上あれば中程度の混戦は3連複フォーメーションで拾える。
    // 本当に横一線の混戦だけワイドで手堅くする。
    return {mode:shape.severeChaos?'wide':'trio',budget,shape};
  }

  function wideOdds(pair){
    try{return num(wideOddsFor(pair))}catch(_){return null}
  }

  function pairUtility(pair,odds){
    const strength=pair.reduce((s,h)=>s+(+h.score||0)+(+h.place||0)*.20,0);
    const model=pair.reduce((s,h)=>s+Math.max(.04,(+h.place||0)/100),0)/2;
    const value=odds?cl(odds*model/3,.55,1.8):1;
    return strength*(odds?(1+cl(value-1,-.2,.4)*.25):1);
  }

  function pairInfo(a,b){
    const pair=[a,b],odds=wideOdds(pair);
    return {pair,odds,utility:pairUtility(pair,odds),k:key(pair.map(h=>h.no))};
  }

  function chooseWide(hs,maxPoints){
    if(hs.length<2)return[];
    const top=hs[0],second=hs[1],out=[];
    const topGap=(+top.score||0)-(+second.score||0);
    const placeGap=(+top.place||0)-(+second.place||0);
    const topDominant=topGap>=5&&placeGap>=5;
    if(topDominant){
      for(const h of hs.slice(1))out.push(pairInfo(top,h));
    }else{
      out.push(pairInfo(top,second));
      for(const h of hs.slice(2)){
        const a=pairInfo(top,h),b=pairInfo(second,h);
        out.push(a.utility>=b.utility?a:b);
      }
    }
    const dedup=[],seen=new Set();
    for(const x of out){if(!seen.has(x.k)){seen.add(x.k);dedup.push(x)}}
    return dedup.slice(0,Math.max(1,Math.min(maxPoints,dedup.length)));
  }

  function stakePriority(hs,x){
    const ranks=x.pair.map(h=>hs.findIndex(v=>+v.no===+h.no)).sort((a,b)=>a-b);
    const core=ranks[0]===0&&ranks[1]===1;
    return (core?1e7:0)+(100-(ranks[1]??99))*1e5+(200-(ranks[0]??99)-(ranks[1]??99))*1e3+(x.utility||0);
  }

  function allocateWide(hs,selected,budget){
    const stakes=new Array(selected.length).fill(100);
    let rest=Math.max(0,budget-selected.length*100);
    const order=selected.map((x,i)=>({i,p:stakePriority(hs,x)})).sort((a,b)=>b.p-a.p);
    let n=0;
    while(rest>=100&&order.length&&n<2000){
      stakes[order[n%Math.min(3,order.length)].i]+=100;
      rest-=100;n++;
    }
    return stakes;
  }

  function renderWide(hs,selected,stakes,total){
    const box=el('ticket');if(!box)return;
    const rows=selected.map((x,i)=>{
      const stake=stakes[i]||100,odds=x.odds;
      const ret=odds?Math.round(odds*stake/10)*10:null;
      const net=ret==null?null:ret-total;
      const pay=ret==null
        ? '<span class="small" style="margin-left:8px;color:var(--w)">オッズ未取得</span>'
        : `<span class="small" style="margin-left:8px">${odds.toFixed(1)}倍 / 払戻 ${money(ret)}円 / <b style="color:${net<0?'var(--d)':'var(--a)'}">${net<0?'−':'＋'}${money(Math.abs(net))}円</b></span>`;
      return `<div style="padding:8px 0;border-bottom:1px solid #2b4168"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><span><b>${x.k}</b>${pay}</span><b>${money(stake)}円</b></div></div>`;
    }).join('');
    box.innerHTML=`<div class="card" style="margin-top:10px"><b class="good">ワイド・AI自動選定</b><div class="small" style="margin:8px 0 10px"><b>AI判断：混戦 → ワイド</b><br>${hs.map(h=>h.no).join('・')}</div><div class="small" style="margin:8px 0"><b>購入内訳</b></div>${rows}<div style="margin-top:10px"><b>${selected.length}点 / 合計 ${money(total)}円</b></div></div>`;
  }

  function makeWidePlan(budget){
    const hs=marked();if(hs.length<2)return false;
    const points=Math.min(hs.length-1,Math.max(1,Math.floor(budget/100)));
    const selected=chooseWide(hs,points);if(!selected.length)return false;
    const stakes=allocateWide(hs,selected,budget);
    lastBetPlan={type:'ワイド',picks:selected.map((x,i)=>({numbers:x.pair.map(h=>+h.no).sort((a,b)=>a-b),stake:stakes[i],odds:x.odds||null}))};
    lastBetPlan.total=lastBetPlan.picks.reduce((s,p)=>s+(+p.stake||0),0);
    renderWide(hs,selected,stakes,lastBetPlan.total);
    return true;
  }

  function cleanTrioNote(){
    try{
      const box=el('ticket');if(!box)return;
      [...box.querySelectorAll('.status.ok')].forEach(x=>{
        if(String(x.textContent||'').includes('全滅防止・妙味保護'))x.remove();
      });
    }catch(_){}
  }

  function install(){
    try{
      if(typeof generateTickets!=='function'||generateTickets.__betStrategyV312)return false;
      const current=generateTickets;
      // marked-ticket-consistency の1段前は、3連複を生成できる本体側ラッパー。
      const trioGenerator=(current&&current.__previous)||current;
      const wrapped=function(){
        const d=decision();
        if(d.mode==='auto'){
          const v=current.apply(this,arguments);
          cleanTrioNote();
          return typeof currentTickets==='function'?currentTickets():v;
        }
        if(d.mode==='wide'){
          // まず通常処理で分析・オッズ更新を済ませ、その後ワイドへ確定。
          try{trioGenerator.apply(this,arguments)}catch(_){try{current.apply(this,arguments)}catch(__){}}
          makeWidePlan(d.budget);
          return typeof currentTickets==='function'?currentTickets():lastBetPlan?.picks||[];
        }
        // 3連複を選ぶ場合は、旧パッチの「低confidenceなら強制ワイド」を通さない。
        const v=trioGenerator.apply(this,arguments);
        cleanTrioNote();
        return typeof currentTickets==='function'?currentTickets():v;
      };
      wrapped.__betStrategyV312=true;
      wrapped.__previous=current;
      try{generateTickets=wrapped}catch(_){}
      try{window.generateTickets=wrapped}catch(_){}
      return true;
    }catch(e){console.warn('bet strategy v312',e);return false}
  }

  let tries=0;const tick=()=>{tries++;if(install()||tries>50)return;setTimeout(tick,200)};tick();
})();

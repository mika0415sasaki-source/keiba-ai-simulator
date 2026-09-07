(()=>{
  if(window.__betStrategyV313)return;
  window.__betStrategyV313=true;

  const el=id=>document.getElementById(id);
  const num=v=>Number.isFinite(+v)?+v:null;
  const cl=(v,a,b)=>Math.max(a,Math.min(b,v));
  const money=v=>Math.round(Number(v)||0).toLocaleString('ja-JP');
  const k=ns=>(ns||[]).map(Number).filter(Number.isFinite).sort((a,b)=>a-b).join('-');
  const choose=(arr,n)=>arr.slice(0,Math.max(0,Math.min(n,arr.length)));

  function hs(){
    try{return Array.isArray(evaluated)?evaluated.slice(0,Math.min(6,evaluated.length)):[]}catch(_){return[]}
  }

  function shape(){
    const a=hs();
    if(a.length<3)return {strongAxis:false,chaos:false,severeChaos:false,stableCore:false};
    const t=a[0],s=a[1],r=a[2],z=a[a.length-1];
    const s1=+t.score||0,s2=+s.score||0,s3=+r.score||0,s6=+z.score||0;
    const p1=+t.place||0,p2=+s.place||0,p3=+r.place||0;
    const gap12=s1-s2,gap13=s1-s3,spread=s1-s6;
    const close5=a.filter(h=>s1-(+h.score||0)<=5).length;
    const close7=a.filter(h=>s1-(+h.score||0)<=7).length;
    const strongAxis=(p1>=62&&(gap12>=2.8||gap13>=5))||(p1>=68&&gap13>=3.5)||(gap12>=5&&p1>=56);
    const stableCore=!strongAxis&&p1>=54&&p2>=46&&p3>=40&&gap13<=8;
    const severeChaos=(close5>=5&&spread<=6.5&&p1<58)||(close7>=6&&spread<=7.5&&p1<55&&gap12<3);
    const chaos=severeChaos||(close5>=4&&spread<=7&&p1<58&&gap12<3.2)||(gap12<2.5&&gap13<4.5&&p1<54&&p3>=38);
    return {strongAxis,stableCore,severeChaos,chaos,gap12,gap13,spread,close5,close7,p1,p2,p3};
  }

  function budgetInfo(){
    const raw=String(el('budget')?.value||'').trim();
    const fixed=raw!==''&&Number(raw)>0;
    const budget=fixed?Math.max(100,Math.floor(Number(raw)/100)*100):null;
    return {fixed,budget};
  }

  function decision(){
    const b=budgetInfo(),s=shape();
    if(!b.fixed){
      if(s.severeChaos)return {mode:'wide',budget:500,fixed:false,s};
      if(s.strongAxis)return {mode:'trio-axis',budget:800,fixed:false,s};
      return {mode:'trio-form',budget:s.chaos?1000:900,fixed:false,s};
    }
    if(s.strongAxis)return {mode:'trio-axis',budget:b.budget,fixed:true,s};
    if(s.severeChaos&&b.budget<=800)return {mode:'wide',budget:b.budget,fixed:true,s};
    if(s.chaos&&b.budget<=600)return {mode:'wide',budget:b.budget,fixed:true,s};
    return {mode:'trio-form',budget:b.budget,fixed:true,s};
  }

  function combos(arr,n){
    const out=[];
    const rec=(st,p)=>{if(p.length===n){out.push(p);return}for(let i=st;i<arr.length;i++)rec(i+1,[...p,arr[i]])};
    rec(0,[]);return out;
  }

  function wideOdds(c){try{return num(wideOddsFor(c))}catch(_){return null}}
  function trioOdds(c){try{return num(trioOddsFor(c))}catch(_){return null}}

  function wideInfo(c){
    const o=wideOdds(c),model=c.reduce((s,h)=>s+Math.max(.04,(+h.place||0)/100),0)/2;
    const strength=c.reduce((s,h)=>s+(+h.score||0)+(+h.place||0)*.20,0);
    const value=o?cl(o*model/3,.55,1.8):1;
    return {c,o,u:strength*(o?(1+cl(value-1,-.2,.4)*.25):1),key:k(c.map(h=>h.no))};
  }

  function trioInfo(c){
    const o=trioOdds(c),model=c.reduce((s,h)=>s+Math.max(.04,(+h.place||0)/100),0)/3;
    const strength=c.reduce((s,h)=>s+(+h.score||0)+(+h.place||0)*.30,0);
    const value=o?cl(o*model/13,.55,1.7):1;
    return {c,o,u:strength*(o?(1+cl(value-1,-.2,.35)*.22):1),key:k(c.map(h=>h.no))};
  }

  function ensureCoverage(sorted,marked,maxPoints){
    if(!sorted.length||maxPoints<=0)return[];
    const out=[],seen=new Set(),covered=new Set();
    const add=x=>{if(!x||seen.has(x.key)||out.length>=maxPoints)return;seen.add(x.key);out.push(x);x.c.forEach(h=>covered.add(+h.no))};
    add(sorted[0]);
    while(out.length<maxPoints){
      const missing=marked.map(h=>+h.no).filter(n=>!covered.has(n));
      if(!missing.length)break;
      const cand=sorted.find(x=>!seen.has(x.key)&&x.c.some(h=>missing.includes(+h.no)));
      if(!cand)break;add(cand);
    }
    for(const x of sorted){if(out.length>=maxPoints)break;add(x)}
    return out;
  }

  function widePlan(marked,budget){
    const top=marked[0],second=marked[1];
    const desired=[wideInfo([top,second])];
    for(const h of marked.slice(2)){
      const a=wideInfo([top,h]),b=wideInfo([second,h]);desired.push(a.u>=b.u?a:b);
    }
    const uniq=[];const seen=new Set();for(const x of desired.sort((a,b)=>b.u-a.u)){if(!seen.has(x.key)){seen.add(x.key);uniq.push(x)}}
    const pts=Math.min(uniq.length,Math.max(1,Math.floor(budget/100)));
    return ensureCoverage(uniq,marked,pts);
  }

  function trioPlan(marked,mode,budget){
    let pool=[];
    if(mode==='trio-axis'){
      const axis=marked[0];pool=combos(marked.slice(1),2).map(p=>trioInfo([axis,...p]));
    }else{
      const all=combos(marked,3).map(trioInfo);
      const s=shape();
      if(s.severeChaos)pool=all;
      else{
        const core=new Set(marked.slice(0,2).map(h=>+h.no));
        pool=all.filter(x=>x.c.some(h=>core.has(+h.no)));
      }
    }
    pool.sort((a,b)=>b.u-a.u);
    const pts=Math.min(pool.length,Math.max(1,Math.floor(budget/100)));
    return ensureCoverage(pool,marked,pts);
  }

  function stakes(items,budget){
    const out=new Array(items.length).fill(100);
    let rest=Math.max(0,budget-items.length*100),i=0;
    while(rest>=100&&items.length){out[i%Math.min(3,items.length)]+=100;rest-=100;i++}
    return out;
  }

  function row(x,stake,total){
    const ret=x.o?Math.round(x.o*stake/10)*10:null;
    const net=ret==null?null:ret-total;
    const meta=ret==null
      ? '<span class="small" style="margin-left:8px;color:var(--w)">オッズ未取得</span>'
      : `<span class="small" style="margin-left:8px">${x.o.toFixed(1)}倍 / 払戻 ${money(ret)}円 / <b style="color:${net<0?'var(--d)':'var(--a)'}">${net<0?'−':'＋'}${money(Math.abs(net))}円</b></span>`;
    return `<div style="padding:8px 0;border-bottom:1px solid #2b4168"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><span><b>${x.key}</b>${meta}</span><b>${money(stake)}円</b></div></div>`;
  }

  function render(mode,marked,items,st,total,fixed){
    const box=el('ticket');if(!box)return;
    let title='',reason='',structure='';
    if(mode==='wide'){
      title='ワイド・AI自動選定';reason='混戦 → ワイド';structure=marked.map(h=>h.no).join('・');
    }else if(mode==='trio-axis'){
      title='3連複1頭軸・AI自動選定';reason='軸信頼度あり → 3連複';structure=`軸 ${marked[0].no} ／ 相手 ${marked.slice(1).map(h=>h.no).join('・')}`;
    }else{
      title='3連複フォーメーション・AI自動選定';reason=shape().severeChaos?'混戦だが予算で広げる → 3連複':'上位評価を中心 → 3連複';structure=`印 ${marked.map(h=>h.no).join('・')}`;
    }
    box.innerHTML=`<div class="card" style="margin-top:10px"><b class="good">${title}</b><div class="small" style="margin:8px 0 10px"><b>AI判断：${reason}</b><br>${structure}</div><div class="small" style="margin:8px 0"><b>購入内訳</b></div>${items.map((x,i)=>row(x,st[i]||100,total)).join('')}<div style="margin-top:10px"><b>${items.length}点 / ${fixed?'合計':'AI推奨総額'} ${money(total)}円</b></div></div>`;
  }

  function generate(){
    try{if(typeof evalAll==='function')evalAll()}catch(_){}
    const marked=hs();if(marked.length<3)return [];
    const d=decision();
    const items=d.mode==='wide'?widePlan(marked,d.budget):trioPlan(marked,d.mode,d.budget);
    if(!items.length)return [];
    const st=stakes(items,d.budget),total=st.reduce((s,v)=>s+v,0);
    lastBetPlan={type:d.mode==='wide'?'ワイド':(d.mode==='trio-axis'?'3連複1頭軸':'3連複フォーメーション'),picks:items.map((x,i)=>({numbers:x.c.map(h=>+h.no).sort((a,b)=>a-b),stake:st[i],odds:x.o||null})),total};
    render(d.mode,marked,items,st,total,d.fixed);
    return typeof currentTickets==='function'?currentTickets():lastBetPlan.picks;
  }

  function install(){
    try{
      if(typeof generateTickets!=='function'||generateTickets.__betStrategyV313)return false;
      let fallback=generateTickets,hops=0;while(fallback&&fallback.__previous&&hops++<10)fallback=fallback.__previous;
      const wrapped=function(){try{return generate()}catch(e){console.warn('bet strategy v313',e);return fallback.apply(this,arguments)}};
      wrapped.__betStrategyV313=true;wrapped.__previous=generateTickets;
      try{generateTickets=wrapped}catch(_){};try{window.generateTickets=wrapped}catch(_){};
      return true;
    }catch(_){return false}
  }

  let tries=0;const tick=()=>{tries++;if(install()||tries>50)return;setTimeout(tick,200)};tick();
})();

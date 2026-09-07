(()=>{
  if(window.__betStrategyV314)return;
  window.__betStrategyV314=true;

  const el=id=>document.getElementById(id);
  const num=v=>Number.isFinite(+v)?+v:null;
  const cl=(v,a,b)=>Math.max(a,Math.min(b,v));
  const money=v=>Math.round(Number(v)||0).toLocaleString('ja-JP');
  const key=ns=>(ns||[]).map(Number).filter(Number.isFinite).sort((a,b)=>a-b).join('-');

  function marked(){
    try{return Array.isArray(evaluated)?evaluated.slice(0,Math.min(6,evaluated.length)):[]}catch(_){return[]}
  }
  function combos(arr,n){
    const out=[];const rec=(st,p)=>{if(p.length===n){out.push(p);return}for(let i=st;i<arr.length;i++)rec(i+1,[...p,arr[i]])};
    rec(0,[]);return out;
  }
  function wideOdds(c){try{return num(wideOddsFor(c))}catch(_){return null}}
  function trioOdds(c){try{return num(trioOddsFor(c))}catch(_){return null}}

  function raceShape(){
    const a=marked();
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
    return {strongAxis,stableCore,severeChaos,chaos,gap12,gap13,spread,p1,p2,p3};
  }

  function budgetInfo(){
    const raw=String(el('budget')?.value||'').trim();
    const fixed=raw!==''&&Number(raw)>0;
    return {fixed,budget:fixed?Math.max(100,Math.floor(Number(raw)/100)*100):null};
  }
  function decision(){
    const b=budgetInfo(),s=raceShape();
    if(!b.fixed){
      if(s.severeChaos)return {mode:'wide',cap:500,fixed:false,s};
      if(s.strongAxis)return {mode:'trio-axis',cap:900,fixed:false,s};
      return {mode:'trio-form',cap:s.chaos?1000:900,fixed:false,s};
    }
    if(s.strongAxis)return {mode:'trio-axis',cap:b.budget,fixed:true,s};
    if(s.severeChaos&&b.budget<=800)return {mode:'wide',cap:b.budget,fixed:true,s};
    if(s.chaos&&b.budget<=600)return {mode:'wide',cap:b.budget,fixed:true,s};
    return {mode:'trio-form',cap:b.budget,fixed:true,s};
  }

  function rankMap(hs){const m=new Map();hs.forEach((h,i)=>m.set(+h.no,i));return m}

  function wideScore(pair,hs){
    const rm=rankMap(hs),o=wideOdds(pair);
    const ranks=pair.map(h=>rm.get(+h.no)??99).sort((a,b)=>a-b);
    const hit=((+pair[0].place||0)/100)*((+pair[1].place||0)/100);
    const ai=(+pair[0].score||0)+(+pair[1].score||0);
    const rankBonus=(ranks[0]===0&&ranks[1]===1)?35:(ranks[0]===0||ranks[0]===1)?18:0;
    const value=o?cl(Math.log10(Math.max(1,o))*5,0,8):0;
    return hit*220+ai*.35+rankBonus+value;
  }
  function wideItem(pair,hs){return {c:pair,o:wideOdds(pair),score:wideScore(pair,hs),key:key(pair.map(h=>h.no))}}
  function makeWide(hs){
    const top=hs[0],second=hs[1],out=[wideItem([top,second],hs)];
    for(const h of hs.slice(2)){
      const a=wideItem([top,h],hs),b=wideItem([second,h],hs);
      out.push(a.score>=b.score?a:b);
    }
    const seen=new Set();return out.filter(x=>!seen.has(x.key)&&seen.add(x.key));
  }

  function trioItem(c,hs){
    const rm=rankMap(hs),r=c.map(h=>rm.get(+h.no)??99).sort((a,b)=>a-b),o=trioOdds(c);
    const has0=r.includes(0),has1=r.includes(1),has2=r.includes(2),has3=r.includes(3);
    let tier=5;
    if(has0&&has1)tier=0;
    else if((has0||has1)&&has2&&has3)tier=1;
    else if((has0||has1)&&(has2||has3))tier=2;
    else if(has0||has1)tier=3;
    else tier=4;
    const hit=c.reduce((p,h)=>p*Math.max(.05,(+h.place||0)/100),1);
    const ai=c.reduce((s,h)=>s+(+h.score||0),0);
    const rankSum=r.reduce((s,v)=>s+v,0);
    const value=o?cl(Math.log10(Math.max(1,o))*4,0,10):0;
    const score=(5-tier)*1000+hit*260+ai*.35-rankSum*2+value;
    return {c,o,tier,score,key:key(c.map(h=>h.no)),r};
  }

  function trioPointTarget(cap,mode){
    if(mode==='trio-axis'){
      if(cap<=700)return Math.min(6,Math.floor(cap/100));
      if(cap<=1200)return Math.min(8,Math.floor(cap/100));
      if(cap<=2000)return 9;
      return 10;
    }
    if(cap<=900)return Math.min(9,Math.floor(cap/100));
    if(cap<=1200)return 10;
    if(cap<=1500)return 12;
    if(cap<=2000)return 13;
    return 15;
  }

  function makeTrio(hs,mode,cap){
    const all=combos(hs,3).map(c=>trioItem(c,hs));
    let pool=all;
    if(mode==='trio-axis')pool=all.filter(x=>x.r.includes(0));
    pool.sort((a,b)=>a.tier-b.tier||b.score-a.score);
    const target=Math.min(pool.length,trioPointTarget(cap,mode));
    const out=[],seen=new Set();
    const add=x=>{if(!x||seen.has(x.key)||out.length>=target)return;seen.add(x.key);out.push(x)};

    // 本線：上位2頭を同時に含む組み合わせを最優先。
    pool.filter(x=>x.r.includes(0)&&x.r.includes(1)).forEach(add);

    // フォーメーション時は「片方が飛んでも全滅」を避ける保険を先に1点ずつ確保。
    if(mode==='trio-form'){
      add(pool.find(x=>x.r.includes(0)&&!x.r.includes(1)&&x.r.includes(2)&&x.r.includes(3)));
      add(pool.find(x=>!x.r.includes(0)&&x.r.includes(1)&&x.r.includes(2)&&x.r.includes(3)));
    }

    // 印6頭のうち未登場馬がいれば、評価の高い組み合わせで順に拾う。
    const covered=()=>new Set(out.flatMap(x=>x.c.map(h=>+h.no)));
    while(out.length<target){
      const cv=covered(),missing=hs.map(h=>+h.no).filter(n=>!cv.has(n));
      if(!missing.length)break;
      const x=pool.find(v=>!seen.has(v.key)&&v.c.some(h=>missing.includes(+h.no)));
      if(!x)break;add(x);
    }
    pool.forEach(add);
    return out;
  }

  function stakePriority(item,hs,mode){
    const rm=rankMap(hs),r=item.c.map(h=>rm.get(+h.no)??99).sort((a,b)=>a-b);
    if(mode==='wide'){
      if(r[0]===0&&r[1]===1)return 10000;
      if(r[0]===0||r[0]===1)return 8000-r[1]*100;
      return 1000-r.reduce((s,v)=>s+v,0)*10;
    }
    if(r.includes(0)&&r.includes(1))return 10000-r.reduce((s,v)=>s+v,0)*50;
    if((r.includes(0)||r.includes(1))&&r.includes(2))return 8000-r.reduce((s,v)=>s+v,0)*40;
    if(r.includes(0)||r.includes(1))return 6000-r.reduce((s,v)=>s+v,0)*30;
    return 3000-r.reduce((s,v)=>s+v,0)*20;
  }

  function allocate(items,cap,hs,mode){
    const st=new Array(items.length).fill(100);
    let total=items.length*100;
    if(total>=cap)return {st,total};

    // 予算は「上限」。全額消化のためだけに点数や金額を増やさない。
    const order=items.map((x,i)=>({i,p:stakePriority(x,hs,mode)})).sort((a,b)=>b.p-a.p);
    const maxStake=mode==='wide'?300:300;
    let changed=true;
    while(total+100<=cap&&changed){
      changed=false;
      for(const o of order){
        if(total+100>cap)break;
        if(st[o.i]>=maxStake)continue;
        // 3連複は本線中心、ワイドは上位組み合わせ中心だけ増額。
        if(mode==='wide'&&o.p<7000)continue;
        if(mode!=='wide'&&o.p<6000)continue;
        st[o.i]+=100;total+=100;changed=true;
      }
    }
    return {st,total};
  }

  function row(x,stake,total){
    const ret=x.o?Math.round(x.o*stake/10)*10:null;
    const net=ret==null?null:ret-total;
    const meta=ret==null
      ? '<span class="small" style="margin-left:8px;color:var(--w)">オッズ未取得</span>'
      : `<span class="small" style="margin-left:8px">${x.o.toFixed(1)}倍 / 払戻 ${money(ret)}円 / <b style="color:${net<0?'var(--d)':'var(--a)'}">${net<0?'−':'＋'}${money(Math.abs(net))}円</b></span>`;
    return `<div style="padding:8px 0;border-bottom:1px solid #2b4168"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><span><b>${x.key}</b>${meta}</span><b>${money(stake)}円</b></div></div>`;
  }

  function structureText(mode,hs){
    if(mode==='wide')return `中心 ${hs[0].no}・${hs[1].no} ／ 相手 ${hs.slice(2).map(h=>h.no).join('・')}`;
    if(mode==='trio-axis')return `軸 ${hs[0].no} ／ 相手 ${hs.slice(1).map(h=>h.no).join('・')}`;
    return `中心 ${hs[0].no}・${hs[1].no} ／ 本線 ${hs[2].no}・${hs[3].no} ／ 押さえ ${hs.slice(4).map(h=>h.no).join('・')}`;
  }
  function render(mode,hs,items,st,total,cap,fixed,s){
    const box=el('ticket');if(!box)return;
    const title=mode==='wide'?'ワイド・AI自動選定':mode==='trio-axis'?'3連複1頭軸・AI自動選定':'3連複フォーメーション・AI自動選定';
    const reason=mode==='wide'?'混戦 → ワイド':mode==='trio-axis'?'軸信頼度あり → 3連複':'混戦でも上位2頭を中心に広げる → 3連複';
    const capText=fixed?`予算上限 ${money(cap)}円`:`AI推奨上限 ${money(cap)}円`;
    const usedText=total<cap?` / 使用 ${money(total)}円`:` / 合計 ${money(total)}円`;
    box.innerHTML=`<div class="card" style="margin-top:10px"><b class="good">${title}</b><div class="small" style="margin:8px 0 10px"><b>AI判断：${reason}</b><br>${structureText(mode,hs)}<br>${capText}${usedText}</div><div class="small" style="margin:8px 0"><b>購入内訳</b></div>${items.map((x,i)=>row(x,st[i],total)).join('')}<div style="margin-top:10px"><b>${items.length}点 / ${total<cap?'使用':'合計'} ${money(total)}円</b></div></div>`;
  }

  function generate(){
    try{if(typeof evalAll==='function')evalAll()}catch(_){}
    const hs=marked();if(hs.length<3)return [];
    const d=decision();
    const items=d.mode==='wide'?makeWide(hs):makeTrio(hs,d.mode,d.cap);
    if(!items.length)return [];
    const a=allocate(items,d.cap,hs,d.mode);
    lastBetPlan={type:d.mode==='wide'?'ワイド':d.mode==='trio-axis'?'3連複1頭軸':'3連複フォーメーション',picks:items.map((x,i)=>({numbers:x.c.map(h=>+h.no).sort((a,b)=>a-b),stake:a.st[i],odds:x.o||null})),total:a.total};
    render(d.mode,hs,items,a.st,a.total,d.cap,d.fixed,d.s);
    return typeof currentTickets==='function'?currentTickets():lastBetPlan.picks;
  }

  function install(){
    try{
      if(typeof generateTickets!=='function'||generateTickets.__betStrategyV314)return false;
      let fallback=generateTickets,hops=0;while(fallback&&fallback.__previous&&hops++<12)fallback=fallback.__previous;
      const wrapped=function(){try{return generate()}catch(e){console.warn('bet strategy v314',e);return fallback.apply(this,arguments)}};
      wrapped.__betStrategyV314=true;wrapped.__previous=generateTickets;
      try{generateTickets=wrapped}catch(_){};try{window.generateTickets=wrapped}catch(_){};
      return true;
    }catch(_){return false}
  }
  let tries=0;const tick=()=>{tries++;if(install()||tries>60)return;setTimeout(tick,200)};tick();
})();

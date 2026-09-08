(()=>{
  if(window.__betStrategyV321)return;
  window.__betStrategyV321=true;

  const el=id=>document.getElementById(id);
  const num=v=>Number.isFinite(+v)?+v:null;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const money=v=>Math.round(Number(v)||0).toLocaleString('ja-JP');
  const key=arr=>arr.map(h=>+h.no).sort((a,b)=>a-b).join('-');

  function hs(){
    try{return Array.isArray(evaluated)?evaluated.slice(0,Math.min(6,evaluated.length)):[]}catch(_){return[]}
  }
  function combos(arr,n){
    const out=[];
    const rec=(st,p)=>{if(p.length===n){out.push(p);return;}for(let i=st;i<arr.length;i++)rec(i+1,[...p,arr[i]])};
    rec(0,[]);return out;
  }
  function uniqueFormationKeys(g1,g2,g3){
    const out=new Set();
    for(const a of g1)for(const b of g2)for(const c of g3){
      const nums=[+a,+b,+c];
      if(new Set(nums).size!==3)continue;
      out.add(nums.sort((x,y)=>x-y).join('-'));
    }
    return out;
  }
  function wideOdds(c){try{return num(wideOddsFor(c))}catch(_){return null}}
  function trioOdds(c){try{return num(trioOddsFor(c))}catch(_){return null}}

  function shape(){
    const a=hs();
    if(a.length<3)return {strong:false,chaos:false,severe:false};
    const s1=+a[0].score||0,s2=+a[1].score||0,s3=+a[2].score||0,s6=+a[a.length-1].score||0;
    const p1=+a[0].place||0,p2=+a[1].place||0,p3=+a[2].place||0;
    const g12=s1-s2,g13=s1-s3,spread=s1-s6;
    const close5=a.filter(h=>s1-(+h.score||0)<=5).length;
    const close7=a.filter(h=>s1-(+h.score||0)<=7).length;
    const strong=(p1>=62&&(g12>=2.8||g13>=5))||(p1>=68&&g13>=3.5)||(g12>=5&&p1>=56);
    const severe=(close5>=5&&spread<=6.5&&p1<58)||(close7>=6&&spread<=7.5&&p1<55&&g12<3);
    const chaos=severe||(close5>=4&&spread<=7&&p1<58&&g12<3.2)||(g12<2.5&&g13<4.5&&p1<54&&p3>=38);
    return {strong,chaos,severe,g12,g13,spread,p1,p2,p3};
  }

  function budget(){
    const raw=String(el('budget')?.value||'').trim();
    const fixed=raw!==''&&Number(raw)>0;
    return {fixed,cap:fixed?Math.max(100,Math.floor(Number(raw)/100)*100):null};
  }
  function decide(){
    const b=budget(),s=shape();
    if(!b.fixed){
      if(s.severe)return {mode:'wide',cap:500,fixed:false,s};
      if(s.strong)return {mode:'axis',cap:800,fixed:false,s};
      return {mode:'form',cap:s.chaos?900:800,fixed:false,s};
    }
    if(s.strong)return {mode:'axis',cap:b.cap,fixed:true,s};
    if(s.severe&&b.cap<=800)return {mode:'wide',cap:b.cap,fixed:true,s};
    if(s.chaos&&b.cap<=700)return {mode:'wide',cap:b.cap,fixed:true,s};
    return {mode:'form',cap:b.cap,fixed:true,s};
  }

  function rankMap(a){const m=new Map();a.forEach((h,i)=>m.set(+h.no,i));return m}
  function wideItem(c,a){
    const rm=rankMap(a),r=c.map(h=>rm.get(+h.no)??99).sort((x,y)=>x-y),o=wideOdds(c);
    const hit=c.reduce((p,h)=>p*Math.max(.05,(+h.place||0)/100),1);
    const ai=c.reduce((s,h)=>s+(+h.score||0),0);
    const main=(r[0]===0&&r[1]===1)?60:(r[0]<=1?25:0);
    const val=o?clamp(Math.log10(Math.max(1,o))*5,0,8):0;
    return {c,o,r,key:key(c),score:hit*260+ai*.35+main+val};
  }
  function makeWidePool(a){
    const A=a[0],B=a[1],out=[],seen=new Set();
    const add=c=>{const x=wideItem(c,a);if(!seen.has(x.key)){seen.add(x.key);out.push(x)}};
    add([A,B]);
    for(const h of a.slice(2)){add([A,h]);add([B,h])}
    return out;
  }
  function selectWide(pool,a,target){
    const out=[],seen=new Set();
    const add=x=>{if(!x||seen.has(x.key)||out.length>=target)return;seen.add(x.key);out.push(x)};
    const A=+a[0].no,B=+a[1].no;
    add(pool.find(x=>x.key===([A,B].sort((m,n)=>m-n).join('-'))));

    let loadA=0,loadB=0;
    for(const h of a.slice(2)){
      if(out.length>=target)break;
      const hn=+h.no;
      const x=pool.find(v=>v.key===([A,hn].sort((m,n)=>m-n).join('-')));
      const y=pool.find(v=>v.key===([B,hn].sort((m,n)=>m-n).join('-')));
      if(!x&&!y)continue;
      if(!x){add(y);loadB++;continue}
      if(!y){add(x);loadA++;continue}
      const ax=x.score-loadA*16,by=y.score-loadB*16;
      if(ax>=by){add(x);loadA++}else{add(y);loadB++}
    }

    [...pool].sort((x,y)=>y.score-x.score).forEach(add);
    return out;
  }

  function trioItem(c,a){
    const rm=rankMap(a),r=c.map(h=>rm.get(+h.no)??99).sort((x,y)=>x-y),o=trioOdds(c);
    const hasA=r.includes(0),hasB=r.includes(1),hasC=r.includes(2),hasD=r.includes(3);
    let tier=4;
    if(hasA&&hasB)tier=0;
    else if((hasA||hasB)&&hasC&&hasD)tier=1;
    else if((hasA||hasB)&&(hasC||hasD))tier=2;
    else if(hasA||hasB)tier=3;
    const hit=c.reduce((p,h)=>p*Math.max(.05,(+h.place||0)/100),1);
    const ai=c.reduce((s,h)=>s+(+h.score||0),0);
    const rankSum=r.reduce((s,v)=>s+v,0);
    const val=o?clamp(Math.log10(Math.max(1,o))*4,0,10):0;
    return {c,o,r,tier,key:key(c),score:(5-tier)*1000+hit*300+ai*.35-rankSum*2+val};
  }
  function makeTrioPool(a,mode){
    let pool=combos(a,3).map(c=>trioItem(c,a));
    if(mode==='axis')return pool.filter(x=>x.r.includes(0));

    const nos=a.map(h=>+h.no);
    const centers=nos.slice(0,2),mains=nos.slice(2,4),supports=nos.slice(4,6);
    const allowed=uniqueFormationKeys(centers,[...centers,...mains],[...mains,...supports]);
    return pool.filter(x=>allowed.has(x.key));
  }
  function pointTarget(cap,mode,poolLength){
    if(mode==='wide')return Math.min(poolLength,Math.max(1,Math.floor(cap/100)));
    if(mode==='axis'){
      if(cap<=700)return Math.min(poolLength,Math.min(6,Math.floor(cap/100)));
      if(cap<=1200)return Math.min(poolLength,Math.min(8,Math.floor(cap/100)));
      return Math.min(poolLength,10);
    }
    if(cap<=900)return Math.min(poolLength,Math.min(9,Math.floor(cap/100)));
    if(cap<=1200)return Math.min(poolLength,10);
    if(cap<=1500)return Math.min(poolLength,12);
    if(cap<=2000)return Math.min(poolLength,13);
    return poolLength;
  }
  function selectTrio(pool,a,mode,target){
    const sorted=[...pool].sort((x,y)=>x.tier-y.tier||y.score-x.score);
    const out=[],seen=new Set();
    const add=x=>{if(!x||seen.has(x.key)||out.length>=target)return;seen.add(x.key);out.push(x)};

    sorted.filter(x=>x.r.includes(0)&&x.r.includes(1)).forEach(add);

    if(mode==='form'){
      add(sorted.find(x=>x.r.includes(0)&&!x.r.includes(1)&&x.r.includes(2)&&x.r.includes(3)));
      add(sorted.find(x=>!x.r.includes(0)&&x.r.includes(1)&&x.r.includes(2)&&x.r.includes(3)));
      add(sorted.find(x=>x.r.includes(0)&&!x.r.includes(1)&&x.tier<=2&&!seen.has(x.key)));
      add(sorted.find(x=>!x.r.includes(0)&&x.r.includes(1)&&x.tier<=2&&!seen.has(x.key)));
    }

    const covered=()=>new Set(out.flatMap(x=>x.c.map(h=>+h.no)));
    while(out.length<target){
      const cv=covered(),missing=a.map(h=>+h.no).filter(n=>!cv.has(n));
      if(!missing.length)break;
      const x=sorted.find(v=>!seen.has(v.key)&&v.c.some(h=>missing.includes(+h.no)));
      if(!x)break;add(x);
    }
    sorted.forEach(add);
    return out;
  }

  function priority(x,mode){
    const r=x.r||[];
    if(mode==='wide'){
      if(r[0]===0&&r[1]===1)return 10000;
      if(r[0]<=1)return 8000-r[1]*100;
      return 1000;
    }
    if(r.includes(0)&&r.includes(1))return 10000-r.reduce((s,v)=>s+v,0)*30;
    if((r.includes(0)||r.includes(1))&&r.includes(2)&&r.includes(3))return 8500-r.reduce((s,v)=>s+v,0)*25;
    if(r.includes(0)||r.includes(1))return 6500-r.reduce((s,v)=>s+v,0)*20;
    return 3000-r.reduce((s,v)=>s+v,0)*10;
  }
  function allocate(items,cap,mode){
    const st=new Array(items.length).fill(100);
    let total=items.length*100;
    if(total>=cap)return {st,total};

    const order=items.map((x,i)=>({i,p:priority(x,mode)})).sort((a,b)=>b.p-a.p);
    const maxStake=mode==='wide'?300:300;
    while(total+100<=cap){
      const pick=order.find(o=>st[o.i]<maxStake&&(mode==='wide'?o.p>=7000:o.p>=6500));
      if(!pick)break;
      st[pick.i]+=100;total+=100;
      order.push(order.shift());
      order.sort((a,b)=>((st[a.i]-st[b.i])*1000)||(b.p-a.p));
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
  function structure(mode,a){
    if(mode==='wide')return `中心 ${a[0].no}・${a[1].no} ／ 相手 ${a.slice(2).map(h=>h.no).join('・')}`;
    if(mode==='axis')return `軸 ${a[0].no} ／ 相手 ${a.slice(1).map(h=>h.no).join('・')}`;
    return `中心 ${a[0].no}・${a[1].no} ／ 本線 ${a[2].no}・${a[3].no} ／ 押さえ ${a.slice(4).map(h=>h.no).join('・')}`;
  }
  function render(mode,a,items,st,total,cap){
    const box=el('ticket');if(!box)return;
    const title=mode==='wide'?'ワイド・AI自動選定':mode==='axis'?'3連複1頭軸・AI自動選定':'3連複フォーメーション・AI自動選定';
    const why=mode==='wide'?'混戦 → ワイド':mode==='axis'?'軸信頼度あり → 3連複':'混戦でも本線を作れる → 3連複';
    const usage=total<cap?`予算上限 ${money(cap)}円 ／ 使用 ${money(total)}円`:`合計 ${money(total)}円`;
    box.innerHTML=`<div class="card" style="margin-top:10px"><b class="good">${title}</b><div class="small" style="margin:8px 0 10px"><b>AI判断：${why}</b><br>${structure(mode,a)}<br>${usage}</div><div class="small" style="margin:8px 0"><b>購入内訳</b></div>${items.map((x,i)=>row(x,st[i],total)).join('')}<div style="margin-top:10px"><b>${items.length}点 / ${money(total)}円</b></div></div>`;
  }

  function serializeCandidate(x){
    return {numbers:x.c.map(h=>+h.no).sort((m,n)=>m-n),odds:x.o||null};
  }
  function generate(){
    try{if(typeof evalAll==='function')evalAll()}catch(_){}
    const a=hs();if(a.length<3)return [];
    const d=decide();

    const pool=d.mode==='wide'?makeWidePool(a):makeTrioPool(a,d.mode);
    if(!pool.length)return [];
    const target=pointTarget(d.cap,d.mode,pool.length);
    const items=d.mode==='wide'?selectWide(pool,a,target):selectTrio(pool,a,d.mode,target);
    if(!items.length)return [];

    const alloc=allocate(items,d.cap,d.mode);
    lastBetPlan={
      type:d.mode==='wide'?'ワイド':d.mode==='axis'?'3連複1頭軸':'3連複フォーメーション',
      candidates:pool.map(serializeCandidate),
      picks:items.map((x,i)=>({numbers:x.c.map(h=>+h.no).sort((m,n)=>m-n),stake:alloc.st[i],odds:x.o||null})),
      total:alloc.total
    };
    try{window.lastBetPlan=lastBetPlan}catch(_){}
    render(d.mode,a,items,alloc.st,alloc.total,d.cap);
    return typeof currentTickets==='function'?currentTickets():lastBetPlan.picks;
  }

  function install(){
    try{
      if(typeof generateTickets!=='function')return false;
      const wrapped=function(){try{return generate()}catch(e){console.warn('bet strategy v321',e);return []}};
      wrapped.__betStrategyV315=true;
      wrapped.__betStrategyV321=true;
      try{generateTickets=wrapped}catch(_){}
      try{window.generateTickets=wrapped}catch(_){}
      return true;
    }catch(_){return false}
  }

  let tries=0;
  const timer=setInterval(()=>{tries++;if(install()||tries>80)clearInterval(timer)},150);
  addEventListener('keiba-patches-ready',()=>setTimeout(install,0),{once:true});
})();

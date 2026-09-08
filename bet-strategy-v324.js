(()=>{
  if(window.__betStrategyV324)return;
  window.__betStrategyV324=true;

  const el=id=>document.getElementById(id);
  const num=v=>Number.isFinite(+v)?+v:null;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const keyNums=arr=>arr.map(Number).sort((a,b)=>a-b).join('-');
  const keyH=arr=>keyNums(arr.map(h=>+h.no));

  function hs(){try{return Array.isArray(evaluated)?evaluated.slice(0,Math.min(6,evaluated.length)):[]}catch(_){return[]}}
  function combos(arr,n){const out=[];const rec=(st,p)=>{if(p.length===n){out.push(p);return}for(let i=st;i<arr.length;i++)rec(i+1,[...p,arr[i]])};rec(0,[]);return out}
  function wideOdds(c){try{return num(wideOddsFor(c))}catch(_){return null}}
  function trioOdds(c){try{return num(trioOddsFor(c))}catch(_){return null}}

  function shape(){
    const a=hs();if(a.length<3)return {strong:false,chaos:false,severe:false};
    const s1=+a[0].score||0,s2=+a[1].score||0,s3=+a[2].score||0,s6=+a[a.length-1].score||0;
    const p1=+a[0].place||0,p3=+a[2].place||0;
    const g12=s1-s2,g13=s1-s3,spread=s1-s6;
    const close5=a.filter(h=>s1-(+h.score||0)<=5).length;
    const close7=a.filter(h=>s1-(+h.score||0)<=7).length;
    const strong=(p1>=62&&(g12>=2.8||g13>=5))||(p1>=68&&g13>=3.5)||(g12>=5&&p1>=56);
    const severe=(close5>=5&&spread<=6.5&&p1<58)||(close7>=6&&spread<=7.5&&p1<55&&g12<3);
    const chaos=severe||(close5>=4&&spread<=7&&p1<58&&g12<3.2)||(g12<2.5&&g13<4.5&&p1<54&&p3>=38);
    return {strong,chaos,severe,g12,g13,spread,p1};
  }
  function budget(){const raw=String(el('budget')?.value||'').trim();const fixed=raw!==''&&Number(raw)>0;return {fixed,cap:fixed?Math.max(100,Math.floor(Number(raw)/100)*100):null}}
  function decide(){
    const b=budget(),s=shape();
    if(!b.fixed){if(s.severe)return {mode:'wide',cap:500,s};if(s.strong)return {mode:'axis',cap:800,s};return {mode:'form',cap:s.chaos?900:800,s}}
    if(s.strong)return {mode:'axis',cap:b.cap,s};
    if(s.severe&&b.cap<=800)return {mode:'wide',cap:b.cap,s};
    if(s.chaos&&b.cap<=700)return {mode:'wide',cap:b.cap,s};
    return {mode:'form',cap:b.cap,s};
  }

  function rankMap(a){const m=new Map();a.forEach((h,i)=>m.set(+h.no,i));return m}
  function wideItem(c,a){
    const rm=rankMap(a),r=c.map(h=>rm.get(+h.no)??99).sort((x,y)=>x-y),o=wideOdds(c);
    const hit=c.reduce((p,h)=>p*Math.max(.05,(+h.place||0)/100),1),ai=c.reduce((s,h)=>s+(+h.score||0),0);
    const main=(r[0]===0&&r[1]===1)?60:(r[0]<=1?25:0),val=o?clamp(Math.log10(Math.max(1,o))*5,0,8):0;
    return {c,o,r,key:keyH(c),score:hit*260+ai*.35+main+val};
  }
  function widePool(a){
    const A=a[0],B=a[1],base=[wideItem([A,B],a)],extra=[];
    for(const h of a.slice(2)){
      const x=wideItem([A,h],a),y=wideItem([B,h],a);
      if(x.score>=y.score){base.push(x);extra.push(y)}else{base.push(y);extra.push(x)}
    }
    extra.sort((x,y)=>y.score-x.score);
    const out=[],seen=new Set();
    for(const x of [...base,...extra]){if(!seen.has(x.key)){seen.add(x.key);out.push(x)}}
    return out;
  }

  function trioItem(c,a){
    const rm=rankMap(a),r=c.map(h=>rm.get(+h.no)??99).sort((x,y)=>x-y),o=trioOdds(c);
    const hasA=r.includes(0),hasB=r.includes(1),hasC=r.includes(2),hasD=r.includes(3);
    let tier=4;if(hasA&&hasB)tier=0;else if((hasA||hasB)&&hasC&&hasD)tier=1;else if((hasA||hasB)&&(hasC||hasD))tier=2;else if(hasA||hasB)tier=3;
    const hit=c.reduce((p,h)=>p*Math.max(.05,(+h.place||0)/100),1),ai=c.reduce((s,h)=>s+(+h.score||0),0),rankSum=r.reduce((s,v)=>s+v,0);
    const val=o?clamp(Math.log10(Math.max(1,o))*4,0,10):0;
    return {c,o,r,tier,key:keyH(c),score:(5-tier)*1000+hit*300+ai*.35-rankSum*2+val};
  }
  function standardFormationKeys(a){
    const nos=a.map(h=>+h.no),centers=nos.slice(0,2),mains=nos.slice(2,4),supports=nos.slice(4,6),out=new Set();
    for(const x of centers)for(const y of [...centers,...mains])for(const z of [...mains,...supports]){
      const n=[x,y,z];if(new Set(n).size!==3)continue;out.add(keyNums(n));
    }
    return out;
  }
  function stableOrder(pool,a,mode){
    const out=[],seen=new Set();
    const add=x=>{if(x&&!seen.has(x.key)){seen.add(x.key);out.push(x)}};
    pool.filter(x=>x.r.includes(0)&&x.r.includes(1)).forEach(add);
    if(mode==='form'){
      add(pool.find(x=>x.r.includes(0)&&!x.r.includes(1)&&x.r.includes(2)&&x.r.includes(3)));
      add(pool.find(x=>!x.r.includes(0)&&x.r.includes(1)&&x.r.includes(2)&&x.r.includes(3)));
      add(pool.find(x=>x.r.includes(0)&&!x.r.includes(1)&&x.tier<=2&&!seen.has(x.key)));
      add(pool.find(x=>!x.r.includes(0)&&x.r.includes(1)&&x.tier<=2&&!seen.has(x.key)));
    }
    const covered=()=>new Set(out.flatMap(x=>x.c.map(h=>+h.no)));
    while(out.length<pool.length){
      const cv=covered(),missing=a.map(h=>+h.no).filter(n=>!cv.has(n));
      if(!missing.length)break;
      const x=pool.find(v=>!seen.has(v.key)&&v.c.some(h=>missing.includes(+h.no)));if(!x)break;add(x);
    }
    pool.forEach(add);return out;
  }
  function trioPools(a,mode,cap){
    let full=combos(a,3).map(c=>trioItem(c,a));
    if(mode==='axis')full=full.filter(x=>x.r.includes(0));
    full.sort((x,y)=>x.tier-y.tier||y.score-x.score);
    if(mode==='axis')return {candidates:full,ordered:stableOrder(full,a,mode)};
    const stdKeys=standardFormationKeys(a),standard=full.filter(x=>stdKeys.has(x.key)),expanded=full.filter(x=>!stdKeys.has(x.key));
    const baseOrder=stableOrder(standard,a,mode),extraOrder=stableOrder(expanded,a,mode);
    const candidates=cap>1500?[...baseOrder,...extraOrder]:baseOrder;
    return {candidates,ordered:candidates};
  }

  // 予算は「使い切る金額」ではなく上限。増えた分はまず候補昇格に使う。
  function recommendedCount(cap,mode,candidateLen){
    if(mode==='wide'){
      if(cap<=500)return Math.min(candidateLen,5);
      if(cap<=800)return Math.min(candidateLen,8);
      return candidateLen;
    }
    if(mode==='axis'){
      if(cap<=700)return Math.min(candidateLen,Math.min(6,Math.floor(cap/100)));
      if(cap<=1200)return Math.min(candidateLen,Math.min(8,Math.floor(cap/100)));
      if(cap<=1800)return Math.min(candidateLen,10);
      return Math.min(candidateLen,Math.max(10,Math.floor(cap/150)));
    }
    if(cap<=900)return Math.min(candidateLen,9);
    if(cap<=1200)return Math.min(candidateLen,10);
    if(cap<=1500)return Math.min(candidateLen,12);
    if(cap<=2000)return Math.min(candidateLen,14);
    if(cap<=2500)return Math.min(candidateLen,17);
    return candidateLen;
  }

  function priority(x,mode){
    const r=x.r||[];
    if(mode==='wide'){if(r[0]===0&&r[1]===1)return 10000;if(r[0]<=1)return 8000-r[1]*100;return 1000}
    if(r.includes(0)&&r.includes(1))return 10000-r.reduce((s,v)=>s+v,0)*30;
    if((r.includes(0)||r.includes(1))&&r.includes(2)&&r.includes(3))return 8500-r.reduce((s,v)=>s+v,0)*25;
    if(r.includes(0)||r.includes(1))return 6500-r.reduce((s,v)=>s+v,0)*20;
    return 3000-r.reduce((s,v)=>s+v,0)*10;
  }

  function breakEvenStake(odds,cap,maxStake=300){
    if(!odds||odds<=0)return 100;
    const need=Math.ceil((cap/odds)/100)*100;
    return clamp(need,100,maxStake);
  }

  // ①全推奨100円 → ②赤字回避に必要な組合せを補強 → ③残りだけ本線へ厚く。
  // これにより、強い買い目へ先に300円を積んで低オッズ側を赤字のまま残す配分を防ぐ。
  function allocate(items,cap,mode){
    const maxStake=300,st=new Array(items.length).fill(100);
    let total=items.length*100;
    if(total>=cap)return {st,total};

    const needs=items.map(x=>breakEvenStake(x.o,cap,maxStake));
    const protectPossible=items.every((x,i)=>!x.o||(+x.o*needs[i])>=cap) && needs.reduce((s,v)=>s+v,0)<=cap;

    if(protectPossible){
      for(let i=0;i<st.length;i++)st[i]=needs[i];
      total=st.reduce((s,v)=>s+v,0);
    }else{
      // 全点を黒字化できない予算では、赤字幅の大きい推奨から先に100円ずつ補強。
      let guard=0;
      while(total+100<=cap&&guard++<200){
        const cand=[];
        for(let i=0;i<items.length;i++){
          if(st[i]>=maxStake)continue;
          const o=+items[i].o||0;
          if(!o)continue;
          const deficit=Math.max(0,cap-o*st[i]);
          if(deficit<=0)continue;
          const nextDef=Math.max(0,cap-o*(st[i]+100));
          cand.push({i,gain:deficit-nextDef,finish:nextDef===0?1:0,p:priority(items[i],mode)});
        }
        if(!cand.length)break;
        cand.sort((a,b)=>b.finish-a.finish||b.gain-a.gain||b.p-a.p||st[a.i]-st[b.i]);
        st[cand[0].i]+=100;total+=100;
      }
    }

    // 黒字保護後に余った予算だけ、AI優先度の高い本線へ追加。
    // 予算は上限なので、上限まで使わなくてもよい。
    let guard=0;
    while(total+100<=cap&&guard++<300){
      const cand=items.map((x,i)=>({i,p:priority(x,mode),stake:st[i]})).filter(x=>x.stake<maxStake);
      if(!cand.length)break;
      cand.sort((a,b)=>a.stake-b.stake||b.p-a.p);
      const pick=cand[0];
      // 全推奨がcap基準で保護済みなら追加しても赤字化しない。
      if(protectPossible){st[pick.i]+=100;total+=100;continue}
      // 保護不能時は、追加100円で赤字点数が増えるなら使い切らない。
      const nextTotal=total+100;
      const next=st.slice();next[pick.i]+=100;
      const redNow=items.reduce((n,x,i)=>n+(x.o&&(+x.o*st[i])<total?1:0),0);
      const redNext=items.reduce((n,x,i)=>n+(x.o&&(+x.o*next[i])<nextTotal?1:0),0);
      if(redNext>redNow)break;
      st[pick.i]+=100;total=nextTotal;
    }
    return {st,total};
  }

  function serialize(x){return {numbers:x.c.map(h=>+h.no).sort((a,b)=>a-b),odds:x.o||null}}

  function generate(){
    try{if(typeof evalAll==='function')evalAll()}catch(_){}
    const a=hs();if(a.length<3)return [];
    const d=decide();let candidates=[],ordered=[];
    if(d.mode==='wide'){
      candidates=widePool(a);ordered=candidates;
    }else{
      const p=trioPools(a,d.mode,d.cap);candidates=p.candidates;ordered=p.ordered;
    }
    if(!candidates.length)return [];
    const recN=recommendedCount(d.cap,d.mode,candidates.length),recommended=ordered.slice(0,recN),alloc=allocate(recommended,d.cap,d.mode);
    const plan={
      type:d.mode==='wide'?'ワイド':d.mode==='axis'?'3連複1頭軸':'3連複フォーメーション',
      candidates:candidates.map(serialize),
      picks:recommended.map((x,i)=>({...serialize(x),stake:alloc.st[i]})),
      total:alloc.total,
      candidateCount:candidates.length,
      recommendedCount:recommended.length,
      budgetCap:d.cap
    };
    try{lastBetPlan=plan}catch(_){};window.lastBetPlan=plan;
    try{window.dispatchEvent(new CustomEvent('keiba-bet-plan-updated',{detail:plan}))}catch(_){}
    return typeof currentTickets==='function'?currentTickets():plan.picks;
  }

  function install(){
    try{
      if(typeof generateTickets!=='function')return false;
      const wrapped=function(){try{return generate()}catch(e){console.warn('bet strategy v324',e);return []}};
      wrapped.__betStrategyV315=true;wrapped.__betStrategyV324=true;
      try{generateTickets=wrapped}catch(_){};window.generateTickets=wrapped;return true;
    }catch(_){return false}
  }
  let tries=0;const timer=setInterval(()=>{tries++;if(install()||tries>80)clearInterval(timer)},150);
  addEventListener('keiba-patches-ready',()=>setTimeout(install,0),{once:true});
})();

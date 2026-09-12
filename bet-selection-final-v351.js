(()=>{
  if(window.__betSelectionFinalV351)return;
  window.__betSelectionFinalV351=true;

  const el=id=>document.getElementById(id);
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const keyNums=arr=>(arr||[]).map(Number).filter(Number.isFinite).sort((a,b)=>a-b).join('-');
  const combos=(arr,n)=>{const out=[];const rec=(st,p)=>{if(p.length===n){out.push(p);return}for(let i=st;i<arr.length;i++)rec(i+1,[...p,arr[i]])};rec(0,[]);return out};
  const hs=()=>{try{return Array.isArray(evaluated)?evaluated.slice(0,Math.min(6,evaluated.length)):[]}catch(_){return[]}};
  const trioOdds=c=>{try{const o=Number(trioOddsFor(c));return Number.isFinite(o)&&o>0?o:null}catch(_){return null}};

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
    return {strong,chaos,severe};
  }

  function budget(){
    const raw=String(el('budget')?.value||'').trim();
    const fixed=raw!==''&&Number(raw)>0;
    return {fixed,cap:fixed?Math.max(100,Math.floor(Number(raw)/100)*100):null};
  }

  function decide(){
    const b=budget(),s=shape();
    if(!b.fixed){if(s.severe)return {mode:'wide',cap:500};if(s.strong)return {mode:'axis',cap:800};return {mode:'form',cap:s.chaos?900:800}}
    if(s.strong)return {mode:'axis',cap:b.cap};
    if(s.severe&&b.cap<=800)return {mode:'wide',cap:b.cap};
    if(s.chaos&&b.cap<=700)return {mode:'wide',cap:b.cap};
    return {mode:'form',cap:b.cap};
  }

  function item(c,a,cap){
    const rm=new Map(a.map((h,i)=>[+h.no,i]));
    const r=c.map(h=>rm.get(+h.no)??99).sort((x,y)=>x-y);
    const o=trioOdds(c);
    const hit=c.reduce((p,h)=>p*Math.max(.05,(+h.place||0)/100),1);
    const ai=c.reduce((s,h)=>s+(+h.score||0),0);
    const rankSum=r.reduce((s,v)=>s+v,0);
    const market=o?clamp(Math.log10(Math.max(1,o))*5,0,12):0;
    const profitBias=o?clamp(((o*100-cap)/Math.max(100,cap))*18,-20,18):0;
    return {c,r,o,key:keyNums(c.map(h=>h.no)),score:hit*520+ai*.48-rankSum*2.2+market+profitBias};
  }

  function scenarioOrder(pool){
    const groups={
      both:pool.filter(x=>x.r.includes(0)&&x.r.includes(1)),
      onlyA:pool.filter(x=>x.r.includes(0)&&!x.r.includes(1)),
      onlyB:pool.filter(x=>!x.r.includes(0)&&x.r.includes(1)),
      neither:pool.filter(x=>!x.r.includes(0)&&!x.r.includes(1))
    };
    Object.values(groups).forEach(g=>g.sort((a,b)=>b.score-a.score));
    const out=[],seen=new Set(),covered=new Map();
    const add=x=>{if(!x||seen.has(x.key))return;seen.add(x.key);out.push(x);x.r.forEach(v=>covered.set(v,(covered.get(v)||0)+1))};

    add(groups.both[0]);
    add(groups.onlyA[0]);
    add(groups.onlyB[0]);
    add(groups.neither[0]);

    while(out.length<pool.length){
      const remaining=pool.filter(x=>!seen.has(x.key));
      if(!remaining.length)break;
      const bonus=x=>x.r.reduce((s,v)=>{
        const count=covered.get(v)||0;
        return s+(count===0?45:count===1?10:0);
      },0);
      remaining.sort((a,b)=>(b.score+bonus(b))-(a.score+bonus(a)));
      add(remaining[0]);
    }
    return out;
  }

  function metrics(items,stakes,total){
    let red=0,deficit=0,worst=0;
    for(let i=0;i<items.length;i++){
      const o=+items[i].o||0;if(!o)continue;
      const d=Math.max(0,total-o*(+stakes[i]||0));
      if(d>0){red++;deficit+=d;worst=Math.max(worst,d)}
    }
    return {red,deficit,worst};
  }

  function allocate(items,cap){
    const st=new Array(items.length).fill(100);
    let total=items.length*100;
    if(total>=cap)return {st,total};
    const maxStake=300;
    let guard=0;
    while(total+100<=cap&&guard++<200){
      const now=metrics(items,st,total),opts=[];
      for(let i=0;i<items.length;i++){
        if(st[i]>=maxStake)continue;
        const next=st.slice();next[i]+=100;
        const m=metrics(items,next,total+100);
        opts.push({i,m,score:items[i].score,stake:st[i]});
      }
      if(!opts.length)break;
      opts.sort((a,b)=>a.m.red-b.m.red||a.m.worst-b.m.worst||a.m.deficit-b.m.deficit||a.stake-b.stake||b.score-a.score||a.i-b.i);
      const best=opts[0];
      if(best.m.red>now.red)break;
      st[best.i]+=100;total+=100;
    }
    return {st,total};
  }

  function serialize(x){return {numbers:x.c.map(h=>+h.no).sort((a,b)=>a-b),odds:x.o||null}}

  function generateForm(){
    try{if(typeof evalAll==='function')evalAll()}catch(_){}
    const a=hs();if(a.length<3)return [];
    const d=decide();
    if(d.mode!=='form')return null;

    const pool=combos(a,3).map(c=>item(c,a,d.cap));
    const ordered=scenarioOrder(pool);
    const buyCount=Math.min(ordered.length,Math.max(1,Math.floor(d.cap/100)));
    const selected=ordered.slice(0,buyCount);
    const alloc=allocate(selected,d.cap);
    const plan={
      type:'3連複フォーメーション',
      candidates:ordered.map(serialize),
      picks:selected.map((x,i)=>({...serialize(x),stake:alloc.st[i]})),
      total:alloc.total,
      candidateCount:ordered.length,
      recommendedCount:selected.length,
      budgetCap:d.cap,
      candidateModel:'6頭BOX全20候補',
      selectionModel:'AI期待度＋実3連複オッズ＋複数シナリオ',
      coverageFirst:true,
      finalBetLogic:'v351'
    };
    try{lastBetPlan=plan}catch(_){};window.lastBetPlan=plan;
    try{window.dispatchEvent(new CustomEvent('keiba-bet-plan-updated',{detail:plan}))}catch(_){}
    return typeof currentTickets==='function'?currentTickets():plan.picks;
  }

  function install(){
    const old=window.generateTickets;
    if(typeof old!=='function')return false;
    if(old.__betFinalV351)return true;
    const fn=function(...args){
      const d=decide();
      if(d.mode==='form'){
        const out=generateForm();
        if(out!==null)return out;
      }
      return old.apply(this,args);
    };
    try{Object.assign(fn,old)}catch(_){}
    fn.__betFinalV351=true;
    fn.__original=old;
    window.generateTickets=fn;try{generateTickets=fn}catch(_){}
    document.documentElement.dataset.betLogic='v351';
    return true;
  }

  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    install();
    if(tries>=16)clearInterval(timer);
  },120);
  setTimeout(install,360);
  addEventListener('keiba-patches-ready',()=>{setTimeout(install,220);setTimeout(install,520)});
})();
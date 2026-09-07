(()=>{
  if(window.__markedTicketConsistencyV310)return;
  window.__markedTicketConsistencyV310=true;

  const el=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const num=v=>Number.isFinite(+v)?+v:null;
  const key=ns=>(ns||[]).map(Number).filter(Number.isFinite).sort((a,b)=>a-b).join('-');
  const money=v=>Math.round(Number(v)||0).toLocaleString('ja-JP');

  function markedHorses(){
    try{return Array.isArray(evaluated)?evaluated.slice(0,Math.min(6,evaluated.length)):[]}catch(_){return[]}
  }

  function wideOdds(pair){
    try{const v=wideOddsFor(pair);return num(v)}catch(_){return null}
  }

  function pairUtility(pair,odds){
    const strength=pair.reduce((s,h)=>s+(+h.score||0)+(+h.place||0)*.20,0);
    const model=pair.reduce((s,h)=>s+Math.max(.04,(+h.place||0)/100),0)/2;
    const value=odds?Math.max(.55,Math.min(1.8,odds*model/3.0)):1;
    return strength*(odds?(1+Math.max(-.2,Math.min(.4,value-1))*.25):1);
  }

  function pairInfo(a,b){
    const pair=[a,b],odds=wideOdds(pair);
    return {pair,odds,utility:pairUtility(pair,odds),k:key(pair.map(h=>h.no))};
  }

  function requiredStake(total,odds){
    if(!(odds>0))return null;
    return Math.max(100,Math.ceil((total/odds)/100)*100);
  }

  function chooseWideStructure(marked,maxPoints=999){
    if(marked.length<2)return {selected:[],strategy:'—'};
    const top=marked[0],second=marked[1];
    const gap=(+top.score||0)-(+second.score||0);
    const placeGap=(+top.place||0)-(+second.place||0);
    const topDominant=gap>=5&&placeGap>=5;
    const desired=[];
    let strategy='';

    if(marked.length===2){
      desired.push(pairInfo(top,second));
      strategy='◎○本線';
    }else if(topDominant){
      for(const h of marked.slice(1))desired.push(pairInfo(top,h));
      strategy='◎中心';
    }else{
      desired.push(pairInfo(top,second));
      for(const h of marked.slice(2)){
        const a=pairInfo(top,h),b=pairInfo(second,h);
        desired.push(a.utility>=b.utility?a:b);
      }
      strategy='◎○中心';
    }

    const dedup=[];const seen=new Set();
    for(const p of desired){if(!seen.has(p.k)){seen.add(p.k);dedup.push(p)}}
    const limit=Math.max(1,Math.min(maxPoints,dedup.length));
    return {selected:dedup.slice(0,limit),strategy};
  }

  function rankOf(marked,h){
    const n=+h?.no;const i=marked.findIndex(x=>+x.no===n);return i<0?99:i;
  }

  function stakePriority(marked,x){
    const ranks=x.pair.map(h=>rankOf(marked,h)).sort((a,b)=>a-b);
    const core=ranks[0]===0&&ranks[1]===1;
    const worst=ranks[1]??99;
    const sum=(ranks[0]??99)+(ranks[1]??99);
    return (core?1e7:0)+(100-worst)*1e5+(200-sum)*1e3+(x.utility||0);
  }

  function autoStakes(marked,selected){
    if(!selected.length)return[];
    const stakes=new Array(selected.length).fill(100);
    const order=selected.map((x,idx)=>({idx,p:stakePriority(marked,x)})).sort((a,b)=>b.p-a.p);
    if(order[0])stakes[order[0].idx]=300;
    if(order[1])stakes[order[1].idx]=200;
    if(order[2])stakes[order[2].idx]=200;
    return stakes;
  }

  function fixedBudgetStakes(marked,selected,budget){
    if(!selected.length)return[];
    const stakes=new Array(selected.length).fill(100);
    let remaining=Math.max(0,budget-selected.length*100);
    const order=selected.map((x,idx)=>({idx,p:stakePriority(marked,x)})).sort((a,b)=>b.p-a.p);
    let i=0;
    while(remaining>=100&&order.length&&i<2000){
      stakes[order[i%Math.min(3,order.length)].idx]+=100;
      remaining-=100;i++;
    }
    return stakes;
  }

  function renderWidePlan(marked,selected,stakes,total,{fixedBudget,strategy}){
    const box=el('ticket');if(!box)return;
    const candidateNos=marked.map(h=>+h.no);
    const covered=new Set(selected.flatMap(x=>x.pair.map(h=>+h.no)));
    const allCovered=candidateNos.every(n=>covered.has(n));
    const rows=selected.map((x,i)=>{
      const stake=stakes[i]||100,odds=x.odds;
      const ret=odds?Math.round(odds*stake/10)*10:null;
      const net=ret==null?null:ret-total;
      let pay='';
      if(ret==null){
        pay='<span class="small" style="margin-left:8px;color:var(--w)">オッズ未取得</span>';
      }else{
        const min=requiredStake(total,odds);
        pay=`<span class="small" style="margin-left:8px">${odds.toFixed(1)}倍 / 払戻 ${money(ret)}円 / <b style="color:${net<0?'var(--d)':'var(--a)'}">${net<0?'−':'＋'}${money(Math.abs(net))}円</b>${net<0&&min?` / 黒字化 ${money(min)}円〜`:''}</span>`;
      }
      return `<div style="padding:8px 0;border-bottom:1px solid #2b4168"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><span><b>${esc(x.k)}</b>${pay}</span><b>${money(stake)}円</b></div></div>`;
    }).join('');
    const summary=`${esc(strategy)}・印${candidateNos.length}頭を${selected.length}点で${allCovered?'カバー':'優先カバー'}`;
    box.innerHTML=`<div class="card" style="margin-top:10px"><b class="good">ワイド・AI自動選定</b><div class="small" style="margin:8px 0 10px;line-height:1.55"><b>${summary}</b><br><span style="color:var(--s)">${candidateNos.join('・')}</span></div><div class="small" style="margin:8px 0"><b>購入内訳</b></div>${rows}<div style="margin-top:10px"><b>${selected.length}点 / ${fixedBudget?'合計':'AI推奨総額'} ${money(total)}円</b></div></div>`;
  }

  function repairWidePlan(){
    try{
      if(!lastBetPlan?.picks?.length||!String(lastBetPlan.type||'').includes('ワイド'))return false;
      const marked=markedHorses();if(marked.length<2)return false;
      const raw=String(el('budget')?.value||'').trim();
      const fixedBudget=raw!==''&&Number(raw)>0;
      const budget=fixedBudget?Math.max(100,Math.floor(Number(raw)/100)*100):null;
      const minFullPoints=Math.max(1,marked.length-1);
      const maxPoints=fixedBudget?Math.max(1,Math.floor(budget/100)):minFullPoints;
      const {selected,strategy}=chooseWideStructure(marked,maxPoints);
      if(!selected.length)return false;
      const stakes=fixedBudget?fixedBudgetStakes(marked,selected,budget):autoStakes(marked,selected);
      lastBetPlan.picks=selected.map((x,i)=>({numbers:x.pair.map(h=>+h.no).sort((a,b)=>a-b),stake:stakes[i]||100,odds:x.odds||null}));
      lastBetPlan.total=lastBetPlan.picks.reduce((s,p)=>s+(+p.stake||0),0);
      renderWidePlan(marked,selected,stakes,lastBetPlan.total,{fixedBudget,strategy});
      return true;
    }catch(e){console.warn('marked ticket consistency',e);return false}
  }

  function scoreText(v){return Number.isFinite(+v)&&+v>=0&&+v<=100?(+v).toFixed(1):'—'}

  function repairSectionalDisplay(){
    let hs=[];try{hs=Array.isArray(evaluated)?evaluated:[]}catch(_){return}
    const cards=[...document.querySelectorAll('#ranking .ranking-card')];
    cards.forEach((card,i)=>{
      const h=hs[i];if(!h)return;
      const row=[...card.querySelectorAll('.metric')].find(x=>String(x.querySelector('span')?.textContent||'').trim()==='上がり');
      const b=row?.querySelector('b');if(b){const v=scoreText(h.last3f);if(b.textContent!==v)b.textContent=v}
    });
    const rows=[...document.querySelectorAll('#rows tr')];
    rows.forEach((tr,i)=>{
      const h=hs[i];if(!h)return;
      const td=tr.querySelector('td[data-label="上がり"]');if(td){const v=scoreText(h.last3f);if(td.textContent!==v)td.textContent=v}
    });
  }

  function installTicketWrap(){
    try{
      if(typeof generateTickets!=='function'||generateTickets.__markedTicketConsistencyV310)return false;
      const previous=generateTickets;
      const wrapped=function(){const v=previous.apply(this,arguments);try{repairWidePlan()}catch(_){};return typeof currentTickets==='function'?currentTickets():v};
      wrapped.__markedTicketConsistencyV310=true;wrapped.__previous=previous;
      try{generateTickets=wrapped}catch(_){};try{window.generateTickets=wrapped}catch(_){}
      return true;
    }catch(e){console.warn('install marked ticket consistency',e);return false}
  }

  function installRenderWrap(name){
    try{
      const old=window[name];if(typeof old!=='function'||old.__sectionalDisplayV310)return;
      const fn=function(...args){const v=old.apply(this,args);queueMicrotask(repairSectionalDisplay);return v};
      fn.__sectionalDisplayV310=true;fn.__original=old;window[name]=fn;
      try{if(name==='renderAnalysis')renderAnalysis=fn;else if(name==='evalAll')evalAll=fn}catch(_){}
    }catch(_){}
  }

  let tries=0;const tick=()=>{tries++;if(!installTicketWrap()&&tries<40)setTimeout(tick,200)};tick();
  installRenderWrap('renderAnalysis');installRenderWrap('evalAll');
  addEventListener('keiba-data-updated',()=>setTimeout(repairSectionalDisplay,0));
  addEventListener('pageshow',()=>setTimeout(repairSectionalDisplay,0));
  setTimeout(repairSectionalDisplay,0);
})();
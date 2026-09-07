(()=>{
  if(window.__markedTicketConsistencyV308)return;
  window.__markedTicketConsistencyV308=true;

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

  function requiredStake(total,odds){
    if(!(odds>0))return null;
    return Math.max(100,Math.ceil((total/odds)/100)*100);
  }

  function allPairCandidates(marked){
    const out=[];
    for(let i=0;i<marked.length-1;i++)for(let j=i+1;j<marked.length;j++){
      const pair=[marked[i],marked[j]],odds=wideOdds(pair);
      out.push({pair,odds,utility:pairUtility(pair,odds),k:key(pair.map(h=>h.no))});
    }
    return out;
  }

  function subsets(arr,k){
    const out=[];
    const rec=(start,p)=>{
      if(p.length===k){out.push(p.slice());return}
      for(let i=start;i<arr.length;i++)rec(i+1,[...p,arr[i]]);
    };
    rec(0,[]);return out;
  }

  function chooseWidePairs(marked,count){
    const pairs=allPairCandidates(marked);
    if(!pairs.length||count<1)return[];
    const target=Math.min(count,pairs.length);
    const markedNos=new Set(marked.map(h=>+h.no));
    let best=null;

    // 印馬のカバーを最優先。収支見込みは候補削除条件に使わない。
    if(pairs.length<=20&&target<=6){
      for(const set of subsets(pairs,target)){
        const covered=new Set(set.flatMap(x=>x.pair.map(h=>+h.no)));
        const allCovered=[...markedNos].every(n=>covered.has(n));
        const known=set.filter(x=>x.odds>0).length;
        const util=set.reduce((s,x)=>s+x.utility,0);
        const score=(allCovered?1e9:0)+covered.size*1e6+known*1e3+util;
        if(!best||score>best.score)best={set,score,covered,allCovered};
      }
    }
    if(best?.set?.length)return best.set.slice().sort((a,b)=>b.utility-a.utility);

    const selected=[],uncovered=new Set(markedNos),pool=pairs.slice();
    while(selected.length<target&&pool.length){
      pool.sort((a,b)=>{
        const ca=a.pair.filter(h=>uncovered.has(+h.no)).length;
        const cb=b.pair.filter(h=>uncovered.has(+h.no)).length;
        if(cb!==ca)return cb-ca;
        return b.utility-a.utility;
      });
      const p=pool.shift();selected.push(p);p.pair.forEach(h=>uncovered.delete(+h.no));
    }
    return selected;
  }

  function allocateStakes(selected,total){
    if(!selected.length)return[];
    const stakes=new Array(selected.length).fill(100);
    let remaining=Math.max(0,total-selected.length*100),i=0;
    const order=selected.map((x,idx)=>({idx,u:x.utility})).sort((a,b)=>b.u-a.u);
    while(remaining>=100&&order.length&&i<1000){
      stakes[order[i%Math.min(3,order.length)].idx]+=100;
      remaining-=100;i++;
    }
    return stakes;
  }

  function renderWidePlan(marked,selected,stakes,total){
    const box=el('ticket');if(!box)return;
    const candidateNos=marked.map(h=>+h.no);
    const covered=new Set(selected.flatMap(x=>x.pair.map(h=>+h.no)));
    const rows=selected.map((x,i)=>{
      const stake=stakes[i]||100,odds=x.odds;
      const ret=odds?Math.round(odds*stake/10)*10:null;
      const net=ret==null?null:ret-total;
      let pay='';
      if(ret==null){
        pay='<span class="small" style="margin-left:8px;color:var(--w)">オッズ未取得</span>';
      }else{
        const min=requiredStake(total,odds);
        pay=`<span class="small" style="margin-left:8px">${odds.toFixed(1)}倍 / 払戻目安 ${money(ret)}円 / <b style="color:${net<0?'var(--d)':'var(--a)'}">${net<0?'−':'＋'}${money(Math.abs(net))}円</b>${net<0&&min?` / 黒字化目安 ${money(min)}円以上`:''}</span>`;
      }
      return `<div style="padding:6px 0;border-bottom:1px solid #2b4168"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><span>${esc(x.k)}${pay}</span><b>${money(stake)}円</b></div></div>`;
    }).join('');
    const allCovered=candidateNos.every(n=>covered.has(n));
    box.innerHTML=`<div class="card" style="margin-top:10px"><b class="good">ワイド・AI自動選定</b><div class="card" style="margin:10px 0;background:#0c172a"><div><b>ワイド候補</b>：${candidateNos.join('・')} <span class="small">（印6頭）</span></div></div><div class="small" style="margin:8px 0 10px"><b>AI判断：混戦</b><br>${allCovered?'印6頭すべてを実際の買い目でカバー':'点数内で印馬を最大限カバー'}。赤字見込みでも自動削除せず、払戻目安と黒字化目安だけ表示します。</div><div class="small" style="margin:8px 0"><b>購入内訳</b></div>${rows}<div style="margin-top:10px"><b>${selected.length}点 / 合計 ${money(total)}円</b></div></div>`;
  }

  function repairWidePlan(){
    try{
      if(!lastBetPlan?.picks?.length||!String(lastBetPlan.type||'').includes('ワイド'))return false;
      const marked=markedHorses();if(marked.length<2)return false;
      const old=lastBetPlan.picks.slice();
      const total=Math.max(old.length*100,+lastBetPlan.total||old.reduce((s,p)=>s+(+p.stake||100),0));
      const selected=chooseWidePairs(marked,old.length);if(!selected.length)return false;
      const stakes=allocateStakes(selected,total);
      lastBetPlan.picks=selected.map((x,i)=>({numbers:x.pair.map(h=>+h.no).sort((a,b)=>a-b),stake:stakes[i]||100,odds:x.odds||null}));
      lastBetPlan.total=lastBetPlan.picks.reduce((s,p)=>s+(+p.stake||0),0);
      renderWidePlan(marked,selected,stakes,lastBetPlan.total);
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
      if(typeof generateTickets!=='function'||generateTickets.__markedTicketConsistencyV308)return false;
      const previous=generateTickets;
      const wrapped=function(){const v=previous.apply(this,arguments);try{repairWidePlan()}catch(_){};return typeof currentTickets==='function'?currentTickets():v};
      wrapped.__markedTicketConsistencyV308=true;wrapped.__previous=previous;
      try{generateTickets=wrapped}catch(_){};try{window.generateTickets=wrapped}catch(_){}
      return true;
    }catch(e){console.warn('install marked ticket consistency',e);return false}
  }

  function installRenderWrap(name){
    try{
      const old=window[name];if(typeof old!=='function'||old.__sectionalDisplayV308)return;
      const fn=function(...args){const v=old.apply(this,args);queueMicrotask(repairSectionalDisplay);return v};
      fn.__sectionalDisplayV308=true;fn.__original=old;window[name]=fn;
      try{if(name==='renderAnalysis')renderAnalysis=fn;else if(name==='evalAll')evalAll=fn}catch(_){}
    }catch(_){}
  }

  let tries=0;const tick=()=>{tries++;if(!installTicketWrap()&&tries<40)setTimeout(tick,200)};tick();
  installRenderWrap('renderAnalysis');installRenderWrap('evalAll');
  addEventListener('keiba-data-updated',()=>setTimeout(repairSectionalDisplay,0));
  addEventListener('pageshow',()=>setTimeout(repairSectionalDisplay,0));
  setTimeout(repairSectionalDisplay,0);
})();
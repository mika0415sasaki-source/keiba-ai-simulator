(()=>{
  if(window.__betWideCandidatesV323)return;
  window.__betWideCandidatesV323=true;

  const num=v=>Number.isFinite(+v)?+v:null;
  const key=nums=>(nums||[]).map(Number).filter(Number.isFinite).sort((a,b)=>a-b).join('-');
  const getEval=()=>{try{return Array.isArray(evaluated)?evaluated.slice(0,6):[]}catch(_){return[]}};
  const oddsFor=nums=>{
    try{
      const a=getEval(),m=new Map(a.map(h=>[+h.no,h]));
      const c=nums.map(n=>m.get(+n)).filter(Boolean);
      if(c.length!==2)return null;
      return num(wideOddsFor(c));
    }catch(_){return null}
  };

  function expandWideCandidates(){
    let plan=null;
    try{plan=lastBetPlan||window.lastBetPlan}catch(_){plan=window.lastBetPlan}
    if(!plan||!String(plan.type||'').includes('ワイド'))return false;
    const a=getEval();
    if(a.length<3)return false;

    const centers=a.slice(0,2).map(h=>+h.no),others=a.slice(2).map(h=>+h.no);
    const full=[];
    if(centers.length===2)full.push([centers[0],centers[1]]);
    for(const h of others){for(const c of centers)full.push([c,h])}

    const old=Array.isArray(plan.candidates)?plan.candidates:[];
    const oldMap=new Map(old.map(c=>[key(c.numbers),c]));
    const pickMap=new Map((plan.picks||[]).map(p=>[key(p.numbers),p]));
    const seen=new Set(),merged=[];

    // 既存順序は絶対に変えない。既存候補を残した上で、未表示候補だけ末尾へ追加。
    for(const c of old){const k=key(c.numbers);if(!k||seen.has(k))continue;seen.add(k);merged.push(c)}
    for(const nums of full){
      const k=key(nums);if(!k||seen.has(k))continue;
      seen.add(k);
      const p=pickMap.get(k),o=+(p?.odds||0)||oddsFor(nums)||null;
      merged.push({numbers:nums.slice().sort((x,y)=>x-y),odds:o});
    }

    if(merged.length===old.length)return false;
    plan.candidates=merged;
    plan.candidateCount=merged.length;
    try{lastBetPlan=plan}catch(_){};window.lastBetPlan=plan;
    try{window.dispatchEvent(new CustomEvent('keiba-bet-plan-updated',{detail:plan}))}catch(_){}
    return true;
  }

  function install(){
    const g=window.generateTickets;
    if(typeof g!=='function'||g.__betWideCandidatesV323)return false;
    const wrapped=function(...args){
      const out=g.apply(this,args);
      setTimeout(expandWideCandidates,0);
      return out;
    };
    try{Object.assign(wrapped,g)}catch(_){}
    wrapped.__betWideCandidatesV323=true;
    try{generateTickets=wrapped}catch(_){};window.generateTickets=wrapped;
    return true;
  }

  let tries=0;
  const timer=setInterval(()=>{tries++;if(install()||tries>120)clearInterval(timer)},100);
  addEventListener('keiba-patches-ready',()=>{setTimeout(install,20);setTimeout(expandWideCandidates,80)},{once:true});
})();

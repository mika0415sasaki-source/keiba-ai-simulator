(()=>{
  if(window.__probabilityNormalizationV335)return;
  window.__probabilityNormalizationV335=true;

  const WITHDRAWN=/取消|出走取消|競走除外|除外|競走中止|中止|失格/;
  const tenth=v=>Math.round(v*10)/10;
  const activeRows=arr=>(Array.isArray(arr)?arr:[]).filter(h=>h&&!WITHDRAWN.test(String(h?.status||h?.result_status||h?.rank_text||'')));

  function normalizeRounded(rows,key,target){
    const n=rows.length;
    if(!n||!(target>0))return;
    const raw=rows.map(h=>Math.max(0.001,Number(h?.[key])||0.001));
    const exact=new Array(n).fill(0);
    let open=raw.map((_,i)=>i);
    let remaining=target;

    // Proportional normalization with a hard 100% ceiling.
    while(open.length){
      const sum=open.reduce((s,i)=>s+raw[i],0)||open.length;
      let capped=false;
      for(const i of [...open]){
        const v=remaining*(sum?raw[i]/sum:1/open.length);
        if(v>100){
          exact[i]=100;
          remaining-=100;
          open=open.filter(j=>j!==i);
          capped=true;
        }
      }
      if(!capped){
        const denom=open.reduce((s,i)=>s+raw[i],0)||open.length;
        for(const i of open)exact[i]=remaining*(denom?raw[i]/denom:1/open.length);
        break;
      }
    }

    // Keep displayed values mathematically exact to 0.1% as well.
    const targetUnits=Math.round(target*10);
    const units=exact.map(v=>Math.floor(Math.max(0,Math.min(100,v))*10+1e-9));
    let left=targetUnits-units.reduce((s,v)=>s+v,0);
    const order=exact.map((v,i)=>({i,frac:v*10-units[i]})).sort((a,b)=>b.frac-a.frac||a.i-b.i);
    let guard=0;
    while(left>0&&guard<10000){
      let moved=false;
      for(const o of order){
        if(left<=0)break;
        if(units[o.i]<1000){units[o.i]++;left--;moved=true}
      }
      if(!moved)break;
      guard++;
    }
    while(left<0&&guard<20000){
      let moved=false;
      for(const o of [...order].reverse()){
        if(left>=0)break;
        if(units[o.i]>0){units[o.i]--;left++;moved=true}
      }
      if(!moved)break;
      guard++;
    }
    rows.forEach((h,i)=>{h[key]=tenth(units[i]/10)});
  }

  function normalizeEvaluated(){
    let arr=[];
    try{arr=Array.isArray(evaluated)?evaluated:[]}catch(_){return false}
    const rows=activeRows(arr);
    if(rows.length<2)return false;

    // 1着はレース全体で必ず100%。3着内は3着までなので通常300%。
    normalizeRounded(rows,'winP',100);
    normalizeRounded(rows,'place',Math.min(3,rows.length)*100);

    for(const h of rows){
      const winP=Number(h.winP)||0;
      const odds=Number(h.winOdds)||0;
      const fair=winP>0?100/winP:null;
      h.fairOdds=fair;
      h.valueIndex=odds>0&&fair?odds/fair:1;
      h.probabilityNormalizedV335=true;
    }
    document.documentElement.dataset.probabilityNormalization='v335';
    document.documentElement.dataset.winProbabilityTotal=tenth(rows.reduce((s,h)=>s+(Number(h.winP)||0),0)).toFixed(1);
    document.documentElement.dataset.placeProbabilityTotal=tenth(rows.reduce((s,h)=>s+(Number(h.place)||0),0)).toFixed(1);
    return true;
  }

  function rerender(){
    try{if(typeof renderAnalysis==='function')renderAnalysis()}catch(e){console.warn('v335 render',e)}
  }

  function wrapEval(){
    try{
      const old=window.evalAll;
      if(typeof old!=='function'||old.__probNormV335)return;
      const fn=function(...args){
        const out=old.apply(this,args);
        normalizeEvaluated();
        rerender();
        return out;
      };
      fn.__probNormV335=true;
      fn.__original=old;
      window.evalAll=fn;
      try{evalAll=fn}catch(_){}
    }catch(e){console.warn('v335 wrap evalAll',e)}
  }

  function settle(){
    wrapEval();
    if(normalizeEvaluated())rerender();
  }

  addEventListener('keiba-data-updated',()=>setTimeout(settle,120));
  addEventListener('pageshow',()=>setTimeout(settle,0));
  setTimeout(settle,0);
})();

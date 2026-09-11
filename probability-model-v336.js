(()=>{
  if(window.__probabilityModelV336)return;
  window.__probabilityModelV336=true;

  const WITHDRAWN=/取消|出走取消|競走除外|除外|競走中止|中止|失格/;
  const T=5.0;
  const AI_WEIGHT=0.70;
  const MARKET_WEIGHT=0.30;
  const tenth=v=>Math.round(v*10)/10;
  const activeRows=arr=>(Array.isArray(arr)?arr:[]).filter(h=>h&&!WITHDRAWN.test(String(h?.status||h?.result_status||h?.rank_text||'')));

  function roundToTarget(values,target,maxEach=100){
    const n=values.length;
    if(!n)return [];
    const scale=values.reduce((s,v)=>s+Math.max(0,Number(v)||0),0);
    const exact=scale>0?values.map(v=>Math.max(0,Number(v)||0)*target/scale):values.map(()=>target/n);
    const targetUnits=Math.round(target*10);
    const units=exact.map(v=>Math.floor(Math.min(maxEach,Math.max(0,v))*10+1e-9));
    let left=targetUnits-units.reduce((s,v)=>s+v,0);
    const order=exact.map((v,i)=>({i,frac:v*10-units[i]})).sort((a,b)=>b.frac-a.frac||a.i-b.i);
    let guard=0;
    while(left>0&&guard++<10000){
      let moved=false;
      for(const o of order){
        if(left<=0)break;
        if(units[o.i]<maxEach*10){units[o.i]++;left--;moved=true}
      }
      if(!moved)break;
    }
    while(left<0&&guard++<20000){
      let moved=false;
      for(const o of [...order].reverse()){
        if(left>=0)break;
        if(units[o.i]>0){units[o.i]--;left++;moved=true}
      }
      if(!moved)break;
    }
    return units.map(u=>tenth(u/10));
  }

  function aiShares(rows){
    const scores=rows.map(h=>Number(h?.score)).filter(Number.isFinite);
    const max=scores.length?Math.max(...scores):0;
    const raw=rows.map(h=>{
      const s=Number(h?.score);
      return Number.isFinite(s)?Math.exp((s-max)/T):1;
    });
    const sum=raw.reduce((a,b)=>a+b,0)||1;
    return raw.map(v=>v/sum);
  }

  function marketShares(rows,ai){
    const raw=rows.map(h=>{
      const o=Number(h?.winOdds);
      return Number.isFinite(o)&&o>1?1/o:0;
    });
    const known=raw.reduce((n,v)=>n+(v>0?1:0),0);
    if(known<Math.max(3,Math.ceil(rows.length*.6)))return null;

    // Missing market rows inherit their AI share at the market pool's average scale.
    const knownRaw=raw.reduce((s,v)=>s+v,0);
    const knownAi=ai.reduce((s,v,i)=>s+(raw[i]>0?v:0),0);
    const scale=knownAi>0?knownRaw/knownAi:1;
    const filled=raw.map((v,i)=>v>0?v:ai[i]*scale);
    const sum=filled.reduce((a,b)=>a+b,0)||1;
    return filled.map(v=>v/sum);
  }

  function blendedStrength(rows){
    const ai=aiShares(rows);
    const market=marketShares(rows,ai);
    const strength=market?ai.map((v,i)=>v*AI_WEIGHT+market[i]*MARKET_WEIGHT):ai;
    const sum=strength.reduce((a,b)=>a+b,0)||1;
    return {strength:strength.map(v=>v/sum),hasMarket:!!market,ai,market};
  }

  function top3Probabilities(w){
    const n=w.length,W=w.reduce((a,b)=>a+b,0)||1,out=new Array(n).fill(0);
    for(let i=0;i<n;i++){
      const wi=w[i];
      let p=wi/W;
      for(let j=0;j<n;j++){
        if(j===i)continue;
        const d2=W-w[j];
        if(d2<=0)continue;
        const pj=w[j]/W;
        p+=pj*wi/d2;
        for(let k=0;k<n;k++){
          if(k===i||k===j)continue;
          const d3=d2-w[k];
          if(d3<=0)continue;
          p+=pj*(w[k]/d2)*(wi/d3);
        }
      }
      out[i]=Math.max(0,Math.min(1,p));
    }
    return out;
  }

  function applyProbabilityModel(){
    let arr=[];
    try{arr=Array.isArray(evaluated)?evaluated:[]}catch(_){return false}
    const rows=activeRows(arr);
    if(rows.length<2)return false;

    const {strength,hasMarket}=blendedStrength(rows);
    const winDisplay=roundToTarget(strength.map(v=>v*100),100,100);
    const placeRaw=top3Probabilities(strength).map(v=>v*100);
    const placeDisplay=roundToTarget(placeRaw,Math.min(3,rows.length)*100,100);

    rows.forEach((h,i)=>{
      h.winP=winDisplay[i];
      h.place=placeDisplay[i];
      const odds=Number(h.winOdds)||0;
      h.fairOdds=h.winP>0?100/h.winP:null;
      h.valueIndex=odds>0&&h.fairOdds?odds/h.fairOdds:1;
      h.probabilityModelV336=true;
      h.probabilitySourceV336=hasMarket?'AI70%+市場30%':'AI100%';
    });

    document.documentElement.dataset.probabilityNormalization='v336';
    document.documentElement.dataset.probabilityModel='ai-market-pl-v336';
    document.documentElement.dataset.winProbabilityTotal=tenth(rows.reduce((s,h)=>s+(Number(h.winP)||0),0)).toFixed(1);
    document.documentElement.dataset.placeProbabilityTotal=tenth(rows.reduce((s,h)=>s+(Number(h.place)||0),0)).toFixed(1);
    document.documentElement.dataset.probabilityMarketBlend=hasMarket?'30':'0';
    return true;
  }

  function patchEvidence(){
    const box=document.getElementById('evidence');
    if(!box)return;
    let d=box.querySelector('[data-prob-v336]');
    if(!d){
      d=document.createElement('div');
      d.dataset.probV336='1';
      d.style.marginTop='10px';
      box.appendChild(d);
    }
    const market=document.documentElement.dataset.probabilityMarketBlend==='30';
    d.innerHTML=`<b>確率モデル v336：</b> AI指数をレース内の相対勝率へ変換し、${market?'単勝市場を30%だけ補助':'オッズ未取得のためAIのみ'}で補正。3着内率は同じ強さから着順を順次抽選するモデルで算出し、全頭合計は1着100%・3着内300%に整合。`;
  }

  function rerender(){
    try{if(typeof renderAnalysis==='function')renderAnalysis()}catch(e){console.warn('v336 render',e)}
    patchEvidence();
  }

  function wrapEval(){
    try{
      const old=window.evalAll;
      if(typeof old!=='function'||old.__probModelV336)return;
      const fn=function(...args){
        const out=old.apply(this,args);
        applyProbabilityModel();
        rerender();
        return out;
      };
      fn.__probModelV336=true;
      fn.__original=old;
      window.evalAll=fn;
      try{evalAll=fn}catch(_){}
    }catch(e){console.warn('v336 wrap evalAll',e)}
  }

  function settle(){
    wrapEval();
    if(applyProbabilityModel())rerender();
  }

  addEventListener('keiba-data-updated',()=>setTimeout(settle,180));
  addEventListener('pageshow',()=>setTimeout(settle,0));
  setTimeout(settle,0);
})();

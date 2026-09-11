(()=>{
  if(window.__rankingProbabilitySeparationV337)return;
  window.__rankingProbabilitySeparationV337=true;

  const BAD=/取消|出走取消|競走除外|除外|競走中止|中止|失格/;
  const AI_WEIGHT=.70, MARKET_WEIGHT=.30, T=5.0;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const tenth=v=>Math.round(v*10)/10;
  const activeRows=arr=>(Array.isArray(arr)?arr:[]).filter(h=>h&&!BAD.test(String(h?.status||h?.result_status||h?.rank_text||'')));

  function marketAdjustment(h){
    const o=Number(h?.winOdds);
    if(!Number.isFinite(o)||o<=1)return 0;
    return clamp(((100/o)-10)*.06,-1.2,1.8);
  }

  // v55本体ではAI指数へ単勝オッズ由来の微補正が入るため、ここで除外する。
  // 以後のAI順位は能力・適性だけ、確率だけが市場を補助情報として使う。
  function separateAiScore(){
    let arr=[];try{arr=Array.isArray(evaluated)?evaluated:[]}catch(_){return []}
    const rows=activeRows(arr);
    rows.forEach(h=>{
      if(h?.rankingProbabilitySeparationV337)return;
      const before=Number(h?.score),adj=marketAdjustment(h);
      if(Number.isFinite(before)){
        h.scoreBeforeMarketV337=before;
        h.marketScoreAdjustmentV337=adj;
        h.score=tenth(clamp(before-adj,0,100));
        h.aiScoreV337=h.score;
      }
      h.rankingProbabilitySeparationV337=true;
    });
    arr.sort((a,b)=>(Number(b?.score)||0)-(Number(a?.score)||0)||(+a?.no||999)-(+b?.no||999));
    return activeRows(arr);
  }

  function roundToTarget(values,target,maxEach=100){
    const n=values.length;if(!n)return [];
    const sum=values.reduce((s,v)=>s+Math.max(0,Number(v)||0),0);
    const exact=sum>0?values.map(v=>Math.max(0,Number(v)||0)*target/sum):values.map(()=>target/n);
    const targetUnits=Math.round(target*10);
    const units=exact.map(v=>Math.floor(Math.min(maxEach,Math.max(0,v))*10+1e-9));
    let left=targetUnits-units.reduce((s,v)=>s+v,0);
    const order=exact.map((v,i)=>({i,frac:v*10-units[i]})).sort((a,b)=>b.frac-a.frac||a.i-b.i);
    let guard=0;
    while(left>0&&guard++<10000){let moved=false;for(const o of order){if(left<=0)break;if(units[o.i]<maxEach*10){units[o.i]++;left--;moved=true}}if(!moved)break}
    while(left<0&&guard++<20000){let moved=false;for(const o of [...order].reverse()){if(left>=0)break;if(units[o.i]>0){units[o.i]--;left++;moved=true}}if(!moved)break}
    return units.map(u=>tenth(u/10));
  }

  function aiShares(rows){
    const scores=rows.map(h=>Number(h?.score)).filter(Number.isFinite),max=scores.length?Math.max(...scores):0;
    const raw=rows.map(h=>{const s=Number(h?.score);return Number.isFinite(s)?Math.exp((s-max)/T):1});
    const sum=raw.reduce((a,b)=>a+b,0)||1;
    return raw.map(v=>v/sum);
  }

  function marketShares(rows,ai){
    const raw=rows.map(h=>{const o=Number(h?.winOdds);return Number.isFinite(o)&&o>1?1/o:0});
    const known=raw.reduce((n,v)=>n+(v>0?1:0),0);
    if(known<Math.max(3,Math.ceil(rows.length*.6)))return null;
    const knownRaw=raw.reduce((s,v)=>s+v,0),knownAi=ai.reduce((s,v,i)=>s+(raw[i]>0?v:0),0),scale=knownAi>0?knownRaw/knownAi:1;
    const filled=raw.map((v,i)=>v>0?v:ai[i]*scale),sum=filled.reduce((a,b)=>a+b,0)||1;
    return filled.map(v=>v/sum);
  }

  function top3Probabilities(w){
    const n=w.length,W=w.reduce((a,b)=>a+b,0)||1,out=new Array(n).fill(0);
    for(let i=0;i<n;i++){
      const wi=w[i];let p=wi/W;
      for(let j=0;j<n;j++){
        if(j===i)continue;
        const d2=W-w[j];if(d2<=0)continue;
        const pj=w[j]/W;p+=pj*wi/d2;
        for(let k=0;k<n;k++){
          if(k===i||k===j)continue;
          const d3=d2-w[k];if(d3<=0)continue;
          p+=pj*(w[k]/d2)*(wi/d3);
        }
      }
      out[i]=Math.max(0,Math.min(1,p));
    }
    return out;
  }

  function recalcProbabilities(rows){
    if(rows.length<2)return false;
    const ai=aiShares(rows),market=marketShares(rows,ai);
    const strength=market?ai.map((v,i)=>v*AI_WEIGHT+market[i]*MARKET_WEIGHT):ai;
    const sum=strength.reduce((a,b)=>a+b,0)||1,normalized=strength.map(v=>v/sum);
    const win=roundToTarget(normalized.map(v=>v*100),100,100);
    const place=roundToTarget(top3Probabilities(normalized).map(v=>v*100),Math.min(3,rows.length)*100,100);
    rows.forEach((h,i)=>{
      h.winP=win[i];h.place=place[i];
      h.fairOdds=h.winP>0?100/h.winP:null;
      const o=Number(h?.winOdds)||0;h.valueIndex=o>0&&h.fairOdds?o/h.fairOdds:1;
      h.probabilitySourceV337=market?'AI70%+単勝市場30%':'AI100%';
    });
    const probOrder=[...rows].sort((a,b)=>(Number(b?.winP)||0)-(Number(a?.winP)||0)||(+a?.no||999)-(+b?.no||999));
    rows.forEach((h,i)=>h.aiRankV337=i+1);
    probOrder.forEach((h,i)=>h.probabilityRankV337=i+1);
    document.documentElement.dataset.rankingModel='ai-ability-only-v337';
    document.documentElement.dataset.probabilityModel='ai70-market30-v337';
    document.documentElement.dataset.probabilityMarketBlend=market?'30':'0';
    return true;
  }

  function annotateUi(){
    let rows=[];try{rows=activeRows(evaluated)}catch(_){return}
    if(!rows.length)return;
    const market=document.documentElement.dataset.probabilityMarketBlend==='30';
    const ranking=document.getElementById('ranking');
    if(ranking){
      const panel=ranking.closest('.panel');
      if(panel){
        let note=document.getElementById('rankingModelNoteV337');
        if(!note){
          note=document.createElement('div');
          note.id='rankingModelNoteV337';note.className='small';
          note.style.cssText='margin:-2px 0 10px;line-height:1.55;color:#9fb0cf';
          ranking.parentNode.insertBefore(note,ranking);
        }
        note.innerHTML=`<b style="color:#eef3ff">AI順位</b>＝能力・適性のみ　／　<b style="color:#eef3ff">1着率・3着内率</b>＝${market?'AI 70%＋単勝オッズ（人気）30%':'AI 100%（市場未取得）'}`;
      }
      const cards=[...ranking.querySelectorAll('.ranking-card')];
      cards.forEach((card,i)=>{
        const h=rows[i];if(!h)return;
        const rank=card.querySelector('.rank');
        if(rank){
          const mark=['◎','○','▲','△','☆','注'][i]||'';
          rank.textContent=`AI ${h.aiRankV337}位　${mark} ${h.no} ${h.name}`;
        }
        const details=card.querySelector('.ranking-card-details');
        if(details){
          const metrics=[...details.querySelectorAll('.metric')];
          const winMetric=metrics.find(x=>/1着率/.test(x.textContent||''));
          if(winMetric){const label=winMetric.querySelector('span');if(label)label.textContent=`1着率（確率${h.probabilityRankV337}位）`}
        }
      });
    }

    const tbody=document.getElementById('rows');
    if(tbody){
      [...tbody.querySelectorAll('tr')].forEach((tr,i)=>{
        const h=rows[i];if(!h)return;
        const rr=tr.querySelector('.comparison-rank');if(rr)rr.textContent=`AI ${h.aiRankV337}位`;
        const cells=[...tr.querySelectorAll('td')];
        const winCell=cells.find(td=>String(td.dataset?.label||'').includes('1着率'));
        if(winCell)winCell.dataset.label=`1着率（確率${h.probabilityRankV337}位）`;
      });
    }

    const evidence=document.getElementById('evidence');
    if(evidence){
      let d=evidence.querySelector('[data-rank-prob-v337]');
      if(!d){d=document.createElement('div');d.dataset.rankProbV337='1';d.style.marginTop='10px';evidence.appendChild(d)}
      d.innerHTML=`<b>順位・確率の分離 v337：</b> AI指数とAI順位から単勝市場の加点を除外。確率だけ${market?'AI70%＋単勝市場30%':'AI100%'}で算出するため、人気馬でも能力・適性が低ければAI順位は上がりません。`;
    }
  }

  function apply(){
    const rows=separateAiScore();
    if(!rows.length)return false;
    recalcProbabilities(rows);
    return true;
  }

  function renderAndAnnotate(){
    try{if(typeof renderAnalysis==='function')renderAnalysis()}catch(e){console.warn('v337 render',e)}
    annotateUi();
  }

  function wrapEval(){
    try{
      const old=window.evalAll;if(typeof old!=='function'||old.__rankProbV337)return;
      const fn=function(...args){const out=old.apply(this,args);if(apply())renderAndAnnotate();return out};
      fn.__rankProbV337=true;fn.__original=old;window.evalAll=fn;try{evalAll=fn}catch(_){}
    }catch(e){console.warn('v337 eval wrap',e)}
  }

  function wrapRender(){
    try{
      const old=window.renderAnalysis;if(typeof old!=='function'||old.__rankProbRenderV337)return;
      const fn=function(...args){const out=old.apply(this,args);queueMicrotask(annotateUi);return out};
      fn.__rankProbRenderV337=true;fn.__original=old;window.renderAnalysis=fn;try{renderAnalysis=fn}catch(_){}
    }catch(e){console.warn('v337 render wrap',e)}
  }

  function settle(){wrapEval();wrapRender();if(apply())renderAndAnnotate()}
  addEventListener('keiba-data-updated',()=>setTimeout(settle,220));
  addEventListener('pageshow',()=>setTimeout(settle,0));
  setTimeout(settle,0);
})();

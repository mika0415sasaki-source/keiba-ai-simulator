(()=>{
  if(window.__rankingProbabilitySeparationV337)return;
  window.__rankingProbabilitySeparationV337=true;

  const BAD=/取消|出走取消|競走除外|除外|競走中止|中止|失格/;
  const AI_WEIGHT=.70, MARKET_WEIGHT=.30, T=5.0;
  const PLACE_MODEL_WEIGHT=.85, PLACE_MARKET_WEIGHT=.15, PLACE_T=6.5;
  const RECENCY=[1,.82,.68,.56,.46];
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

  function horseSource(h){
    try{return (Array.isArray(horses)?horses:[]).find(x=>+x?.no===+h?.no||String(x?.name||'')===String(h?.name||''))||h}catch(_){return h}
  }

  // 3着内率は「勝ち切る強度」と分離し、近走の複勝圏実績・着順の安定度・
  // 評価軸の弱点を使う。取得済みデータだけを参照し、欠損は中立扱いにする。
  function placeProfile(h){
    const src=horseSource(h),history=(Array.isArray(src?.history)&&src.history.length?src.history:(Array.isArray(src?.jra_history)?src.jra_history:[])).slice(0,5);
    let inMoneyN=0,inMoneyD=0;const performances=[];
    history.forEach((r,i)=>{
      const rank=+r?.rank;if(!(Number.isFinite(rank)&&rank>0))return;
      const field=Math.max(rank,Number.isFinite(+r?.field_size)&&+r.field_size>=2?+r.field_size:16,2);
      const percentile=(rank-1)/Math.max(1,field-1);
      const performance=clamp(100-percentile*75,25,100);
      const inMoney=rank<=3?100:clamp(72-percentile*45,25,72);
      const w=RECENCY[i]||.4;
      inMoneyN+=inMoney*w;inMoneyD+=w;performances.push({value:performance,weight:w});
    });
    const inMoney=inMoneyD?inMoneyN/inMoneyD:65;
    let consistency=65;
    if(performances.length>=2){
      const wd=performances.reduce((s,x)=>s+x.weight,0)||1;
      const mean=performances.reduce((s,x)=>s+x.value*x.weight,0)/wd;
      const variance=performances.reduce((s,x)=>s+x.weight*(x.value-mean)**2,0)/wd;
      consistency=clamp(100-Math.sqrt(variance)*1.8,35,100);
    }
    const axes=[h?.speed,h?.course,h?.distance,h?.gradeScore];
    if((+h?.closingSamples||0)>0)axes.push(h?.last3f);
    const validAxes=axes.map(Number).filter(Number.isFinite);
    const balance=validAxes.length
      ? validAxes.reduce((s,v)=>s+v,0)/validAxes.length*.65+Math.min(...validAxes)*.35
      : 65;
    const ai=Number.isFinite(+h?.score)?+h.score:65;
    return clamp(ai*.50+inMoney*.30+consistency*.12+balance*.08,25,99);
  }

  function placeShares(rows){
    const scores=rows.map(placeProfile),max=scores.length?Math.max(...scores):0;
    const raw=scores.map(v=>Math.exp((v-max)/PLACE_T)),sum=raw.reduce((a,b)=>a+b,0)||1;
    rows.forEach((h,i)=>h.placeModelScoreV337=tenth(scores[i]));
    return raw.map(v=>v/sum);
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
    const winStrength=market?ai.map((v,i)=>v*AI_WEIGHT+market[i]*MARKET_WEIGHT):ai;
    const winSum=winStrength.reduce((a,b)=>a+b,0)||1,winNormalized=winStrength.map(v=>v/winSum);
    const placeAi=placeShares(rows);
    const placeStrength=market?placeAi.map((v,i)=>v*PLACE_MODEL_WEIGHT+market[i]*PLACE_MARKET_WEIGHT):placeAi;
    const placeSum=placeStrength.reduce((a,b)=>a+b,0)||1,placeNormalized=placeStrength.map(v=>v/placeSum);
    const win=roundToTarget(winNormalized.map(v=>v*100),100,100);
    const place=roundToTarget(top3Probabilities(placeNormalized).map(v=>v*100),Math.min(3,rows.length)*100,100);
    rows.forEach((h,i)=>{
      h.winP=win[i];h.place=place[i];
      h.fairOdds=h.winP>0?100/h.winP:null;
      const o=Number(h?.winOdds)||0;h.valueIndex=o>0&&h.fairOdds?o/h.fairOdds:1;
      h.probabilitySourceV337=market?'1着AI70%+単勝市場30%／3着内安定性85%+単勝市場15%':'1着AI100%／3着内安定性100%';
    });
    const probOrder=[...rows].sort((a,b)=>(Number(b?.winP)||0)-(Number(a?.winP)||0)||(+a?.no||999)-(+b?.no||999));
    const placeOrder=[...rows].sort((a,b)=>(Number(b?.place)||0)-(Number(a?.place)||0)||(Number(b?.score)||0)-(Number(a?.score)||0)||(+a?.no||999)-(+b?.no||999));
    rows.forEach((h,i)=>h.aiRankV337=i+1);
    probOrder.forEach((h,i)=>h.probabilityRankV337=i+1);
    placeOrder.forEach((h,i)=>h.placeProbabilityRankV337=i+1);
    document.documentElement.dataset.rankingModel='ai-ability-only-v337';
    document.documentElement.dataset.probabilityModel='win-ai70-market30-place-stability85-market15-v337';
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
        note.innerHTML=`<b style="color:#eef3ff">AI順位</b>＝能力・適性　／　<b style="color:#eef3ff">1着率</b>＝${market?'AI 70%＋単勝人気30%':'AI 100%'}　／　<b style="color:#eef3ff">3着内率</b>＝安定性モデル${market?'85%＋単勝人気15%':'100%（市場未取得）'}`;
      }
      const cards=[...ranking.querySelectorAll('.ranking-card')];
      cards.forEach((card,i)=>{
        const h=rows[i];if(!h)return;
        const rank=card.querySelector('.rank');
        if(rank){
          const mark=['◎','○','▲','△','☆','注'][(h.placeProbabilityRankV337||i+1)-1]||'';
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
      d.innerHTML=`<b>順位・確率の分離 v337：</b> AI指数は能力・適性のみ。1着率は勝ち切る強度、3着内率は直近5走の複勝圏実績・着順安定度・評価軸の弱点を加えた別モデルで算出します。`;
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

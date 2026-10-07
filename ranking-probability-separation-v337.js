(()=>{
  if(window.__rankingProbabilitySeparationV337)return;
  window.__rankingProbabilitySeparationV337=true;

  const BAD=/取消|出走取消|競走除外|除外|競走中止|中止|失格/;
  const AI_WEIGHT=.70, MARKET_WEIGHT=.30, T=5.0;
  const PLACE_MODEL_WEIGHT=.85, PLACE_MARKET_WEIGHT=.15, PLACE_T=6.5;
  const RECENCY=[1,.82,.68,.56,.46];
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const tenth=v=>Math.round(v*10)/10;
  // 近走の着順だけでなく、実際に走ったレース格も3着内率へ反映する。
  // 格そのものを別加点せず、着順評価へ25%だけ混ぜて低級条件の好走と重賞好走を区別する。
  const GRADE={G1:100,G2:94,G3:88,L:82,OP:78,'3勝':72,'2勝':66,'1勝':60,'未勝利':56,'新馬':54};
  const gradeOf=r=>{
    const s=String(r?.grade||r?.race_grade||r?.class_name||r?.race_class||r?.class||r?.race_name||r?.raceName||r?.title||r?.race||'').normalize('NFKC').toUpperCase().replace(/\\s+/g,'');
    if(/G3|GIII|JPN3|JPNIII/.test(s))return'G3';
    if(/G2|GII|JPN2|JPNII(?!I)/.test(s))return'G2';
    if(/G1|GI|JPN1|JPNI(?!I)/.test(s))return'G1';
    if(/リステッド|(^|[^A-Z])L([^A-Z]|$)/.test(s))return'L';
    if(/オープン|OPEN|OP/.test(s))return'OP';
    if(/3勝/.test(s))return'3勝';if(/2勝/.test(s))return'2勝';if(/1勝/.test(s))return'1勝';
    if(/未勝利/.test(s))return'未勝利';if(/新馬/.test(s))return'新馬';return'';
  };
  const gradeScore=r=>GRADE[gradeOf(r)]||68;
  const raceRating=r=>{
    const v=Number(r?.rating??r?.rt??r?.race_rating??r?.horse_rating);
    return Number.isFinite(v)&&v>=70&&v<=130?v:null;
  };
  const performanceStrength=(r,field=16)=>{
    const rank=+r?.rank;if(!Number.isFinite(rank)||rank<=0)return 65;
    const fs=Math.max(2,Number.isFinite(+r?.field_size)&&+r.field_size>=2?+r.field_size:field);
    const pct=(rank-1)/Math.max(1,fs-1);
    const finish=clamp(100-pct*75,25,100);
    const grade=gradeScore(r);
    const rt=raceRating(r);
    const ratingScore=rt==null?68:clamp(50+(rt-90)*2.0,30,100);
    return clamp(finish*.55+grade*.25+ratingScore*.20,25,100);
  };
  const activeRows=arr=>(Array.isArray(arr)?arr:[]).filter(h=>h&&!BAD.test(String(h?.status||h?.result_status||h?.rank_text||'')));

  // AI順位側にも、近走の「実績レース強度」を限定的に反映する。
  // 近走表示値そのものは変更せず、着順×レース格×取得済みレーティングから別軸を作る。
  // 欠損は中立値にし、特定馬名には依存しない。
  function recentRaceStrength(h){
    const src=horseSource(h);
    const hist=(Array.isArray(src?.history)&&src.history.length?src.history:(Array.isArray(src?.jra_history)?src.jra_history:[])).slice(0,5);
    let n=0,d=0;
    hist.forEach((r,i)=>{
      const rank=+r?.rank;
      if(!Number.isFinite(rank)||rank<=0)return;
      const field=Math.max(2,Number.isFinite(+r?.field_size)&&+r.field_size>=2?+r.field_size:16,rank);
      const value=performanceStrength(r,field);
      const w=RECENCY[i]||.4;
      n+=value*w;d+=w;
    });
    return d?clamp(n/d,25,99):65;
  }

  // 同じレースを実際に走った現出走馬同士の直接比較。
  // 特定の馬名を固定せず、履歴に同一レースが存在する組み合わせだけを使う。
  const raceKey=r=>{
    const id=String(r?.race_id||r?.raceId||r?.race_key||'').trim();
    const date=String(r?.date||r?.race_date||r?.raceDate||'').replace(/[^0-9]/g,'');
    const name=String(r?.race_name||r?.raceName||r?.title||'').normalize('NFKC').trim();
    const course=String(r?.course_name||r?.track||r?.venue||'').normalize('NFKC').trim();
    const dist=String(r?.distance||r?.dist||'').replace(/[^0-9]/g,'');
    if(id)return 'id|'+id;
    if(!date)return '';
    if(name)return [date,name,course,dist].join('|');
    if(course&&dist)return [date,course,dist].join('|');
    return '';
  };
  const headToHeadScore=(h,allRows)=>{
    const src=horseSource(h);
    const hist=(Array.isArray(src?.history)&&src.history.length?src.history:(Array.isArray(src?.jra_history)?src.jra_history:[])).slice(0,5);
    const out=[];
    (Array.isArray(allRows)?allRows:[]).forEach(other=>{
      if(other===h)return;
      const oh=horseSource(other);
      const ohist=Array.isArray(oh?.history)&&oh.history.length?oh.history:(Array.isArray(oh?.jra_history)?oh.jra_history:[]);
      hist.forEach(r=>{
        const myRank=+r?.rank;
        if(!Number.isFinite(myRank)||myRank<=0)return;
        const key=raceKey(r);if(!key)return;
        const mate=ohist.find(x=>raceKey(x)===key);
        const oppRank=+mate?.rank;
        if(!Number.isFinite(oppRank)||oppRank<=0)return;
        const field=Math.max(2,Number.isFinite(+r?.field_size)&&+r.field_size>=2?+r.field_size:(Number.isFinite(+mate?.field_size)&&+mate.field_size>=2?+mate.field_size:Math.max(myRank,oppRank,16)));
        const diff=(oppRank-myRank)/Math.max(1,field-1);
        const grade=Math.max(54,gradeScore(r));
        const w=(RECENCY[hist.indexOf(r)]||.4)*(grade/100);
        out.push({score:clamp(50+diff*30,25,75),weight:w});
      });
    });
    if(!out.length)return 65;
    const den=out.reduce((s,x)=>s+x.weight,0)||1;
    return clamp(out.reduce((s,x)=>s+x.score*x.weight,0)/den,25,75);
  };

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
        const raceStrength=recentRaceStrength(h);
        // 既存AI点を主軸(85%)に残し、実績レース強度を15%だけ補助する。
        // 近走・コース等の既存項目を壊さず、重賞好走と低級条件好走を区別する。
        h.raceStrengthV337=tenth(raceStrength);
        h.score=tenth(clamp(before*.85+raceStrength*.15-adj,0,100));
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
  // 3着内率は「勝ち切る強度」から明確に分離する。
  // 直近の複勝圏実績・安定度を最優先し、コース/距離/馬場/上がり適性を補助、
  // AI指数は最後の補助情報とする。脚質・展開の専用データは現行データ経路に
  // 安定して存在しないため、未取得を推測値で埋めず今回は加点しない。
  function placeHistory(h){
    const src=horseSource(h);
    const direct=Array.isArray(h?.history)&&h.history.length?h.history:Array.isArray(h?.jra_history)&&h.jra_history.length?h.jra_history:[];
    if(direct.length)return direct.slice(0,5);
    const srcRows=Array.isArray(src?.history)&&src.history.length?src.history:Array.isArray(src?.jra_history)?src.jra_history:[];
    if(srcRows.length)return srcRows.slice(0,5);
    try{
      const pool=Array.isArray(window.horses)?window.horses:[];
      const alt=pool.find(x=>+x?.no===+h?.no||String(x?.name||'')===String(h?.name||''));
      const rows=Array.isArray(alt?.history)&&alt.history.length?alt.history:(Array.isArray(alt?.jra_history)?alt.jra_history:[]);
      return rows.slice(0,5);
    }catch(_){return []}
  }
  function placeProfile(h,allRows){
    const src=horseSource(h),history=placeHistory(h);
    const headToHead=headToHeadScore(h,allRows);
    let inMoneyN=0,inMoneyD=0;const finishValues=[];
    history.forEach((r,i)=>{
      const rank=+r?.rank;if(!(Number.isFinite(rank)&&rank>0))return;
      const field=Math.max(rank,Number.isFinite(+r?.field_size)&&+r.field_size>=2?+r.field_size:16,2);
      const percentile=(rank-1)/Math.max(1,field-1);
      // 3着内率の主軸は「実際に3着以内へ入ったか」。
      // AI側のレース強度・レーティングはここでは混ぜず、着順事実を優先する。
      const rankInMoney=rank<=3?100:clamp(72-percentile*45,25,72);
      const finishScore=clamp(rankInMoney*.80+headToHead*.20,25,100);
      const w=RECENCY[i]||.4;
      inMoneyN+=rankInMoney*w;inMoneyD+=w;
      finishValues.push({value:finishScore,weight:w});
    });
    const inMoney=inMoneyD?inMoneyN/inMoneyD:65;
    let consistency=65;
    if(finishValues.length>=2){
      const wd=finishValues.reduce((s,x)=>s+x.weight,0)||1;
      const mean=finishValues.reduce((s,x)=>s+x.value*x.weight,0)/wd;
      const variance=finishValues.reduce((s,x)=>s+x.weight*(x.value-mean)**2,0)/wd;
      // 着順のブレが小さい馬ほど3着内率を高くする。
      consistency=clamp(100-Math.sqrt(variance)*2.2,35,100);
    }
    const axes=[h?.placeModelCourse,h?.placeModelDistance,h?.placeModelGoing];
    const fallbackAxes=[h?.course,h?.distance,h?.going];
    const validAxes=axes.map(Number).filter(Number.isFinite);
    const sourceAxes=validAxes.length?validAxes:fallbackAxes.map(Number).filter(Number.isFinite);
    const balance=sourceAxes.length
      ? sourceAxes.reduce((s,v)=>s+v,0)/sourceAxes.length*.60+Math.min(...sourceAxes)*.40
      : 65;
    const closing=Number.isFinite(+h?.placeModelLast3f)?+h.placeModelLast3f:((+h?.closingSamples||0)>0&&Number.isFinite(+h.last3f)?+h.last3f:65);
    const jockey=(()=>{
      try{
        const fn=window.jockeyComboScore;
        const v=typeof fn==='function'?fn(h):Number(h?.jockey_combo);
        return Number.isFinite(+v)?+v:65;
      }catch(_){return 65}
    })();
    const count=finishValues.length;
    const credibility=clamp(count/5,0,1);
    // 履歴が取得できている場合は、3着内実績を中立値へ薄めず主軸にする。
    // これにより「履歴があるのに全馬同じ→AI順位へフォールバック」という経路を防ぐ。
    const recent=history.length?clamp(inMoney,25,99):65;
    const stable=history.length?clamp(consistency,35,99):65;
    const components=[recent,stable,balance,closing,jockey]
      .map(v=>clamp(Number(v)||65,25,99));
    // 3着内率はAI指数を直接再利用せず、複勝圏実績・安定度を中心に
    // 適性4軸を補助として統合する。
    const geometric=Math.exp(
      components.reduce((s,v)=>s+Math.log(Math.max(1,v)),0)/components.length
    );
    const reliability=65+35*credibility;
    return clamp(
      geometric*credibility+65*(1-credibility)+
      (reliability-65)*.08,
      25,99
    );
  }
  function placeShares(rows){
    const scores=rows.map(h=>placeProfile(h,rows)),max=scores.length?Math.max(...scores):0;
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
      h.probabilitySourceV337=market?'1着AI70%+単勝市場30%／3着内モデル85%+単勝市場15%':'1着AI100%／3着内モデル100%';
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

  // 履歴再取得後にv57側がscoreを再計算するため、その直後からも順位・確率分離を再適用できる入口を公開する。\n  // 既存の分析式や市場補正は変更せず、最新scoreを入力として同じv337モデルを再計算する。\n  function refreshAfterHistory(){\n    try{\n      if(Array.isArray(evaluated))evaluated.forEach(h=>{try{delete h.rankingProbabilitySeparationV337}catch(_){} });\n      const rows=apply();\n      // v57の履歴再計算後に残る旧win値を使わず、v337が算出した1着率を最終値にする。\n      if(Array.isArray(rows))rows.forEach(h=>{\n        if(Number.isFinite(+h?.winP))h.win=+h.winP;\n        if(Number.isFinite(+h?.place))h.place=+h.place;\n      });\n      if(rows.length){try{if(typeof renderAnalysis==='function')renderAnalysis()}catch(_){};annotateUi()}\n      return rows;\n    }catch(e){console.warn('v337 history refresh',e);return []}\n  }\n  window.__refreshRankingProbabilityV337=refreshAfterHistory;\n\n  function annotateUi(){
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
        note.innerHTML=`<b style="color:#eef3ff">AI順位</b>＝能力・適性　／　<b style="color:#eef3ff">1着率</b>＝${market?'AI 70%＋単勝市場30%':'AI 100%'}　／　<b style="color:#eef3ff">3着内率</b>＝近走・安定度・コース/距離/馬場・上がり・騎手相性の別モデル${market?'＋単勝市場15%':'（市場未取得）'}`;
      }
      const cards=[...ranking.querySelectorAll('.ranking-card')];
      cards.forEach((card,i)=>{
        const h=rows[i];if(!h)return;
        const rank=card.querySelector('.rank');
        if(rank){
          const mark=['◎','○','▲','△','☆','注'][(h.placeProbabilityRankV337||i+1)-1]||'';
          rank.textContent=`AI ${h.aiRankV337}位　${mark} ${h.no} ${h.name}`;
        }
        // 順位バッジは1段だけ残す。旧表示処理とv345系の両方が走った場合に
        // 「AI順位・1着率・3着内率」と「1着率・3着内率」が二重表示されるため、
        // ranking-summary-main直下の重複する順位行だけを除去する。
        const summaryMain=card.querySelector('.ranking-summary-main');
        if(summaryMain){
          // 他の描画経路が順位バッジを後から内側へ追加しても、1段だけ残す。
          // 直下だけでなく配下の順位行も対象にし、同じ内容の重複表示を防ぐ。
          const rankRows=[...summaryMain.querySelectorAll('*')].filter(node=>{
            const t=String(node.textContent||'');
            return /1着率/.test(t)&&/3着内率/.test(t)&&node.children.length>=2;
          });
          const preferred=rankRows.find(node=>/AI順位/.test(String(node.textContent||'')))||rankRows[0];
          rankRows.forEach(node=>{if(node!==preferred)node.remove()});
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
      const diag=[...rows].sort((a,b)=>(Number(b?.placeModelScoreV337)||0)-(Number(a?.placeModelScoreV337)||0)||(+a?.no||999)-(+b?.no||999)).map(h=>`${h.no}:${tenth(Number(h.placeModelScoreV337)||0)}→${h.placeProbabilityRankV337}位`).join('　');
      d.innerHTML=`<b>順位・確率の分離 v337：</b> AI指数は能力・適性のみ。1着率は勝ち切る強度、3着内率は直近5走の複勝圏実績・着順安定度・コース/距離/馬場・上がり・騎手相性を別モデルで統合。単勝市場が取得できる場合のみ15%を補助的に加味。<br><small>内部3着内モデル：${diag}</small>`;
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

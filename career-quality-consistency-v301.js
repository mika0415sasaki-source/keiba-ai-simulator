(()=>{
  if(window.__careerQualityConsistencyV301)return;
  window.__careerQualityConsistencyV301=true;
  const el=id=>document.getElementById(id);
  const norm=s=>String(s||'').normalize('NFKC').replace(/[\s　]+/g,'').trim();
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const validLast3f=v=>{const n=Number(v);return Number.isFinite(n)&&n>=20&&n<=60?n:null};
  const CONF={0:0,1:48,2:61,3:74,4:87,5:100};
  const JRA_VENUES=new Set(['札幌','函館','福島','新潟','東京','中山','中京','京都','阪神','小倉']);
  function dateKey(v){const m=String(v||'').normalize('NFKC').replace(/[年月]/g,'-').replace(/日/g,'').match(/(20\d{2})[\/.-](\d{1,2})[\/.-](\d{1,2})/);return m?+m[1]*10000+(+m[2])*100+(+m[3]):null}
  function rowsOf(h){const rows=(Array.isArray(h?.history)&&h.history.length?h.history:(Array.isArray(h?.jra_history)?h.jra_history:[]));return rows.filter(r=>r&&!/取消|除外|中止|失格/.test(String(r.status||''))&&+r.rank>0).slice(0,5)}
  function earliest(rows){return rows.slice().sort((a,b)=>(dateKey(a?.date)||99999999)-(dateKey(b?.date)||99999999))[0]||null}
  function isDebut(r){const t=[r?.grade,r?.race_grade,r?.class_name,r?.race_class,r?.class,r?.race_name,r?.raceName,r?.title,r?.race].filter(Boolean).join(' ');return /新馬/.test(String(t))}
  function isForeignRun(r){const v=String(r?.venue||'').replace(/競馬場/g,'').trim();return !!v&&!JRA_VENUES.has(v)}
  function quality(h){
    const rows=rowsOf(h),n=rows.length;if(!n)return{score:0,n,career:false,label:'未取得',issues:[{date:'履歴',missing:['過去走未取得']}],excluded:[]};
    let have=0,total=0;const issues=[],excluded=[];
    for(const r of rows){
      const checks=[['着順',+r.rank>0],['競馬場',!!r.venue],['芝ダ',!!r.surface],['距離',Number.isFinite(+r.distance)&&+r.distance>0],['馬場',!!r.going],['騎手',!!r.jockey]],miss=[];
      if(validLast3f(r.last3f)!=null)checks.push(['上がり',true]);
      else if(isForeignRun(r))excluded.push({date:r.date||'過去走',field:'上がり',reason:'海外競走の取得元に数値なし'});
      else checks.push(['上がり',false]);
      for(const [k,ok] of checks){total++;if(ok)have++;else miss.push(k)}
      if(miss.length)issues.push({date:r.date||'過去走',missing:miss});
    }
    const career=n>=5||isDebut(earliest(rows)),fieldScore=Math.round(have/Math.max(1,total)*100),cap=career?100:(CONF[n]??100),score=Math.min(fieldScore,cap);
    if(!career&&n<5)issues.unshift({date:'履歴',missing:[`${n}/5走`]});
    const label=career&&n<5?`全キャリア${n}走`:(n>=5?'5走':`${n}/5走`);
    return{score,n,career,label,issues,excluded};
  }
  function formatIssues(q){
    if(!q.issues.length)return'';
    return q.issues.map(x=>{if(x.date==='履歴')return `履歴：${x.missing.join('・')}欠損`;const d=String(x.date||'').replace(/^20\d{2}[\/.-]/,'');return `${d}：${x.missing.join('・')}欠損`}).join('<br>');
  }
  function formatExcluded(q){
    if(!q.excluded?.length)return'';
    return q.excluded.map(x=>{const d=String(x.date||'').replace(/^20\d{2}[\/.-]/,'');return `${d}：${x.field}は対象外（${x.reason}）`}).join('<br>');
  }
  function horseForCard(card){const t=norm(card?.querySelector('.rank')?.textContent||'');return (Array.isArray(horses)?horses:[]).find(h=>t.includes(norm(h.name)))||null}
  function patchCard(card,h){
    const q=quality(h),rows=rowsOf(h),source=(h?.history||[]).length?'netkeiba':'JRA';
    const badges=[...card.querySelectorAll('.badge')];const sourceBadge=badges.find(x=>/netkeiba|JRA/.test(x.textContent||'')),qualityBadge=badges.find(x=>/品質/.test(x.textContent||''));
    if(sourceBadge)sourceBadge.textContent=`${source} ${rows.length}走`;
    if(qualityBadge)qualityBadge.textContent=`品質 ${q.score}%`;
    const smalls=[...card.querySelectorAll('.small')];const main=smalls.find(x=>/主データ/.test(x.textContent||''));if(main)main.textContent=`主データ：${source} ${rows.length}走`;
    const statuses=[...card.querySelectorAll('.status')];const dq=statuses.find(x=>/データ品質/.test(x.textContent||''));
    if(dq){const issue=formatIssues(q),excluded=formatExcluded(q),head=q.score===100?(q.career&&q.n<5?`データ品質：${q.label} 完全100%`:`データ品質：完全100%`):`データ品質：${q.label} ${q.score}%`;dq.classList.toggle('ok',q.score===100);dq.classList.toggle('err',q.score<75);dq.innerHTML=`<b>${head}</b>${issue?`<br>${issue}`:''}${excluded?`<br>${excluded}`:''}${q.score<100?'<br>欠損項目だけ指数計算から除外します。':''}`}
  }
  function patchCards(){for(const card of document.querySelectorAll('#horses .card')){const h=horseForCard(card);if(h)patchCard(card,h)}}
  function compactHeader(){
    if(!document.getElementById('compactHeaderV301Style')){const s=document.createElement('style');s.id='compactHeaderV301Style';s.textContent=`
      @media(max-width:700px){header{padding:7px 12px !important;min-height:0 !important}header h1{font-size:16px !important;line-height:1.15 !important;margin:0 !important}header .sub{display:none !important}}
      @media(min-width:701px){header{padding:8px 14px !important}header h1{font-size:17px !important;line-height:1.2 !important}header .sub{font-size:10px !important;white-space:nowrap !important;overflow:hidden !important;text-overflow:ellipsis !important}}
    `;(document.head||document.documentElement).appendChild(s)}
  }
  function gradeKnown(h){const rows=rowsOf(h);return rows.some(r=>{const s=[r?.grade,r?.race_grade,r?.class_name,r?.race_class,r?.class,r?.race_name,r?.raceName,r?.title,r?.race].filter(Boolean).join(' ');return /G[123I]|JPN|リステッド|\bL\b|OP|オープン|[123]勝|未勝利|新馬/.test(String(s).normalize('NFKC').toUpperCase())})}
  function adjustEvaluated(){
    if(!Array.isArray(evaluated)||!evaluated.length)return;
    evaluated=evaluated.map(e=>{
      const src=(Array.isArray(horses)?horses:[]).find(h=>+h.no===+e.no||norm(h.name)===norm(e.name))||e,q=quality(src),oldQ=Number.isFinite(+e.quality)?+e.quality:q.score;
      if(oldQ===q.score)return{...e,quality:q.score};
      const raw=(+e.speed||0)*(weights?.speed??.22)+(+e.last3f||0)*(weights?.last3f??.18)+(+e.course||0)*(weights?.course??.14)+(+e.distance||0)*(weights?.distance??.14)+(+e.jockey||0)*(weights?.jockey??.10)+(+e.blood||0)*(weights?.blood??.08)+(+e.trainer||0)*(weights?.trainer??.06)+(+e.condition||0)*(weights?.condition??.08);
      const oldF=clamp(oldQ/100,.55,1),newF=clamp(q.score/100,.55,1),mix=gradeKnown(src)?.90:1,delta=raw*(newF-oldF)*mix;
      const score=clamp((+e.score||0)+delta,0,100),baseScore=clamp((+e.baseScore||0)+delta,0,100),marketProb=e.winOdds?100/(+e.winOdds):0,winP=clamp((score-55)*.55+(marketProb?marketProb*.22:0),3,42),place=clamp(winP*2.65+3,10,82),fair=winP?100/winP:null,valueIndex=e.winOdds&&fair?(+e.winOdds)/fair:1;
      return{...e,score,baseScore,quality:q.score,winP,place,valueIndex}
    }).sort((a,b)=>b.score-a.score)
  }
  function wrapRender(){try{const old=typeof renderHorses==='function'?renderHorses:null;if(!old||old.__v301)return;const fn=function(...args){const v=old.apply(this,args);patchCards();return v};fn.__v301=true;fn.__original=old;renderHorses=fn;window.renderHorses=fn}catch(e){console.warn('render v301',e)}}
  function wrapEval(){try{const old=typeof evalAll==='function'?evalAll:null;if(!old||old.__v301)return;const fn=function(...args){const v=old.apply(this,args);adjustEvaluated();try{if(typeof renderAnalysis==='function')renderAnalysis()}catch(_){}return evaluated||v};fn.__v301=true;fn.__original=old;evalAll=fn;window.evalAll=fn}catch(e){console.warn('eval v301',e)}}
  compactHeader();wrapRender();wrapEval();patchCards();addEventListener('keiba-data-updated',()=>setTimeout(patchCards,0));document.documentElement.dataset.careerQuality='v301';
})();
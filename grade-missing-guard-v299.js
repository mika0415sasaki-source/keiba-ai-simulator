(()=>{
  if(window.__gradeMissingGuardV299)return;
  window.__gradeMissingGuardV299=true;
  const norm=s=>String(s||'').normalize('NFKC').replace(/[\s　]+/g,'').trim();
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function normalizeGrade(v){const s=String(v||'').normalize('NFKC').toUpperCase().replace(/Ｇ/g,'G').replace(/Ⅲ/g,'III').replace(/Ⅱ/g,'II').replace(/Ⅰ/g,'I').replace(/３/g,'3').replace(/２/g,'2').replace(/１/g,'1').replace(/\s+/g,'');if(/JPN3|JPNIII|G3|GIII/.test(s))return'G3';if(/JPN2|JPNII(?!I)|G2|GII(?!I)/.test(s))return'G2';if(/JPN1|JPNI(?!I)|G1|GI(?!I)/.test(s))return'G1';if(/リステッド/.test(s)||/(?:^|[^A-Z])L(?:$|[^A-Z])/.test(s))return'L';if(/オープン|OPEN|OP/.test(s))return'OP';if(/3勝/.test(s))return'3勝';if(/2勝/.test(s))return'2勝';if(/1勝/.test(s))return'1勝';if(/未勝利/.test(s))return'未勝利';if(/新馬/.test(s))return'新馬';if(/ハンデ/.test(s))return'海外ハンデ';return''}
  function runGrade(r){return normalizeGrade(r?.grade||r?.race_grade||r?.class_name||r?.race_class||r?.class||r?.race_name||r?.raceName||r?.title||r?.race||'')}
  function horseFor(x){return (Array.isArray(horses)?horses:[]).find(h=>+h.no===+x?.no||norm(h.name)===norm(x?.name))||x}
  function gradeCount(h){return (Array.isArray(h?.history)?h.history:[]).slice(0,5).filter(runGrade).length}
  function restoreNoGrade(){
    if(!Array.isArray(evaluated))return;
    evaluated=evaluated.map(h=>{
      const src=horseFor(h),count=gradeCount(src);if(count)return h;
      const score=Number.isFinite(+h.score)?clamp(((+h.score)-6.8)/.90,0,100):+h.score;
      const base=Number.isFinite(+h.baseScore)?clamp(((+h.baseScore)-6.8)/.90,0,100):+h.baseScore;
      const marketProb=h.winOdds?100/(+h.winOdds):0;
      const winP=clamp((score-55)*.55+(marketProb?marketProb*.22:0),3,42),place=clamp(winP*2.65+3,10,82),fair=winP?100/winP:null,valueIndex=h.winOdds&&fair?(+h.winOdds)/fair:1;
      return {...h,score,baseScore:base,gradeScore:null,gradeLabel:'格情報未取得・評価除外',winP,place,valueIndex};
    }).sort((a,b)=>b.score-a.score);
  }
  function patchHorseCards(){
    for(const card of document.querySelectorAll('#horses .card')){
      const title=norm(card.querySelector('.rank')?.textContent||''),h=(Array.isArray(horses)?horses:[]).find(x=>title.includes(norm(x.name)));if(!h||gradeCount(h))continue;
      const m=card.querySelector('[data-race-grade-v298]');if(m)m.innerHTML='<span>レース格</span><b>—（未取得・評価除外）</b>';
    }
  }
  function patchAnalysis(){
    if(!Array.isArray(evaluated))return;
    [...document.querySelectorAll('#ranking .card')].forEach((card,i)=>{const h=evaluated[i];if(!h||gradeCount(horseFor(h)))return;const b=card.querySelector('[data-analysis-grade-v298] b');if(b)b.textContent='—（評価除外）'});
    [...document.querySelectorAll('#rows tr')].forEach((tr,i)=>{const h=evaluated[i];if(!h||gradeCount(horseFor(h)))return;const td=tr.querySelector('[data-grade-cell-v298]');if(td)td.textContent='—'});
    const ev=document.getElementById('evidence'),d=ev?.querySelector('[data-grade-evidence-v298]');if(d)d.textContent='追加評価：過去走のレース格は取得できた馬のみAI指数へ10%反映。格情報が無い場合は中立点を入れず、その評価軸を除外します。';
  }
  function wrapEval(){try{const old=typeof evalAll==='function'?evalAll:null;if(!old||old.__gradeMissingV299)return;const fn=function(...args){const v=old.apply(this,args);restoreNoGrade();try{renderAnalysis()}catch(_){patchAnalysis()}return evaluated||v};fn.__gradeMissingV299=true;fn.__original=old;evalAll=fn;window.evalAll=fn}catch(e){console.warn('grade missing eval v299',e)}}
  function wrapRenderHorses(){try{const old=typeof renderHorses==='function'?renderHorses:null;if(!old||old.__gradeMissingV299)return;const fn=function(...args){const v=old.apply(this,args);patchHorseCards();return v};fn.__gradeMissingV299=true;fn.__original=old;renderHorses=fn;window.renderHorses=fn}catch(_){} }
  function wrapRenderAnalysis(){try{const old=typeof renderAnalysis==='function'?renderAnalysis:null;if(!old||old.__gradeMissingV299)return;const fn=function(...args){const v=old.apply(this,args);patchAnalysis();return v};fn.__gradeMissingV299=true;fn.__original=old;renderAnalysis=fn;window.renderAnalysis=fn}catch(_){} }
  wrapEval();wrapRenderHorses();wrapRenderAnalysis();restoreNoGrade();patchHorseCards();patchAnalysis();document.documentElement.dataset.gradeMissingGuard='v299';
})();

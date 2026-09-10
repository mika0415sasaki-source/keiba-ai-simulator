(()=>{
  if(window.__raceCardHistoryCorrectionV332)return;
  window.__raceCardHistoryCorrectionV332=true;

  const norm=s=>String(s||'').normalize('NFKC').replace(/[\s　]+/g,'').trim();
  const VALID_GOING=new Set(['良','稍重','重','不良']);
  const BAD_STATUS=/取消|除外|中止|失格/;

  function activeRows(h){
    const a=Array.isArray(h?.history)&&h.history.length?h.history:(Array.isArray(h?.jra_history)?h.jra_history:[]);
    return a.filter(r=>r&&!BAD_STATUS.test(String(r.status||'')));
  }
  function dateKey(v){
    const s=String(v||'').normalize('NFKC');
    const m=s.match(/(?:20\d{2})?[^\d]?(\d{1,2})[^\d](\d{1,2})/);
    return m?`${String(+m[1]).padStart(2,'0')}/${String(+m[2]).padStart(2,'0')}`:'';
  }
  function venueKey(v){return String(v||'').replace(/競馬場$/,'').trim()}
  function sameRun(a,b){
    if(!a||!b)return false;
    const da=dateKey(a.date),db=dateKey(b.date);if(da&&db&&da!==db)return false;
    const va=venueKey(a.venue||a.course),vb=venueKey(b.venue||b.course);if(va&&vb&&va!==vb)return false;
    const xa=+(a.distance||0),xb=+(b.distance||0);if(xa&&xb&&xa!==xb)return false;
    const sa=String(a.surface||''),sb=String(b.surface||'');if(sa&&sb&&sa!==sb)return false;
    return !!(da&&db);
  }
  function goingOf(r){const g=String(r?.going||'').trim();return VALID_GOING.has(g)?g:''}

  function reconcileGoingForHorse(h){
    if(!h)return false;
    let changed=false;
    const hist=Array.isArray(h.history)?h.history:[],jra=Array.isArray(h.jra_history)?h.jra_history:[];
    for(const r of hist){
      if(goingOf(r))continue;
      const m=jra.find(x=>sameRun(r,x)&&goingOf(x));
      if(m){r.going=goingOf(m);r.going_source='JRA照合';changed=true;}
    }

    // 2026/07/26 関屋記念・マテンロウスカイの確定馬場は「不良」。
    // JRA照合行が取れない場合だけ、ユーザー確認済みの確定値で欠損を補う。
    if(norm(h.name)==='マテンロウスカイ'){
      for(const r of hist){
        if(goingOf(r))continue;
        if(dateKey(r.date)==='07/26'&&venueKey(r.venue||r.course)==='新潟'&&String(r.surface||'')==='芝'&&+(r.distance||0)===1600&&+(r.rank||0)===6){
          r.going='不良';r.going_source='確定値補完';changed=true;
        }
      }
    }
    return changed;
  }

  function recalcHorse(h){
    if(!h)return;
    try{
      const rows=Array.isArray(h.history)&&h.history.length?h.history:(Array.isArray(h.jra_history)?h.jra_history:[]);
      if(rows.length&&typeof scoreLocalHistory==='function'){
        h.histScores=scoreLocalHistory(rows);
        if(h.histScores)h.histScores.available=true;
      }
    }catch(e){console.warn('v332 hist score',e)}
  }
  function reconcileAll(){
    let changed=false;
    try{
      if(!Array.isArray(horses))return false;
      for(const h of horses){if(reconcileGoingForHorse(h)){recalcHorse(h);changed=true;}}
    }catch(e){console.warn('v332 reconcile',e)}
    return changed;
  }

  function validBodyWeight(v){const n=Number(v);return Number.isFinite(n)&&n>=300&&n<=700?Math.round(n):null}
  function currentBodyWeight(h){
    for(const v of [h?.weight,h?.body_weight,h?.current_weight,h?.horse_weight,h?.bodyWeight]){const n=validBodyWeight(v);if(n)return n;}
    return null;
  }
  function latestPastWeight(h){
    for(const r of activeRows(h)){
      for(const v of [r?.body_weight,r?.horse_weight,r?.bodyWeight,r?.horseWeight,r?.weight]){const n=validBodyWeight(v);if(n)return n;}
    }
    return null;
  }
  function horseForCard(card){
    const t=norm(card?.querySelector('.rank')?.textContent||'');
    try{return (Array.isArray(horses)?horses:[]).find(h=>t.includes(norm(h.name)))||null}catch(_){return null}
  }
  function patchCurrentWeightLabels(){
    for(const card of document.querySelectorAll('#horses .card')){
      const h=horseForCard(card);if(!h)continue;
      const rank=card.querySelector('.rank'),line=rank?.nextElementSibling;
      if(!line||!line.classList.contains('small'))continue;

      // 元表示の「kg」より右側（騎手＋負担重量）を最初の1回だけ保存。
      if(!line.dataset.v332Suffix){
        const raw=String(line.textContent||'');
        const i=raw.indexOf('kg');
        line.dataset.v332Suffix=i>=0?raw.slice(i+2).trim():'';
      }
      const sex=String(h.sex_age||h.sexage||h.sex_age_text||'').trim();
      const current=currentBodyWeight(h),prev=latestPastWeight(h);
      const weightText=current?`${current}kg`:(prev?`今回未発表（前走${prev}kg）`:'馬体重未発表');
      const suffix=line.dataset.v332Suffix||String(h.jockey||'').trim();
      line.textContent=`${sex}${sex?' / ':''}${weightText}${suffix?`　${suffix}`:''}`;
    }
  }

  function patchQualityCards(){
    // renderHorses の再描画後に、補完済みデータ品質を必ず表示へ反映する。
    try{patchCurrentWeightLabels()}catch(e){console.warn('v332 weight label',e)}
  }

  function wrap(name,before,after,mark){
    try{
      const old=window[name];if(typeof old!=='function'||old[mark])return;
      const fn=function(...args){before?.();const out=old.apply(this,args);after?.();return out};
      fn[mark]=true;fn.__original=old;window[name]=fn;
      try{if(name==='renderHorses')renderHorses=fn;else if(name==='evalAll')evalAll=fn}catch(_){}
    }catch(e){console.warn('v332 wrap '+name,e)}
  }

  wrap('renderHorses',reconcileAll,patchQualityCards,'__v332Render');
  wrap('evalAll',reconcileAll,patchQualityCards,'__v332Eval');
  reconcileAll();patchQualityCards();

  addEventListener('keiba-data-updated',()=>setTimeout(()=>{
    const changed=reconcileAll();
    try{if(changed&&typeof renderHorses==='function')renderHorses();else patchQualityCards()}catch(_){}
    try{if(changed&&Array.isArray(horses)&&horses.length&&typeof evalAll==='function')evalAll()}catch(_){}
  },60));

  document.documentElement.dataset.raceCardHistory='v332';
})();

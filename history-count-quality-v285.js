(()=>{
  if(window.__historyCountQualityV285)return;
  window.__historyCountQualityV285=true;

  const clean=v=>String(v||'').normalize('NFKC').replace(/[\s　]+/g,'').trim();
  const list=()=>{try{if(typeof horses!=='undefined'&&Array.isArray(horses))return horses}catch(_){}return Array.isArray(window.horses)?window.horses:[]};
  const CONF={0:0,1:48,2:61,3:74,4:87,5:100};
  let originalDataQuality=null;

  function rowsFor(h){
    try{
      if(typeof activeHistory==='function'){
        const r=activeHistory(h);
        if(Array.isArray(r))return r;
      }
    }catch(_){}
    if(Array.isArray(h?.history)&&h.history.length)return h.history;
    if(Array.isArray(h?.jra_history))return h.jra_history;
    return [];
  }
  function completedRows(h){
    return rowsFor(h).filter(r=>{
      if(!r)return false;
      const st=clean(r.status);
      if(st&&/(取消|除外|中止|競走中止|失格|未出走|不出走|scratched|cancel|withdraw)/i.test(st))return false;
      const rank=Number(r.rank);
      return Number.isFinite(rank)&&rank>0;
    }).slice(0,5);
  }
  function runCount(h){return completedRows(h).length}
  function confidenceFor(n){return CONF[Math.max(0,Math.min(5,n))]??0}

  function installDataQuality(){
    try{
      const current=(typeof dataQuality==='function')?dataQuality:window.dataQuality;
      if(!current)return;
      if(current.__historyCountQualityV285)return;
      if(!originalDataQuality||originalDataQuality.__historyCountQualityV285)originalDataQuality=current;
      const baseFn=originalDataQuality;
      const patched=function(h){
        let base;
        try{base=baseFn(h)}catch(_){base={score:0,label:'未取得',issues:[],source:'未取得'}}
        base=base&&typeof base==='object'?{...base}:{score:0,label:'未取得',issues:[],source:'未取得'};
        const n=runCount(h);
        if(n===0)return {...base,score:0,label:'未取得',history_count:0,history_target:5};
        const cap=confidenceFor(n);
        const raw=Number.isFinite(+base.score)?+base.score:100;
        const score=Math.min(raw,cap);
        return {...base,score,label:n>=5?(base.label||'完全'):`履歴 ${n}/5走`,history_count:n,history_target:5};
      };
      patched.__historyCountQualityV285=true;
      patched.__original=baseFn;
      try{dataQuality=patched}catch(_){}
      try{window.dataQuality=patched}catch(_){}
    }catch(e){console.warn('history count quality install',e)}
  }

  function horseFromCard(card){
    const hs=list();
    const text=clean(card?.textContent);
    return hs.find(h=>text.startsWith(clean(String(h.no||'')+String(h.name||'')))||text.includes(clean(String(h.no||'')+String(h.name||''))))||null;
  }

  function patchHorseCards(){
    const root=document.getElementById('horses');if(!root)return;
    const cards=[...root.querySelectorAll(':scope > .card')];
    for(const card of cards){
      const h=horseFromCard(card);if(!h)continue;
      const n=runCount(h);
      let q={score:0};
      try{q=(typeof dataQuality==='function'?dataQuality(h):q)||q}catch(_){}
      const badges=[...card.querySelectorAll('.badge')];
      const sourceBadge=badges.find(x=>/netkeiba\s*\d*走/.test(String(x.textContent||'')));
      if(sourceBadge)sourceBadge.textContent=`netkeiba ${n}走`;
      const qualityBadge=badges.find(x=>/^品質\s*/.test(String(x.textContent||'')));
      if(qualityBadge)qualityBadge.textContent=`品質 ${Math.round(+q.score||0)}%`;
      const smalls=[...card.querySelectorAll('.small')];
      const sourceLine=smalls.find(x=>/^主データ：/.test(String(x.textContent||'')));
      if(sourceLine)sourceLine.textContent=String(sourceLine.textContent||'').replace(/netkeiba\s*5走/,`netkeiba ${n}走`);
      const status=[...card.querySelectorAll('.status')].find(x=>/データ品質：/.test(String(x.textContent||'')));
      if(status&&n>0&&n<5){
        status.classList.remove('ok');
        status.innerHTML=`<b>データ品質：履歴 ${n}/5走 ${Math.round(+q.score||confidenceFor(n))}%</b><br><span class="small">取消・除外・中止などは過去走数に含めず、実際に完走した${n}走だけで評価します。履歴不足分はAI指数で信頼度補正します。</span>`;
      }
    }
  }

  function patchEvidence(){
    const el=document.getElementById('evidence');if(!el)return;
    const hs=list();if(!hs.length)return;
    const full=hs.filter(h=>runCount(h)>=5).length;
    el.innerHTML=String(el.innerHTML||'')
      .replace(/主評価：netkeiba5走\s*\d+\/\d+頭/,`主評価：netkeiba履歴 ${hs.length}/${hs.length}頭（5走揃い ${full}/${hs.length}頭）`)
      .replace(/netkeiba5走を主評価し/,`netkeibaの完走履歴（最大5走）を主評価し`);
  }

  function post(){installDataQuality();patchHorseCards();patchEvidence()}
  function wrap(name,after){
    try{
      const fn=window[name]||eval(`typeof ${name}==='function'?${name}:null`);
      if(!fn||fn.__historyCountQualityV285)return;
      const wrapped=function(){installDataQuality();const v=fn.apply(this,arguments);setTimeout(()=>{try{after()}catch(_){}},0);return v};
      wrapped.__historyCountQualityV285=true;wrapped.__original=fn;
      try{window[name]=wrapped}catch(_){}
      try{eval(`${name}=wrapped`)}catch(_){}
    }catch(_){}
  }
  function install(){
    installDataQuality();
    wrap('renderHorses',patchHorseCards);
    wrap('renderAnalysis',()=>{patchEvidence();patchHorseCards()});
    post();
  }

  document.addEventListener('click',e=>{
    const t=e.target;if(!t)return;
    if(t.id==='importRace'||t.id==='importHist'||t.id==='analyze'||/出馬表取込|過去5走を再取得|AI分析/.test(String(t.textContent||''))){
      setTimeout(()=>{install();try{if(typeof evalAll==='function')evalAll()}catch(_){}post()},1800);
      setTimeout(()=>{install();try{if(typeof evalAll==='function')evalAll()}catch(_){}post()},6000);
    }
  },true);

  let tries=0;const tick=()=>{tries++;install();if(tries<40)setTimeout(tick,400)};setTimeout(tick,60);
  setTimeout(()=>{try{if(typeof evalAll==='function')evalAll()}catch(_){}post()},2200);
})();

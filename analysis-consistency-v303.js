(()=>{
  if(window.__analysisConsistencyV303)return;
  window.__analysisConsistencyV303=true;
  const el=id=>document.getElementById(id);
  const norm=s=>String(s||'').normalize('NFKC').replace(/[\s　]+/g,'').trim();
  const runGrade=r=>String(r?.grade||r?.race_grade||r?.class_name||r?.race_class||r?.class||r?.race_name||r?.raceName||r?.title||r?.race||'');

  function list(){try{return Array.isArray(horses)?horses:[]}catch(_){return[]}}
  function completed(h){return (Array.isArray(h?.history)?h.history:[]).filter(r=>r&&!/取消|除外|中止|失格/.test(String(r?.status||r?.result_status||r?.rank_text||''))&&Number.isFinite(+r?.rank)&&+r.rank>0).slice(0,5)}
  function syncHistorySummary(){
    const hs=list();if(!hs.length)return;
    const ok=hs.filter(h=>completed(h).length).length;
    const runs=hs.reduce((s,h)=>s+completed(h).length,0);
    const graded=hs.reduce((s,h)=>s+completed(h).filter(r=>runGrade(r)).length,0);
    const jra=hs.filter(h=>Array.isArray(h?.jra_history)&&h.jra_history.length).length;
    const hc=el('histCount');if(hc){const next=`netkeiba ${ok}/${hs.length}頭・合計${runs}走 / レース格 ${Math.min(graded,runs)}/${runs}走 / JRA照合 ${jra}頭`;if(hc.textContent!==next)hc.textContent=next}
    const st=el('histStatus');if(st&&/過去走/.test(st.textContent||'')){
      let html=st.innerHTML;
      html=html.replace(/過去走\s*\d+\/\d+頭/g,`過去走 ${ok}/${hs.length}頭`);
      html=html.replace(/合計\d+走/g,`合計${runs}走`);
      if(html!==st.innerHTML)st.innerHTML=html;
    }
  }
  function patchEvidence(){
    const box=el('evidence');if(!box)return;
    let s=box.innerHTML;
    s=s.replace(/主評価：netkeiba5走\s*(\d+\/\d+頭)/g,'主評価：netkeiba履歴 $1（直近完走5走まで）');
    s=s.replace(/netkeiba5走を主評価し/g,'netkeibaの直近完走5走までを主評価し');
    if(s!==box.innerHTML)box.innerHTML=s;
  }
  function patchTypography(){
    if(el('analysisConsistencyV303Style'))return;
    const s=document.createElement('style');s.id='analysisConsistencyV303Style';s.textContent=`
      #ranking .ranking-card>summary{grid-template-columns:minmax(0,1fr) 58px 14px!important;gap:8px!important}
      #ranking .ranking-card .rank{font-size:16px!important;letter-spacing:-.01em!important;line-height:1.28!important}
      #ranking .ranking-card .score{font-size:27px!important;text-align:right!important}
      #ranking .accordion-chevron{font-size:13px!important}
      @media(max-width:390px){#ranking .ranking-card .rank{font-size:15px!important}#ranking .ranking-card .score{font-size:25px!important}}
    `;(document.head||document.documentElement).appendChild(s);
  }
  function settle(){syncHistorySummary();patchEvidence();patchTypography()}
  function wrap(name){
    try{const fn=window[name];if(typeof fn!=='function'||fn.__v303)return;const w=function(...args){const out=fn.apply(this,args);queueMicrotask(settle);return out};w.__v303=true;w.__original=fn;window[name]=w;try{if(name==='renderHorses')renderHorses=w;else if(name==='renderAnalysis')renderAnalysis=w;else if(name==='evalAll')evalAll=w}catch(_){}}catch(_){}
  }
  function install(){wrap('renderHorses');wrap('renderAnalysis');wrap('evalAll');settle()}
  const st=el('histStatus');if(st)new MutationObserver(()=>queueMicrotask(syncHistorySummary)).observe(st,{subtree:true,childList:true,characterData:true});
  addEventListener('keiba-data-updated',()=>setTimeout(settle,0));
  addEventListener('pageshow',()=>setTimeout(settle,0));
  install();
  document.documentElement.dataset.consistency='v303';
})();
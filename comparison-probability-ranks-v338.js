(()=>{
  if(window.__comparisonProbabilityRanksV338)return;
  window.__comparisonProbabilityRanksV338=true;

  const BAD=/取消|出走取消|競走除外|除外|競走中止|中止|失格/;
  const el=id=>document.getElementById(id);
  const activeRows=arr=>(Array.isArray(arr)?arr:[]).filter(h=>h&&!BAD.test(String(h?.status||h?.result_status||h?.rank_text||'')));
  const num=v=>Number.isFinite(+v)?+v:-Infinity;

  function injectStyle(){
    if(el('comparisonProbabilityRanksV338Style'))return;
    const s=document.createElement('style');
    s.id='comparisonProbabilityRanksV338Style';
    s.textContent=`
      .comparison-prob-ranks-v338{display:flex;flex-wrap:wrap;gap:5px 7px;margin-top:5px;font-size:10px;line-height:1.35;color:#9fb0cf;font-weight:700}
      .comparison-prob-ranks-v338 .prob-rank-chip{display:inline-flex;align-items:center;gap:3px;padding:2px 6px;border:1px solid rgba(102,224,163,.24);border-radius:999px;background:rgba(102,224,163,.06);white-space:nowrap}
      .comparison-prob-ranks-v338 b{color:#dfe9fb;font-weight:900}
      @media(min-width:721px){.comparison-prob-ranks-v338{font-size:10px;margin-top:4px}}
    `;
    (document.head||document.documentElement).appendChild(s);
  }

  function rankMaps(rows){
    const ai=[...rows].sort((a,b)=>num(b?.score)-num(a?.score)||(+a?.no||999)-(+b?.no||999));
    const win=[...rows].sort((a,b)=>num(b?.winP)-num(a?.winP)||num(b?.score)-num(a?.score)||(+a?.no||999)-(+b?.no||999));
    const place=[...rows].sort((a,b)=>num(b?.place)-num(a?.place)||num(b?.score)-num(a?.score)||(+a?.no||999)-(+b?.no||999));
    const aiMap=new Map(),winMap=new Map(),placeMap=new Map();
    ai.forEach((h,i)=>aiMap.set(h,i+1));
    win.forEach((h,i)=>winMap.set(h,i+1));
    place.forEach((h,i)=>placeMap.set(h,i+1));
    rows.forEach(h=>{
      h.aiRankV338=aiMap.get(h);
      h.winProbabilityRankV338=winMap.get(h);
      h.placeProbabilityRankV338=placeMap.get(h);
    });
    return {aiMap,winMap,placeMap};
  }

  function horseForRow(tr,rows,index){
    const text=String(tr?.textContent||'');
    const noMatch=text.match(/(?:AI\s*\d+位\s*)?(\d{1,2})\s/);
    if(noMatch){
      const no=+noMatch[1];
      const byNo=rows.find(h=>+h?.no===no);
      if(byNo)return byNo;
    }
    return rows[index]||null;
  }

  function annotateComparison(){
    injectStyle();
    let rows=[];try{rows=activeRows(evaluated)}catch(_){return}
    if(!rows.length)return;
    rankMaps(rows);

    const tbody=el('rows');
    if(!tbody)return;
    [...tbody.querySelectorAll('tr')].forEach((tr,i)=>{
      const h=horseForRow(tr,rows,i);if(!h)return;
      const aiRank=h.aiRankV338||i+1;
      const winRank=h.winProbabilityRankV338||0;
      const placeRank=h.placeProbabilityRankV338||0;

      const rr=tr.querySelector('.comparison-rank');
      if(rr)rr.textContent=`AI ${aiRank}位`;

      const toggle=tr.querySelector('.comparison-toggle');
      if(toggle){
        let host=toggle.querySelector('.comparison-prob-ranks-v338');
        if(!host){
          host=document.createElement('div');
          host.className='comparison-prob-ranks-v338';
          const main=toggle.firstElementChild;
          if(main)main.appendChild(host);else toggle.prepend(host);
        }
        host.innerHTML=`<span class="prob-rank-chip">1着率 <b>${winRank}位</b></span><span class="prob-rank-chip">3着内率 <b>${placeRank}位</b></span>`;
      }

      const cells=[...tr.querySelectorAll('td')];
      const winCell=cells.find(td=>String(td.dataset?.label||'').includes('1着率'));
      const placeCell=cells.find(td=>String(td.dataset?.label||'').includes('3着内率'));
      if(winCell)winCell.dataset.label=`1着率（${winRank}位）`;
      if(placeCell)placeCell.dataset.label=`3着内率（${placeRank}位）`;
    });
    document.documentElement.dataset.comparisonProbabilityRanks='v338';
  }

  function wrapRender(){
    try{
      const old=window.renderAnalysis;if(typeof old!=='function'||old.__comparisonProbRanksV338)return;
      const fn=function(...args){const out=old.apply(this,args);queueMicrotask(annotateComparison);return out};
      fn.__comparisonProbRanksV338=true;fn.__original=old;window.renderAnalysis=fn;try{renderAnalysis=fn}catch(_){}
    }catch(e){console.warn('comparison ranks v338 render wrap',e)}
  }

  function settle(){wrapRender();setTimeout(annotateComparison,0)}
  addEventListener('keiba-data-updated',()=>setTimeout(annotateComparison,260));
  addEventListener('pageshow',()=>setTimeout(annotateComparison,0));
  addEventListener('keiba-patches-ready',()=>setTimeout(settle,0));
  setTimeout(settle,0);
})();

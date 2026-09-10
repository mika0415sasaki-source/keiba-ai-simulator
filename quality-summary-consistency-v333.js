(()=>{
  if(window.__qualitySummaryConsistencyV333)return;
  window.__qualitySummaryConsistencyV333=true;

  const patch=()=>{
    try{
      const cards=[...document.querySelectorAll('#horses .card')];
      const statuses=cards.map(card=>[...card.querySelectorAll('.status')].find(x=>/データ品質/.test(x.textContent||''))).filter(Boolean);
      if(!statuses.length)return;
      const complete=statuses.filter(x=>/100%/.test(x.textContent||'')).length;
      const missing=statuses.length-complete;
      const box=document.getElementById('evidence');
      if(!box)return;
      const walker=document.createTreeWalker(box,NodeFilter.SHOW_TEXT);
      let node;
      while((node=walker.nextNode())){
        const s=node.nodeValue||'';
        if(!/完全\s*\d+頭\s*\/\s*欠損\s*\d+頭/.test(s))continue;
        const next=s.replace(/完全\s*\d+頭\s*\/\s*欠損\s*\d+頭/g,`完全 ${complete}頭 / 欠損 ${missing}頭`);
        if(next!==s)node.nodeValue=next;
      }
    }catch(e){console.warn('quality summary v333',e)}
  };

  const wrap=name=>{
    try{
      const old=window[name];
      if(typeof old!=='function'||old.__qualitySummaryV333)return;
      const fn=function(...args){const out=old.apply(this,args);setTimeout(patch,0);return out};
      fn.__qualitySummaryV333=true;fn.__original=old;window[name]=fn;
      try{if(name==='renderAnalysis')renderAnalysis=fn;else if(name==='renderHorses')renderHorses=fn;else if(name==='evalAll')evalAll=fn}catch(_){}
    }catch(e){console.warn('quality summary wrap v333',name,e)}
  };

  wrap('renderHorses');
  wrap('renderAnalysis');
  wrap('evalAll');
  addEventListener('keiba-data-updated',()=>setTimeout(patch,0));
  addEventListener('pageshow',()=>setTimeout(patch,0));
  setTimeout(patch,0);
  document.documentElement.dataset.qualitySummary='v333';
})();
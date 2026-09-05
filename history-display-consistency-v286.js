(()=>{
  if(window.__historyDisplayConsistencyV286)return;
  window.__historyDisplayConsistencyV286=true;

  const clean=v=>String(v||'').normalize('NFKC').replace(/[\s　]+/g,'').trim();
  const list=()=>{try{if(typeof horses!=='undefined'&&Array.isArray(horses))return horses}catch(_){}return Array.isArray(window.horses)?window.horses:[]};
  function rowsFor(h){
    try{if(typeof activeHistory==='function'){const r=activeHistory(h);if(Array.isArray(r))return r}}catch(_){}
    if(Array.isArray(h?.history)&&h.history.length)return h.history;
    return Array.isArray(h?.jra_history)?h.jra_history:[];
  }
  function completedCount(h){
    return rowsFor(h).filter(r=>{
      if(!r)return false;
      const st=clean(r.status);
      if(st&&/(取消|除外|中止|競走中止|失格|未出走|不出走|scratched|cancel|withdraw)/i.test(st))return false;
      const rank=Number(r.rank);
      return Number.isFinite(rank)&&rank>0;
    }).slice(0,5).length;
  }
  function stats(){
    const hs=list();
    const counts=hs.map(completedCount);
    const total=counts.reduce((a,b)=>a+b,0);
    const full=counts.filter(n=>n>=5).length;
    const short=counts.filter(n=>n>0&&n<5).length;
    let missing=0;
    try{missing=hs.filter(h=>{const q=(typeof dataQuality==='function'?dataQuality(h):null);return Array.isArray(q?.issues)&&q.issues.length>0}).length}catch(_){}
    return {n:hs.length,total,full,short,missing};
  }
  function patchRaceStatus(){
    const el=document.getElementById('raceStatus');if(!el)return;
    const s=stats();if(!s.n)return;
    el.innerHTML=String(el.innerHTML||'').replace(/netkeiba5走\s*\d+\/\d+頭/g,`netkeiba履歴 ${s.n}/${s.n}頭（合計${s.total}走・5走揃い${s.full}頭）`);
  }
  function patchEvidence(){
    const el=document.getElementById('evidence');if(!el)return;
    const s=stats();if(!s.n)return;
    el.innerHTML=String(el.innerHTML||'').replace(/データ品質：完全\s*\d+頭\s*\/\s*欠損あり\s*\d+頭/g,`履歴充足：5走揃い ${s.full}頭 / 5走未満 ${s.short}頭<br><br>項目欠損：${s.missing}頭`);
  }
  function patch(){patchRaceStatus();patchEvidence()}
  const obs=new MutationObserver(()=>{try{patch()}catch(_){}});
  const boot=()=>{
    const rs=document.getElementById('raceStatus'),ev=document.getElementById('evidence');
    if(rs)obs.observe(rs,{childList:true,subtree:true,characterData:true});
    if(ev)obs.observe(ev,{childList:true,subtree:true,characterData:true});
    patch();
  };
  document.addEventListener('click',e=>{
    const t=e.target;if(!t)return;
    if(t.id==='importRace'||t.id==='importHist'||t.id==='analyze'||/出馬表取込|過去5走を再取得|AI分析/.test(String(t.textContent||''))){setTimeout(patch,250);setTimeout(patch,1800);setTimeout(patch,6000)}
  },true);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  setTimeout(boot,1200);
})();

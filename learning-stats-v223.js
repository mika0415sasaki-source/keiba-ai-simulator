(function(){
  'use strict';
  if(window.__keibaLearningStatsV223)return;
  window.__keibaLearningStatsV223=true;

  const MEMORY_KEY='keiba_ai_memory_v19';
  const ENTRY_KEY='keiba_latest_entry_v223';
  let retryTimer=0;
  let refreshTimer=0;

  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function fmtRaceDate(s){const x=String(s||'').replace(/\D/g,'');return x.length>=8?Number(x.slice(4,6))+'/'+Number(x.slice(6,8)):'';}
  function fmtImportedAt(s){
    if(!s)return '';
    const d=new Date(s);if(!Number.isFinite(d.getTime()))return '';
    try{return new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(d);}
    catch(e){return (d.getMonth()+1)+'/'+d.getDate()+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');}
  }

  function readMemory(){
    try{const raw=localStorage.getItem(MEMORY_KEY);if(!raw)return null;const x=JSON.parse(raw);return x&&typeof x==='object'&&!Array.isArray(x)?x:null;}
    catch(e){return null;}
  }

  function readEntry(){
    try{const raw=sessionStorage.getItem(ENTRY_KEY);return raw?JSON.parse(raw):null;}
    catch(e){return null;}
  }

  function summarize(mem){
    const horses=Object.keys(mem||{}),raceSet=new Set();
    let resultRecords=0,latest=null,latestMs=-1;
    horses.forEach(function(name){
      const h=mem[name];if(!h||typeof h!=='object')return;
      const arr=Array.isArray(h.learnedResults)?h.learnedResults:[];
      arr.forEach(function(r){
        if(!r||typeof r!=='object')return;
        resultRecords++;
        const k=String(r.raceId||r.raceKey||[r.date,r.course,r.raceNo,r.surface,r.distance].join('|'));if(k)raceSet.add(k);
        const ms=Date.parse(r.importedAt||'');if(Number.isFinite(ms)&&ms>latestMs){latestMs=ms;latest=r;}
      });
    });
    return {horseCount:horses.length,raceCount:raceSet.size,resultRecords:resultRecords,latest:latest};
  }

  function ensureBox(){
    let box=document.getElementById('learningStatsV223');if(box)return box;
    const old=document.getElementById('learningStatsV222');if(old){old.id='learningStatsV223';return old;}
    const count=document.getElementById('memoryCount');if(!count)return null;
    let card=count.closest('.card')||count.parentElement;if(!card)return null;
    box=document.createElement('div');box.id='learningStatsV223';
    box.style.cssText='margin-top:7px;padding:8px 9px;border:1px solid #30363d;border-radius:7px;background:#0d1117;line-height:1.65;color:#c9d1d9;font-size:11px';
    const status=document.getElementById('memoryStatus');if(status&&status.parentNode===card)card.insertBefore(box,status);else card.appendChild(box);
    return box;
  }

  function entryLabel(e){
    if(!e)return 'まだこの画面で出馬表を取得していません';
    const course=String(e.course||'').replace('競馬場','');
    const raceNo=Number(e.raceNo||0)>0?Number(e.raceNo)+'R':'';
    const cond=[e.surface,Number(e.distance||0)>0?Number(e.distance)+'m':''].filter(Boolean).join('');
    return [fmtImportedAt(e.importedAt),course,raceNo,cond].filter(Boolean).join(' ');
  }

  function render(){
    const box=ensureBox();if(!box)return false;
    const mem=readMemory();if(!mem){box.innerHTML='<span style="color:#8b949e">学習履歴を読み込み中…</span>';return false;}
    const s=summarize(mem),entry=readEntry();
    const count=document.getElementById('memoryCount');if(count&&String(count.textContent||'')!==String(s.horseCount))count.textContent=String(s.horseCount);

    let latest='まだ確定結果の学習なし',resultImported='';
    if(s.latest){
      const r=s.latest,raceDate=fmtRaceDate(r.date),course=String(r.course||'').replace('競馬場','');
      const raceNo=Number(r.raceNo||0)>0?Number(r.raceNo)+'R':'';
      const cond=[r.surface,Number(r.distance||0)>0?Number(r.distance)+'m':''].filter(Boolean).join('');
      latest=[raceDate,course,raceNo,cond].filter(Boolean).join(' ');resultImported=fmtImportedAt(r.importedAt);
    }

    box.innerHTML=
      '<b style="color:#e6edf3">📚 学習履歴</b><br>'+ 
      '<span style="color:#58a6ff">最新出馬表:</span> <b>'+esc(entryLabel(entry))+'</b><br>'+ 
      '確定結果: <b>'+s.raceCount+'レース</b> / <b>'+s.resultRecords+'件</b><br>'+ 
      '最終結果学習: <b>'+esc(latest)+'</b>'+ 
      (resultImported?'<br><span style="color:#8b949e">最終結果取込: '+esc(resultImported)+' / Supabase保存</span>':'');
    return true;
  }

  function initialLoad(){let tries=0;function tick(){tries++;if(render())return;if(tries<30)retryTimer=setTimeout(tick,300);}tick();}
  function scheduleRefresh(){clearTimeout(refreshTimer);refreshTimer=setTimeout(render,1200);setTimeout(render,3200);}

  window.addEventListener('keiba:entry-imported',function(e){
    try{sessionStorage.setItem(ENTRY_KEY,JSON.stringify(e.detail||{}));}catch(_e){}
    render();
  });

  document.addEventListener('click',function(e){
    const t=e.target&&e.target.closest?e.target.closest('button'):null;if(!t)return;
    if(['saveMemory','learnResult','fetchJraResult','autoLearnResult','purgeBadMemory','cleanMemory','clearMemory'].includes(t.id))scheduleRefresh();
  },true);

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialLoad,{once:true});else initialLoad();
})();
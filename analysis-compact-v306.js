(()=>{
  if(window.__analysisCompactV309)return;
  window.__analysisCompactV309=true;

  const el=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));

  function injectStyle(){
    if(el('analysisCompactV309Style'))return;
    const s=document.createElement('style');s.id='analysisCompactV309Style';s.textContent=`
      #evidence.analysis-evidence-compact{padding:12px 14px!important}
      #evidence .evidence-title{font-size:15px;font-weight:900;margin-bottom:8px}
      #evidence .evidence-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px 14px}
      #evidence .evidence-item{min-width:0;font-size:12px;line-height:1.45;color:#cbd7ee}
      #evidence .evidence-item b{color:#eef3ff}
      #evidence .evidence-wide{grid-column:1/-1}
      #evidence .evidence-note{font-size:11px;line-height:1.55;color:#9fb0cf}
      #evidence .evidence-note-first{padding-top:7px;margin-top:1px;border-top:1px solid rgba(72,96,139,.35)}
      #evidence .evidence-note-next{padding-top:0;margin-top:-2px}
      #ranking .ranking-card:nth-child(n+7){display:none!important}
      #rankingMarkedNote{font-size:11px;color:#9fb0cf;margin:-2px 0 8px}
      @media(max-width:520px){
        #evidence .evidence-grid{grid-template-columns:1fr;gap:6px}
        #evidence .evidence-wide{grid-column:1}
      }
    `;(document.head||document.documentElement).appendChild(s);
  }

  function compactEvidence(){
    const box=el('evidence');if(!box)return;
    let hs=[];try{hs=Array.isArray(horses)?horses:[]}catch(_){}
    const total=hs.length;
    const nk=hs.filter(h=>h?.histScores?.available||Array.isArray(h?.history)&&h.history.length).length;
    const blood=hs.filter(h=>h?.sire||h?.dam||h?.damsire).length;
    const jra=hs.filter(h=>Array.isArray(h?.jra_history)&&h.jra_history.length).length;
    let complete=0;try{if(typeof dataQuality==='function')complete=hs.filter(h=>dataQuality(h).score===100).length}catch(_){complete=0}
    const missing=Math.max(0,total-complete);
    const gradedRuns=hs.reduce((n,h)=>(n+(Array.isArray(h?.history)?h.history.filter(r=>r&&(r.grade||r.race_grade||r.class_name||r.race_class||r.class||r.race_name||r.raceName)).length:0)),0);
    const totalRuns=hs.reduce((n,h)=>(n+(Array.isArray(h?.history)?h.history.length:0)),0);
    let pace='—';try{pace=el('pace')?.value==='自動'?(raceMeta?.autoPace||'自動'):el('pace')?.value||'—'}catch(_){}
    const win=Object.keys((typeof oddsCache!=='undefined'&&oddsCache?.win)||{}).length;
    const wide=Object.keys((typeof oddsCache!=='undefined'&&oddsCache?.wide)||{}).length;
    const trio=Object.keys((typeof oddsCache!=='undefined'&&oddsCache?.trio)||{}).length;

    box.classList.add('analysis-evidence-compact');
    box.innerHTML=`
      <div class="evidence-title">分析根拠</div>
      <div class="evidence-grid">
        <div class="evidence-item"><b>主評価</b>　netkeiba ${nk}/${total}頭</div>
        <div class="evidence-item"><b>血統</b>　${blood}/${total}頭</div>
        <div class="evidence-item"><b>レース格</b>　${gradedRuns}/${totalRuns}走</div>
        <div class="evidence-item"><b>データ品質</b>　完全 ${complete}頭 / 欠損 ${missing}頭</div>
        <div class="evidence-item"><b>ペース</b>　${esc(pace)}（脚質から判定）</div>
        <div class="evidence-item"><b>騎手</b>　netkeiba過去走を参照</div>
        <div class="evidence-item"><b>オッズ</b>　単勝 ${win}頭 / ワイド ${wide}点 / 3連複 ${trio}点</div>
        <div class="evidence-item"><b>コース</b>　JRA基礎データ${jra?` / JRA履歴 ${jra}頭`:''}</div>
        <div class="evidence-item evidence-wide evidence-note evidence-note-first"><b>近走</b>：頭数・着順・レース格・今回条件・直近度を反映</div>
        <div class="evidence-item evidence-wide evidence-note evidence-note-next"><b>上がり</b>：芝ダ・距離・競馬場・馬場を補正して比較</div>
      </div>`;
  }

  function markedRankingOnly(){
    const ranking=el('ranking');if(!ranking)return;
    const cards=[...ranking.querySelectorAll('.ranking-card')];
    cards.forEach((card,i)=>card.style.display=i<6?'':'none');
    const panel=ranking.closest('.panel');if(panel){
      let note=el('rankingMarkedNote');
      if(!note){note=document.createElement('div');note.id='rankingMarkedNote';note.textContent='印付きの馬だけ表示（全頭は「全頭比較」で確認）';ranking.parentNode.insertBefore(note,ranking)}
    }
  }

  function settle(){injectStyle();compactEvidence();markedRankingOnly()}
  function wrap(name){
    try{
      const old=window[name];if(typeof old!=='function'||old.__v309)return;
      const fn=function(...args){const v=old.apply(this,args);queueMicrotask(settle);return v};
      fn.__v309=true;fn.__original=old;window[name]=fn;
      try{if(name==='renderAnalysis')renderAnalysis=fn;else if(name==='evalAll')evalAll=fn}catch(_){}
    }catch(e){console.warn('analysis compact',e)}
  }
  wrap('renderAnalysis');wrap('evalAll');
  addEventListener('keiba-data-updated',()=>setTimeout(settle,0));
  addEventListener('pageshow',()=>setTimeout(settle,0));
  setTimeout(settle,0);
})();

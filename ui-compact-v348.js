(()=>{
  if(window.__uiCompactV348)return;
  window.__uiCompactV348=true;

  const el=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const TURN={札幌:'右',函館:'右',福島:'右',新潟:'左',東京:'左',中山:'右',中京:'左',京都:'右',阪神:'右',小倉:'右'};
  let busy=false,timer=0;

  function injectStyle(){
    if(el('uiCompactV348Style'))return;
    const s=document.createElement('style');
    s.id='uiCompactV348Style';
    s.textContent=`
      #rankingModelNoteV337,#rankingModelNoteV345{display:none!important}
      #courseProfile.v348-compact,#evidence.v348-compact{line-height:1.35!important;padding:12px!important}
      .v349-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}
      .v349-title{font-size:16px;font-weight:900;color:#eef3ff;line-height:1.25}
      .v349-sub{font-size:11px;color:#9fb0cf;margin-top:2px}
      .v349-badge{flex:0 0 auto;padding:5px 9px;border-radius:999px;border:1px solid rgba(102,224,163,.45);background:rgba(102,224,163,.10);color:#7ce7b4;font-size:11px;font-weight:900;white-space:nowrap}
      .v349-metrics,.v349-data-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}
      .v349-box{min-width:0;padding:8px 6px;border:1px solid rgba(63,86,130,.72);border-radius:10px;background:rgba(10,19,35,.58);text-align:center}
      .v349-box span{display:block;font-size:10px;color:#9fb0cf;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .v349-box b{display:block;margin-top:2px;font-size:15px;color:#eef3ff;line-height:1.15}
      .v349-note{margin-top:8px;font-size:11px;color:#9fb0cf}
      .v349-row{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
      .v349-chip{display:inline-flex;align-items:center;gap:4px;padding:5px 8px;border:1px solid rgba(63,86,130,.72);border-radius:999px;background:rgba(10,19,35,.58);font-size:11px;color:#aebbd3;white-space:nowrap}
      .v349-chip b{color:#eef3ff;font-size:11px}
      .v349-chip.good{border-color:rgba(102,224,163,.35);color:#82dcb3}
      #evidence.v348-compact .v348-tech{margin-top:9px;padding-top:8px;border-top:1px solid rgba(63,86,130,.45);color:#9fb0cf}
      #evidence.v348-compact .v348-tech>summary{cursor:pointer;font-size:11px;font-weight:800;color:#cfdaf0;list-style:none}
      #evidence.v348-compact .v348-tech>summary::-webkit-details-marker{display:none}
      #evidence.v348-compact .v348-tech>summary::after{content:' ▼';font-size:9px}
      #evidence.v348-compact .v348-tech[open]>summary::after{content:' ▲'}
      #ranking details.ranking-card>summary{cursor:pointer;list-style:none;display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:9px;width:100%}
      #ranking details.ranking-card>summary::-webkit-details-marker{display:none}
      #ranking .accordion-chevron{display:inline-block;min-width:18px;text-align:center;color:#9fb0cf;font-size:14px}
      @media(max-width:700px){
        #courseProfile.v348-compact,#evidence.v348-compact{font-size:12px!important}
        .v349-metrics,.v349-data-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
        .v349-title{font-size:15px}
        .v349-box{padding:7px 5px}
        .v349-box b{font-size:14px}
      }
    `;
    (document.head||document.documentElement).appendChild(s);
  }

  function ctx(){
    const venue=String(el('venue')?.value||'').replace(/競馬場$/,'');
    const surface=String(el('surface')?.value||'');
    const dist=Number(el('distance')?.value||0);
    const going=String(el('going')?.value||'良');
    const paceSel=String(el('pace')?.value||'自動');
    let autoPace='ミドル';
    try{autoPace=String((typeof raceMeta!=='undefined'&&raceMeta?.autoPace)||window.raceMeta?.autoPace||'ミドル')}catch(_){}
    const pace=paceSel==='自動'?autoPace:paceSel;
    return {venue,surface,dist,going,pace,autoPace,turn:TURN[venue]||String(window.raceMeta?.turn||'')};
  }

  function route(c){
    if(c.surface!=='芝')return'';
    if(c.venue==='阪神'){
      if([1200,1400,2000,2200,3000].includes(c.dist))return'内回り';
      if([1600,1800,2400].includes(c.dist))return'外回り';
    }
    if(c.venue==='中山'){
      if([1800,2000].includes(c.dist))return'内回り';
      if([1600,2200].includes(c.dist))return'外回り';
    }
    if(c.venue==='新潟'){
      if([1200,1400,2200].includes(c.dist))return'内回り';
      if([1600,1800,2000].includes(c.dist))return'外回り';
    }
    return'';
  }

  function profile(c){
    return window.__keibaGoingProfileV341?.profiles?.[c.surface]?.[c.going]||null;
  }

  function countData(){
    let hs=[];try{hs=Array.isArray(window.horses)?window.horses:(Array.isArray(horses)?horses:[])}catch(_){hs=[]}
    let odds={};try{odds=window.oddsCache||oddsCache||{}}catch(_){odds={}}
    const quality=h=>{try{return typeof dataQuality==='function'?dataQuality(h)?.score:0}catch(_){return 0}};
    const winFor=h=>{try{return typeof winOddsFor==='function'?winOddsFor(h):h?.winOdds}catch(_){return h?.winOdds}};
    return {
      total:hs.length,
      nk:hs.filter(h=>h?.histScores?.available).length,
      jra:hs.filter(h=>(h?.jra_history||[]).length).length,
      mem:hs.filter(h=>h?.legacyMemory).length,
      blood:hs.filter(h=>h?.sire||h?.dam||h?.damsire).length,
      complete:hs.filter(h=>quality(h)===100).length,
      fill:hs.reduce((a,h)=>a+(Number(h?.jraFillCount)||0),0),
      winN:hs.filter(h=>winFor(h)).length,
      wideN:Object.keys(odds?.wide||{}).length,
      trioN:Object.keys(odds?.trio||{}).length
    };
  }

  function compactCourse(){
    const box=el('courseProfile');if(!box)return;
    const c=ctx(),p=profile(c),r=route(c);
    const w=p||{speed:.22,last3f:.18,course:.14,distance:.14};
    const shape=c.venue==='阪神'&&c.surface==='芝'&&c.dist===2000?'内回り・急坂＋同/近似コース実績を反映':`${r||c.turn+'回り'}・同/近似コースと距離実績を反映`;
    const html=`
      <div class="v349-head">
        <div><div class="v349-title">${esc(c.venue)} ${esc(c.surface)}${c.dist}m</div><div class="v349-sub">${esc(c.turn)}${r?`・${esc(r)}`:''}</div></div>
        <span class="v349-badge">${esc(c.going)}補正 ON</span>
      </div>
      <div class="v349-metrics">
        <div class="v349-box"><span>近走</span><b>${Math.round(w.speed*100)}%</b></div>
        <div class="v349-box"><span>上がり</span><b>${Math.round(w.last3f*100)}%</b></div>
        <div class="v349-box"><span>コース</span><b>${Math.round(w.course*100)}%</b></div>
        <div class="v349-box"><span>距離</span><b>${Math.round(w.distance*100)}%</b></div>
      </div>
      <div class="v349-note">${esc(shape)}</div>`;
    box.classList.add('v348-compact');
    if(box.innerHTML!==html)box.innerHTML=html;
  }

  function compactEvidence(){
    const box=el('evidence');if(!box)return;
    const c=ctx(),d=countData(),bad=Math.max(0,d.total-d.complete);
    const html=`
      <div class="v349-head"><div class="v349-title">分析根拠</div><span class="v349-badge">ペース ${esc(c.pace)}</span></div>
      <div class="v349-data-grid">
        <div class="v349-box"><span>netkeiba</span><b>${d.nk}/${d.total}</b></div>
        <div class="v349-box"><span>JRA照合</span><b>${d.jra}/${d.total}</b></div>
        <div class="v349-box"><span>学習</span><b>${d.mem}/${d.total}</b></div>
        <div class="v349-box"><span>血統</span><b>${d.blood}/${d.total}</b></div>
      </div>
      <div class="v349-row">
        <span class="v349-chip good"><b>完全 ${d.complete}</b>頭</span>
        ${bad?`<span class="v349-chip"><b>欠損 ${bad}</b>頭</span>`:''}
        ${d.fill?`<span class="v349-chip">JRA補完 <b>${d.fill}</b></span>`:''}
      </div>
      <div class="v349-row">
        <span class="v349-chip">単勝 <b>${d.winN}頭</b></span>
        <span class="v349-chip">ワイド <b>${d.wideN}点</b></span>
        <span class="v349-chip">3連複 <b>${d.trioN}点</b></span>
      </div>
      <details class="v348-tech"><summary>計算仕様を見る</summary><div class="small" style="margin-top:7px;line-height:1.55">AI順位は能力・適性のみ。1着率・3着内率はAI70%＋単勝市場30%。netkeiba5走を主評価し、JRA4走は空欄のみ補完。残る欠損は該当評価軸から除外。騎手は現騎手×当馬のJRA前4走コンビ成績を反映。馬場補正ON。</div></details>`;
    box.classList.add('v348-compact');
    if(box.innerHTML!==html)box.innerHTML=html;
  }

  function cleanRankingNote(){
    const a=el('rankingModelNoteV337'),b=el('rankingModelNoteV345');
    if(a)a.setAttribute('aria-hidden','true');
    if(b)b.setAttribute('aria-hidden','true');
  }

  function apply(){
    if(busy)return;busy=true;
    try{injectStyle();compactCourse();compactEvidence();cleanRankingNote();document.documentElement.dataset.uiCompact='v349'}
    catch(e){console.warn('v349 compact UI',e)}
    finally{busy=false}
  }
  const schedule=(ms=40)=>{clearTimeout(timer);timer=setTimeout(apply,ms)};

  const start=()=>{
    apply();
    const course=el('courseProfile'),evidence=el('evidence');
    const obs=new MutationObserver(()=>schedule(40));
    if(course)obs.observe(course,{childList:true,subtree:true});
    if(evidence)obs.observe(evidence,{childList:true,subtree:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  addEventListener('keiba-data-updated',()=>schedule(180));
  addEventListener('keiba-odds-updated',()=>schedule(120));
  addEventListener('pageshow',()=>schedule(60));
  ['venue','surface','distance','going','pace'].forEach(id=>el(id)?.addEventListener('change',()=>schedule(120)));
})();

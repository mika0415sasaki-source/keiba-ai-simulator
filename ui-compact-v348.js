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
      #rankingModelNoteV337{display:none!important}
      #courseProfile.v348-compact,#evidence.v348-compact{line-height:1.55}
      #evidence.v348-compact .v348-tech{margin-top:7px;color:#9fb0cf}
      #evidence.v348-compact .v348-tech>summary{cursor:pointer;font-weight:700;color:#cfdaf0;list-style:none}
      #evidence.v348-compact .v348-tech>summary::-webkit-details-marker{display:none}
      #evidence.v348-compact .v348-tech>summary::after{content:' ▼';font-size:10px}
      #evidence.v348-compact .v348-tech[open]>summary::after{content:' ▲'}
      #ranking details.ranking-card>summary{cursor:pointer;list-style:none;display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:9px;width:100%}
      #ranking details.ranking-card>summary::-webkit-details-marker{display:none}
      #ranking .accordion-chevron{display:inline-block;min-width:18px;text-align:center;color:#9fb0cf;font-size:14px}
      @media(max-width:700px){#courseProfile.v348-compact,#evidence.v348-compact{font-size:12px}}
    `;
    (document.head||document.documentElement).appendChild(s);
  }

  function ctx(){
    const venue=String(el('venue')?.value||'').replace(/競馬場$/,'');
    const surface=String(el('surface')?.value||'');
    const dist=Number(el('distance')?.value||0);
    const going=String(el('going')?.value||'良');
    const paceSel=String(el('pace')?.value||'自動');
    let autoPace='ミドル';try{autoPace=String((typeof raceMeta!=='undefined'&&raceMeta?.autoPace)||window.raceMeta?.autoPace||'ミドル')}catch(_){}
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
    const weights=p?`近走 ${Math.round(p.speed*100)}% / 上がり ${Math.round(p.last3f*100)}% / コース ${Math.round(p.course*100)}% / 距離 ${Math.round(p.distance*100)}%`:'';
    const shape=c.venue==='阪神'&&c.surface==='芝'&&c.dist===2000?'内回り・急坂と同/近似コース実績を反映':`${r||c.turn+'回り'}・同/近似コースと距離実績を反映`;
    const html=`<b>コース・馬場：</b> ${esc(c.venue)} ${esc(c.surface)}${c.dist}m・${esc(c.turn)}${r?` ${esc(r)}`:''} / ${esc(c.going)}補正 ON${weights?`<br><b>配分：</b> ${weights}`:''}<br><span class="small">${esc(shape)}</span>`;
    box.classList.add('v348-compact');
    if(box.innerHTML!==html)box.innerHTML=html;
  }

  function compactEvidence(){
    const box=el('evidence');if(!box)return;
    const c=ctx(),d=countData();
    const bad=Math.max(0,d.total-d.complete);
    const html=`<b>分析根拠</b><br>netkeiba ${d.nk}/${d.total}頭・JRA照合 ${d.jra}/${d.total}頭（補完 ${d.fill}）・学習 ${d.mem}/${d.total}頭・血統 ${d.blood}/${d.total}頭<br>品質：完全 ${d.complete}頭 / 欠損 ${bad}頭　｜　ペース：${esc(c.pace)}（自動 ${esc(c.autoPace)}）<br>オッズ：単勝 ${d.winN}頭・ワイド ${d.wideN}点・3連複 ${d.trioN}点<br><span class="small">AI順位＝能力・適性 / 1着率・3着内率＝AI70%＋単勝市場30% / 馬場補正ON</span><details class="v348-tech"><summary>計算仕様を見る</summary><div class="small" style="margin-top:6px">netkeiba5走を主評価し、JRA4走は空欄補完。残る欠損だけ該当評価軸から除外。騎手は現騎手×当馬のJRA前4走コンビ成績を反映。</div></details>`;
    box.classList.add('v348-compact');
    if(box.innerHTML!==html)box.innerHTML=html;
  }

  function cleanRankingNote(){
    el('rankingModelNoteV337')?.setAttribute('aria-hidden','true');
    const n=el('rankingModelNoteV345');
    if(n)n.innerHTML='<b style="color:#eef3ff">AI順位</b>＝能力・適性　／　<b style="color:#eef3ff">確率順位</b>＝AI70%＋市場30%';
  }

  function apply(){
    if(busy)return;busy=true;
    try{injectStyle();compactCourse();compactEvidence();cleanRankingNote();document.documentElement.dataset.uiCompact='v348'}
    catch(e){console.warn('v348 compact UI',e)}
    finally{busy=false}
  }
  const schedule=(ms=40)=>{clearTimeout(timer);timer=setTimeout(apply,ms)};

  const start=()=>{
    apply();
    const course=el('courseProfile'),evidence=el('evidence');
    const obs=new MutationObserver(()=>schedule(30));
    if(course)obs.observe(course,{childList:true,subtree:true});
    if(evidence)obs.observe(evidence,{childList:true,subtree:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  addEventListener('keiba-data-updated',()=>schedule(180));
  addEventListener('keiba-odds-updated',()=>schedule(120));
  addEventListener('pageshow',()=>schedule(60));
  ['venue','surface','distance','going','pace'].forEach(id=>el(id)?.addEventListener('change',()=>schedule(120)));
})();

(()=>{
  if(window.__uiSummaryStableV350)return;
  window.__uiSummaryStableV350=true;

  const el=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const TURN={札幌:'右',函館:'右',福島:'右',新潟:'左',東京:'左',中山:'右',中京:'左',京都:'右',阪神:'右',小倉:'右'};
  let timer=0;

  function injectStyle(){
    if(el('uiSummaryStableV350Style'))return;
    const s=document.createElement('style');
    s.id='uiSummaryStableV350Style';
    s.textContent=`
      #courseProfile,#evidence,#rankingModelNoteV337,#rankingModelNoteV345{display:none!important}
      #analysisSummaryV350{display:block!important;margin-top:10px;padding:12px;border:1px solid #2a6c51;border-radius:12px;background:#0d1526;line-height:1.35}
      .v350-section+.v350-section{margin-top:12px;padding-top:11px;border-top:1px solid rgba(63,86,130,.45)}
      .v350-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:9px}
      .v350-title{font-size:16px;font-weight:900;color:#eef3ff;line-height:1.2}
      .v350-sub{font-size:11px;color:#9fb0cf;margin-top:2px}
      .v350-badge{flex:0 0 auto;padding:5px 9px;border-radius:999px;border:1px solid rgba(102,224,163,.45);background:rgba(102,224,163,.10);color:#7ce7b4;font-size:11px;font-weight:900;white-space:nowrap}
      .v350-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}
      .v350-box{min-width:0;padding:8px 6px;border:1px solid rgba(63,86,130,.72);border-radius:10px;background:rgba(10,19,35,.58);text-align:center}
      .v350-box span{display:block;font-size:10px;color:#9fb0cf;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .v350-box b{display:block;margin-top:2px;font-size:15px;color:#eef3ff;line-height:1.15}
      .v350-note{margin-top:8px;font-size:11px;color:#9fb0cf}
      .v350-row{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
      .v350-chip{display:inline-flex;align-items:center;gap:4px;padding:5px 8px;border:1px solid rgba(63,86,130,.72);border-radius:999px;background:rgba(10,19,35,.58);font-size:11px;color:#aebbd3;white-space:nowrap}
      .v350-chip b{color:#eef3ff;font-size:11px}
      .v350-chip.good{border-color:rgba(102,224,163,.35);color:#82dcb3}
      #analysisSummaryV350 details{margin-top:10px;padding-top:8px;border-top:1px solid rgba(63,86,130,.45);color:#9fb0cf}
      #analysisSummaryV350 details>summary{cursor:pointer;font-size:11px;font-weight:800;color:#cfdaf0;list-style:none}
      #analysisSummaryV350 details>summary::-webkit-details-marker{display:none}
      #analysisSummaryV350 details>summary::after{content:' ▼';font-size:9px}
      #analysisSummaryV350 details[open]>summary::after{content:' ▲'}
      @media(max-width:700px){
        #analysisSummaryV350{padding:11px}
        .v350-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
        .v350-title{font-size:15px}
        .v350-box{padding:7px 5px}
        .v350-box b{font-size:14px}
      }
    `;
    (document.head||document.documentElement).appendChild(s);
  }

  function ensureHost(){
    let host=el('analysisSummaryV350');
    if(host)return host;
    const race=el('raceLabel');
    if(!race?.parentElement)return null;
    host=document.createElement('div');
    host.id='analysisSummaryV350';
    race.insertAdjacentElement('afterend',host);
    return host;
  }

  function ctx(){
    const venue=String(el('venue')?.value||'').replace(/競馬場$/,'');
    const surface=String(el('surface')?.value||'');
    const dist=Number(el('distance')?.value||0);
    const going=String(el('going')?.value||'良');
    const paceSel=String(el('pace')?.value||'自動');
    let autoPace='ミドル';
    try{autoPace=String((typeof raceMeta!=='undefined'&&raceMeta?.autoPace)||'ミドル')}catch(_){}
    const pace=paceSel==='自動'?autoPace:paceSel;
    return {venue,surface,dist,going,pace,autoPace,turn:TURN[venue]||''};
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

  function profile(c){return window.__keibaGoingProfileV341?.profiles?.[c.surface]?.[c.going]||null}

  function counts(){
    let hs=[];try{hs=Array.isArray(horses)?horses:[]}catch(_){hs=[]}
    let odds={};try{odds=oddsCache||{}}catch(_){odds={}}
    const q=h=>{try{return typeof dataQuality==='function'?dataQuality(h)?.score:0}catch(_){return 0}};
    const winFor=h=>{try{return typeof winOddsFor==='function'?winOddsFor(h):h?.winOdds}catch(_){return h?.winOdds}};
    return {
      total:hs.length,
      nk:hs.filter(h=>h?.histScores?.available).length,
      jra:hs.filter(h=>(h?.jra_history||[]).length).length,
      mem:hs.filter(h=>h?.legacyMemory).length,
      blood:hs.filter(h=>h?.sire||h?.dam||h?.damsire).length,
      complete:hs.filter(h=>q(h)===100).length,
      fill:hs.reduce((a,h)=>a+(Number(h?.jraFillCount)||0),0),
      winN:hs.filter(h=>winFor(h)).length,
      wideN:Object.keys(odds?.wide||{}).length,
      trioN:Object.keys(odds?.trio||{}).length
    };
  }

  function render(){
    injectStyle();
    const host=ensureHost();if(!host)return;
    const wasOpen=!!host.querySelector('details')?.open;
    const c=ctx(),d=counts(),p=profile(c)||{speed:.22,last3f:.18,course:.14,distance:.14},r=route(c),bad=Math.max(0,d.total-d.complete);
    const shape=c.venue==='阪神'&&c.surface==='芝'&&c.dist===2000?'内回り・急坂＋同/近似コース実績を反映':`${r||c.turn+'回り'}・同/近似コースと距離実績を反映`;
    host.innerHTML=`
      <div class="v350-section">
        <div class="v350-head">
          <div><div class="v350-title">${esc(c.venue)} ${esc(c.surface)}${c.dist}m</div><div class="v350-sub">${esc(c.turn)}${r?`・${esc(r)}`:''}</div></div>
          <span class="v350-badge">${esc(c.going)}補正 ON</span>
        </div>
        <div class="v350-grid">
          <div class="v350-box"><span>近走</span><b>${Math.round(p.speed*100)}%</b></div>
          <div class="v350-box"><span>上がり</span><b>${Math.round(p.last3f*100)}%</b></div>
          <div class="v350-box"><span>コース</span><b>${Math.round(p.course*100)}%</b></div>
          <div class="v350-box"><span>距離</span><b>${Math.round(p.distance*100)}%</b></div>
        </div>
        <div class="v350-note">${esc(shape)}</div>
      </div>
      <div class="v350-section">
        <div class="v350-head"><div class="v350-title">分析根拠</div><span class="v350-badge">ペース ${esc(c.pace)}</span></div>
        <div class="v350-grid">
          <div class="v350-box"><span>netkeiba</span><b>${d.nk}/${d.total}</b></div>
          <div class="v350-box"><span>JRA照合</span><b>${d.jra}/${d.total}</b></div>
          <div class="v350-box"><span>学習</span><b>${d.mem}/${d.total}</b></div>
          <div class="v350-box"><span>血統</span><b>${d.blood}/${d.total}</b></div>
        </div>
        <div class="v350-row">
          <span class="v350-chip good"><b>完全 ${d.complete}</b>頭</span>
          ${bad?`<span class="v350-chip"><b>欠損 ${bad}</b>頭</span>`:''}
          ${d.fill?`<span class="v350-chip">JRA補完 <b>${d.fill}</b></span>`:''}
        </div>
        <div class="v350-row">
          <span class="v350-chip">単勝 <b>${d.winN}頭</b></span>
          <span class="v350-chip">ワイド <b>${d.wideN}点</b></span>
          <span class="v350-chip">3連複 <b>${d.trioN}点</b></span>
        </div>
        <details${wasOpen?' open':''}><summary>計算仕様を見る</summary><div class="small" style="margin-top:7px;line-height:1.55">AI順位は能力・適性のみ。1着率・3着内率はAI70%＋単勝市場30%。netkeiba5走を主評価し、JRA4走は空欄のみ補完。残る欠損は該当評価軸から除外。騎手は現騎手×当馬のJRA前4走コンビ成績を反映。馬場補正ON。</div></details>
      </div>`;
    document.documentElement.dataset.uiSummaryStable='v350';
  }

  const schedule=(ms=0)=>{clearTimeout(timer);timer=setTimeout(render,ms)};

  function wrap(name,flag){
    try{
      const old=window[name];if(typeof old!=='function'||old[flag])return;
      const fn=function(...args){const out=old.apply(this,args);render();return out};
      fn[flag]=true;fn.__original=old;window[name]=fn;try{eval(`${name}=window[name]`)}catch(_){}
    }catch(e){console.warn('v350 wrap '+name,e)}
  }

  function start(){
    wrap('renderAnalysis','__v350Render');
    wrap('evalAll','__v350Eval');
    render();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  addEventListener('pageshow',()=>schedule(0));
  addEventListener('keiba-data-updated',()=>schedule(40));
  addEventListener('keiba-odds-updated',()=>schedule(40));
  addEventListener('keiba-patches-ready',()=>schedule(0));
  ['venue','surface','distance','going','pace'].forEach(id=>el(id)?.addEventListener('change',()=>schedule(0)));
})();

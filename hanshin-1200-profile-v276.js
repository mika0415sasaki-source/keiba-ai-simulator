(()=>{
  if(window.__hanshin1200ProfileV276)return;
  window.__hanshin1200ProfileV276=true;

  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const active=()=>document.getElementById('venue')?.value==='阪神'&&document.getElementById('surface')?.value==='芝'&&+(document.getElementById('distance')?.value||0)===1200;
  const profile={turn:'右',layout:'内',straight:'短',hill:'強'};

  function score(rows){
    const rr=(rows||[]).filter(r=>!r?.status&&Number.isFinite(+r?.rank)&&+r.rank>0).slice(0,5);if(!rr.length)return null;
    let total=0,wTotal=0;
    rr.forEach((r,i)=>{
      const venue=String(r.venue||r.course||'').replace(/競馬場/g,'');
      const surf=String(r.surface||'');const dist=+r.distance||0;
      let sim=.18;
      if(surf==='芝')sim+=.14;
      if(venue==='阪神')sim+=.34;
      if(venue==='阪神'&&dist===1200)sim+=.22;
      else if(venue==='阪神'&&dist===1400)sim+=.12;
      else if(dist===1200)sim+=.10;
      else if(dist>=1000&&dist<=1400)sim+=.05;
      if(['京都','中山','札幌','函館','福島','小倉'].includes(venue))sim+=.04;
      sim=clamp(sim,.15,1);
      const rank=+r.rank,field=Math.max(rank,+r.field_size||16,2);
      const perf=clamp(100-((rank-1)/Math.max(1,field-1))*68,32,100);
      const run=perf*.72+sim*100*.28;
      const rec=[1,.90,.81,.73,.66][i]||.62;
      const w=rec*(.55+.45*sim);total+=run*w;wTotal+=w;
    });
    return wTotal?clamp(total/wTotal,20,100):null;
  }

  function patchProfile(){
    if(!active())return;
    try{if(typeof raceMeta==='object'&&raceMeta){raceMeta.turn='右';raceMeta.course_layout='内';raceMeta.straight='短';raceMeta.hill='強'}}catch(_){}
    const box=document.getElementById('courseProfile');if(!box)return;
    const old=box.innerHTML||'';
    const weight=(old.match(/有効ウェイト上位[^<]*/)||[])[0]||'有効ウェイト上位：近走 22.0% / 上がり 18.0% / コース 14.0%';
    box.innerHTML=`<b>コース・馬場補正：</b> 阪神 芝1200m・右・内<br>JRAコース基礎データ：Aコースは内回り・直線356.5m・高低差1.9m。3～4コーナーから下り基調で、直線半ばまでスピードに乗り、ゴール前の急坂へ。短い直線だけの瞬発力より、先行力・コーナーでの加速・坂を踏ん張る持続力を重視<br>${weight}<br><br><span class="small">コース指数の根拠：阪神芝1200mの同競馬場・同距離を最優先。阪神芝1400m、芝1200mの他場実績を補助評価し、着順は頭数補正・直近ほど重く反映。</span>`;
  }

  function installScore(){
    try{
      if(typeof scoreLocalHistory!=='function'||scoreLocalHistory.__hanshin1200ProfileV276)return;
      const prev=scoreLocalHistory;
      const wrapped=function(rows){const out=prev.apply(this,arguments);if(!active()||!out?.available)return out;const c=score(rows);return c==null?out:{...out,course:c}};
      wrapped.__hanshin1200ProfileV276=true;wrapped.__previous=prev;scoreLocalHistory=wrapped;try{window.scoreLocalHistory=wrapped}catch(_){}
    }catch(_){}
  }

  function install(){
    installScore();
    try{
      if(typeof renderAnalysis==='function'&&!renderAnalysis.__hanshin1200ProfileV276){
        const prev=renderAnalysis;const wrapped=function(){const v=prev.apply(this,arguments);setTimeout(patchProfile,0);return v};
        wrapped.__hanshin1200ProfileV276=true;wrapped.__previous=prev;renderAnalysis=wrapped;try{window.renderAnalysis=wrapped}catch(_){}
      }
    }catch(_){}
  }

  ['venue','surface','distance','going'].forEach(id=>document.getElementById(id)?.addEventListener('change',()=>setTimeout(patchProfile,0)));
  document.addEventListener('click',e=>{const t=e.target;if(t&&(t.id==='importRace'||t.id==='analyze'||/出馬表取込|AI分析/.test(String(t.textContent||'')))){setTimeout(patchProfile,500);setTimeout(patchProfile,2200)}},true);
  let n=0;const tick=()=>{n++;install();patchProfile();if(n<30)setTimeout(tick,500)};setTimeout(tick,100);
})();
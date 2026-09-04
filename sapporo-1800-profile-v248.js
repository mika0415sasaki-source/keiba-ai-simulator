(()=>{
  if(window.__sapporo1800ProfileV248)return;
  window.__sapporo1800ProfileV248=true;

  function applySapporo1800Profile(){
    try{
      const venue=String(document.getElementById('venue')?.value||'');
      const surface=String(document.getElementById('surface')?.value||'');
      const dist=Number(document.getElementById('distance')?.value||0);
      if(venue!=='札幌'||surface!=='芝'||dist!==1800)return;

      const el=document.getElementById('courseProfile');
      if(!el)return;
      const turn=(window.raceMeta&&raceMeta.turn)||'右';
      const w=(typeof weights!=='undefined'&&weights)?weights:{speed:.22,last3f:.18,course:.14};
      el.innerHTML=
        `<b>コース・馬場補正：</b> 札幌 芝1800m・${turn}<br>`+
        `コース基礎データ：右回り・小回り寄り・直線短め。コーナー4回での立ち回りと持続力を考慮<br>`+
        `有効ウェイト上位：近走 ${(Number(w.speed||0)*100).toFixed(1)}% / 上がり ${(Number(w.last3f||0)*100).toFixed(1)}% / コース ${(Number(w.course||0)*100).toFixed(1)}%<br><br>`+
        `<span class="small">コース指数の根拠：札幌1800mの同競馬場実績を最優先し、右回り適性・小回り適性・コーナー4回での器用さ・位置取り・早めに動いて脚を長く使える持続力を重視して補正。着順を頭数で正規化し、直近ほど重く評価。</span>`;
    }catch(e){console.warn('sapporo1800 profile',e);}
  }

  function install(){
    try{
      if(typeof renderAnalysis==='function'&&!renderAnalysis.__sapporo1800V248){
        const original=renderAnalysis;
        const wrapped=function(...args){
          const r=original.apply(this,args);
          applySapporo1800Profile();
          return r;
        };
        wrapped.__sapporo1800V248=true;
        wrapped.__original=original;
        renderAnalysis=wrapped;
        try{window.renderAnalysis=wrapped;}catch(_){}
      }
    }catch(_){}
    applySapporo1800Profile();
  }

  setTimeout(install,100);
  setTimeout(install,500);
  setTimeout(install,1500);

  document.addEventListener('change',e=>{
    if(['venue','surface','distance','going'].includes(e.target?.id))setTimeout(applySapporo1800Profile,0);
  });
})();

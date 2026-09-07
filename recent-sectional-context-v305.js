(()=>{
  if(window.__recentSectionalContextV305)return;
  window.__recentSectionalContextV305=true;

  const el=id=>document.getElementById(id);
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const REC=[1,.82,.68,.56,.46];
  const oldLocal=typeof window.scoreLocalHistory==='function'?window.scoreLocalHistory:null;

  function gradeOf(r){
    const s=String(r?.grade||r?.race_grade||r?.class_name||r?.race_class||r?.class||r?.race_name||r?.raceName||'').normalize('NFKC').toUpperCase().replace(/\s+/g,'');
    if(/JPN3|JPNIII|G3|GIII/.test(s))return'G3';
    if(/JPN2|JPNII(?!I)|G2|GII(?!I)/.test(s))return'G2';
    if(/JPN1|JPNI(?!I)|G1|GI(?!I)/.test(s))return'G1';
    if(/リステッド/.test(s)||/(?:^|[^A-Z])L(?:$|[^A-Z])/.test(s))return'L';
    if(/オープン|OPEN|OP/.test(s))return'OP';
    if(/3勝/.test(s))return'3勝';if(/2勝/.test(s))return'2勝';if(/1勝/.test(s))return'1勝';
    if(/未勝利/.test(s))return'未勝利';if(/新馬/.test(s))return'新馬';return'';
  }
  const GRADE={G1:100,G2:94,G3:88,L:82,OP:78,'3勝':72,'2勝':66,'1勝':60,'未勝利':56,'新馬':54};

  function completed(rows){
    return (Array.isArray(rows)?rows:[]).filter(r=>r&&!/取消|除外|中止|失格/.test(String(r?.status||r?.result_status||r?.rank_text||''))&&Number.isFinite(+r?.rank)&&+r.rank>0).slice(0,5);
  }
  function target(){
    return {surface:el('surface')?.value||'',distance:+(el('distance')?.value||0)};
  }
  function relevance(r,t){
    let d=68;
    if(Number.isFinite(+r.distance)&&t.distance){
      const x=Math.abs(+r.distance-t.distance);
      d=x===0?100:x<=200?92:x<=400?80:x<=600?68:58;
    }
    if(t.surface&&r.surface&&r.surface!==t.surface)d=Math.min(d,55);
    return d;
  }
  function recentScore(rows){
    const rr=completed(rows),t=target();if(!rr.length)return 50;
    let n=0,d=0;
    rr.forEach((r,i)=>{
      const rank=+r.rank,field=Math.max(rank,Number.isFinite(+r.field_size)&&+r.field_size>=2?+r.field_size:16);
      const pos=clamp(100-((rank-1)/Math.max(1,field-1))*72,25,100);
      const g=GRADE[gradeOf(r)]||68;
      const rel=relevance(r,t);
      const run=.70*pos+.15*g+.15*rel;
      const w=REC[i]||.4;n+=run*w;d+=w;
    });
    return d?n/d:50;
  }

  const VENUE_ADJ={東京:-.10,新潟:-.15,京都:-.05,阪神:0,中京:.05,中山:.15,小倉:.10,福島:.15,札幌:.20,函館:.25};
  function expectedLast3f(r){
    const dist=Number.isFinite(+r.distance)?+r.distance:1600,surface=String(r.surface||'芝');
    let base,going=0;
    if(/ダ/.test(surface)){
      base=36.0+Math.max(0,dist-1200)*.0015;
      going=r.going==='稍重'?-.10:r.going==='重'?-.25:r.going==='不良'?-.35:0;
    }else{
      base=34.2+Math.max(0,dist-1600)*.0010;
      going=r.going==='稍重'?.40:r.going==='重'?.80:r.going==='不良'?1.20:0;
    }
    return base+(VENUE_ADJ[String(r.venue||'').replace(/競馬場/g,'')]||0)+going;
  }
  function sectionalScore(rows){
    const rr=completed(rows);let n=0,d=0,count=0;
    rr.forEach((r,i)=>{
      const x=+r.last3f;if(!Number.isFinite(x)||x<20||x>60)return;
      const expected=expectedLast3f(r);
      const run=clamp(75+(expected-x)*10,35,98);
      const w=REC[i]||.4;n+=run*w;d+=w;count++;
    });
    return count&&d?n/d:55;
  }

  function scoreV305(rows){
    let out={available:completed(rows).length>0,speed:50,last3f:55,distance:50,course:50};
    if(oldLocal){try{const prev=oldLocal.apply(this,arguments);if(prev&&typeof prev==='object')out={...prev}}catch(_){}}
    const rr=completed(rows);
    return {...out,available:rr.length>0,speed:recentScore(rows),last3f:sectionalScore(rows),metricVersion:'v305'};
  }
  scoreV305.__v305=true;scoreV305.__original=oldLocal;
  try{window.scoreLocalHistory=scoreV305;scoreLocalHistory=scoreV305}catch(_){}

  function recompute(){
    let hs=[];try{hs=Array.isArray(horses)?horses:[]}catch(_){return}
    for(const h of hs){
      if(Array.isArray(h?.history)&&h.history.length){h.histScores=scoreV305(h.history);h.histScores.available=true}
      else if(Array.isArray(h?.jra_history)&&h.jra_history.length&&!h.histScores){h.histScores=scoreV305(h.jra_history)}
    }
  }

  function patchQualityColor(){
    for(const box of document.querySelectorAll('#horses .status')){
      if(!/データ品質/.test(box.textContent||''))continue;
      if(/100%/.test(box.textContent||'')){box.classList.remove('bad','err');box.classList.add('ok')}
    }
  }
  function patchEvidence(){
    const cp=el('courseProfile');
    if(cp){
      let s=cp.innerHTML;
      s=s.replace(/有効ウェイト上位：[^<]*/,'最終指数の主ウェイト：近走 19.8% / 上がり 16.2% / コース 12.6% / 距離 12.6% / レース格 10.0%');
      cp.innerHTML=s;
    }
    const ev=el('evidence');if(ev){
      let d=ev.querySelector('[data-metric-v305]');if(!d){d=document.createElement('div');d.dataset.metricV305='1';d.style.marginTop='10px';ev.appendChild(d)}
      d.innerHTML='<b>近走・上がり評価 v305</b><br>近走：着順だけの単純平均を廃止。頭数に対する着順・レース格・今回距離/芝ダへの近さ・新しい走ほど重い時系列ウェイトで評価。<br>上がり：33秒台を自動的に100点へ丸める方式を廃止。芝/ダート・距離・競馬場・馬場状態ごとの基準上がりとの差を時系列加重して評価。';
    }
  }

  function wrap(name,before,after){
    try{
      const old=window[name];if(typeof old!=='function'||old.__v305)return;
      const fn=function(...args){if(before)before();const v=old.apply(this,args);if(after)after();return v};
      fn.__v305=true;fn.__original=old;window[name]=fn;
      try{if(name==='evalAll')evalAll=fn;else if(name==='renderHorses')renderHorses=fn;else if(name==='renderAnalysis')renderAnalysis=fn}catch(_){}
    }catch(e){console.warn('v305 wrap',name,e)}
  }
  function settle(){recompute();patchQualityColor();patchEvidence()}
  wrap('renderHorses',recompute,patchQualityColor);
  wrap('evalAll',recompute,null);
  wrap('renderAnalysis',null,patchEvidence);
  addEventListener('keiba-data-updated',()=>setTimeout(settle,0));
  addEventListener('pageshow',()=>setTimeout(settle,0));
  setTimeout(settle,0);
  document.documentElement.dataset.metricModel='v305';
})();

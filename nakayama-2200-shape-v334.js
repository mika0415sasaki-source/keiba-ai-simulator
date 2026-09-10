(()=>{
  if(window.__nakayama2200ShapeV334)return;
  window.__nakayama2200ShapeV334=true;

  const el=id=>document.getElementById(id);
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const REC=[1,.82,.68,.56,.46];
  const BAD=/取消|出走取消|競走除外|除外|競走中止|中止|失格/;
  const VENUE_ADJ={東京:-.10,新潟:-.15,京都:-.05,阪神:0,中京:.05,中山:.15,小倉:.10,福島:.15,札幌:.20,函館:.25};
  const oldLocal=typeof window.scoreLocalHistory==='function'?window.scoreLocalHistory:null;

  const venueOf=r=>String(r?.venue||r?.course||'').replace(/競馬場$/,'').trim();
  const surfaceOf=r=>String(r?.surface||'').trim();
  const distanceOf=r=>Number(r?.distance)||0;

  function current(){
    return {
      venue:String(el('venue')?.value||'').replace(/競馬場$/,''),
      surface:String(el('surface')?.value||''),
      distance:Number(el('distance')?.value)||0
    };
  }
  function isTarget(t=current()){
    return t.venue==='中山'&&t.surface==='芝'&&t.distance===2200;
  }
  function completed(rows){
    return (Array.isArray(rows)?rows:[]).filter(r=>r&&!BAD.test(String(r?.status||r?.result_status||r?.rank_text||''))&&Number.isFinite(+r?.rank)&&+r.rank>0).slice(0,5);
  }
  function finishScore(r){
    const rank=+r.rank;
    const field=Math.max(rank,Number.isFinite(+r.field_size)&&+r.field_size>=2?+r.field_size:16);
    return clamp(100-((rank-1)/Math.max(1,field-1))*75,25,100);
  }
  function expectedLast3f(r){
    const dist=distanceOf(r)||1600,surface=surfaceOf(r)||'芝';
    let base,going=0;
    if(/ダ/.test(surface)){
      base=36.0+Math.max(0,dist-1200)*.0015;
      going=r.going==='稍重'?-.10:r.going==='重'?-.25:r.going==='不良'?-.35:0;
    }else{
      base=34.2+Math.max(0,dist-1600)*.0010;
      going=r.going==='稍重'?.40:r.going==='重'?.80:r.going==='不良'?1.20:0;
    }
    return base+(VENUE_ADJ[venueOf(r)]||0)+going;
  }
  function sectionalScore(r){
    const x=+r?.last3f;
    if(!Number.isFinite(x)||x<20||x>60)return null;
    return clamp(75+(expectedLast3f(r)-x)*10,35,98);
  }
  function performanceScore(r){
    const f=finishScore(r),s=sectionalScore(r);
    return s==null?f:.78*f+.22*s;
  }
  function passageNums(r){
    const raw=r?.passage??r?.corner_positions??r?.corners??r?.passing_order??null;
    if(Array.isArray(raw))return raw.map(Number).filter(n=>Number.isFinite(n)&&n>0);
    if(raw==null)return [];
    return (String(raw).match(/\d+/g)||[]).map(Number).filter(n=>Number.isFinite(n)&&n>0);
  }
  function cornerSustainScore(r){
    const p=passageNums(r);if(!p.length)return null;
    const rank=+r.rank,last=p[p.length-1],prev=p.length>=2?p[p.length-2]:last;
    // 4角（最終通過点）からゴールまで順位を上げる・維持する力と、
    // その直前から4角までの進出を持続力の代理指標として数値化する。
    const movement=clamp(65+(last-rank)*5+(prev-last)*2,25,100);
    return .65*movement+.35*finishScore(r);
  }
  function weighted(rows,selector,scorer){
    let n=0,d=0,count=0;
    rows.forEach((r,i)=>{
      if(!selector(r))return;
      const v=scorer(r);if(!Number.isFinite(v))return;
      const w=REC[i]||.4;n+=v*w;d+=w;count++;
    });
    return count&&d?{score:n/d,count}:null;
  }
  function shapeFit(rows){
    const exact=weighted(rows,r=>venueOf(r)==='中山'&&surfaceOf(r)==='芝'&&distanceOf(r)===2200,performanceScore);
    const nakayama=weighted(rows,r=>venueOf(r)==='中山'&&surfaceOf(r)==='芝'&&distanceOf(r)>=1800&&distanceOf(r)<=2500,performanceScore);
    const stamina=weighted(rows,r=>surfaceOf(r)==='芝'&&distanceOf(r)>=2000&&distanceOf(r)<=2500,performanceScore);
    const corner=weighted(rows,r=>surfaceOf(r)==='芝'&&distanceOf(r)>=1800&&distanceOf(r)<=2500,cornerSustainScore);
    const cats=[
      {x:exact,w:.40,key:'exact'},
      {x:nakayama,w:.25,key:'nakayama'},
      {x:stamina,w:.20,key:'stamina'},
      {x:corner,w:.15,key:'corner'}
    ].filter(o=>o.x);
    if(!cats.length)return null;
    const sw=cats.reduce((s,o)=>s+o.w,0);
    return {
      score:cats.reduce((s,o)=>s+o.x.score*o.w,0)/sw,
      exact:exact?.score??null,
      nakayama:nakayama?.score??null,
      stamina:stamina?.score??null,
      corner:corner?.score??null,
      evidence:{exact:exact?.count||0,nakayama:nakayama?.count||0,stamina:stamina?.count||0,corner:corner?.count||0}
    };
  }

  function scoreV334(rows){
    let out={available:completed(rows).length>0,speed:50,last3f:55,distance:50,course:50};
    if(oldLocal){
      try{const prev=oldLocal.apply(this,arguments);if(prev&&typeof prev==='object')out={...prev}}catch(e){console.warn('v334 base score',e)}
    }
    if(!isTarget())return out;
    const rr=completed(rows),shape=shapeFit(rr);
    if(!shape)return {...out,courseShapeV334:true,courseShape:null,courseGeneric:Number(out.course)||50};
    const generic=Number.isFinite(+out.course)?+out.course:50;
    // 汎用コース適性68% + 中山芝2200専用形状適性32%。
    // 専用側は同コース40 / 中山芝中距離25 / 芝2000-2500持続20 / 4角持続15。
    const course=clamp(generic*.68+shape.score*.32,15,100);
    return {...out,course,courseGeneric:generic,courseShape:shape.score,courseShapeBreakdown:shape,courseShapeV334:true,metricVersionCourse:'v334'};
  }
  scoreV334.__v334=true;scoreV334.__original=oldLocal;
  try{window.scoreLocalHistory=scoreV334;scoreLocalHistory=scoreV334}catch(_){}

  function recompute(){
    if(!isTarget())return;
    let hs=[];try{hs=Array.isArray(horses)?horses:[]}catch(_){return}
    for(const h of hs){
      const rows=Array.isArray(h?.history)&&h.history.length?h.history:(Array.isArray(h?.jra_history)?h.jra_history:[]);
      if(rows.length){
        try{h.histScores=scoreV334(rows);if(h.histScores)h.histScores.available=true}catch(e){console.warn('v334 horse score',h?.name,e)}
      }
    }
  }
  function patchProfile(){
    const box=el('courseProfile');if(!box)return;
    let d=box.querySelector('[data-nk2200-v334]');
    if(!isTarget()){
      if(d)d.remove();
      return;
    }
    if(!d){d=document.createElement('div');d.dataset.nk2200V334='1';d.style.marginTop='6px';box.appendChild(d)}
    d.innerHTML='<b>中山芝2200専用数値補正：</b> 汎用コース適性68%＋専用形状適性32%。専用形状は「同コース実績40% / 中山芝1800〜2500mの坂・機動力25% / 芝2000〜2500mの持続力20% / 4角〜ゴールの位置取り維持・上昇15%」で計算。通過順が無い走は4角項目だけ除外し、取得済み項目で再配分します。';
  }
  function patchEvidence(){
    const box=el('evidence');if(!box)return;
    let d=box.querySelector('[data-nk2200-evidence-v334]');
    if(!isTarget()){
      if(d)d.remove();
      return;
    }
    if(!d){d=document.createElement('div');d.dataset.nk2200EvidenceV334='1';d.style.marginTop='10px';box.appendChild(d)}
    d.innerHTML='<b>中山芝2200コース形状 v334</b><br>表示説明だけでなく、実際の「コース適性」数値へ専用補正を反映済み。着順・頭数・上がり・競馬場・距離・通過順（取得時）を使い、同コース実績と持続戦への適性を評価します。';
  }
  function settle(){recompute();patchProfile();patchEvidence()}
  function wrap(name,before,after,mark){
    try{
      const old=window[name];if(typeof old!=='function'||old[mark])return;
      const fn=function(...args){before?.();const v=old.apply(this,args);after?.();return v};
      fn[mark]=true;fn.__original=old;window[name]=fn;
      try{if(name==='evalAll')evalAll=fn;else if(name==='renderHorses')renderHorses=fn;else if(name==='renderAnalysis')renderAnalysis=fn}catch(_){}
    }catch(e){console.warn('v334 wrap '+name,e)}
  }
  wrap('evalAll',recompute,()=>{patchProfile();patchEvidence()},'__nk2200v334Eval');
  wrap('renderHorses',recompute,null,'__nk2200v334Render');
  wrap('renderAnalysis',null,()=>{patchProfile();patchEvidence()},'__nk2200v334Analysis');
  for(const id of ['venue','surface','distance'])el(id)?.addEventListener('change',()=>setTimeout(()=>{
    settle();try{if(Array.isArray(horses)&&horses.length&&typeof evalAll==='function')evalAll()}catch(_){}
  },0));
  addEventListener('keiba-data-updated',()=>setTimeout(()=>{
    settle();try{if(Array.isArray(horses)&&horses.length&&typeof evalAll==='function')evalAll()}catch(_){}
  },80));
  addEventListener('pageshow',()=>setTimeout(settle,0));
  setTimeout(settle,0);
  document.documentElement.dataset.nakayam2200Shape='v334';
})();

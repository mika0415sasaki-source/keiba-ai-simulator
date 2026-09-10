(()=>{
  if(window.__courseScoreCorrectionV330)return;
  window.__courseScoreCorrectionV330=true;

  const el=id=>document.getElementById(id);
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const TURN={札幌:'右',函館:'右',福島:'右',新潟:'左',東京:'左',中山:'右',中京:'左',京都:'右',阪神:'右',小倉:'右'};

  // 距離だけから内外を確定できる競馬場・条件だけを定義する。
  // 不確かな条件は null とし、内外補正を掛けない。
  function routeOf(venue,surface,dist){
    venue=String(venue||'').replace(/競馬場$/,''); surface=String(surface||''); dist=+dist||0;
    if(surface!=='芝')return null;
    if(venue==='阪神'){
      if([1200,1400,2000,2200,3000].includes(dist))return '内';
      if([1600,1800,2400].includes(dist))return '外';
    }
    if(venue==='中山'){
      if([1600,2200].includes(dist))return '外';
      if([1800,2000].includes(dist))return '内';
    }
    if(venue==='新潟'){
      if([1600,1800,2000].includes(dist))return '外';
      if([1200,1400,2200].includes(dist))return '内';
    }
    return null;
  }

  function currentCourse(){
    const venue=String(el('venue')?.value||'').replace(/競馬場$/,''),surface=String(el('surface')?.value||''),dist=+(el('distance')?.value||0);
    return {venue,surface,dist,turn:TURN[venue]||'',route:routeOf(venue,surface,dist)};
  }

  function runCourseScore(r,cur){
    const venue=String(r?.venue||r?.course||'').replace(/競馬場$/,''),surface=String(r?.surface||''),dist=+(r?.distance||0);
    if(!venue||!surface||!dist)return null;
    const turn=TURN[venue]||'',route=routeOf(venue,surface,dist);
    let s=34;
    if(surface===cur.surface)s+=10; else s-=12;
    if(venue===cur.venue)s+=24;
    if(dist===cur.dist)s+=18;
    else if(Math.abs(dist-cur.dist)<=200)s+=10;
    else if(Math.abs(dist-cur.dist)<=400)s+=4;
    else s-=4;
    if(turn&&cur.turn&&turn===cur.turn)s+=5;
    if(route&&cur.route){s+=route===cur.route?9:-5;}
    // 同一競馬場・同芝ダ・同距離は最重要。阪神芝2000のような内回り適性がここで直接効く。
    if(venue===cur.venue&&surface===cur.surface&&dist===cur.dist)s+=8;
    return clamp(s,15,100);
  }

  function courseScore(rows){
    const cur=currentCourse(),valid=(Array.isArray(rows)?rows:[]).filter(r=>r&&!/取消|除外|中止|失格/.test(String(r.status||''))&&+r.rank>0).slice(0,5);
    const vals=valid.map((r,i)=>({v:runCourseScore(r,cur),w:[1.35,1.20,1.08,1.00,.94][i]||.9})).filter(x=>Number.isFinite(x.v));
    if(!vals.length)return 50;
    return vals.reduce((s,x)=>s+x.v*x.w,0)/vals.reduce((s,x)=>s+x.w,0);
  }

  function patchScoreLocalHistory(){
    try{
      const old=window.scoreLocalHistory;
      if(typeof old!=='function'||old.__v330)return;
      const fn=function(rows){
        const out=old.apply(this,arguments)||{};
        const c=courseScore(rows);
        return {...out,course:c,course_v330:true};
      };
      fn.__v330=true;fn.__original=old;
      window.scoreLocalHistory=fn;try{scoreLocalHistory=fn}catch(_){}
    }catch(e){console.warn('course score v330 install',e)}
  }

  function recalcHistScores(){
    try{
      if(!Array.isArray(horses)||typeof scoreLocalHistory!=='function')return;
      horses=horses.map(h=>{
        const z={...h};
        const rows=(Array.isArray(z.history)&&z.history.length)?z.history:(Array.isArray(z.jra_history)?z.jra_history:[]);
        if(rows.length){z.histScores=scoreLocalHistory(rows);if(z.histScores)z.histScores.available=true;}
        return z;
      });
    }catch(e){console.warn('course score v330 recalc',e)}
  }

  function patchProfile(){
    const box=el('courseProfile');if(!box)return;
    const cur=currentCourse(),route=cur.route?`・${cur.route}回り`:'',line=`コース適性指数：同競馬場・同芝ダ・同距離を最重視し、${cur.turn||'回り不明'}回り${route}と近似距離も実際の指数計算へ反映。`;
    if(box.querySelector('.course-score-v330'))box.querySelector('.course-score-v330').textContent=line;
    else{const d=document.createElement('div');d.className='course-score-v330';d.style.marginTop='4px';d.textContent=line;box.appendChild(d);}
  }

  function wrapEval(){
    try{
      const old=window.evalAll;
      if(typeof old!=='function'||old.__courseV330)return;
      const fn=function(...args){recalcHistScores();const out=old.apply(this,args);patchProfile();return out};
      fn.__courseV330=true;fn.__original=old;window.evalAll=fn;try{evalAll=fn}catch(_){}
    }catch(e){console.warn('eval wrap v330',e)}
  }
  function wrapRenderHorses(){
    try{
      const old=window.renderHorses;
      if(typeof old!=='function'||old.__courseV330)return;
      const fn=function(...args){recalcHistScores();return old.apply(this,args)};
      fn.__courseV330=true;fn.__original=old;window.renderHorses=fn;try{renderHorses=fn}catch(_){}
    }catch(_){}
  }

  patchScoreLocalHistory();wrapEval();wrapRenderHorses();recalcHistScores();patchProfile();
  addEventListener('keiba-data-updated',()=>setTimeout(()=>{recalcHistScores();try{if(Array.isArray(horses)&&horses.length)evalAll()}catch(_){};patchProfile()},40));
  for(const id of ['venue','surface','distance'])el(id)?.addEventListener('change',()=>setTimeout(()=>{recalcHistScores();try{if(Array.isArray(horses)&&horses.length)evalAll()}catch(_){};patchProfile()},0));
  document.documentElement.dataset.courseScore='v330';
})();

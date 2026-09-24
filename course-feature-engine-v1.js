(()=>{
  if(window.__courseFeatureEngineV1)return;
  window.__courseFeatureEngineV1=true;
  const el=id=>document.getElementById(id),clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const TURN={札幌:'右',函館:'右',福島:'右',新潟:'左',東京:'左',中山:'右',中京:'左',京都:'右',阪神:'右',小倉:'右'};
  function normVenue(v){return String(v||'').normalize('NFKC').replace(/競馬場$/,'').trim()}
  function letterFrom(v){const s=String(v||'').normalize('NFKC');const m=s.match(/(?:^|[^A-Z])([ABCD])(?:コース|course)?(?:$|[^A-Z])/i);return m?m[1].toUpperCase():''}
  function layoutFrom(v){const s=String(v||'').normalize('NFKC');if(/(?:^|[\s(（])外(?:回り|コース)?(?:$|[\s)）])/i.test(s)||/outer/i.test(s))return'外';if(/(?:^|[\s(（])内(?:回り|コース)?(?:$|[\s)）])/i.test(s)||/inner/i.test(s))return'内';return''}
  function turnFrom(v){const s=String(v||'').normalize('NFKC');const m=s.match(/[（(]\s*(左|右)/);return m?m[1]:''}
  function inferLayout(venue,surface,distance){
    const v=normVenue(venue),s=String(surface||''),d=+distance||0;
    if(s!=='芝')return'';
    if(v==='阪神'){
      if(d===1600||d===1800)return'外';
      if(d===2000||d===2200)return'内';
      if(d===2400)return'外';
    }
    if(v==='京都'){
      if(d===1400||d===1600||d===1800||d===2200||d===2400||d===3000||d===3200)return'外';
      if(d===2000)return'内';
    }
    if(v==='中山'){
      if(d===1800||d===2000||d===2500)return'内';
      if(d===2200||d===2600||d===3200||d===3600||d===4000)return'外';
    }
    return'';
  }
  function metaCurrent(){
    const vals=[];
    try{if(window.raceMeta)vals.push(raceMeta.courseCode,raceMeta.course_code,raceMeta.course_letter,raceMeta.courseLetter,raceMeta.turfCourse,raceMeta.course,raceMeta.course_label,raceMeta.courseName,raceMeta.course_text,raceMeta.course_layout,raceMeta.layout,raceMeta.turn)}catch(_){}
    try{vals.push(window.currentRace?.courseCode,window.currentRace?.course_code,window.currentRace?.course_letter,window.currentRace?.courseLetter,window.currentRace?.course,window.currentRace?.course_label,window.currentRace?.courseName,window.currentRace?.course_text,window.currentRace?.course_layout,window.currentRace?.layout,window.currentRace?.turn)}catch(_){}
    try{vals.push(el('course')?.value,el('courseCode')?.value,el('courseLetter')?.value,el('courseLayout')?.value,el('turn')?.value)}catch(_){}
    let letter='',layout='',turn='';
    for(const x of vals){if(!letter)letter=letterFrom(x);if(!layout)layout=layoutFrom(x);if(!turn)turn=turnFrom(x)}
    const venue=normVenue(el('venue')?.value),surface=String(el('surface')?.value||''),dist=+(el('distance')?.value||0);
    if(!layout)layout=inferLayout(venue,surface,dist);
    if(!turn)turn=TURN[venue]||'';
    return{letter,layout,turn}
  }
  function metaRow(r){
    const vals=[r?.course_code,r?.courseCode,r?.course_letter,r?.courseLetter,r?.turf_course,r?.turfCourse,r?.course_label,r?.courseName,r?.course,r?.course_layout,r?.layout,r?.course_text,r?.turn];
    let letter='',layout='',turn='';
    for(const x of vals){if(!letter)letter=letterFrom(x);if(!layout)layout=layoutFrom(x);if(!turn)turn=turnFrom(x)}
    if(!turn)turn=String(r?.turn||'').normalize('NFKC').match(/^(左|右)$/)?.[1]||'';
    if(!layout)layout=inferLayout(r?.venue||r?.courseVenue||r?.race_venue,r?.surface,+r?.distance||0);
    return{letter,layout,turn}
  }
  function current(){
    const venue=normVenue(el('venue')?.value),surface=String(el('surface')?.value||''),dist=+(el('distance')?.value||0),m=metaCurrent();
    return{venue,surface,dist,turn:m.turn,letter:m.letter,layout:m.layout}
  }
  function similarity(r,cur){
    const venue=normVenue(r?.venue||r?.courseVenue||r?.race_venue),surface=String(r?.surface||''),dist=+(r?.distance||0);
    if(!venue||!surface||!dist)return null;
    const rm=metaRow(r);let s=50;
    s+=venue===cur.venue?18:-8;
    s+=surface===cur.surface?10:-12;
    const diff=Math.abs(dist-cur.dist);s+=dist===cur.dist?12:diff<=200?7:diff<=400?2:-6;
    if(cur.turn&&rm.turn)s+=rm.turn===cur.turn?5:-4;
    if(cur.layout&&rm.layout)s+=rm.layout===cur.layout?8:-5;
    if(cur.letter&&rm.letter)s+=rm.letter===cur.letter?10:-6;
    return clamp(s,10,100)
  }
  function geometry(r,cur){
    const venue=normVenue(r?.venue||r?.courseVenue||r?.race_venue),surface=String(r?.surface||''),dist=+(r?.distance||0),rm=metaRow(r);
    if(!venue||!surface||!dist)return null;
    if(venue!==cur.venue||surface!==cur.surface)return 45;
    const d=Math.abs(dist-cur.dist);let s=d===0?92:d<=200?78:d<=400?63:45;
    if(cur.turn&&rm.turn)s+=rm.turn===cur.turn?4:-4;
    if(cur.layout&&rm.layout)s+=rm.layout===cur.layout?7:-5;
    if(cur.letter&&rm.letter)s+=rm.letter===cur.letter?8:-5;
    return clamp(s,20,100)
  }
  function performance(r){const rank=Math.max(1,+r?.rank||1),field=Number.isFinite(+r?.field_size)&&+r.field_size>=rank&&+r.field_size>=2?+r.field_size:16;return clamp(100-((rank-1)/Math.max(1,field-1))*75,25,100)}
  function score(rows){
    const cur=current(),valid=(Array.isArray(rows)?rows:[]).filter(r=>r&&!/取消|除外|中止|失格/.test(String(r?.status||r?.result_status||r?.rank_text||''))&&Number.isFinite(+r?.rank)&&+r.rank>0).slice(0,5);
    if(!valid.length)return 50;
    let n=0,d=0,count=0;
    valid.forEach((r,i)=>{
      const fs=similarity(r,cur),gs=geometry(r,cur);if(!Number.isFinite(fs)||!Number.isFinite(gs))return;
      const perf=performance(r),sim=.65*fs+.35*gs,rel=.25+.75*(sim/100),value=50+(perf-50)*rel,w=([1.30,1.18,1.08,1.00,.94][i]||.9)*(.45+.55*(sim/100));
      n+=value*w;d+=w;count++
    });
    return count&&d?clamp(n/d,20,100):50
  }
  function patch(){
    try{
      const old=window.scoreLocalHistory;if(typeof old!=='function'||old.__courseFeatureV1)return false;
      const fn=function(rows){const out=old.apply(this,arguments)||{};return{...out,course:score(rows),course_feature_v1:true}};
      fn.__courseFeatureV1=true;fn.__original=old;window.scoreLocalHistory=fn;try{scoreLocalHistory=fn}catch(_){}return true
    }catch(e){console.warn('course feature v1 install',e);return false}
  }
  function recalc(){
    try{
      if(!Array.isArray(horses)||typeof scoreLocalHistory!=='function')return;
      horses=horses.map(h=>{const z={...h},rows=(Array.isArray(z.history)&&z.history.length)?z.history:(Array.isArray(z.jra_history)?z.jra_history:[]);if(!rows.length)return z;z.histScores=scoreLocalHistory(rows);if(z.histScores)z.histScores.available=true;return z});
      try{if(typeof evalAll==='function')evalAll()}catch(_){ }
    }catch(e){console.warn('course feature v1 recalc',e)}
  }
  function start(){if(!patch())return setTimeout(start,80);recalc();document.documentElement.dataset.courseFeature='v1'}
  start();
  addEventListener('keiba-data-updated',()=>setTimeout(recalc,150));
  ['venue','surface','distance'].forEach(id=>el(id)?.addEventListener('change',()=>setTimeout(recalc,80)));
})();
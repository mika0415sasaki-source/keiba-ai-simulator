(()=>{
  if(window.__courseFeatureEngineV1)return;
  window.__courseFeatureEngineV1=true;

  const el=id=>document.getElementById(id);
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const TURN={札幌:'右',函館:'右',福島:'右',新潟:'左',東京:'左',中山:'右',中京:'左',京都:'右',阪神:'右',小倉:'右'};
  const ROUTE={
    阪神:{1200:'内',1400:'内',1600:'外',1800:'外',2000:'内',2200:'内',2400:'外',3000:'内'},
    中山:{1200:'内',1600:'外',1800:'内',2000:'内',2200:'外',2500:'内'},
    新潟:{1200:'内',1400:'内',1600:'外',1800:'外',2000:'内',2200:'内'},
    京都:{1200:'内',1400:'内',1600:'外',1800:'外',2000:'内',2200:'外',2400:'外',3000:'外',3200:'外'}
  };
  const COURSE={
    札幌:{A:{width:25,straight:266},B:{width:20,straight:266},C:{width:16,straight:266}},
    函館:{A:{width:29,straight:262},B:{width:25,straight:262},C:{width:20,straight:262}},
    福島:{A:{width:25,straight:292},B:{width:22,straight:292},C:{width:18,straight:292}},
    新潟:{A:{width:25,straight:359},B:{width:21,straight:359}},
    東京:{A:{width:31,straight:526},B:{width:27,straight:526},C:{width:25,straight:526},D:{width:22,straight:526}},
    中山:{A:{width:32,straight:310},B:{width:29,straight:310},C:{width:26,straight:310}},
    中京:{A:{width:28,straight:412},B:{width:25,straight:412}},
    京都:{A:{width:38,straight:328},B:{width:33,straight:323},C:{width:28,straight:323},D:{width:24,straight:323}},
    阪神:{A:{width:28,straight:473},B:{width:24,straight:476}},
    小倉:{A:{width:30,straight:293},B:{width:26,straight:293}}
  };

  function normVenue(v){return String(v||'').normalize('NFKC').replace(/競馬場$/,'').trim()}
  function letterFrom(v){
    const s=String(v||'').normalize('NFKC');
    const m=s.match(/(?:^|[^A-Z])([ABCD])(?:コース|course)?(?:$|[^A-Z])/i);
    return m?m[1].toUpperCase():'';
  }
  function routeOf(venue,surface,dist){
    venue=normVenue(venue); if(String(surface||'')!=='芝')return '';
    return ROUTE[venue]?.[+dist]||'';
  }
  function explicitCurrentLetter(){
    const candidates=[];
    try{
      if(window.raceMeta){candidates.push(raceMeta.courseCode,raceMeta.course_letter,raceMeta.courseLetter,raceMeta.turfCourse,raceMeta.course)}
    }catch(_){}
    try{candidates.push(window.currentRace?.courseCode,window.currentRace?.course_letter,window.currentRace?.courseLetter,window.currentRace?.course)}catch(_){}
    try{candidates.push(el('course')?.value,el('courseCode')?.value,el('courseLetter')?.value)}catch(_){}
    for(const x of candidates){const l=letterFrom(x);if(l)return l}
    return '';
  }
  function rowLetter(r){
    if(!r)return '';
    const vals=[r.course_code,r.courseCode,r.course_letter,r.courseLetter,r.turf_course,r.turfCourse,r.course_label,r.courseName,r.course];
    for(const x of vals){const l=letterFrom(x);if(l)return l}
    return '';
  }
  function current(){
    const venue=normVenue(el('venue')?.value),surface=String(el('surface')?.value||''),dist=+(el('distance')?.value||0);
    return {venue,surface,dist,turn:TURN[venue]||'',route:routeOf(venue,surface,dist),letter:explicitCurrentLetter()};
  }
  function featureSimilarity(r,cur){
    const venue=normVenue(r?.venue||r?.courseVenue||r?.race_venue),surface=String(r?.surface||''),dist=+(r?.distance||0);
    if(!venue||!surface||!dist)return null;
    let s=50;
    if(venue===cur.venue)s+=18; else s-=8;
    if(surface===cur.surface)s+=10; else s-=12;
    const diff=Math.abs(dist-cur.dist); s+=dist===cur.dist?12:diff<=200?7:diff<=400?2:-6;
    const rt=routeOf(venue,surface,dist); if(rt&&cur.route)s+=rt===cur.route?7:-5;
    const rl=rowLetter(r); if(cur.letter&&rl)s+=rl===cur.letter?8:-4;
    return clamp(s,10,100);
  }
  function geometrySimilarity(r,cur){
    const venue=normVenue(r?.venue||r?.courseVenue||r?.race_venue),surface=String(r?.surface||''),dist=+(r?.distance||0);
    if(!venue||!surface||!dist)return null;
    const sameVenue=venue===cur.venue, sameSurface=surface===cur.surface;
    if(!sameVenue||!sameSurface)return 45;
    const d=Math.abs(dist-cur.dist);
    let s=d===0?92:d<=200?78:d<=400?63:45;
    const rr=routeOf(venue,surface,dist); if(rr&&cur.route)s+=(rr===cur.route?5:-6);
    return clamp(s,20,100);
  }
  function performance(r){
    const rank=Math.max(1,+r?.rank||1),field=Number.isFinite(+r?.field_size)&&+r.field_size>=rank&&+r.field_size>=2?+r.field_size:16;
    return clamp(100-((rank-1)/Math.max(1,field-1))*75,25,100);
  }
  function enhancedCourseScore(rows){
    const cur=current();
    const valid=(Array.isArray(rows)?rows:[]).filter(r=>r&&!/取消|除外|中止|失格/.test(String(r?.status||r?.result_status||r?.rank_text||''))&&Number.isFinite(+r?.rank)&&+r.rank>0).slice(0,5);
    if(!valid.length)return 50;
    let n=0,d=0,count=0;
    valid.forEach((r,i)=>{
      const fs=featureSimilarity(r,cur); if(!Number.isFinite(fs))return;
      const gs=geometrySimilarity(r,cur); if(!Number.isFinite(gs))return;
      const perf=performance(r);
      const similarity=.65*fs+.35*gs;
      const relevance=.25+.75*(similarity/100);
      const value=50+(perf-50)*relevance;
      const w=([1.30,1.18,1.08,1.00,.94][i]||.9)*(.45+.55*(similarity/100));
      n+=value*w;d+=w;count++;
    });
    return count&&d?clamp(n/d,20,100):50;
  }
  function patch(){
    try{
      const old=window.scoreLocalHistory;
      if(typeof old!=='function'||old.__courseFeatureV1)return false;
      const fn=function(rows){
        const out=old.apply(this,arguments)||{};
        return {...out,course:enhancedCourseScore(rows),course_feature_v1:true};
      };
      fn.__courseFeatureV1=true;fn.__original=old;
      window.scoreLocalHistory=fn;try{scoreLocalHistory=fn}catch(_){}
      return true;
    }catch(e){console.warn('course feature v1 install',e);return false}
  }
  function recalc(){
    try{
      if(!Array.isArray(horses)||typeof scoreLocalHistory!=='function')return;
      horses=horses.map(h=>{
        const z={...h},rows=(Array.isArray(z.history)&&z.history.length)?z.history:(Array.isArray(z.jra_history)?z.jra_history:[]);
        if(!rows.length)return z;
        z.histScores=scoreLocalHistory(rows); if(z.histScores)z.histScores.available=true;
        return z;
      });
      try{if(typeof evalAll==='function')evalAll()}catch(_){}
    }catch(e){console.warn('course feature v1 recalc',e)}
  }
  function start(){if(!patch())return setTimeout(start,80);recalc();document.documentElement.dataset.courseFeature='v1'}
  start();
  addEventListener('keiba-data-updated',()=>setTimeout(recalc,150));
  ['venue','surface','distance'].forEach(id=>el(id)?.addEventListener('change',()=>setTimeout(recalc,80)));
})();
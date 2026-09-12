(()=>{
  if(window.__analysisBaseline20260910V358)return;
  window.__analysisBaseline20260910V358=true;

  const el=id=>document.getElementById(id);
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const norm=s=>String(s||'').normalize('NFKC').replace(/[\s　]+/g,'').trim();
  const REC=[1,.82,.68,.56,.46];
  const CONF={0:0,1:48,2:61,3:74,4:87,5:100};
  const JRA_VENUES=new Set(['札幌','函館','福島','新潟','東京','中山','中京','京都','阪神','小倉']);
  const GRADE={G1:100,G2:94,G3:88,L:82,OP:78,'3勝':72,'2勝':66,'1勝':60,'未勝利':56,'新馬':54};
  const GRADE_BLEND={G1:100,G2:92,G3:85,L:78,OP:74,'海外ハンデ':70,'3勝':67,'2勝':60,'1勝':54,'未勝利':48,'新馬':48,'未勝利・新馬':48};
  const VENUE_ADJ={東京:-.10,新潟:-.15,京都:-.05,阪神:0,中京:.05,中山:.15,小倉:.10,福島:.15,札幌:.20,函館:.25};

  function normalizeGrade(v){
    const s=String(v||'').normalize('NFKC').toUpperCase().replace(/Ｇ/g,'G').replace(/Ⅲ/g,'III').replace(/Ⅱ/g,'II').replace(/Ⅰ/g,'I').replace(/３/g,'3').replace(/２/g,'2').replace(/１/g,'1').replace(/\s+/g,'');
    if(/JPN3|JPNIII|G3|GIII/.test(s))return'G3';
    if(/JPN2|JPNII(?!I)|G2|GII(?!I)/.test(s))return'G2';
    if(/JPN1|JPNI(?!I)|G1|GI(?!I)/.test(s))return'G1';
    if(/リステッド/.test(s)||/(?:^|[^A-Z])L(?:$|[^A-Z])/.test(s))return'L';
    if(/オープン|OPEN|OP/.test(s))return'OP';
    if(/3勝/.test(s))return'3勝';if(/2勝/.test(s))return'2勝';if(/1勝/.test(s))return'1勝';
    if(/未勝利/.test(s))return'未勝利';if(/新馬/.test(s))return'新馬';
    if(/ハンデ/.test(s))return'海外ハンデ';
    return'';
  }
  function runGrade(r){return normalizeGrade(r?.grade||r?.race_grade||r?.class_name||r?.race_class||r?.class||r?.race_name||r?.raceName||r?.title||r?.race||'')}
  function completed(rows){
    return (Array.isArray(rows)?rows:[]).filter(r=>r&&!/取消|除外|中止|失格/.test(String(r?.status||r?.result_status||r?.rank_text||''))&&Number.isFinite(+r?.rank)&&+r.rank>0).slice(0,5);
  }
  function target(){return {surface:String(el('surface')?.value||''),distance:+(el('distance')?.value||0)}}
  function relevance(r,t){
    let d=68;
    if(Number.isFinite(+r.distance)&&t.distance){const x=Math.abs(+r.distance-t.distance);d=x===0?100:x<=200?92:x<=400?80:x<=600?68:58}
    if(t.surface&&r.surface&&r.surface!==t.surface)d=Math.min(d,55);
    return d;
  }
  function recentScore(rows){
    const rr=completed(rows),t=target();if(!rr.length)return 50;
    let n=0,d=0;
    rr.forEach((r,i)=>{
      const rank=+r.rank,field=Math.max(rank,Number.isFinite(+r.field_size)&&+r.field_size>=2?+r.field_size:16);
      const pos=clamp(100-((rank-1)/Math.max(1,field-1))*72,25,100);
      const g=GRADE[runGrade(r)]||68,rel=relevance(r,t),run=.70*pos+.15*g+.15*rel,w=REC[i]||.4;
      n+=run*w;d+=w;
    });
    return d?n/d:50;
  }
  function expectedLast3f(r){
    const dist=Number.isFinite(+r.distance)?+r.distance:1600,surface=String(r.surface||'芝');let base,going=0;
    if(/ダ/.test(surface)){base=36.0+Math.max(0,dist-1200)*.0015;going=r.going==='稍重'?-.10:r.going==='重'?-.25:r.going==='不良'?-.35:0}
    else{base=34.2+Math.max(0,dist-1600)*.0010;going=r.going==='稍重'?.40:r.going==='重'?.80:r.going==='不良'?1.20:0}
    return base+(VENUE_ADJ[String(r.venue||'').replace(/競馬場/g,'')]||0)+going;
  }
  function sectionalScore(rows){
    const rr=completed(rows);let n=0,d=0,count=0;
    rr.forEach((r,i)=>{const x=+r.last3f;if(!Number.isFinite(x)||x<20||x>60)return;const run=clamp(75+(expectedLast3f(r)-x)*10,35,98),w=REC[i]||.4;n+=run*w;d+=w;count++});
    return count&&d?n/d:55;
  }
  function gradeFeature(rows){
    let n=0,d=0,count=0;
    completed(rows).forEach((run,i)=>{const g=runGrade(run);if(!g)return;const rank=+run.rank,field=Math.max(rank,+run.field_size||18,2),perf=rank?Math.max(35,100-((rank-1)/Math.max(1,field-1))*65):68,rating=Number.isFinite(+run.rating)&&+run.rating>=70?Math.max(45,Math.min(100,(+run.rating-80)*1.65+50)):(GRADE_BLEND[g]||68),value=(GRADE_BLEND[g]||68)*.68+perf*.22+rating*.10,w=REC[i]||.4;n+=value*w;d+=w;count++});
    return {score:+(d?n/d:68).toFixed(1),count};
  }
  function rowsOf(h){const rows=(Array.isArray(h?.history)&&h.history.length?h.history:(Array.isArray(h?.jra_history)?h.jra_history:[]));return completed(rows)}
  function dateKey(v){const m=String(v||'').normalize('NFKC').replace(/[年月]/g,'-').replace(/日/g,'').match(/(20\d{2})[\/.-](\d{1,2})[\/.-](\d{1,2})/);return m?+m[1]*10000+(+m[2])*100+(+m[3]):null}
  function earliest(rows){return rows.slice().sort((a,b)=>(dateKey(a?.date)||99999999)-(dateKey(b?.date)||99999999))[0]||null}
  function isDebut(r){return /新馬/.test([r?.grade,r?.race_grade,r?.class_name,r?.race_class,r?.class,r?.race_name,r?.raceName,r?.title,r?.race].filter(Boolean).join(' '))}
  function isForeignRun(r){const v=String(r?.venue||'').replace(/競馬場/g,'').trim();return !!v&&!JRA_VENUES.has(v)}
  function historicalQuality(h){
    const rows=rowsOf(h),n=rows.length;if(!n)return 0;
    let have=0,total=0;
    for(const r of rows){const checks=[+r.rank>0,!!r.venue,!!r.surface,Number.isFinite(+r.distance)&&+r.distance>0,!!r.going,!!r.jockey];const l3=Number(r.last3f);if(Number.isFinite(l3)&&l3>=20&&l3<=60)checks.push(true);else if(!isForeignRun(r))checks.push(false);for(const ok of checks){total++;if(ok)have++}}
    const career=n>=5||isDebut(earliest(rows)),fieldScore=Math.round(have/Math.max(1,total)*100),cap=career?100:(CONF[n]??100);
    return Math.min(fieldScore,cap);
  }
  function gradeKnown(h){return rowsOf(h).some(r=>!!runGrade(r))}
  function horseSource(e){try{return (Array.isArray(horses)?horses:[]).find(h=>+h.no===+e.no||norm(h.name)===norm(e.name))||e}catch(_){return e}}

  function installHistoryModel(){
    let old=null;try{old=window.scoreLocalHistory}catch(_){}
    if(typeof old!=='function'||old.__baseline20260910V358)return false;
    const fn=function(rows){
      let out={};try{out=old.apply(this,arguments)||{}}catch(_){out={}}
      const rr=completed(rows);
      return {...out,available:rr.length>0,speed:recentScore(rows),last3f:sectionalScore(rows),metricVersion:'20260910-v305-baseline'};
    };
    fn.__baseline20260910V358=true;fn.__original=old;
    try{window.scoreLocalHistory=fn;scoreLocalHistory=fn}catch(_){}
    return true;
  }

  function installJockeyModel(){
    let old=null;try{old=window.jockeyComboScore}catch(_){}
    if(typeof old!=='function'||old.__baseline20260910V358)return false;
    const fn=function(h){
      const j=norm(h?.jockey||h?.rider||''),rows=j?(h?.history||[]).filter(r=>norm(r?.jockey||'')&&norm(r.jockey).includes(j)):[];
      if(rows.length)return rows.map(r=>clamp(105-(+r.rank-1)*8,20,100)).reduce((a,b)=>a+b,0)/rows.length;
      return old(h);
    };
    fn.__baseline20260910V358=true;fn.__original=old;
    try{window.jockeyComboScore=fn;jockeyComboScore=fn}catch(_){}
    return true;
  }

  function recalcHist(){
    try{
      if(!Array.isArray(horses)||typeof scoreLocalHistory!=='function')return;
      horses=horses.map(h=>{const z={...h},rows=(Array.isArray(z.history)&&z.history.length)?z.history:(Array.isArray(z.jra_history)?z.jra_history:[]);if(rows.length){z.histScores=scoreLocalHistory(rows);if(z.histScores)z.histScores.available=true}return z});
    }catch(e){console.warn('v358 hist',e)}
  }

  function installEvalModel(){
    let old=null;try{old=window.evalAll}catch(_){}
    if(typeof old!=='function'||old.__baseline20260910V358)return false;
    const fn=function(...args){
      recalcHist();
      const out=old.apply(this,args);
      try{
        if(Array.isArray(evaluated)){
          evaluated=evaluated.map(e=>{
            const src=horseSource(e),gf=gradeFeature(src?.history||src?.jra_history||[]),raw=+e.score||0;
            let score=clamp(raw*.90+gf.score*.10,0,100),baseScore=clamp((+e.baseScore||raw)*.90+gf.score*.10,0,100);
            const newQ=historicalQuality(src),oldQ=Number.isFinite(+e.quality)?+e.quality:newQ;
            if(Number.isFinite(newQ)&&oldQ!==newQ){
              const rawAxes=(+e.speed||0)*(weights?.speed??.22)+(+e.last3f||0)*(weights?.last3f??.18)+(+e.course||0)*(weights?.course??.14)+(+e.distance||0)*(weights?.distance??.14)+(+e.jockey||0)*(weights?.jockey??.10)+(+e.blood||0)*(weights?.blood??.08)+(+e.trainer||0)*(weights?.trainer??.06)+(+e.condition||0)*(weights?.condition??.08);
              const oldF=clamp(oldQ/100,.55,1),newF=clamp(newQ/100,.55,1),mix=gradeKnown(src)?.90:1,delta=rawAxes*(newF-oldF)*mix;
              score=clamp(score+delta,0,100);baseScore=clamp(baseScore+delta,0,100);
            }
            const marketProb=e.winOdds?100/(+e.winOdds):0,winP=clamp((score-55)*.55+(marketProb?marketProb*.22:0),3,42),place=clamp(winP*2.65+3,10,82),fair=winP?100/winP:null,valueIndex=e.winOdds&&fair?(+e.winOdds)/fair:1;
            return {...e,score,baseScore,gradeScore:gf.score,quality:newQ,winP,place,valueIndex,analysisBaselineV358:true};
          }).sort((a,b)=>b.score-a.score||(+a.no||999)-(+b.no||999));
        }
      }catch(e){console.warn('v358 eval post',e)}
      return evaluated||out;
    };
    fn.__baseline20260910V358=true;fn.__original=old;
    try{window.evalAll=fn;evalAll=fn}catch(_){}
    return true;
  }

  function install(){
    const a=installHistoryModel(),b=installJockeyModel(),c=installEvalModel();
    if(a||b||c){recalcHist();document.documentElement.dataset.analysisBaseline='20260910-v358'}
    return typeof window.evalAll==='function'&&window.evalAll.__baseline20260910V358;
  }

  let tries=0;const timer=setInterval(()=>{tries++;if(install()||tries>=40)clearInterval(timer)},50);
  install();
})();
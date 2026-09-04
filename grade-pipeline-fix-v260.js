(()=>{
  if(window.__gradePipelineFixV260)return;
  window.__gradePipelineFixV260=true;

  const clean=v=>String(v??'').normalize('NFKC').replace(/[\s　]+/g,'').trim();
  const isMissing=v=>{
    const s=clean(v);
    return !s||/^(格)?(情報)?(なし|無し|未取得|不明|中立)$/.test(s)||/格情報なし|格未取得/.test(s);
  };
  const normalizeGrade=v=>{
    const s=String(v??'').normalize('NFKC').toUpperCase()
      .replace(/Ｇ/g,'G').replace(/Ⅲ/g,'III').replace(/Ⅱ/g,'II').replace(/Ⅰ/g,'I')
      .replace(/３/g,'3').replace(/２/g,'2').replace(/１/g,'1').replace(/\s+/g,'');
    if(/JPN3|JPNIII|G3|GIII/.test(s))return 'G3';
    if(/JPN2|JPNII(?!I)|G2|GII(?!I)/.test(s))return 'G2';
    if(/JPN1|JPNI(?!I)|G1|GI(?!I)/.test(s))return 'G1';
    if(/リステッド|(?:^|[^A-Z])L(?:$|[^A-Z])/.test(s))return 'L';
    if(/オープン|OPEN|OP/.test(s))return 'OP';
    if(/3勝/.test(s))return '3勝';
    if(/2勝/.test(s))return '2勝';
    if(/1勝/.test(s))return '1勝';
    if(/未勝利|新馬/.test(s))return '未勝利・新馬';
    if(/ハンデ/.test(s))return '海外ハンデ';
    return '';
  };
  const candidates=r=>[
    r?.grade,r?.race_grade,r?.class_name,r?.race_class,r?.class,
    r?.race_name,r?.raceName,r?.title,r?.race,r?.category,r?.race_type,
    r?.condition,r?.conditions,r?.remarks,r?.note,r?.result,r?.source
  ];
  const inferGrade=r=>{
    for(const v of candidates(r)){
      if(isMissing(v))continue;
      const g=normalizeGrade(v);
      if(g)return g;
    }
    try{
      for(const [k,v] of Object.entries(r||{})){
        if(typeof v!=='string'&&typeof v!=='number')continue;
        if(/grade|class|race|title|condition|remark|note|source/i.test(k)){
          const g=normalizeGrade(v);
          if(g)return g;
        }
      }
    }catch(_){}
    return '';
  };
  const fixRun=r=>{
    if(!r||typeof r!=='object')return false;
    const current=normalizeGrade(r.grade);
    if(current){ if(r.grade!==current){r.grade=current;return true} return false; }
    const inferred=inferGrade(r);
    if(inferred){r.grade=inferred;return true}
    if(isMissing(r.grade)&&r.grade){r.grade='';return true}
    return false;
  };
  const fixRows=rows=>{let changed=false;for(const r of rows||[])if(fixRun(r))changed=true;return changed};
  const horseList=()=>{
    try{if(typeof horses!=='undefined'&&Array.isArray(horses))return horses}catch(_){}
    return Array.isArray(window.horses)?window.horses:[];
  };
  const fixAll=()=>{
    let changed=false;
    for(const h of horseList()){
      if(!Array.isArray(h?.history))continue;
      if(fixRows(h.history))changed=true;
      if(typeof window.scoreLocalHistory==='function'&&h.history.length){
        try{h.histScores=window.scoreLocalHistory(h.history);h.histScores.available=true}catch(_){}
      }
    }
    return changed;
  };

  function wrapApplyHistory(){
    const fn=window.__applyHistoryV57;
    if(typeof fn!=='function'||fn.__gradePipelineFixV260)return false;
    const wrapped=function(h,rows,...rest){
      const safe=Array.isArray(rows)?rows.map(r=>({...r})):rows;
      if(Array.isArray(safe))fixRows(safe);
      const out=fn.call(this,h,safe,...rest);
      if(Array.isArray(h?.history))fixRows(h.history);
      return out;
    };
    wrapped.__gradePipelineFixV260=true;
    wrapped.__original=fn;
    window.__applyHistoryV57=wrapped;
    return true;
  }

  function wrapScore(){
    const fn=window.scoreLocalHistory;
    if(typeof fn!=='function'||fn.__gradePipelineFixV260)return false;
    const wrapped=function(rows,...rest){
      if(Array.isArray(rows))fixRows(rows);
      return fn.call(this,rows,...rest);
    };
    wrapped.__gradePipelineFixV260=true;
    wrapped.__original=fn;
    window.scoreLocalHistory=wrapped;
    try{scoreLocalHistory=wrapped}catch(_){}
    return true;
  }

  function wrapRender(){
    const fn=window.renderHorses;
    if(typeof fn!=='function'||fn.__gradePipelineFixV260)return false;
    const wrapped=function(...args){fixAll();return fn.apply(this,args)};
    wrapped.__gradePipelineFixV260=true;
    wrapped.__original=fn;
    window.renderHorses=wrapped;
    try{renderHorses=wrapped}catch(_){}
    return true;
  }

  let n=0;
  const tick=()=>{
    n++;
    wrapApplyHistory();wrapScore();wrapRender();
    const changed=fixAll();
    if(changed&&typeof window.renderHorses==='function'){
      try{window.renderHorses()}catch(_){}
    }
    if(n<40)setTimeout(tick,500);
  };
  setTimeout(tick,100);
})();

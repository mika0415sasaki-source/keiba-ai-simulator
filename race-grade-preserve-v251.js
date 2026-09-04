(()=>{
  if(window.__raceGradePreserveV251)return;
  window.__raceGradePreserveV251=true;

  const normGrade=v=>{
    const s=String(v||'').toUpperCase().replace(/Ｇ/g,'G').replace(/Ⅲ/g,'III').replace(/Ⅱ/g,'II').replace(/Ⅰ/g,'I').replace(/３/g,'3').replace(/２/g,'2').replace(/１/g,'1').replace(/\s+/g,'');
    if(/JPN3|JPNIII|G3|GIII/.test(s))return 'G3';
    if(/JPN2|JPNII(?!I)|G2|GII(?!I)/.test(s))return 'G2';
    if(/JPN1|JPNI(?!I)|G1|GI(?!I)/.test(s))return 'G1';
    if(/リステッド|(?:^|[^A-Z])L(?:$|[^A-Z])/.test(s))return 'L';
    if(/オープン|OPEN|OP/.test(s))return 'OP';
    if(/3勝/.test(s))return '3勝';
    if(/2勝/.test(s))return '2勝';
    if(/1勝/.test(s))return '1勝';
    if(/未勝利/.test(s))return '未勝利';
    if(/新馬/.test(s))return '新馬';
    return '';
  };
  const key=r=>{
    const d=String(r?.date||'').replace(/\D/g,'');
    return `${d.slice(-4)}|${String(r?.venue||'').replace(/競馬場/g,'')}|${r?.surface||''}|${Number(r?.distance||0)}|${Number(r?.rank||0)}`;
  };
  function enrichHorse(h){
    if(!h||!Array.isArray(h.history))return;
    const refs=[...(Array.isArray(h.jra_history)?h.jra_history:[]),...(Array.isArray(h.history)?h.history:[])];
    const map=new Map();
    for(const r of refs){
      const g=normGrade(r?.grade||r?.race_grade||r?.class_name||r?.race_class||r?.class||r?.race_name||r?.raceName||r?.title||r?.race);
      const rn=String(r?.race_name||r?.raceName||r?.title||r?.race||'').trim();
      if(g||rn)map.set(key(r),{grade:g,race_name:rn});
    }
    for(const r of h.history){
      let g=normGrade(r?.grade||r?.race_grade||r?.class_name||r?.race_class||r?.class||r?.race_name||r?.raceName||r?.title||r?.race);
      const found=map.get(key(r));
      if(!g&&found?.grade){r.grade=found.grade;g=found.grade;}
      if(!r.race_name&&found?.race_name)r.race_name=found.race_name;
      if(!g){
        const text=[r?.race_name,r?.raceName,r?.title,r?.race,r?.class_name,r?.race_class,r?.class].filter(Boolean).join(' ');
        const inferred=normGrade(text);
        if(inferred)r.grade=inferred;
      }
    }
  }
  function applyAll(){
    let list=[];try{list=(typeof horses!=='undefined'&&Array.isArray(horses))?horses:(Array.isArray(window.horses)?window.horses:[]);}catch(_){}
    list.forEach(enrichHorse);
  }
  function wrap(name){
    try{
      const fn=window[name]||globalThis[name];
      if(typeof fn!=='function'||fn.__gradePreserveV251)return;
      const w=function(...args){applyAll();const out=fn.apply(this,args);applyAll();return out;};
      w.__gradePreserveV251=true;
      try{globalThis[name]=w;}catch(_){}
      try{window[name]=w;}catch(_){}
    }catch(_){}
  }
  setTimeout(()=>{applyAll();wrap('renderHorses');wrap('evalAll');try{if(typeof renderHorses==='function')renderHorses();}catch(_){}},300);
  setTimeout(()=>{applyAll();try{if(typeof renderHorses==='function')renderHorses();}catch(_){}},1200);
})();

(()=>{
  if(window.__recentScoreCorrectionV1)return;
  window.__recentScoreCorrectionV1=true;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const REC=[1,.82,.68,.56,.46];
  const norm=s=>String(s||'').normalize('NFKC').replace(/[\s　]+/g,'').trim();
  const GRADE={G1:100,G2:94,G3:88,L:82,OP:78,'3勝':72,'2勝':66,'1勝':60,'未勝利':56,'新馬':54};
  function grade(v){const s=String(v||'').normalize('NFKC').toUpperCase().replace(/Ｇ/g,'G').replace(/Ⅲ/g,'III').replace(/Ⅱ/g,'II').replace(/Ⅰ/g,'I').replace(/\s+/g,'');if(/G3|GIII|JPN3|JPNIII/.test(s))return'G3';if(/G2|GII|JPN2|JPNII(?!I)/.test(s))return'G2';if(/G1|GI|JPN1|JPNI(?!I)/.test(s))return'G1';if(/リステッド|(^|[^A-Z])L([^A-Z]|$)/.test(s))return'L';if(/オープン|OPEN|OP/.test(s))return'OP';if(/3勝/.test(s))return'3勝';if(/2勝/.test(s))return'2勝';if(/1勝/.test(s))return'1勝';if(/未勝利/.test(s))return'未勝利';if(/新馬/.test(s))return'新馬';return''}
  function runGrade(r){return grade(r?.grade||r?.race_grade||r?.class_name||r?.race_class||r?.class||r?.race_name||r?.raceName||r?.title||r?.race||'')}
  function target(){return {surface:String(document.getElementById('surface')?.value||''),distance:+(document.getElementById('distance')?.value||0)}}
  function relevance(r,t){let d=68;if(Number.isFinite(+r.distance)&&t.distance){const x=Math.abs(+r.distance-t.distance);d=x===0?100:x<=200?92:x<=400?80:x<=600?68:58}if(t.surface&&r.surface&&r.surface!==t.surface)d=Math.min(d,55);return d}
  function completed(rows){return(Array.isArray(rows)?rows:[]).filter(r=>r&&!/取消|除外|中止|失格/.test(String(r?.status||r?.result_status||r?.rank_text||''))&&Number.isFinite(+r?.rank)&&+r.rank>0).slice(0,5)}
  function recentScore(rows){const rr=completed(rows),t=target();if(!rr.length)return 50;let n=0,d=0;rr.forEach((r,i)=>{const rank=+r.rank,field=Math.max(rank,Number.isFinite(+r.field_size)&&+r.field_size>=2?+r.field_size:16);const pos=clamp(100-((rank-1)/Math.max(1,field-1))*72,25,100);const g=GRADE[runGrade(r)]||68,rel=relevance(r,t),run=.55*pos+.15*g+.30*rel,w=REC[i]||.4;n+=run*w;d+=w});return d?n/d:50}
  const old=window.scoreLocalHistory;if(typeof old!=='function')return;
  const fn=function(rows){let out={};try{out=old.apply(this,arguments)||{}}catch(_){};return {...out,speed:recentScore(rows),metricVersion:'recent-score-correction-v1'}};
  fn.__recentScoreCorrectionV1=true;fn.__original=old;window.scoreLocalHistory=fn;try{scoreLocalHistory=fn}catch(_){}
  try{
    if(typeof window.evalAll==='function'){
      const oe=window.evalAll;
      window.evalAll=function(...a){
        try{
          if(Array.isArray(window.horses))window.horses=window.horses.map(h=>{const z={...h},rows=(Array.isArray(z.history)&&z.history.length)?z.history:(Array.isArray(z.jra_history)?z.jra_history:[]);if(rows.length)z.histScores=window.scoreLocalHistory(rows);return z});
        }catch(_){}
        const out=oe.apply(this,a);
        try{
          if(Array.isArray(window.evaluated)){
            window.evaluated=window.evaluated.map(e=>{
              const h=(Array.isArray(window.horses)?window.horses:[]).find(x=>+x.no===+e.no||norm(x.name)===norm(e.name));
              const rows=h?(Array.isArray(h.history)&&h.history.length?h.history:(Array.isArray(h.jra_history)?h.jra_history:[])):[];
              return rows.length?{...e,speed:recentScore(rows),recentScore:recentScore(rows)}:e;
            });
          }
        }catch(_){}
        return window.evaluated||out;
      };
      try{evalAll=window.evalAll}catch(_){}
    }
  }catch(_){ }
})();
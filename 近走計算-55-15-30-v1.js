(()=>{
  if(window.__recentScoreNamedV1)return;
  window.__recentScoreNamedV1=true;

  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const REC=[1,.82,.68,.56,.46];
  const GRADE={G1:100,G2:94,G3:88,L:82,OP:78,'3勝':72,'2勝':66,'1勝':60,'未勝利':56,'新馬':54};
  const gradeOf=r=>{
    const s=String(r?.grade||r?.race_grade||r?.class_name||r?.race_class||r?.class||r?.race_name||r?.raceName||r?.title||r?.race||'').normalize('NFKC').toUpperCase().replace(/\s+/g,'');
    if(/G3|GIII|JPN3|JPNIII/.test(s))return'G3';
    if(/G2|GII|JPN2|JPNII(?!I)/.test(s))return'G2';
    if(/G1|GI|JPN1|JPNI(?!I)/.test(s))return'G1';
    if(/リステッド|(^|[^A-Z])L([^A-Z]|$)/.test(s))return'L';
    if(/オープン|OPEN|OP/.test(s))return'OP';
    if(/3勝/.test(s))return'3勝';if(/2勝/.test(s))return'2勝';if(/1勝/.test(s))return'1勝';
    if(/未勝利/.test(s))return'未勝利';if(/新馬/.test(s))return'新馬';return'';
  };
  const completed=rows=>(Array.isArray(rows)?rows:[]).filter(r=>r&&!/取消|除外|中止|失格/.test(String(r?.status||r?.result_status||r?.rank_text||''))&&Number.isFinite(+r?.rank)&&+r.rank>0).slice(0,5);
  const target=()=>({surface:String(document.getElementById('surface')?.value||''),distance:+(document.getElementById('distance')?.value||0)});
  const relevance=(r,t)=>{
    let d=68;
    if(Number.isFinite(+r.distance)&&t.distance){const x=Math.abs(+r.distance-t.distance);d=x===0?100:x<=200?92:x<=400?80:x<=600?68:58}
    if(t.surface&&r.surface&&String(r.surface)!==t.surface)d=Math.min(d,55);
    return d;
  };
  const recentScore=rows=>{
    const rr=completed(rows),t=target();if(!rr.length)return 50;
    let n=0,d=0;
    rr.forEach((r,i)=>{
      const rank=+r.rank;
      const field=Math.max(rank,Number.isFinite(+r.field_size)&&+r.field_size>=2?+r.field_size:16);
      const pos=clamp(100-((rank-1)/Math.max(1,field-1))*72,25,100);
      const g=GRADE[gradeOf(r)]||68;
      const rel=relevance(r,t);
      const run=.55*pos+.15*g+.30*rel;
      const w=REC[i]||.4;n+=run*w;d+=w;
    });
    return d?n/d:50;
  };

  let installed=false;
  function apply(){
    if(!Array.isArray(window.horses)||!window.horses.length)return;
    for(const h of window.horses){
      const rows=Array.isArray(h?.history)&&h.history.length?h.history:(Array.isArray(h?.jra_history)?h.jra_history:[]);
      if(rows.length){
        const base=h.histScores&&typeof h.histScores==='object'?h.histScores:{};
        h.histScores={...base,speed:recentScore(rows),metricVersion:'近走計算-55-15-30-v1'};
      }
    }
    if(Array.isArray(window.evaluated)){
      window.evaluated=window.evaluated.map(e=>{
        const h=window.horses.find(x=>+x?.no===+e?.no||String(x?.name||'')===String(e?.name||''));
        const rows=h?(Array.isArray(h.history)&&h.history.length?h.history:(Array.isArray(h.jra_history)?h.jra_history:[])):[];
        return rows.length?{...e,speed:recentScore(rows),recentScore:recentScore(rows)}:e;
      });
    }
  }
  function install(){
    if(installed)return true;
    if(typeof window.scoreLocalHistory!=='function')return false;
    const old=window.scoreLocalHistory;
    if(old.__recentNamedWrapper)return true;
    const wrapped=function(rows,...args){
      const out=old.apply(this,[rows,...args]);
      return {...(out&&typeof out==='object'?out:{}),speed:recentScore(rows),metricVersion:'近走計算-55-15-30-v1'};
    };
    wrapped.__recentNamedWrapper=true;wrapped.__original=old;
    window.scoreLocalHistory=wrapped;try{scoreLocalHistory=wrapped}catch(_){}
    installed=true;apply();
    return true;
  }
  let tries=0;
  const boot=()=>{if(install()){apply();return}if(++tries<80)setTimeout(boot,100)};
  addEventListener('keiba-patches-ready',()=>setTimeout(boot,0));
  addEventListener('keiba-data-updated',()=>{boot();setTimeout(apply,0)});
  addEventListener('pageshow',()=>setTimeout(boot,0));
  boot();
})();
(()=>{
  if(window.__recentScoreNamedV1)return;
  window.__recentScoreNamedV1=true;

  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const REC=[1,.82,.68,.56,.46];
  const FULL_WEIGHT=REC.reduce((a,b)=>a+b,0);
  const NEUTRAL=68;
  const GRADE={G1:100,G2:94,G3:88,L:82,OP:78,'3勝':72,'2勝':66,'1勝':60,'未勝利':56,'新馬':54};
  const gradeOf=r=>{
    const s=String(r?.grade||r?.race_grade||r?.class_name||r?.race_class||r?.class||r?.race_name||r?.raceName||r?.title||r?.race||'').normalize('NFKC').toUpperCase().replace(/\\s+/g,'');
    if(/G3|GIII|JPN3|JPNIII/.test(s))return'G3';
    if(/G2|GII|JPN2|JPNII(?!I)/.test(s))return'G2';
    if(/G1|GI|JPN1|JPNI(?!I)/.test(s))return'G1';
    if(/リステッド|(^|[^A-Z])L([^A-Z]|$)/.test(s))return'L';
    if(/オープン|OPEN|OP/.test(s))return'OP';
    if(/3勝/.test(s))return'3勝';if(/2勝/.test(s))return'2勝';if(/1勝/.test(s))return'1勝';
    if(/未勝利/.test(s))return'未勝利';if(/新馬/.test(s))return'新馬';return'';
  };

  function targetDateKey(){
    try{
      const url=String(document.getElementById('raceUrl')?.value||'');
      if(typeof window.raceDateFromUrl==='function'){
        const d=String(window.raceDateFromUrl(url)||'').replace(/\\D/g,'');
        if(/^20\\d{6}$/.test(d))return d;
      }
      if(typeof window.raceIdFromUrl==='function'){
        const id=String(window.raceIdFromUrl(url)||'').replace(/\\D/g,'');
        if(/^20\\d{10}$/.test(id))return id.slice(0,8);
      }
      const m=url.match(/(20\\d{2})[\\/-]?(\\d{2})[\\/-]?(\\d{2})/);
      return m?m[1]+m[2]+m[3]:'';
    }catch(_){return ''}
  }

  function rowDateKey(r,targetYear){
    const vals=[r?.date,r?.race_date,r?.raceDate,r?.開催日,r?.race_date_text,r?.date_text];
    for(const raw of vals){
      const s=String(raw??'').normalize('NFKC').trim();
      if(!s)continue;
      let m=s.match(/(20\\d{2})[\\/-\\.](\\d{1,2})[\\/-\\.](\\d{1,2})/);
      if(m)return m[1]+String(+m[2]).padStart(2,'0')+String(+m[3]).padStart(2,'0');
      m=s.match(/\\b(20\\d{2})(\\d{2})(\\d{2})\\b/);
      if(m)return m[1]+m[2]+m[3];
      m=s.match(/(?:^|\\D)(\\d{1,2})[\\/-\\.](\\d{1,2})(?:$|\\D)/);
      if(m&&targetYear){const mo=+m[1],day=+m[2],tdk=targetDateKey(),tm=tdk?+tdk.slice(4,6):0,td=tdk?+tdk.slice(6,8):0,y=(mo>tm||(mo===tm&&day>td))?targetYear-1:targetYear;return String(y)+String(mo).padStart(2,'0')+String(day).padStart(2,'0');}
    }
    const ids=[r?.race_id,r?.raceId,r?.raceid];
    for(const raw of ids){
      const s=String(raw??'').replace(/\\D/g,'');
      if(/^20\\d{10}$/.test(s))return s.slice(0,8);
    }
    return '';
  }

  // 予想対象レースと同日以降の結果は、予想時点では存在しないため近走から除外する。
  // 対象日が取れている場合、日付を解釈できない行も近走には入れない。
  // 近走の実走数を水増ししないため、同一レースの重複行もここで1走に統合する。
  function historyBeforeTarget(rows){
    if(!Array.isArray(rows)||!rows.length)return [];
    const target=targetDateKey(),year=target?+target.slice(0,4):0;
    const list=rows.map((r,i)=>({r,i,d:rowDateKey(r,year)}));
    const filtered=target?list.filter(x=>x.d&&x.d<target):list;
    const seen=new Set(),unique=[];
    filtered.sort((a,b)=>{
      if(a.d&&b.d)return b.d.localeCompare(a.d);
      return a.i-b.i;
    });
    for(const item of filtered){
      const r=item.r;
      const key=[
        item.d||'',
        String(r?.venue||''),
        String(r?.surface||''),
        Number(r?.distance)||0,
        Number(r?.rank)||0
      ].join('|');
      if(seen.has(key))continue;
      seen.add(key);
      unique.push(r);
    }
    return unique;
  }

  const completed=rows=>historyBeforeTarget(rows)
    .filter(r=>r&&!/取消|除外|中止|失格/.test(String(r?.status||r?.result_status||r?.rank_text||''))&&Number.isFinite(+r?.rank)&&+r.rank>0)
    .slice(0,5);
  const target=()=>({surface:String(document.getElementById('surface')?.value||''),distance:+(document.getElementById('distance')?.value||0)});
  const relevance=(r,t)=>{
    let d=68;
    if(Number.isFinite(+r.distance)&&t.distance){const x=Math.abs(+r.distance-t.distance);d=x===0?100:x<=200?92:x<=400?80:x<=600?68:58}
    if(t.surface&&r.surface&&String(r.surface)!==t.surface)d=Math.min(d,55);
    return d;
  };
  // 過去走は「何頭中何着か」で評価する。
  // 取得元によって頭数のキーや表示形式が異なるため、field_sizeだけに依存しない。
  function fieldSizeOf(r){
    const direct=[
      r?.field_size,r?.fieldSize,r?.field,r?.runners,r?.runner_count,
      r?.horse_count,r?.head_count,r?.entry_count,r?.entries,r?.total_horses
    ];
    for(const v of direct){
      const n=Number(String(v??'').replace(/[^0-9]/g,''));
      if(Number.isFinite(n)&&n>=2&&n<=30)return n;
    }
    const text=[r?.field_text,r?.field_size_text,r?.race_field,r?.race_info,r?.title,r?.race_name]
      .map(v=>String(v??'')).join(' ');
    const m=text.match(/(?:18|17|16|15|14|13|12|11|10|9|8|7|6|5|4|3|2)頭/);
    if(m){
      const n=Number(m[0].replace(/[^0-9]/g,''));
      if(n>=2&&n<=30)return n;
    }
    return null;
  }
  window.__recentScoreAuthoritative=finalRecentScore;
  const recentScore=rows=>finalRecentScore(rows);

  let installed=false;
  function finalRecentScore(rows){
  const rr=completed(rows);
  if(!rr.length)return 50;
  let n=0,d=0;
  rr.forEach((r,i)=>{
    const rank=+r.rank,actualField=fieldSizeOf(r),field=Math.max(rank,actualField||16);
    const pos=clamp(100-((rank-1)/Math.max(1,field-1))*72,25,100);
    const g=GRADE[gradeOf(r)]||68,rel=relevance(r,target());
    const run=.55*pos+.15*g+.30*rel,w=REC[i]||.4;
    n+=run*w;d+=w;
  });
  const raw=n/d;
  const credibility=Math.min(1,rr.length/5);
  return clamp(NEUTRAL+(raw-NEUTRAL)*credibility,25,100);
}

function apply(){
    if(!Array.isArray(window.horses)||!window.horses.length)return;
    for(const h of window.horses){
      if(Array.isArray(h?.history)&&h.history.length)h.history=historyBeforeTarget(h.history);
      if(Array.isArray(h?.jra_history)&&h.jra_history.length)h.jra_history=historyBeforeTarget(h.jra_history);
      const rows=Array.isArray(h?.history)&&h.history.length?h.history:(Array.isArray(h?.jra_history)?h.jra_history:[]);
      if(rows.length){
        const base=h.histScores&&typeof h.histScores==='object'?h.histScores:{};
        h.histScores={...base,speed:recentScore(rows),metricVersion:'近走計算-55-15-30-v2-history-confidence'};
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
      const out=old.apply(this,[historyBeforeTarget(rows),...args]);
      return {...(out&&typeof out==='object'?out:{}),speed:recentScore(rows),metricVersion:'近走計算-55-15-30-v2-history-confidence'};
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

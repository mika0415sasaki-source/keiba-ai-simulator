(()=>{
  if(window.__sameRaceLearningGuardV357)return;
  window.__sameRaceLearningGuardV357=true;

  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

  function parseRaceId(value){
    let s=String(value||'').trim();
    for(let i=0;i<3;i++){try{s=decodeURIComponent(s)}catch(_){break}}
    let m=s.match(/(?:race_id[=:_\/-]*|\/race\/|rid\|)(20\d{10})/i)||s.match(/\b(20\d{10})\b/);
    if(m)return m[1];
    m=s.match(/(?:sw01|pw01)(?:ddd|dde|sde)(?:10|01)?(\d{2})(20\d{2})(\d{2})(\d{2})(\d{2})(?:20\d{6})?/i);
    if(m)return `${m[2]}${m[1]}${m[3]}${m[4]}${m[5]}`;
    try{
      if(typeof window.raceIdFromUrl==='function')return String(window.raceIdFromUrl(s)||'');
    }catch(_){ }
    return '';
  }

  function currentRaceId(){
    const candidates=[];
    try{candidates.push(document.getElementById('raceUrl')?.value)}catch(_){}
    try{candidates.push(window.raceMeta?.race_id,window.raceMeta?.raceId,window.raceMeta?.id)}catch(_){}
    try{candidates.push(window.oddsCache?.race_id)}catch(_){}
    for(const x of candidates){
      const id=parseRaceId(x);
      if(id)return id;
    }
    return '';
  }

  function rowRaceId(row){
    if(!row)return '';
    const direct=[row.raceId,row.race_id,row.raceKey,row.race_key,row.resultUrl,row.result_url,row.raceUrl,row.race_url];
    for(const x of direct){const id=parseRaceId(x);if(id)return id}
    return '';
  }

  function guardedLegacyBonus(h){
    const m=h?.legacyMemory;
    if(!m)return 0;
    const originalRows=Array.isArray(m.learnedResults)?m.learnedResults:[];
    const rid=currentRaceId();

    // per-race履歴がある馬は、その履歴だけで学習補正を計算する。
    // 現在表示中のレースIDは必ず除外し、結果を知った後に同じレース自身へ加点しない。
    if(originalRows.length){
      const rows=rid?originalRows.filter(x=>rowRaceId(x)!==rid):originalRows.slice();
      if(!rows.length){
        document.documentElement.dataset.sameRaceLearningExcluded=rid?'yes':'no';
        return 0;
      }
      const venue=String(document.getElementById('venue')?.value||'');
      const going=String(document.getElementById('going')?.value||'');
      const dist=+(document.getElementById('distance')?.value||0);
      const surface=String(document.getElementById('surface')?.value||'');
      const bucket=d=>d<=1400?'短距離':d<=1800?'マイル中距離':d<=2200?'中距離':'長距離';
      const stat=a=>{
        const p=a.map(x=>+x.pos||0).filter(x=>x>0);
        if(!p.length)return 0;
        const avg=p.reduce((s,x)=>s+x,0)/p.length;
        const top=p.filter(x=>x<=3).length/p.length;
        let b=avg<=3?2.5:avg>=8?-1.5:0;
        if(top>=.5)b+=1.5;
        return b*(p.length/(p.length+4));
      };
      const c=stat(rows.filter(x=>String(x.course||'').replace(/競馬場/g,'')===venue&&String(x.surface||'')===surface));
      const g=stat(rows.filter(x=>String(x.going||'')===going));
      const d=stat(rows.filter(x=>bucket(+x.distance||0)===bucket(dist)));
      if(rid&&rows.length!==originalRows.length)document.documentElement.dataset.sameRaceLearningExcluded='yes';
      return clamp(c*.40+g*.25+d*.35,-3,3);
    }

    // 旧形式の集計メモリしかない場合は、既存ロジックを維持する。
    try{
      if(typeof guardedLegacyBonus.__original==='function')return guardedLegacyBonus.__original(h);
    }catch(_){ }
    return 0;
  }

  function install(){
    let old=null;
    try{old=window.legacyBonus}catch(_){}
    if(typeof old!=='function'||old.__sameRaceGuardV357)return false;
    guardedLegacyBonus.__original=old;
    guardedLegacyBonus.__sameRaceGuardV357=true;
    try{window.legacyBonus=guardedLegacyBonus}catch(_){}
    try{legacyBonus=guardedLegacyBonus}catch(_){}
    document.documentElement.dataset.sameRaceLearningGuard='v357';
    return true;
  }

  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if(install()||tries>=40)clearInterval(timer);
  },50);
  install();

  // 結果保存後にメモリを再読込して再分析しても、現在レース自身は加点対象外。
  addEventListener('keiba-data-updated',()=>{install();try{if(typeof evalAll==='function')evalAll()}catch(_){}});
  addEventListener('pageshow',install);
})();

(()=>{
  if(window.__historyIntegrityV249)return;
  window.__historyIntegrityV249=true;

  const JRA_VENUES=['札幌','函館','福島','新潟','東京','中山','中京','京都','阪神','小倉'];
  const cleanVenue=v=>String(v||'').replace(/競馬場/g,'').trim();
  const isJraVenue=v=>JRA_VENUES.some(x=>cleanVenue(v).includes(x));
  const normDate=v=>{
    const s=String(v||'').trim();
    let m=s.match(/^(20\d{2})[-\/.](\d{1,2})[-\/.](\d{1,2})$/);
    if(m)return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;
    m=s.match(/^(\d{1,2})[-\/.](\d{1,2})$/);
    if(m){const y=new Date().getFullYear();return `${y}-${String(m[1]).padStart(2,'0')}-${String(m[2]).padStart(2,'0')}`;}
    return '';
  };
  const currentRaceDate=()=>{
    const candidates=[window.raceMeta?.date,window.raceMeta?.race_date,window.raceMeta?.raceDate,window.raceMeta?.held_at];
    for(const c of candidates){const d=normDate(c);if(d)return d;}
    // 出馬表は通常当日〜数日先。未来月の誤履歴を弾くため安全側で7日後を上限にする。
    const t=new Date();t.setDate(t.getDate()+7);
    return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;
  };
  const explicitNonFinish=r=>/出走取消|取消|競走除外|除外|競走中止|中止|失格/.test([r?.status,r?.result_status,r?.finish_status,r?.rank_text,r?.result,r?.remarks,r?.note].filter(Boolean).join(' '));
  const validRun=(r,cutoff)=>{
    if(!r||explicitNonFinish(r))return false;
    const d=normDate(r.date);
    if(d&&cutoff&&d>cutoff)return false;
    return true;
  };
  const key=r=>`${normDate(r?.date)}|${cleanVenue(r?.venue)}|${r?.surface||''}|${r?.distance||''}`;

  function repairHorse(h){
    if(!h)return false;
    const cutoff=currentRaceDate();
    const nk=Array.isArray(h.history)?h.history.filter(r=>validRun(r,cutoff)):[];
    const jra=Array.isArray(h.jra_history)?h.jra_history.filter(r=>validRun(r,cutoff)&&isJraVenue(r.venue)):[];
    const futureBad=Array.isArray(h.history)&&h.history.some(r=>{const d=normDate(r?.date);return d&&cutoff&&d>cutoff;});
    const localBad=nk.filter(r=>r?.venue&&!isJraVenue(r.venue)).length;
    const mostlyLocal=nk.length>0&&localBad>=Math.ceil(nk.length/2);

    // JRA出走馬でnetkeiba履歴が未来日付または地方別馬らしい場合は、
    // 馬名だけで拾った誤履歴を採用せず、JRA照合済み履歴を正として使う。
    let merged=[];
    if((futureBad||mostlyLocal)&&jra.length){
      merged=jra.slice();
      h.historySource='JRA照合（netkeiba別馬疑いを除外）';
      h.historyIdentityWarning=true;
    }else{
      const seen=new Set();
      for(const r of [...nk,...jra]){const k=key(r);if(seen.has(k))continue;seen.add(k);merged.push(r);}
    }
    merged=merged.filter(r=>validRun(r,cutoff)).sort((a,b)=>String(normDate(b.date)).localeCompare(String(normDate(a.date)))).slice(0,5);
    const changed=JSON.stringify((h.history||[]).map(key))!==JSON.stringify(merged.map(key));
    if(changed){
      h.history=merged;
      if(typeof scoreLocalHistory==='function'){
        try{h.histScores=scoreLocalHistory(merged);if(h.histScores)h.histScores.available=merged.length>0;}catch(_){}
      }
    }
    return changed;
  }

  function canonicalCourseProfile(){
    try{
      const venue=String(document.getElementById('venue')?.value||'');
      const surface=String(document.getElementById('surface')?.value||'');
      const dist=Number(document.getElementById('distance')?.value||0);
      if(venue!=='札幌'||surface!=='芝'||dist!==1800)return;
      const el=document.getElementById('courseProfile');if(!el)return;
      const turn=(window.raceMeta&&raceMeta.turn)||'右';
      const w=(typeof weights!=='undefined'&&weights)?weights:{speed:.22,last3f:.18,course:.14};
      const html=`<b>コース・馬場補正：</b> 札幌 芝1800m・${turn}<br>`+
        `コース基礎データ：右回り・小回り寄り・直線短め。コーナー4回での立ち回りと持続力を考慮<br>`+
        `有効ウェイト上位：近走 ${(Number(w.speed||0)*100).toFixed(1)}% / 上がり ${(Number(w.last3f||0)*100).toFixed(1)}% / コース ${(Number(w.course||0)*100).toFixed(1)}%<br><br>`+
        `<span class="small">コース指数の根拠：札幌1800mの同競馬場実績を最優先し、右回り適性・小回り適性・コーナー4回での器用さ・位置取り・早めに動いて脚を長く使える持続力を重視して補正。着順を頭数で正規化し、直近ほど重く評価。</span>`;
      if(el.innerHTML!==html)el.innerHTML=html;
    }catch(_){}
  }

  function repairAll(){
    let list=[];try{if(typeof horses!=='undefined'&&Array.isArray(horses))list=horses;else if(Array.isArray(window.horses))list=window.horses;}catch(_){}
    let changed=false;for(const h of list)changed=repairHorse(h)||changed;
    canonicalCourseProfile();
    if(changed&&typeof renderHorses==='function'){try{renderHorses();}catch(_){} }
  }

  // 分析直前にも必ず本人性チェックを通す。
  function wrapEval(){
    try{
      if(typeof evalAll!=='function'||evalAll.__historyIntegrityV249)return;
      const original=evalAll;
      const wrapped=function(...args){repairAll();const r=original.apply(this,args);canonicalCourseProfile();return r;};
      wrapped.__historyIntegrityV249=true;evalAll=wrapped;try{window.evalAll=wrapped;}catch(_){}
    }catch(_){}
  }

  setTimeout(()=>{wrapEval();repairAll();},300);
  setTimeout(()=>{wrapEval();repairAll();},1200);
  setTimeout(()=>{wrapEval();repairAll();},3000);
  setInterval(()=>{canonicalCourseProfile();},1500);
})();

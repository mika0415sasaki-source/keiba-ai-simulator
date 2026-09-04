(()=>{
  if(window.__displayIntegrityV269)return;
  window.__displayIntegrityV269=true;

  const clean=v=>String(v||'').normalize('NFKC').replace(/[\s　]+/g,'').trim();
  const hs=()=>{try{if(typeof horses!=='undefined'&&Array.isArray(horses))return horses}catch(_){}return Array.isArray(window.horses)?window.horses:[]};
  const num=v=>Number.isFinite(+v)?+v:null;

  function normalizeWeightFields(h){
    if(!h)return h;
    const legacy=num(h.weight);
    const carried=num(h.carried_weight);
    const body=num(h.body_weight);
    if((carried===null||carried<40||carried>70)&&legacy!==null&&legacy>=40&&legacy<=70)h.carried_weight=legacy;
    if((body===null||body<300||body>700)&&legacy!==null&&legacy>=300&&legacy<=700)h.body_weight=legacy;
    if(legacy!==null&&legacy>=40&&legacy<=70)h.weight=null;
    if(num(h.body_weight)!==null&&num(h.body_weight)>=300&&num(h.body_weight)<=700)h.weight=num(h.body_weight);
    return h;
  }

  function previousBodyWeight(h){
    const direct=num(h?.last_body_weight);
    if(direct!==null&&direct>=300&&direct<=700)return Math.round(direct);
    const run=(h?.history||[]).find(r=>num(r?.body_weight)!==null&&num(r?.body_weight)>=300&&num(r?.body_weight)<=700);
    return run?Math.round(num(run.body_weight)):null;
  }

  function currentBodyWeight(h){
    const current=num(h?.body_weight);
    if(current!==null&&current>=300&&current<=700)return Math.round(current);
    const legacy=num(h?.weight);
    if(legacy!==null&&legacy>=300&&legacy<=700)return Math.round(legacy);
    return null;
  }

  function horseForCard(card){
    const title=clean(card?.querySelector?.('.rank')?.textContent||'');
    return hs().find(h=>title.includes(clean(h?.name)))||null;
  }

  function fixHorseCards(){
    hs().forEach(normalizeWeightFields);
    for(const card of document.querySelectorAll('#horses .card')){
      const h=horseForCard(card);if(!h)continue;
      const directSmalls=[...card.children].filter(el=>el.classList?.contains('small'));
      const top=directSmalls[0];if(!top)continue;
      const current=currentBodyWeight(h),previous=previousBodyWeight(h),carried=num(h.carried_weight),change=num(h.body_weight_change);
      const body=current!==null
        ? `馬体重 ${current}kg${change!==null?`（${change>=0?'+':''}${change}）`:''}`
        : previous!==null?`馬体重 未発表（前走${previous}kg）`:'馬体重 未発表';
      const cw=carried!==null&&carried>=40&&carried<=70?`斤量 ${carried.toFixed(1)}kg`:'斤量 未取得';
      const label=[h.sex_age||'',body,cw,h.jockey||h.rider||'騎手未取得'].filter(Boolean).join('　');
      if(top.textContent!==label)top.textContent=label;
    }
  }

  function stripDuplicatedGradeLabels(){
    document.querySelectorAll('#horses .hist-row').forEach(row=>{
      const spans=row.querySelectorAll('span');if(spans.length<2)return;
      const s=String(spans[1].textContent||'');
      const next=s.replace(/\((?:G(?:I{1,3}|[123])|JPN(?:I{1,3}|[123])|L|OP|[123]勝(?:クラス)?)\)\s*$/i,'').trim();
      if(next!==s)spans[1].textContent=next;
    });
  }

  function syncHistoryCount(){
    const list=hs();if(!list.length)return;
    const ok=list.filter(h=>(h.history||[]).length>0).length;
    const totalRuns=list.reduce((sum,h)=>sum+Math.min(5,(h.history||[]).length),0);
    const jraN=list.filter(h=>(h.jra_history||[]).length>0).length;
    const label=`netkeiba ${ok}/${list.length}頭・合計${totalRuns}走 / JRA照合 ${jraN}頭`;
    const el=document.getElementById('histCount');if(el&&el.textContent!==label)el.textContent=label;
    if(ok>0){
      const rs=document.getElementById('raceStatus');
      if(rs&&rs.innerHTML){
        const next=rs.innerHTML
          .replace(/netkeiba5走\s*\d+\/\d+頭/g,`netkeiba5走 ${ok}/${list.length}頭`)
          .replace(/JRA前4走\s*\d+頭/g,`JRA前4走 ${jraN}頭`);
        if(next!==rs.innerHTML)rs.innerHTML=next;
      }
    }
  }

  const profiles={
    '中山|芝|1600':{
      turn:'右',layout:'外',
      facts:'外回り。最初のコーナーまで約240mと短く、2コーナーから4コーナー途中まで下り基調。直線は310mで、残り200m付近から高低差2.2mの急坂。外を回す距離ロス、位置取り、短い直線での加速力を重視',
      basis:'中山芝1600mの同競馬場・同距離実績を最優先。別場実績は回り方向とコース形状を補助情報として低めに扱い、距離差と直近度を段階補正。'
    },
    '中京|芝|1600':{
      turn:'左',layout:'',
      facts:'1～2コーナー間の引き込み線からスタートし、約200mで本線へ合流。バックストレッチ半ばから下り基調で、直線は412.5m。直線序盤に高低差約2mの急坂があり、坂を越えてからも200m余り続くため持続力と地力を重視',
      basis:'中京芝1600mの同競馬場・同距離実績を最優先。左回り適性、長めの直線、直線の急坂、距離差を補助要素として段階補正し、直近ほど重く評価。'
    }
  };

  function patchCourseProfile(){
    const venue=document.getElementById('venue')?.value||'';
    const surface=document.getElementById('surface')?.value||'';
    const distance=+(document.getElementById('distance')?.value||0);
    const p=profiles[`${venue}|${surface}|${distance}`];if(!p)return;
    try{if(typeof raceMeta==='object'&&raceMeta){raceMeta.turn=p.turn;raceMeta.course_layout=p.layout}}catch(_){}
    const box=document.getElementById('courseProfile');if(!box)return;
    const old=box.innerHTML||'';
    const weightLine=(old.match(/有効ウェイト上位[^<]*/)||[])[0]||'有効ウェイト上位：近走 22.0% / 上がり 18.0% / コース 14.0%';
    const layout=[p.turn,p.layout].filter(Boolean).join('・');
    const next=`<b>コース・馬場補正：</b> ${venue} ${surface}${distance}m・${layout}<br>JRA実データ：${p.facts}<br>${weightLine}<br><br><span class="small">コース指数の根拠：${p.basis}着順は頭数で正規化し、直近ほど重く評価。</span>`;
    if(next!==old)box.innerHTML=next;
  }

  function refreshDisplays(){fixHorseCards();stripDuplicatedGradeLabels();syncHistoryCount();patchCourseProfile()}

  function wrapJraImport(){
    try{
      if(typeof jraImport!=='function'||jraImport.__weightSplitV269)return false;
      const original=jraImport;
      const wrapped=async function(...args){const value=await original.apply(this,args);if(Array.isArray(value?.horses))value.horses.forEach(normalizeWeightFields);return value};
      wrapped.__weightSplitV269=true;wrapped.__original=original;jraImport=wrapped;try{window.jraImport=wrapped}catch(_){}return true;
    }catch(_){return false}
  }

  function install(){
    wrapJraImport();
    try{
      if(typeof renderHorses==='function'&&!renderHorses.__displayIntegrityV269){
        const original=renderHorses;
        const wrapped=function(...args){hs().forEach(normalizeWeightFields);const v=original.apply(this,args);setTimeout(refreshDisplays,0);return v};
        wrapped.__displayIntegrityV269=true;wrapped.__original=original;renderHorses=wrapped;try{window.renderHorses=wrapped}catch(_){}
      }
    }catch(_){}
    try{
      if(typeof renderAnalysis==='function'&&!renderAnalysis.__courseProfileV269){
        const original=renderAnalysis;
        const wrapped=function(...args){const v=original.apply(this,args);patchCourseProfile();return v};
        wrapped.__courseProfileV269=true;wrapped.__original=original;renderAnalysis=wrapped;try{window.renderAnalysis=wrapped}catch(_){}
      }
    }catch(_){}
  }

  ['venue','surface','distance','going'].forEach(id=>document.getElementById(id)?.addEventListener('change',()=>setTimeout(patchCourseProfile,0)));
  document.addEventListener('click',e=>{
    const t=e.target;
    if(t&&(t.id==='importRace'||t.id==='importHist'||t.id==='analyze'||/出馬表取込|過去5走を再取得|AI分析/.test(String(t.textContent||'')))){
      setTimeout(refreshDisplays,400);setTimeout(refreshDisplays,1800);setTimeout(refreshDisplays,4500);
    }
  },true);

  let tries=0;
  const tick=()=>{tries++;install();refreshDisplays();if(tries<30)setTimeout(tick,500)};
  setTimeout(tick,100);
})();

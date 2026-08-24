(function(){
  'use strict';
  if(window.__keibaRaceMetaGuardV203)return;
  window.__keibaRaceMetaGuardV203=true;

  const COURSE_MAP={
    '01':'札幌競馬場','02':'函館競馬場','03':'福島競馬場','04':'新潟競馬場','05':'東京競馬場',
    '06':'中山競馬場','07':'中京競馬場','08':'京都競馬場','09':'阪神競馬場','10':'小倉競馬場'
  };
  const controls=['play','batch','navPlay','navBatch'];
  const resultIds=['ranking','analysis','aiSummary','valueSummary','trifectaPlan'];
  let seq=0;

  function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
  function setButtons(disabled){controls.forEach(id=>{const el=document.getElementById(id);if(el)el.disabled=!!disabled;});}
  function blockResults(blocked){
    resultIds.forEach(id=>{
      const el=document.getElementById(id);if(!el)return;
      if(blocked){el.dataset.v203Blocked='1';el.style.visibility='hidden';}
      else if(el.dataset.v203Blocked==='1'){delete el.dataset.v203Blocked;el.style.visibility='';}
    });
  }
  function banner(text,state){
    let el=document.getElementById('raceMetaGuardV203');
    if(!el){
      el=document.createElement('div');el.id='raceMetaGuardV203';
      el.style.margin='8px 0';el.style.padding='10px 12px';el.style.borderRadius='8px';el.style.fontSize='12px';el.style.fontWeight='700';
      const target=document.getElementById('importStatus')||document.getElementById('jraEntryStatus');
      if(target&&target.parentNode)target.parentNode.insertBefore(el,target.nextSibling);
    }
    const map={pending:['#d29922','#2d2411'],ok:['#3fb950','#102a17'],error:['#f85149','#351313']};
    const c=map[state]||map.pending;el.style.color=c[0];el.style.background=c[1];el.style.border='1px solid '+c[0];el.textContent=text;
  }
  function inputUrl(){const el=document.getElementById('jraEntryUrl');return String(el&&el.value||'').trim();}
  function raceIdFromUrl(url){const m=String(url||'').match(/[?&]race_id=(\d{12})/);return m?m[1]:'';}
  async function fetchText(url,ms){
    const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),ms||6500);
    try{const r=await fetch(url,{cache:'no-store',signal:ctrl.signal});if(!r.ok)throw new Error('HTTP '+r.status);return await r.text();}
    finally{clearTimeout(timer);}
  }
  function inferVariant(course,surface,distance,dir){
    if(surface==='ダート')return '通常';
    const d=Number(distance||0),s=String(dir||'').normalize('NFKC');
    if(course==='新潟競馬場'){
      if(d===1000||/直線/.test(s))return '直線';
      if(/外/.test(s)||[1600,1800,3000,3200].includes(d))return '外回り';
      return '内回り';
    }
    if(course==='阪神競馬場'||course==='京都競馬場'||course==='中山競馬場')return /外/.test(s)?'外回り':'内回り';
    if(course==='小倉競馬場'){
      const m=s.match(/(?:^|\s)(A|B|C)(?:\s|$)/i);return m?m[1].toUpperCase():'A';
    }
    return '通常';
  }
  function parseMeta(text,forcedCourse){
    const raw=String(text||'').normalize('NFKC').replace(/\r/g,'\n');
    const head=raw.slice(0,18000);let surface='',distance=0,dir='';
    const pats=[
      /(芝|ダート|ダ)\s*([1-4]\d{3})\s*m\s*[（(]?\s*([^）)\n\/]{0,40})/i,
      /([1-4]\d{3})\s*m\s*[（(]?\s*(芝|ダート|ダ)\s*([^）)\n\/]{0,40})/i,
      /([1-4]\d{3})\s*メートル\s*[（(]\s*(芝|ダート|ダ)([^）)]{0,40})[）)]/i
    ];
    let m=head.match(pats[0]);
    if(m){surface=m[1];distance=Number(m[2]);dir=String(m[3]||'');}
    if(!m){m=head.match(pats[1]);if(m){distance=Number(m[1]);surface=m[2];dir=String(m[3]||'');}}
    if(!m){m=head.match(pats[2]);if(m){distance=Number(m[1]);surface=m[2];dir=String(m[3]||'');}}
    if(!m||!Number.isFinite(distance))return null;
    if(surface==='ダ')surface='ダート';
    if(!forcedCourse)return null;
    return {course:forcedCourse,surface,distance,variant:inferVariant(forcedCourse,surface,distance,dir),dir};
  }
  async function resolveMeta(url){
    const rid=raceIdFromUrl(url);if(!rid)throw new Error('race_idを確認できません');
    const course=COURSE_MAP[rid.slice(4,6)]||'';if(!course)throw new Error('競馬場を確認できません');
    const pages=[url,
      'https://race.netkeiba.com/race/shutuba.html?race_id='+rid,
      'https://race.netkeiba.com/race/shutuba_past.html?race_id='+rid,
      'https://race.sp.netkeiba.com/race/shutuba.html?race_id='+rid,
      'https://race.netkeiba.com/race/result.html?race_id='+rid
    ];
    const seen=new Set();
    for(const p of pages){
      if(!p||seen.has(p))continue;seen.add(p);
      for(const u of ['https://r.jina.ai/'+p,p]){
        try{const meta=parseMeta(await fetchText(u,6500),course);if(meta)return meta;}catch(e){}
      }
    }
    throw new Error('対象レース条件を取得できません');
  }
  function hasOption(el,value){return !!(el&&Array.from(el.options||[]).some(o=>String(o.value)===String(value)||String(o.textContent)===String(value)));}
  async function setSelect(el,value){
    if(!el||!hasOption(el,value))return false;
    el.value=String(value);el.dispatchEvent(new Event('change',{bubbles:true}));await sleep(45);return true;
  }
  async function applyMeta(meta){
    const course=document.getElementById('course'),surface=document.getElementById('surface'),variant=document.getElementById('variant'),distance=document.getElementById('distance');
    if(!await setSelect(course,meta.course))throw new Error('競馬場を設定できません');
    if(!await setSelect(surface,meta.surface))throw new Error('芝/ダートを設定できません');
    if(!await setSelect(variant,meta.variant))throw new Error('コース区分を設定できません: '+meta.variant);
    if(!await setSelect(distance,String(meta.distance)))throw new Error('距離を設定できません: '+meta.distance+'m');
    const ok=String(course.value)===String(meta.course)&&String(surface.value)===String(meta.surface)&&String(variant.value)===String(meta.variant)&&Number(distance.value)===Number(meta.distance);
    if(!ok)throw new Error('画面への条件反映に失敗しました');
  }
  async function waitImportDone(mySeq,url,beforeBulk,beforeImport,beforeDiag){
    const rid=raceIdFromUrl(url);const started=Date.now();
    for(let i=0;i<160;i++){
      if(mySeq!==seq)return false;
      const bulk=String((document.getElementById('bulk')||{}).value||'');
      const imp=String((document.getElementById('importStatus')||{}).textContent||'');
      const diag=String((document.getElementById('jraEntryStatus')||{}).textContent||'');
      const hasBulk=bulk.trim().length>20;
      const success=/取り込みました|反映しました|直接反映/.test(imp+' '+diag);
      const raceMatched=rid&&diag.includes(rid);
      const changed=bulk!==beforeBulk||imp!==beforeImport||diag!==beforeDiag;
      const elapsed=Date.now()-started;
      if(hasBulk&&success&&(changed||raceMatched||elapsed>2500)){
        await sleep(220);
        return true;
      }
      await sleep(250);
    }
    return false;
  }
  async function verify(mySeq,url,beforeBulk,beforeImport,beforeDiag){
    try{
      banner('レース条件を自動確認中…','pending');
      const metaPromise=resolveMeta(url);
      const done=await waitImportDone(mySeq,url,beforeBulk,beforeImport,beforeDiag);
      if(!done)throw new Error('出馬表取込完了を確認できません');
      if(mySeq!==seq)return;
      const meta=await metaPromise;if(mySeq!==seq)return;
      await applyMeta(meta);
      await sleep(120);
      banner('✓ 条件確認済み: '+meta.course.replace('競馬場','')+' / '+meta.surface+' / '+meta.variant+' / '+meta.distance+'m','ok');
      blockResults(false);setButtons(false);
    }catch(e){
      if(mySeq!==seq)return;
      setButtons(true);blockResults(true);
      banner('⚠ 条件を確認できないためシミュレーションを停止しました: '+String(e&&e.message||e),'error');
    }
  }
  function mount(){
    const btn=document.getElementById('fetchJraEntry');if(!btn){setTimeout(mount,120);return;}
    if(btn.dataset.raceMetaGuardV203)return;btn.dataset.raceMetaGuardV203='1';
    btn.addEventListener('click',function(){
      seq++;const mySeq=seq,url=inputUrl();
      const beforeBulk=String((document.getElementById('bulk')||{}).value||'');
      const beforeImport=String((document.getElementById('importStatus')||{}).textContent||'');
      const beforeDiag=String((document.getElementById('jraEntryStatus')||{}).textContent||'');
      setButtons(true);blockResults(true);
      banner('レース条件確認待ち。確認完了までAI評価・シミュレーション結果は表示しません。','pending');
      setTimeout(()=>verify(mySeq,url,beforeBulk,beforeImport,beforeDiag),60);
    },true);
  }
  mount();
})();
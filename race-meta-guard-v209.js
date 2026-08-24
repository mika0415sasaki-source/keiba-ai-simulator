(function(){
  'use strict';
  if(window.__keibaRaceMetaGuardV209)return;
  window.__keibaRaceMetaGuardV209=true;

  const COURSE_MAP={
    '01':'札幌競馬場','02':'函館競馬場','03':'福島競馬場','04':'新潟競馬場','05':'東京競馬場',
    '06':'中山競馬場','07':'中京競馬場','08':'京都競馬場','09':'阪神競馬場','10':'小倉競馬場'
  };
  const controls=['play','batch','navPlay','navBatch'];
  const resultIds=['ranking','analysis','aiSummary','valueSummary','trifectaPlan'];
  const capturedByRace={};
  const nativeFetch=window.fetch.bind(window);
  let activeToken=null;
  let lastClickAt=0;

  function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
  function setButtons(disabled){controls.forEach(id=>{const el=document.getElementById(id);if(el)el.disabled=!!disabled;});}
  function blockResults(blocked){
    resultIds.forEach(id=>{
      const el=document.getElementById(id);if(!el)return;
      if(blocked){
        if(el.dataset.v209Blocked!=='1')el.dataset.v209Display=el.style.display||'';
        el.dataset.v209Blocked='1';
        el.style.display='none';
      }else if(el.dataset.v209Blocked==='1'){
        el.style.display=el.dataset.v209Display||'';
        delete el.dataset.v209Display;
        delete el.dataset.v209Blocked;
      }
    });
  }
  function banner(text,state){
    let el=document.getElementById('raceMetaGuardV209');
    if(!el){
      el=document.createElement('div');el.id='raceMetaGuardV209';
      el.style.margin='8px 0';el.style.padding='10px 12px';el.style.borderRadius='8px';el.style.fontSize='12px';el.style.fontWeight='700';
      const target=document.getElementById('importStatus')||document.getElementById('jraEntryStatus');
      if(target&&target.parentNode)target.parentNode.insertBefore(el,target.nextSibling);
    }
    const map={pending:['#d29922','#2d2411'],ok:['#3fb950','#102a17'],error:['#f85149','#351313']};
    const c=map[state]||map.pending;el.style.color=c[0];el.style.background=c[1];el.style.border='1px solid '+c[0];el.textContent=text;
  }
  function inputUrl(){const el=document.getElementById('jraEntryUrl');return String(el&&el.value||'').trim();}
  function raceIdFromUrl(url){
    let s=String(url||'');
    try{s=decodeURIComponent(s);}catch(e){}
    const m=s.match(/[?&]race_id=(\d{12})/);return m?m[1]:'';
  }

  window.fetch=async function(input,init){
    const response=await nativeFetch(input,init);
    try{
      const url=typeof input==='string'?input:String(input&&input.url||'');
      const rid=raceIdFromUrl(url);
      if(rid&&response&&response.ok){
        const clone=response.clone();
        clone.text().then(text=>{
          const s=String(text||'');
          if(s.length>=80)capturedByRace[rid]=s.slice(0,260000);
        }).catch(()=>{});
      }
    }catch(e){}
    return response;
  };

  async function fetchText(url,ms){
    const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),ms||3500);
    try{const r=await nativeFetch(url,{cache:'no-store',signal:ctrl.signal});if(!r.ok)throw new Error('HTTP '+r.status);return await r.text();}
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
    if(/The quota has been exceeded|QuotaExceededError/i.test(raw))return null;
    const head=raw.slice(0,40000);let surface='',distance=0,dir='';
    const pats=[
      /(芝|ダート|ダ)\s*([1-4]\d{3})\s*(?:m|メートル)?\s*[（(]?\s*([^）)\n\/]{0,50})/i,
      /([1-4]\d{3})\s*(?:m|メートル)?\s*[（(]?\s*(芝|ダート|ダ)\s*([^）)\n\/]{0,50})/i,
      /([1-4]\d{3})\s*メートル\s*[（(]\s*(芝|ダート|ダ)([^）)]{0,50})[）)]/i
    ];
    let m=head.match(pats[0]);
    if(m){surface=m[1];distance=Number(m[2]);dir=String(m[3]||'');}
    if(!m){m=head.match(pats[1]);if(m){distance=Number(m[1]);surface=m[2];dir=String(m[3]||'');}}
    if(!m){m=head.match(pats[2]);if(m){distance=Number(m[1]);surface=m[2];dir=String(m[3]||'');}}
    if(!m||!Number.isFinite(distance)||distance<1000||distance>4000)return null;
    if(surface==='ダ')surface='ダート';
    if(!forcedCourse)return null;
    return {course:forcedCourse,surface,distance,variant:inferVariant(forcedCourse,surface,distance,dir),dir};
  }
  function cacheKey(rid){return 'keiba_race_meta_v209_'+rid;}
  function loadMetaCache(rid){
    for(const key of [cacheKey(rid),'keiba_race_meta_v208_'+rid,'keiba_race_meta_v206_'+rid]){
      try{const x=JSON.parse(localStorage.getItem(key)||'null');if(x&&x.course&&x.surface&&Number(x.distance)>0)return x;}catch(e){}
    }
    return null;
  }
  function saveMetaCache(rid,meta){try{localStorage.setItem(cacheKey(rid),JSON.stringify({...meta,savedAt:Date.now()}));}catch(e){}}
  async function capturedMeta(rid,course){
    for(let i=0;i<30;i++){
      const text=capturedByRace[rid];
      if(text){const meta=parseMeta(text,course);if(meta)return meta;}
      await sleep(100);
    }
    return null;
  }
  async function resolveMeta(url){
    const rid=raceIdFromUrl(url);if(!rid)throw new Error('race_idを確認できません');
    const course=COURSE_MAP[rid.slice(4,6)]||'';if(!course)throw new Error('競馬場を確認できません');
    const fromCapture=await capturedMeta(rid,course);
    if(fromCapture){saveMetaCache(rid,fromCapture);return fromCapture;}
    const cached=loadMetaCache(rid);if(cached)return cached;
    const shutuba='https://race.netkeiba.com/race/shutuba.html?race_id='+rid;
    const fallback=[
      'https://api.allorigins.win/raw?url='+encodeURIComponent(shutuba),
      'https://corsproxy.io/?url='+encodeURIComponent(shutuba)
    ];
    const jobs=fallback.map(async u=>{try{return parseMeta(await fetchText(u,3600),course);}catch(e){return null;}});
    const all=await Promise.all(jobs);
    const meta=all.find(Boolean);
    if(meta){saveMetaCache(rid,meta);return meta;}
    throw new Error('対象レース条件を取得できません');
  }
  function hasOption(el,value){return !!(el&&Array.from(el.options||[]).some(o=>String(o.value)===String(value)||String(o.textContent)===String(value)));}
  async function setSelect(el,value){
    if(!el||!hasOption(el,value))return false;
    const want=String(value),current=String(el.value||'');
    if(current===want)return true;
    el.value=want;el.dispatchEvent(new Event('change',{bubbles:true}));await sleep(35);return true;
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
  function bulkLooksReady(text){
    const s=String(text||'').trim();if(s.length<20)return false;
    return s.split(/\n+/).filter(x=>x.split(',').length>=6).length>=1;
  }
  function importSnapshot(){
    return {
      bulk:String((document.getElementById('bulk')||{}).value||''),
      imp:String((document.getElementById('importStatus')||{}).textContent||''),
      diag:String((document.getElementById('jraEntryStatus')||{}).textContent||'')
    };
  }
  async function waitImportDone(token,before){
    const started=Date.now();
    let lastNotice=0;
    while(Date.now()-started<12*60*1000){
      if(activeToken!==token)return false;
      const now=importSnapshot();
      const ready=bulkLooksReady(now.bulk);
      const combined=now.imp+' '+now.diag;
      const success=/\d+頭を?取り込みました|\d+頭を反映しました|直接反映しました|出馬表取込完了/.test(combined);
      const newData=now.bulk!==before.bulk;
      const newStatus=now.imp!==before.imp||now.diag!==before.diag;
      if(ready&&success&&(newData||newStatus)){await sleep(150);return true;}

      const elapsed=Date.now()-started;
      if(elapsed-lastNotice>15000){
        lastNotice=elapsed;
        const prog=combined.match(/(?:取得|再検証|照合|解析)[^\n]{0,40}?\d+\s*[～〜~-]\s*\d+\s*\/\s*\d+頭|\d+\s*\/\s*\d+頭/);
        banner(prog?'出馬表を取得中… '+prog[0]:'出馬表を取得中…','pending');
      }
      await sleep(elapsed<30000?300:800);
    }
    return false;
  }
  async function verify(token,url,before){
    try{
      const metaPromise=resolveMeta(url).catch(e=>({__error:e}));
      const done=await waitImportDone(token,before);
      if(!done)throw new Error('出馬表取込が完了しませんでした');
      if(activeToken!==token)return;
      banner('レース条件を確認中…','pending');
      const meta=await metaPromise;
      if(meta&&meta.__error)throw meta.__error;
      if(activeToken!==token)return;
      await applyMeta(meta);await sleep(80);
      banner('✓ 条件確認済み: '+meta.course.replace('競馬場','')+' / '+meta.surface+' / '+meta.variant+' / '+meta.distance+'m','ok');
      blockResults(false);setButtons(false);
    }catch(e){
      if(activeToken!==token)return;
      setButtons(true);blockResults(true);
      banner('⚠ 条件を確認できないためシミュレーションを停止しました: '+String(e&&e.message||e),'error');
    }
  }
  function mount(){
    const btn=document.getElementById('fetchJraEntry');if(!btn){setTimeout(mount,120);return;}
    if(btn.dataset.raceMetaGuardV209)return;btn.dataset.raceMetaGuardV209='1';
    btn.addEventListener('click',function(){
      const now=Date.now();if(now-lastClickAt<700)return;lastClickAt=now;
      const token={id:now};activeToken=token;
      const url=inputUrl();
      const before=importSnapshot();
      setButtons(true);blockResults(true);
      banner('出馬表を取得中…','pending');
      setTimeout(()=>verify(token,url,before),80);
    },true);
  }
  mount();
})();

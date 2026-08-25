(function(){
  'use strict';
  if(window.__keibaRuntimeV218)return;
  window.__keibaRuntimeV218=true;

  const SUPABASE_URL='https://qhzccahbevnqaoxdfnbx.supabase.co';
  const ANON_JWT='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoemNjYWhiZXZucWFveGRmbmJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2MTExNjEsImV4cCI6MjEwMzE4NzE2MX0.7RnMtCdjJTJEdbeJHMz2lQ9QIge7UvOpzLVJtdNJnFY';
  const metaCache=new Map();
  let requestSeq=0;

  function patchIntro(){
    try{
      document.querySelectorAll('main > div').forEach(function(el){
        const t=String(el.textContent||'');
        if(t.includes('Safari単体版')){
          el.innerHTML='<b>クラウド保存版</b> — 学習データはSupabaseへ保存。Safariには現在のレースで使う一時データだけを保持します。';
        }
      });
    }catch(e){}
  }

  function raceIdFromText(s){
    let x=String(s||'');
    for(let i=0;i<2;i++){try{x=decodeURIComponent(x);}catch(e){break;}}
    const m=x.match(/(?:race_id[=\s:_-]*|\/race\/)(\d{12})/i)||x.match(/\b(20\d{10})\b/);
    return m?m[1]:'';
  }

  function currentRid(){
    const u=document.getElementById('jraEntryUrl');
    const a=raceIdFromText(u&&u.value);
    if(a)return a;
    const s=String((document.getElementById('jraEntryStatus')||{}).textContent||'')+' '+String((document.getElementById('importStatus')||{}).textContent||'');
    return raceIdFromText(s);
  }

  function status(text,state){
    let e=document.getElementById('raceMetaV218Status');
    if(!e){
      e=document.createElement('div');
      e.id='raceMetaV218Status';
      e.style.cssText='margin:5px 0 2px;font-size:11px;font-weight:700;color:#8b949e';
      const a=document.getElementById('remoteStorageV216Status')||document.getElementById('importStatus')||document.getElementById('jraEntryStatus');
      if(a&&a.parentNode)a.parentNode.insertBefore(e,a.nextSibling);
    }
    if(!e)return;
    e.textContent=text;
    e.style.color=state==='ok'?'#3fb950':state==='warn'?'#d29922':'#8b949e';
  }

  function optionExists(el,value){
    const v=String(value);
    return Array.from(el&&el.options||[]).some(o=>String(o.value)===v||String(o.textContent).replace(/m$/i,'')===v);
  }

  function setSimpleSelect(el,value){
    if(!el)return false;
    const v=String(value);
    if(optionExists(el,v)){
      const o=Array.from(el.options).find(o=>String(o.value)===v||String(o.textContent).replace(/m$/i,'')===v);
      el.value=o.value;
      return true;
    }
    return false;
  }

  function forceSingleOption(el,value,suffix){
    if(!el)return false;
    const v=String(value);
    el.innerHTML='';
    const o=document.createElement('option');
    o.value=v;
    o.textContent=v+(suffix||'');
    el.appendChild(o);
    el.value=v;
    return true;
  }

  function applyMetaOnce(meta,rid){
    if(!meta||String(meta.race_id||'')!==rid)return false;
    const course=String(meta.course||'');
    const surface=String(meta.surface||'');
    const variant=String(meta.variant||'');
    const distance=Number(meta.distance||0);
    if(!course||!surface||!variant||!distance)return false;

    const c=document.getElementById('course');
    const s=document.getElementById('surface');
    const v=document.getElementById('variant');
    const d=document.getElementById('distance');
    const g=document.getElementById('going');
    if(!c||!s||!v||!d)return false;

    const scrollX=window.scrollX,scrollY=window.scrollY;

    // v218: onchangeを連打しない。DOM値をまとめて直して最後に再計算を1回だけ行う。
    if(!setSimpleSelect(c,course))return false;
    if(!setSimpleSelect(s,surface))return false;
    forceSingleOption(v,variant,'');
    forceSingleOption(d,distance,'m');
    if(meta.going&&g)setSimpleSelect(g,String(meta.going));

    // 基本アプリの重い再計算・再描画は1回だけ。
    d.dispatchEvent(new Event('change',{bubbles:true}));

    requestAnimationFrame(function(){
      try{window.scrollTo(scrollX,scrollY);}catch(e){}
    });

    status('✓ '+course.replace('競馬場','')+' / '+surface+' / '+variant+' / '+distance+'m','ok');
    return true;
  }

  async function fetchMeta(rid){
    if(metaCache.has(rid))return metaCache.get(rid);
    const ac=new AbortController();
    const tm=setTimeout(()=>ac.abort(),4500);
    try{
      const url=SUPABASE_URL+'/functions/v1/race-meta?race_id='+encodeURIComponent(rid);
      const r=await fetch(url,{method:'GET',cache:'no-store',signal:ac.signal,headers:{apikey:ANON_JWT,Authorization:'Bearer '+ANON_JWT}});
      if(!r.ok)throw new Error('HTTP '+r.status);
      const x=await r.json();
      if(!x||!x.ok||String(x.race_id)!==rid)throw new Error('NO_META');
      metaCache.set(rid,x);
      return x;
    }finally{clearTimeout(tm);}
  }

  function imported(){
    const t=String((document.getElementById('jraEntryStatus')||{}).textContent||'')+' '+String((document.getElementById('importStatus')||{}).textContent||'');
    return /\d+頭を?取り込みました|\d+頭を反映しました|直接反映しました/.test(t);
  }

  function waitImported(seq,limitMs){
    const started=Date.now();
    return new Promise(function(resolve){
      function tick(){
        if(seq!==requestSeq)return resolve(false);
        if(imported())return setTimeout(()=>resolve(seq===requestSeq),80);
        if(Date.now()-started>=limitMs)return resolve(false);
        setTimeout(tick,120);
      }
      tick();
    });
  }

  async function handleImport(){
    patchIntro();
    const rid=currentRid();
    if(!rid)return;
    const seq=++requestSeq;
    status('レース条件を確認中…','pending');

    // 出馬表取得と条件取得を並列。条件取得は出馬表処理を止めない。
    const metaPromise=fetchMeta(rid).catch(()=>null);
    const ok=await waitImported(seq,8000);
    if(seq!==requestSeq)return;
    const meta=await metaPromise;
    if(seq!==requestSeq)return;

    if(ok&&meta&&applyMetaOnce(meta,rid))return;
    status('⚠ 条件自動補正なし。表示条件を確認してください','warn');
  }

  function mount(){
    patchIntro();
    const btn=document.getElementById('fetchJraEntry');
    if(!btn){setTimeout(mount,120);return;}
    if(btn.dataset.runtimeV218)return;
    btn.dataset.runtimeV218='1';
    btn.addEventListener('click',function(){setTimeout(handleImport,0);});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
})();

(function(){
  'use strict';
  if(window.__keibaRuntimeV219)return;
  window.__keibaRuntimeV219=true;

  const SUPABASE_URL='https://qhzccahbevnqaoxdfnbx.supabase.co';
  const ANON_JWT='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoemNjYWhiZXZucWFveGRmbmJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2MTExNjEsImV4cCI6MjEwMzE4NzE2MX0.7RnMtCdjJTJEdbeJHMz2lQ9QIge7UvOpzLVJtdNJnFY';
  let seq=0;
  const cache=new Map();

  function patchIntro(){
    try{
      document.querySelectorAll('main > div').forEach(function(el){
        const t=String(el.textContent||'');
        if(t.includes('Safari単体版'))el.innerHTML='<b>クラウド保存版</b> — 学習データはSupabaseへ保存。Safariには現在のレースで使う一時データだけを保持します。';
      });
    }catch(e){}
  }

  function raceIdFromText(s){
    let x=String(s||'');
    for(let i=0;i<2;i++){try{x=decodeURIComponent(x);}catch(e){break;}}
    const m=x.match(/(?:race_id[=\s:_-]*|\/race\/)(\d{12})/i)||x.match(/\b(20\d{10})\b/);
    return m?m[1]:'';
  }

  function rid(){
    const u=document.getElementById('jraEntryUrl');
    return raceIdFromText(u&&u.value)||raceIdFromText(String((document.getElementById('jraEntryStatus')||{}).textContent||'')+' '+String((document.getElementById('importStatus')||{}).textContent||''));
  }

  function status(text,state){
    let e=document.getElementById('raceMetaV219Status');
    if(!e){
      e=document.createElement('div');
      e.id='raceMetaV219Status';
      e.style.cssText='margin:5px 0 2px;font-size:11px;font-weight:700;color:#8b949e';
      const a=document.getElementById('remoteStorageV216Status')||document.getElementById('importStatus')||document.getElementById('jraEntryStatus');
      if(a&&a.parentNode)a.parentNode.insertBefore(e,a.nextSibling);
    }
    if(!e)return;
    e.textContent=text;
    e.style.color=state==='ok'?'#3fb950':state==='warn'?'#d29922':'#8b949e';
  }

  function combinedStatus(){
    return String((document.getElementById('jraEntryStatus')||{}).textContent||'')+'\n'+String((document.getElementById('importStatus')||{}).textContent||'');
  }

  function isDone(t){return /\d+頭を?取り込みました|\d+頭を反映しました|直接反映しました/.test(String(t||''));}

  async function waitForNewImport(my,before){
    const start=Date.now();
    let changed=false;
    let last='';
    let stableSince=0;
    while(Date.now()-start<10000){
      if(my!==seq)return false;
      const now=combinedStatus();
      if(now!==before)changed=true;
      if(now!==last){last=now;stableSince=Date.now();}
      if(changed&&isDone(now)&&Date.now()-stableSince>=180)return true;
      await new Promise(r=>setTimeout(r,100));
    }
    return false;
  }

  async function meta(raceId){
    if(cache.has(raceId))return cache.get(raceId);
    const ac=new AbortController();
    const tm=setTimeout(()=>ac.abort(),4000);
    try{
      const r=await fetch(SUPABASE_URL+'/functions/v1/race-meta?race_id='+encodeURIComponent(raceId),{
        method:'GET',cache:'no-store',signal:ac.signal,
        headers:{apikey:ANON_JWT,Authorization:'Bearer '+ANON_JWT}
      });
      if(!r.ok)throw new Error('HTTP '+r.status);
      const x=await r.json();
      if(!x||!x.ok||String(x.race_id)!==raceId)throw new Error('NO_META');
      cache.set(raceId,x);
      return x;
    }finally{clearTimeout(tm);}
  }

  function selectValue(el,value){
    if(!el)return false;
    const s=String(value);
    const o=Array.from(el.options||[]).find(x=>String(x.value)===s||String(x.textContent).replace(/m$/i,'')===s);
    if(!o)return false;
    el.value=o.value;
    return true;
  }

  function oneOption(el,value,suffix){
    if(!el)return;
    const s=String(value);
    el.innerHTML='';
    const o=document.createElement('option');
    o.value=s;o.textContent=s+(suffix||'');el.appendChild(o);el.value=s;
  }

  function apply(x,raceId){
    if(!x||String(x.race_id)!==raceId)return false;
    const c=document.getElementById('course');
    const s=document.getElementById('surface');
    const v=document.getElementById('variant');
    const d=document.getElementById('distance');
    const g=document.getElementById('going');
    if(!c||!s||!v||!d)return false;
    if(!selectValue(c,x.course)||!selectValue(s,x.surface))return false;
    oneOption(v,x.variant,'');
    oneOption(d,Number(x.distance),'m');
    if(x.going&&g)selectValue(g,x.going);

    // 最後に1回だけ再計算・再描画。
    d.dispatchEvent(new Event('change',{bubbles:true}));
    status('✓ 条件確定: '+String(x.course).replace('競馬場','')+' / '+x.surface+' / '+x.variant+' / '+x.distance+'m','ok');
    return true;
  }

  async function run(before){
    patchIntro();
    const raceId=rid();
    if(!raceId)return;
    const my=++seq;
    status('レース条件を確認中…','pending');
    const p=meta(raceId).catch(()=>null);
    const done=await waitForNewImport(my,before);
    if(my!==seq)return;
    const x=await p;
    if(my!==seq)return;
    if(done&&x&&apply(x,raceId))return;
    status('⚠ 条件自動補正に失敗。表示条件を確認してください','warn');
  }

  function mount(){
    patchIntro();
    const b=document.getElementById('fetchJraEntry');
    if(!b){setTimeout(mount,150);return;}
    if(b.dataset.runtimeV219)return;
    b.dataset.runtimeV219='1';
    b.addEventListener('click',function(){
      const before=combinedStatus();
      setTimeout(function(){run(before);},0);
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
})();

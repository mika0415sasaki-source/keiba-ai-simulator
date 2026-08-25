(function(){
  'use strict';
  if(window.__keibaRuntimeV220)return;
  window.__keibaRuntimeV220=true;

  const SUPABASE_URL='https://qhzccahbevnqaoxdfnbx.supabase.co';
  const ANON_JWT='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYXNlIiwicmVmIjoicWh6Y2NhaGJldm5xYW94ZGZuYngiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc4NzYxMTE2MSwiZXhwIjoyMTAzMTg3MTYxfQ.7RnMtCdjJTJEdbeJHMz2lQ9QIge7UvOpzLVJtdNJnFY';
  let seq=0;
  const cache=new Map();

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
    const fromUrl=raceIdFromText(u&&u.value);
    if(fromUrl)return fromUrl;
    return raceIdFromText(statusText());
  }

  function statusText(){
    return String((document.getElementById('jraEntryStatus')||{}).textContent||'')+'\n'+
           String((document.getElementById('importStatus')||{}).textContent||'');
  }

  function showStatus(text,state){
    let e=document.getElementById('raceMetaV220Status');
    if(!e){
      e=document.createElement('div');
      e.id='raceMetaV220Status';
      e.style.cssText='margin:5px 0 2px;font-size:11px;font-weight:700;color:#8b949e';
      const a=document.getElementById('remoteStorageV216Status')||document.getElementById('importStatus')||document.getElementById('jraEntryStatus');
      if(a&&a.parentNode)a.parentNode.insertBefore(e,a.nextSibling);
    }
    if(!e)return;
    e.textContent=text;
    e.style.color=state==='ok'?'#3fb950':state==='warn'?'#d29922':'#8b949e';
  }

  function importDone(){
    const t=statusText();
    return /\d+頭を?取り込みました|\d+頭を反映しました|直接反映しました/.test(t);
  }

  async function waitUntilDone(my){
    const start=Date.now();
    let firstDone=0;
    while(Date.now()-start<180000){
      if(my!==seq)return false;
      if(importDone()){
        if(!firstDone)firstDone=Date.now();
        if(Date.now()-firstDone>=800)return true;
      }else{
        firstDone=0;
      }
      await new Promise(r=>setTimeout(r,500));
    }
    return false;
  }

  async function fetchMetaOnce(raceId){
    const ac=new AbortController();
    const tm=setTimeout(()=>ac.abort(),8000);
    try{
      const r=await fetch(SUPABASE_URL+'/functions/v1/race-meta?race_id='+encodeURIComponent(raceId),{
        method:'GET',cache:'no-store',signal:ac.signal,
        headers:{apikey:ANON_JWT,Authorization:'Bearer '+ANON_JWT}
      });
      if(!r.ok)throw new Error('HTTP '+r.status);
      const x=await r.json();
      if(!x||!x.ok||String(x.race_id)!==raceId)throw new Error('NO_META');
      return x;
    }finally{clearTimeout(tm);}
  }

  async function getMeta(raceId){
    if(cache.has(raceId))return cache.get(raceId);
    let last=null;
    for(let i=0;i<3;i++){
      try{
        const x=await fetchMetaOnce(raceId);
        cache.set(raceId,x);
        return x;
      }catch(e){
        last=e;
        if(i<2)await new Promise(r=>setTimeout(r,700));
      }
    }
    throw last||new Error('metadata unavailable');
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
    if(!el)return false;
    const s=String(value);
    el.innerHTML='';
    const o=document.createElement('option');
    o.value=s;
    o.textContent=s+(suffix||'');
    el.appendChild(o);
    el.value=s;
    return true;
  }

  function applyMeta(x,raceId){
    if(!x||String(x.race_id)!==raceId)return false;
    const c=document.getElementById('course');
    const s=document.getElementById('surface');
    const v=document.getElementById('variant');
    const d=document.getElementById('distance');
    const g=document.getElementById('going');
    if(!c||!s||!v||!d)return false;

    if(!selectValue(c,x.course))return false;
    if(!selectValue(s,x.surface))return false;
    if(!oneOption(v,x.variant,''))return false;
    if(!oneOption(d,Number(x.distance),'m'))return false;
    if(x.going&&g)selectValue(g,x.going);

    // 取得完了後に最後の1回だけ再計算。
    d.dispatchEvent(new Event('change',{bubbles:true}));
    showStatus('✓ 条件確定: '+String(x.course).replace('競馬場','')+' / '+x.surface+' / '+x.variant+' / '+x.distance+'m','ok');
    return true;
  }

  async function handleImport(raceId){
    patchIntro();
    if(!raceId)return;
    const my=++seq;
    showStatus('レース条件を取得済み。出馬表の完了待ち…','pending');

    const metaPromise=getMeta(raceId).catch(()=>null);
    const done=await waitUntilDone(my);
    if(my!==seq)return;
    if(!done){
      showStatus('⚠ 出馬表取得が完了しないため条件確定できません','warn');
      return;
    }

    let x=await metaPromise;
    if(my!==seq)return;
    if(!x){
      try{x=await getMeta(raceId);}catch(e){x=null;}
    }
    if(my!==seq)return;

    if(x&&applyMeta(x,raceId))return;
    showStatus('⚠ レース条件取得に失敗。AI計算は実行しないでください','warn');
  }

  function mount(){
    patchIntro();
    const b=document.getElementById('fetchJraEntry');
    if(!b){setTimeout(mount,150);return;}
    if(b.dataset.runtimeV220)return;
    b.dataset.runtimeV220='1';
    b.addEventListener('click',function(){
      setTimeout(function(){
        const raceId=currentRid();
        handleImport(raceId);
      },0);
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
})();
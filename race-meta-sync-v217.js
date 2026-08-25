(function(){
  'use strict';
  if(window.__keibaRaceMetaSyncV217)return;
  window.__keibaRaceMetaSyncV217=true;

  const SUPABASE_URL='https://qhzccahbevnqaoxdfnbx.supabase.co';
  const ANON_JWT='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoemNjYWhiZXZucWFveGRmbmJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2MTExNjEsImV4cCI6MjEwMzE4NzE2MX0.7RnMtCdjJTJEdbeJHMz2lQ9QIge7UvOpzLVJtdNJnFY';
  const cache=new Map();
  let requestToken=0;
  let currentRaceId='';

  function patchIntro(){
    try{
      document.querySelectorAll('main > div').forEach(function(el){
        const t=String(el.textContent||'');
        if(t.includes('Safari単体版')&&t.includes('学習データはこのiPhoneのSafari内に保存されます')){
          el.innerHTML='<b>クラウド保存版</b> — ログイン不要。学習データはSupabaseへ保存し、Safariには現在のレースで使う一時データだけを保持します。JRA / netkeibaのURLから出馬表を取り込みます。';
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
    let e=document.getElementById('raceMetaSyncV217Status');
    if(!e){
      e=document.createElement('div');
      e.id='raceMetaSyncV217Status';
      e.style.cssText='margin:5px 0 2px;font-size:11px;font-weight:700;color:#8b949e';
      const a=document.getElementById('remoteStorageV216Status')||document.getElementById('importStatus')||document.getElementById('jraEntryStatus');
      if(a&&a.parentNode)a.parentNode.insertBefore(e,a.nextSibling);
    }
    if(!e)return;
    e.textContent=text;
    e.style.color=state==='ok'?'#3fb950':state==='warn'?'#d29922':'#8b949e';
  }

  function setSelect(id,value){
    const el=document.getElementById(id);
    if(!el)return false;
    const target=String(value);
    const opt=Array.from(el.options||[]).find(function(o){
      return String(o.value)===target||String(o.textContent).replace(/m$/i,'')===target;
    });
    if(!opt)return false;
    el.value=opt.value;
    el.dispatchEvent(new Event('change',{bubbles:true}));
    return true;
  }

  function applyMeta(meta,rid){
    if(!meta||rid!==currentRaceId)return false;
    const course=String(meta.course||'');
    const surface=String(meta.surface||'');
    const variant=String(meta.variant||'');
    const distance=Number(meta.distance||0);
    if(!course||!surface||!variant||!distance)return false;

    if(!setSelect('course',course))return false;
    if(!setSelect('surface',surface))return false;
    if(!setSelect('variant',variant))return false;
    if(!setSelect('distance',String(distance)))return false;

    // The base app redraws on change. Re-apply after importer mutations finish as well.
    setTimeout(function(){
      if(rid!==currentRaceId)return;
      setSelect('course',course);
      setSelect('surface',surface);
      setSelect('variant',variant);
      setSelect('distance',String(distance));
    },250);
    setTimeout(function(){
      if(rid!==currentRaceId)return;
      setSelect('variant',variant);
      setSelect('distance',String(distance));
    },900);

    status('✓ レース条件確認: '+course.replace('競馬場','')+' / '+surface+' / '+variant+' / '+distance+'m','ok');
    return true;
  }

  async function fetchMeta(rid,my){
    if(cache.has(rid))return cache.get(rid);
    const url=SUPABASE_URL+'/functions/v1/race-meta?race_id='+encodeURIComponent(rid);
    const ac=new AbortController();
    const tm=setTimeout(function(){ac.abort();},6500);
    try{
      const r=await fetch(url,{
        method:'GET',
        cache:'no-store',
        signal:ac.signal,
        headers:{apikey:ANON_JWT,Authorization:'Bearer '+ANON_JWT}
      });
      if(!r.ok)throw new Error('HTTP '+r.status);
      const x=await r.json();
      if(!x||!x.ok||String(x.race_id)!==rid)throw new Error('metadata unavailable');
      cache.set(rid,x);
      return x;
    }finally{
      clearTimeout(tm);
    }
  }

  async function syncRace(force){
    patchIntro();
    const rid=currentRid();
    if(!rid)return;
    if(!force&&rid===currentRaceId&&cache.has(rid)){
      applyMeta(cache.get(rid),rid);
      return;
    }
    currentRaceId=rid;
    const my=++requestToken;
    status('レース条件を公式見出しで確認中…','pending');
    try{
      const meta=await fetchMeta(rid,my);
      if(my!==requestToken||rid!==currentRaceId)return;
      applyMeta(meta,rid);
    }catch(e){
      if(my!==requestToken||rid!==currentRaceId)return;
      status('⚠ レース条件の再確認に失敗。現在の表示を確認してください','warn');
    }
  }

  function mount(){
    patchIntro();
    const btn=document.getElementById('fetchJraEntry');
    if(!btn){setTimeout(mount,120);return;}
    if(btn.dataset.metaSyncV217)return;
    btn.dataset.metaSyncV217='1';
    btn.addEventListener('click',function(){
      setTimeout(function(){syncRace(true);},0);
    });

    ['jraEntryStatus','importStatus'].forEach(function(id){
      const el=document.getElementById(id);
      if(!el)return;
      new MutationObserver(function(){
        const t=String(el.textContent||'');
        if(/取り込みました|反映しました|直接反映|race_id/.test(t))setTimeout(function(){syncRace(false);},40);
      }).observe(el,{childList:true,subtree:true,characterData:true});
    });

    setTimeout(function(){syncRace(false);},700);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
})();

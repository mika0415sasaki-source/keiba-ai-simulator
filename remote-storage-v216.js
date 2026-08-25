(function(){
  'use strict';
  if(window.__keibaRemoteStorageV216)return;
  window.__keibaRemoteStorageV216=true;

  const SUPABASE_URL='https://qhzccahbevnqaoxdfnbx.supabase.co';
  const SUPABASE_KEY='sb_publishable_i_5mqOMlvWvUI99_8gjdYw_g5TaSwrm';
  const APP_ID='keiba-ai-simulator';
  const MEMORY_KEY='keiba_ai_memory_v19';
  const VOLATILE_KEYS=new Set(['keiba_jra_last_text_v27']);
  const VOLATILE_PREFIXES=[
    'keiba_netkeiba_past5_v144_',
    'keiba_horse_profile_v112_',
    'keiba_horse_profile_v127_',
    'keiba_horse_profile_v128_',
    'keiba_horse_profile_v129_',
    'keiba_current_race_class_v145_',
    'keiba_race_meta_v'
  ];

  const storage=window.localStorage;
  const proto=Storage.prototype;
  const nativeGet=proto.getItem;
  const nativeSet=proto.setItem;
  const nativeRemove=proto.removeItem;
  const nativeClear=proto.clear;
  const volatile=new Map();
  let memoryValue=null;
  let hydrated=false;
  let saveTimer=0;
  let saving=false;
  let pendingSave=false;

  function isVolatile(k){
    k=String(k||'');
    return VOLATILE_KEYS.has(k)||VOLATILE_PREFIXES.some(p=>k.startsWith(p));
  }

  function status(text,ok){
    try{
      let e=document.getElementById('remoteStorageV216Status');
      if(!e){
        e=document.createElement('div');
        e.id='remoteStorageV216Status';
        e.style.cssText='margin:6px 0 2px;font-size:11px;font-weight:700;color:#8b949e';
        const a=document.getElementById('importStatus')||document.getElementById('jraEntryStatus');
        if(a&&a.parentNode)a.parentNode.insertBefore(e,a.nextSibling);
      }
      if(e){e.textContent=text;e.style.color=ok===false?'#d29922':'#8b949e';}
    }catch(e){}
  }

  async function remoteLoad(){
    const url=SUPABASE_URL+'/rest/v1/keiba_app_state?app_id=eq.'+encodeURIComponent(APP_ID)+'&select=payload';
    const r=await fetch(url,{headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+SUPABASE_KEY},cache:'no-store'});
    if(!r.ok)throw new Error('remote load HTTP '+r.status);
    const rows=await r.json();
    const payload=rows&&rows[0]&&rows[0].payload;
    return payload&&typeof payload.memory==='string'?payload.memory:null;
  }

  async function remoteSaveNow(){
    if(saving){pendingSave=true;return;}
    saving=true;
    try{
      const url=SUPABASE_URL+'/rest/v1/keiba_app_state?app_id=eq.'+encodeURIComponent(APP_ID);
      const r=await fetch(url,{
        method:'PATCH',
        headers:{
          apikey:SUPABASE_KEY,
          Authorization:'Bearer '+SUPABASE_KEY,
          'Content-Type':'application/json',
          Prefer:'return=minimal'
        },
        body:JSON.stringify({payload:{memory:memoryValue==null?'':String(memoryValue)},updated_at:new Date().toISOString()})
      });
      if(!r.ok)throw new Error('remote save HTTP '+r.status);
      status('☁ 学習データ: Supabase保存',true);
    }catch(e){
      status('⚠ 学習データの外部保存を再試行します',false);
      pendingSave=true;
    }finally{
      saving=false;
      if(pendingSave){pendingSave=false;setTimeout(remoteSaveNow,1500);}
    }
  }

  function scheduleSave(){
    clearTimeout(saveTimer);
    saveTimer=setTimeout(remoteSaveNow,350);
  }

  function cleanupExistingCaches(){
    const remove=[];
    try{
      for(let i=0;i<storage.length;i++){
        const k=storage.key(i);
        if(k&&isVolatile(k))remove.push(k);
      }
      remove.forEach(k=>{try{nativeRemove.call(storage,k);}catch(e){}});
    }catch(e){}
  }

  proto.getItem=function(key){
    const k=String(key);
    if(this===storage&&k===MEMORY_KEY){
      if(memoryValue!==null)return memoryValue;
      return nativeGet.call(this,k);
    }
    if(this===storage&&isVolatile(k))return volatile.has(k)?volatile.get(k):null;
    return nativeGet.call(this,key);
  };

  proto.setItem=function(key,value){
    const k=String(key),v=String(value);
    if(this===storage&&k===MEMORY_KEY){
      memoryValue=v;
      if(hydrated)scheduleSave();
      return;
    }
    if(this===storage&&isVolatile(k)){
      volatile.set(k,v);
      return;
    }
    return nativeSet.call(this,key,value);
  };

  proto.removeItem=function(key){
    const k=String(key);
    if(this===storage&&k===MEMORY_KEY){memoryValue='';if(hydrated)scheduleSave();return;}
    if(this===storage&&isVolatile(k)){volatile.delete(k);return;}
    return nativeRemove.call(this,key);
  };

  proto.clear=function(){
    if(this!==storage)return nativeClear.call(this);
    const keepMemory=memoryValue;
    nativeClear.call(this);
    volatile.clear();
    memoryValue=keepMemory;
  };

  async function hydrate(){
    status('☁ 学習データをSupabaseから読込中…',true);
    cleanupExistingCaches();
    const localMemory=nativeGet.call(storage,MEMORY_KEY);
    try{
      const remoteMemory=await remoteLoad();
      if(remoteMemory){
        memoryValue=remoteMemory;
      }else if(localMemory){
        memoryValue=localMemory;
        await remoteSaveNow();
      }else{
        memoryValue='';
      }
      try{nativeRemove.call(storage,MEMORY_KEY);}catch(e){}
      hydrated=true;
      status('☁ 学習データ: Supabase保存 / Safariは一時データのみ',true);
    }catch(e){
      memoryValue=localMemory||'';
      hydrated=true;
      status('⚠ Supabase未接続: 今回のみメモリ保持',false);
    }
  }

  window.addEventListener('pagehide',function(){if(hydrated&&memoryValue!==null)remoteSaveNow();});
  hydrate();
})();

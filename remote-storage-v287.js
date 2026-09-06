(function(){
  'use strict';
  if(window.__keibaRemoteStorageV287)return;
  window.__keibaRemoteStorageV287=true;

  const SUPABASE_URL='https://qhzccahbevnqaoxdfnbx.supabase.co';
  const SUPABASE_KEY='sb_publishable_i_5mqOMlvWvUI99_8gjdYw_g5TaSwrm';
  const APP_ID='keiba-ai-simulator';
  const TABLE='keiba_app_state';
  const PREFIX='keiba_';
  const LEGACY_MEMORY_KEY='keiba_ai_memory_v19';

  // These are the only browser-storage values that need to survive a reload.
  // They live in RAM while the page is open and are persisted remotely in Supabase.
  const REMOTE_KEYS=new Set([
    LEGACY_MEMORY_KEY,
    'keiba_ai_analysis_audit_v31',
    'keiba_ai_career_stats_v1',
    'keiba_ai_career_race_map_v1',
    'keiba_memory_stats_cache_v1',
    'keiba_last_result_saved_v1'
  ]);

  const storage=window.localStorage;
  const proto=Storage.prototype;
  const nativeGet=proto.getItem;
  const nativeSet=proto.setItem;
  const nativeRemove=proto.removeItem;
  const nativeClear=proto.clear;
  const nativeKey=proto.key;

  const mem=new Map();
  let remotePayload={};
  let hydrated=false;
  let saveTimer=0;
  let saving=false;
  let saveAgain=false;

  function isAppKey(key){return String(key||'').startsWith(PREFIX);}
  function isRemoteKey(key){return REMOTE_KEYS.has(String(key||''));}

  function nativeKeys(){
    const out=[];
    try{
      for(let i=0;i<storage.length;i++){
        const k=nativeKey.call(storage,i);
        if(k)out.push(k);
      }
    }catch(e){}
    return out;
  }

  // Migrate old Safari values into RAM immediately, before the application scripts run.
  // This keeps the current session working even if the remote request is still in flight.
  function migrateSafariNow(){
    const keys=nativeKeys().filter(isAppKey);
    for(const k of keys){
      try{
        const v=nativeGet.call(storage,k);
        if(v!=null)mem.set(k,String(v));
      }catch(e){}
    }
    // Do not leave KEIBA data in Safari. Other origin data is untouched.
    for(const k of keys){
      try{nativeRemove.call(storage,k);}catch(e){}
    }
  }

  function remoteKvFromPayload(payload){
    const kv=(payload&&payload.kv&&typeof payload.kv==='object'&&!Array.isArray(payload.kv))?payload.kv:{};
    const out={};
    for(const k of REMOTE_KEYS){
      if(k===LEGACY_MEMORY_KEY)continue;
      if(typeof kv[k]==='string')out[k]=kv[k];
    }
    if(payload&&typeof payload.memory==='string')out[LEGACY_MEMORY_KEY]=payload.memory;
    else if(typeof kv[LEGACY_MEMORY_KEY]==='string')out[LEGACY_MEMORY_KEY]=kv[LEGACY_MEMORY_KEY];
    return out;
  }

  async function remoteLoad(){
    const url=SUPABASE_URL+'/rest/v1/'+TABLE+'?app_id=eq.'+encodeURIComponent(APP_ID)+'&select=payload';
    const r=await fetch(url,{headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+SUPABASE_KEY},cache:'no-store'});
    if(!r.ok)throw new Error('remote load HTTP '+r.status);
    const rows=await r.json();
    const p=rows&&rows[0]&&rows[0].payload;
    return p&&typeof p==='object'&&!Array.isArray(p)?p:{};
  }

  function buildPayload(){
    const kv={...((remotePayload&&remotePayload.kv&&typeof remotePayload.kv==='object'&&!Array.isArray(remotePayload.kv))?remotePayload.kv:{})};
    for(const k of REMOTE_KEYS){
      if(k===LEGACY_MEMORY_KEY)continue;
      if(mem.has(k))kv[k]=mem.get(k);
      else delete kv[k];
    }
    const memory=mem.has(LEGACY_MEMORY_KEY)?mem.get(LEGACY_MEMORY_KEY):String((remotePayload&&remotePayload.memory)||'');
    return {...remotePayload,memory,kv};
  }

  async function remoteSaveNow(){
    if(!hydrated)return;
    if(saving){saveAgain=true;return;}
    saving=true;
    try{
      const payload=buildPayload();
      const url=SUPABASE_URL+'/rest/v1/'+TABLE+'?app_id=eq.'+encodeURIComponent(APP_ID);
      const r=await fetch(url,{
        method:'PATCH',
        headers:{
          apikey:SUPABASE_KEY,
          Authorization:'Bearer '+SUPABASE_KEY,
          'Content-Type':'application/json',
          Prefer:'return=minimal'
        },
        body:JSON.stringify({payload,updated_at:new Date().toISOString()}),
        keepalive:true
      });
      if(!r.ok)throw new Error('remote save HTTP '+r.status);
      remotePayload=payload;
      window.dispatchEvent(new CustomEvent('keiba:remote-storage-saved'));
    }catch(e){
      console.warn('[KEIBA storage] remote save failed',e);
    }finally{
      saving=false;
      if(saveAgain){saveAgain=false;setTimeout(remoteSaveNow,1200);}
    }
  }

  function scheduleSave(){
    clearTimeout(saveTimer);
    saveTimer=setTimeout(remoteSaveNow,1200);
  }

  // For this app, every keiba_* key is RAM-only in Safari.
  // Only REMOTE_KEYS are additionally persisted to Supabase.
  proto.getItem=function(key){
    const k=String(key);
    if(this===storage&&isAppKey(k))return mem.has(k)?mem.get(k):null;
    return nativeGet.call(this,key);
  };

  proto.setItem=function(key,value){
    const k=String(key),v=String(value);
    if(this===storage&&isAppKey(k)){
      mem.set(k,v);
      if(hydrated&&isRemoteKey(k))scheduleSave();
      return;
    }
    return nativeSet.call(this,key,value);
  };

  proto.removeItem=function(key){
    const k=String(key);
    if(this===storage&&isAppKey(k)){
      mem.delete(k);
      if(hydrated&&isRemoteKey(k))scheduleSave();
      return;
    }
    return nativeRemove.call(this,key);
  };

  proto.clear=function(){
    if(this!==storage)return nativeClear.call(this);
    mem.clear();
    nativeClear.call(this);
    if(hydrated)scheduleSave();
  };

  async function hydrate(){
    try{
      const p=await remoteLoad();
      remotePayload=p;
      const remote=remoteKvFromPayload(p);
      // Supabase is authoritative for persistent keys when a remote value exists.
      for(const [k,v] of Object.entries(remote)){
        if(typeof v==='string'&&v!=='')mem.set(k,v);
      }
      hydrated=true;
      // If Safari held legacy persistent data that Supabase did not have, migrate it once.
      let needsMigration=false;
      for(const k of REMOTE_KEYS){
        if(mem.has(k)&&!(k in remote))needsMigration=true;
      }
      if(needsMigration)scheduleSave();
      window.__keibaStorageMode={browser:'memory-only',persistent:'supabase',ready:true};
      window.dispatchEvent(new CustomEvent('keiba:remote-storage-ready'));
    }catch(e){
      hydrated=true;
      window.__keibaStorageMode={browser:'memory-only',persistent:'session-only',ready:true,error:String(e)};
      console.warn('[KEIBA storage] Supabase unavailable; session RAM only',e);
      window.dispatchEvent(new CustomEvent('keiba:remote-storage-ready'));
    }
  }

  migrateSafariNow();
  window.__keibaStorageMode={browser:'memory-only',persistent:'loading',ready:false};
  hydrate();
})();

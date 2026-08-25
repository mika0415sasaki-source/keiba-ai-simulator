(function(){
  'use strict';
  if(window.__keibaRuntimeV224)return;
  window.__keibaRuntimeV224=true;

  const SUPABASE_URL='https://qhzccahbevnqaoxdfnbx.supabase.co';
  const ANON_JWT='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoemNjYWhiZXZucWFveGRmbmJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2MTExNjEsImV4cCI6MjEwMzE4NzE2MX0.7RnMtCdjJTJEdbeJHMz2lQ9QIge7UvOpzLVJtdNJnFY';
  const COURSE_MAP={
    '01':'札幌競馬場','02':'函館競馬場','03':'福島競馬場','04':'新潟競馬場','05':'東京競馬場',
    '06':'中山競馬場','07':'中京競馬場','08':'京都競馬場','09':'阪神競馬場','10':'小倉競馬場'
  };
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

  function statusText(){
    return String((document.getElementById('jraEntryStatus')||{}).textContent||'')+'\n'+
           String((document.getElementById('importStatus')||{}).textContent||'');
  }

  function currentRid(){
    const u=document.getElementById('jraEntryUrl');
    return raceIdFromText(u&&u.value)||raceIdFromText(statusText());
  }

  function showStatus(text,state){
    let e=document.getElementById('raceMetaV224Status');
    if(!e){
      e=document.createElement('div');
      e.id='raceMetaV224Status';
      e.style.cssText='margin:5px 0 2px;font-size:11px;font-weight:700;color:#8b949e';
      const a=document.getElementById('remoteStorageV216Status')||document.getElementById('importStatus')||document.getElementById('jraEntryStatus');
      if(a&&a.parentNode)a.parentNode.insertBefore(e,a.nextSibling);
    }
    if(!e)return;
    e.textContent=text;
    e.style.color=state==='ok'?'#3fb950':state==='warn'?'#d29922':'#8b949e';
  }

  function setAnalysisEnabled(enabled){
    ['navAnalyze','navPlay','navBatch','play','batch'].forEach(function(id){
      const e=document.getElementById(id);
      if(e){e.disabled=!enabled;e.style.opacity=enabled?'':'0.45';}
    });
  }

  function isDone(t){return /\d+頭を?取り込みました|\d+頭を反映しました|直接反映しました/.test(String(t||''));}
  function isLoading(t){return /取得中|読込中|読み込み中|解析中|反映中|①\s*netkeiba競馬新聞を取得中/.test(String(t||''));}

  async function waitForFreshImport(my,before){
    const started=Date.now();
    let sawChange=false,sawLoading=false,doneSince=0;
    while(Date.now()-started<180000){
      if(my!==seq)return false;
      const now=statusText();
      if(now!==before)sawChange=true;
      if(isLoading(now))sawLoading=true;
      if((sawChange||sawLoading)&&isDone(now)){
        if(!doneSince)doneSince=Date.now();
        if(Date.now()-doneSince>=1000)return true;
      }else doneSince=0;
      await new Promise(function(r){setTimeout(r,250);});
    }
    return false;
  }

  function emitEntryImported(detail){
    try{window.dispatchEvent(new CustomEvent('keiba:entry-imported',{detail:detail||{}}));}catch(e){}
  }

  function emitRawEntry(raceId){
    const id=String(raceId||'');
    emitEntryImported({
      raceId:id,
      raceNo:Number(id.slice(-2))||0,
      course:COURSE_MAP[id.slice(4,6)]||'',
      surface:'',variant:'',distance:0,going:'',
      importedAt:new Date().toISOString(),
      pendingMeta:true
    });
  }

  async function fetchMetaOnce(raceId){
    const ac=new AbortController();
    const tm=setTimeout(function(){ac.abort();},9000);
    try{
      const r=await fetch(SUPABASE_URL+'/functions/v1/race-meta?race_id='+encodeURIComponent(raceId),{
        method:'GET',cache:'no-store',signal:ac.signal,
        headers:{apikey:ANON_JWT,Authorization:'Bearer '+ANON_JWT}
      });
      let body=null;try{body=await r.json();}catch(e){}
      if(!r.ok){
        const err=new Error('HTTP '+r.status+(body&&body.error?' / '+body.error:''));
        err.status=r.status;
        throw err;
      }
      if(!body||!body.ok||String(body.race_id)!==raceId)throw new Error((body&&body.error)||'NO_META');
      return body;
    }finally{clearTimeout(tm);}
  }

  async function getMeta(raceId){
    if(cache.has(raceId))return cache.get(raceId);
    let last=null;
    for(let i=0;i<3;i++){
      try{const x=await fetchMetaOnce(raceId);cache.set(raceId,x);return x;}
      catch(e){
        last=e;
        if(e&&e.status===401)break;
        if(i<2)await new Promise(function(r){setTimeout(r,600);});
      }
    }
    throw last||new Error('metadata unavailable');
  }

  function selectValue(el,value){
    if(!el)return false;
    const s=String(value);
    const o=Array.from(el.options||[]).find(function(x){return String(x.value)===s||String(x.textContent).replace(/m$/i,'')===s;});
    if(!o)return false;el.value=o.value;return true;
  }

  function oneOption(el,value,suffix){
    if(!el)return false;
    const s=String(value);el.innerHTML='';
    const o=document.createElement('option');o.value=s;o.textContent=s+(suffix||'');el.appendChild(o);el.value=s;return true;
  }

  function applyMeta(x,raceId){
    if(!x||String(x.race_id)!==raceId)return false;
    const c=document.getElementById('course'),s=document.getElementById('surface'),v=document.getElementById('variant'),d=document.getElementById('distance'),g=document.getElementById('going');
    if(!c||!s||!v||!d)return false;
    if(!selectValue(c,x.course)||!selectValue(s,x.surface))return false;
    if(!oneOption(v,x.variant,'')||!oneOption(d,Number(x.distance),'m'))return false;
    if(x.going&&g)selectValue(g,x.going);
    d.dispatchEvent(new Event('change',{bubbles:true}));
    setAnalysisEnabled(true);
    showStatus('✓ 条件確定: '+String(x.course).replace('競馬場','')+' / '+x.surface+' / '+x.variant+' / '+x.distance+'m','ok');
    emitEntryImported({
      raceId:String(raceId||''),raceNo:Number(String(raceId||'').slice(-2))||0,
      course:String(x.course||''),surface:String(x.surface||''),variant:String(x.variant||''),
      distance:Number(x.distance||0),going:String(x.going||''),importedAt:new Date().toISOString(),pendingMeta:false
    });
    return true;
  }

  async function handleImport(raceId,before){
    patchIntro();
    if(!raceId){showStatus('⚠ race_idを取得できません','warn');setAnalysisEnabled(false);return;}
    const my=++seq;setAnalysisEnabled(false);showStatus('出馬表の取得完了を待っています…','pending');
    const done=await waitForFreshImport(my,before);
    if(my!==seq)return;
    if(!done){showStatus('⚠ 出馬表取得の完了を確認できません','warn');return;}

    // 出馬表そのものの取得履歴は、条件APIの成否に関係なくここで即更新。
    emitRawEntry(raceId);

    showStatus('レース条件を確認中…','pending');
    let x=null,err='';try{x=await getMeta(raceId);}catch(e){err=String(e&&e.message||e);}
    if(my!==seq)return;
    if(x&&applyMeta(x,raceId))return;
    setAnalysisEnabled(false);showStatus('⚠ レース条件取得失敗'+(err?' ['+err+']':'')+'。AI計算を停止しました','warn');
  }

  function mount(){
    patchIntro();
    const b=document.getElementById('fetchJraEntry');
    if(!b){setTimeout(mount,150);return;}
    if(b.dataset.runtimeV224)return;
    b.dataset.runtimeV224='1';
    b.addEventListener('click',function(){
      const before=statusText();const raceId=currentRid();
      setTimeout(function(){handleImport(raceId,before);},0);
    },true);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
})();
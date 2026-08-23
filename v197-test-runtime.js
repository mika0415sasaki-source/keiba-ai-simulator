(function(){
  'use strict';
  if(window.__keibaV197RaceMetaMounted)return;
  window.__keibaV197RaceMetaMounted=true;

  const courseMap={
    '01':'札幌競馬場','02':'函館競馬場','03':'福島競馬場','04':'新潟競馬場','05':'東京競馬場',
    '06':'中山競馬場','07':'中京競馬場','08':'京都競馬場','09':'阪神競馬場','10':'小倉競馬場'
  };
  let busy=false,lastDone='';

  function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
  function raceIdFromInput(){
    const el=document.getElementById('jraEntryUrl');
    const m=String(el&&el.value||'').match(/[?&]race_id=(\d{12})/);
    return m?m[1]:'';
  }
  function setStatus(msg,ok){
    const el=document.getElementById('importStatus');
    if(!el)return;
    const cls=ok?'ok':'warn';
    const old=String(el.innerHTML||'').replace(/<div data-v197-meta="1"[\s\S]*?<\/div>/g,'');
    el.innerHTML=old+'<div data-v197-meta="1" class="'+cls+'" style="margin-top:4px">'+msg+'</div>';
  }
  async function fetchText(url,ms){
    const ctrl=new AbortController();
    const t=setTimeout(()=>ctrl.abort(),ms||9000);
    try{
      const r=await fetch(url,{cache:'no-store',signal:ctrl.signal});
      if(!r.ok)throw new Error('HTTP '+r.status);
      return await r.text();
    }finally{clearTimeout(t);}
  }
  async function exactMeta(raceId){
    const raceNo=Number(raceId.slice(-2));
    const mobile='https://race.sp.netkeiba.com/race/shutuba.html?race_id='+raceId+'&rf=prs';
    let text='';
    const routes=['https://r.jina.ai/'+mobile,mobile];
    let err='';
    for(const u of routes){
      try{text=await fetchText(u,9000);if(text&&text.length>300)break;}catch(e){err=String(e&&e.message||e);}
    }
    if(!text)throw new Error(err||'出馬表ヘッダー取得失敗');
    const raw=String(text).normalize('NFKC').replace(/\r/g,'');
    const re=new RegExp('(?:^|\\n)\\s*'+raceNo+'R\\s*(?:\\n|$)','m');
    const hit=re.exec(raw);
    const start=hit?hit.index:0;
    const head=raw.slice(start,start+2600);
    let m=head.match(/(芝|ダート|ダ)\s*([1-4]\d{3})\s*m\s*[（(]?\s*([^）)\n]{0,12})/i);
    if(!m)m=head.match(/([1-4]\d{3})\s*m\s*[（(]?\s*(芝|ダート|ダ)([^）)\n]{0,12})/i);
    if(!m)throw new Error('対象レースの距離・芝ダをヘッダーから確認できません');
    let surface,distance,dir='';
    if(/^\d/.test(m[1])){distance=Number(m[1]);surface=m[2];dir=String(m[3]||'');}
    else{surface=m[1];distance=Number(m[2]);dir=String(m[3]||'');}
    if(surface==='ダ')surface='ダート';
    let variant='';
    if(surface==='芝'){
      if(/直線/.test(dir))variant='直線';
      else if(/外/.test(dir))variant='外回り';
      else if(/内/.test(dir))variant='内回り';
    }
    return {course:courseMap[raceId.slice(4,6)]||'',surface,distance,variant,head:head.slice(0,300)};
  }
  function optionHas(el,v){return !!(el&&[...el.options].some(o=>String(o.value)===String(v)||String(o.textContent)===String(v)));}
  async function applyMeta(meta){
    const course=document.getElementById('course');
    const surface=document.getElementById('surface');
    const variant=document.getElementById('variant');
    const distance=document.getElementById('distance');
    if(meta.course&&optionHas(course,meta.course)){
      course.value=meta.course;
      course.dispatchEvent(new Event('change',{bubbles:true}));
      await sleep(0);
    }
    if(meta.surface&&optionHas(surface,meta.surface)){
      surface.value=meta.surface;
      surface.dispatchEvent(new Event('change',{bubbles:true}));
      await sleep(0);
    }
    if(meta.variant&&optionHas(variant,meta.variant)){
      variant.value=meta.variant;
      variant.dispatchEvent(new Event('change',{bubbles:true}));
      await sleep(0);
    }
    if(meta.distance&&optionHas(distance,String(meta.distance))){
      distance.value=String(meta.distance);
      distance.dispatchEvent(new Event('change',{bubbles:true}));
    }
  }
  async function verifyAfterImport(){
    if(busy)return;
    const raceId=raceIdFromInput();
    if(!raceId||raceId===lastDone)return;
    busy=true;
    try{
      const meta=await exactMeta(raceId);
      await applyMeta(meta);
      lastDone=raceId;
      setStatus('v197確認: '+meta.course.replace('競馬場','')+' / '+meta.surface+' '+meta.distance+'m'+(meta.variant?' / '+meta.variant:''),true);
      await sleep(60);
      const batch=document.getElementById('batch');
      if(batch&&!batch.disabled)batch.click();
    }catch(e){
      setStatus('v197条件確認失敗: '+String(e&&e.message||e),false);
    }finally{busy=false;}
  }
  function mount(){
    const btn=document.getElementById('fetchJraEntry');
    if(!btn){setTimeout(mount,120);return;}
    if(btn.dataset.v197Bound)return;
    btn.dataset.v197Bound='1';
    btn.addEventListener('click',function(){
      lastDone='';
      const timer=setInterval(function(){
        const b=document.getElementById('fetchJraEntry');
        const bulk=document.getElementById('bulk');
        if(b&&!b.disabled&&bulk&&String(bulk.value||'').trim()){
          clearInterval(timer);
          setTimeout(verifyAfterImport,80);
        }
      },250);
      setTimeout(()=>clearInterval(timer),45000);
    },true);
    try{
      document.title='KEIBA AI Simulator v197 TEST';
      const h=document.querySelector('header h1');
      if(h)h.textContent='🏇 KEIBA AI Simulator v197 TEST';
    }catch(e){}
  }
  mount();
})();

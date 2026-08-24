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

  // v197.4 TEST: same simulation formula, but deterministic horse values are
  // calculated once before the Monte Carlo loop. This removes thousands of
  // repeated total-diagnosis / past-five calculations and yields to Safari
  // every small chunk so the page keeps painting.
  function simCacheV197(){
    const basePace=paceName();
    return horses.map(function(h){
      const style=String(h&&h.style||'差し');
      let frontCoef=-0.55;
      if(style==='逃げ')frontCoef=1.25;
      else if(style==='先行')frontCoef=0.8;
      else if(style==='追込')frontCoef=-0.9;
      const frame=Number(h&&h.frame||1);
      const frameKnown=(window.__keibaFrameConfirmedV167!==false)||(h&&h.frameConfirmedV165===true);
      const m=pastFiveMetricsV81(h);
      return {
        h:h,
        base:score(h)-paceAdjV82(h,basePace),
        paceHigh:paceAdjV82(h,'ハイ'),
        paceMid:paceAdjV82(h,'ミドル'),
        paceSlow:paceAdjV82(h,'スロー'),
        frontCoef:frontCoef,
        frameNorm:frameKnown?(frame-4.5)/3.5:0,
        sd:Math.max(4.6,Number(m&&m.volatility||0)*1.35)
      };
    });
  }
  function fastScenarioScoreV197(c,scenario){
    let pa=c.paceMid;
    if(scenario.pace==='ハイ')pa=c.paceHigh;
    else if(scenario.pace==='スロー')pa=c.paceSlow;
    let z=c.base+pa;
    z+=scenario.frontBias*c.frontCoef;
    z+=scenario.frameBias*c.frameNorm;
    const r=Math.random();
    if(r<.055)z-=4.5+Math.random()*4.5;
    else if(r<.16)z-=1.0+Math.random()*2.6;
    else if(r>.90)z+=.6+Math.random()*1.8;
    z+=randNormV82()*c.sd;
    z+=randNormV82()*1.15;
    return z;
  }
  async function batchFastV197(n,onProgress){
    const s=horses.map(()=>({w:0,p2:0,p3:0}));
    const cache=simCacheV197();
    const chunk=n>=10000?100:n>=1000?75:50;
    for(let r=0;r<n;r++){
      const scenario={
        pace:samplePaceV82(),
        frontBias:randNormV82()*1.25,
        frameBias:randNormV82()*1.05
      };
      const o=cache.map((c,i)=>({i:i,s:fastScenarioScoreV197(c,scenario)})).sort((a,b)=>b.s-a.s);
      if(o.length){
        s[o[0].i].w++;
        if(o[1]){s[o[0].i].p2++;s[o[1].i].p2++;}
        for(let k=0;k<Math.min(3,o.length);k++)s[o[k].i].p3++;
      }
      const done=r+1;
      if(done%chunk===0||done===n){
        if(typeof onProgress==='function')onProgress(done,n);
        await new Promise(resolve=>setTimeout(resolve,0));
      }
    }
    return s.map((x,i)=>({i:i,win:100*x.w/n,quin:100*x.p2/n,show:100*x.p3/n}))
      .sort((a,b)=>b.show-a.show||b.win-a.win);
  }
  async function runFastV197(withRace){
    if(!horses.length)return;
    const n=Number(E.count.value)||1000;
    setSimulationBusyV95(true,0,n);
    try{
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      lastStats=await batchFastV197(n,(done,total)=>setSimulationBusyV95(true,done,total));
      lastSimulationCountV83=n;
      simulationRunSeqV83++;
      lastSimulationLabelV83=withRace?'選択回数シミュレーション':'集計のみ再計算';
      renderStats();
    }finally{
      setSimulationBusyV95(false,n,n);
    }
    if(withRace)play();
  }
  function installFastSimulationV197(){
    try{
      if(typeof horses==='undefined'||typeof score!=='function'||typeof pastFiveMetricsV81!=='function'||typeof paceAdjV82!=='function'||typeof setSimulationBusyV95!=='function')return false;
      const playBtn=document.getElementById('play');
      const batchBtn=document.getElementById('batch');
      const navPlay=document.getElementById('navPlay');
      const navBatch=document.getElementById('navBatch');
      if(playBtn)playBtn.onclick=function(){runFastV197(true);};
      if(batchBtn)batchBtn.onclick=function(){runFastV197(false);};
      if(navPlay)navPlay.onclick=function(){runFastV197(true);};
      if(navBatch)navBatch.onclick=function(){if(E&&E.count)E.count.value='1000';runFastV197(true);};
      return true;
    }catch(e){
      console.warn('v197 fast simulation unavailable',e);
      return false;
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
      // The base v196 resolver can still have applied the exact immutable condition.
      // Keep this as a diagnostic only; never overwrite a valid current selection.
      setStatus('v197追加確認: '+String(e&&e.message||e),false);
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
    let tries=0;
    const fastTimer=setInterval(function(){
      tries++;
      if(installFastSimulationV197()||tries>30)clearInterval(fastTimer);
    },120);
  }
  mount();
})();

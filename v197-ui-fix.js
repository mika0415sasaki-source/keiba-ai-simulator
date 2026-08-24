(function(){
  'use strict';
  if(window.__keibaV197UiFixMounted)return;
  window.__keibaV197UiFixMounted=true;

  let recalcTimer=0;
  function scheduleAsyncRecalc(){
    clearTimeout(recalcTimer);
    recalcTimer=setTimeout(function(){
      try{
        const b=document.getElementById('batch');
        if(b&&!b.disabled)b.click();
      }catch(e){}
    },420);
  }

  function setDirtyAndDraw(){
    try{lastStats=null;}catch(e){}
    try{lastSimulationCountV83=0;}catch(e){}
    try{lastSimulationLabelV83='条件変更後の非同期再計算';}catch(e){}
    try{if(typeof renderPaceAutoStatus==='function')renderPaceAutoStatus();}catch(e){}
    try{if(typeof draw==='function')draw();}catch(e){}
    scheduleAsyncRecalc();
  }

  function install(){
    try{
      if(typeof E==='undefined'||typeof C==='undefined')throw new Error('base not ready');

      // Core v163 updateDistances() cleared lastStats and immediately called
      // renderStats(); renderStats() then synchronously ran batch(1000).
      // Replace only that UI path in this TEST build. Monte Carlo math is unchanged.
      const lightUpdateDistances=function(){
        const variants=C[E.course.value]&&C[E.course.value].variants&&C[E.course.value].variants[E.surface.value];
        if(!variants)return;
        const a=variants[E.variant.value]||[];
        const prev=Number(E.distance&&E.distance.value||0);
        E.distance.innerHTML=a.map(function(d){return '<option value="'+d+'">'+d+'m</option>';}).join('');
        if(a.includes(prev))E.distance.value=String(prev);
        else if(a.includes(1800))E.distance.value='1800';
        else if(a.length)E.distance.value=String(a[0]);
        setDirtyAndDraw();
      };

      try{window.updateDistances=lightUpdateDistances;}catch(e){}
      try{updateDistances=lightUpdateDistances;}catch(e){}

      // updateVariants() resolves updateDistances by identifier at call time in
      // the classic script, so course/surface/variant changes now use the light path.
      if(E.distance)E.distance.onchange=setDirtyAndDraw;
      if(E.going)E.going.onchange=setDirtyAndDraw;
      if(E.pace)E.pace.onchange=setDirtyAndDraw;

      const el=document.getElementById('importStatus');
      if(el){
        const old=String(el.innerHTML||'').replace(/<div data-v197-ui="1"[\s\S]*?<\/div>/g,'');
        el.innerHTML=old+'<div data-v197-ui="1" class="ok" style="margin-top:4px">v197軽量化: 条件変更時の同期1,000回計算を停止</div>';
      }
      return true;
    }catch(e){return false;}
  }

  let tries=0;
  const timer=setInterval(function(){
    tries++;
    if(install()||tries>40)clearInterval(timer);
  },120);
})();

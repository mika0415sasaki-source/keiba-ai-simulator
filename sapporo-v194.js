(function(){
  'use strict';
  if(window.__keibaSapporoFrameV194Mounted)return;
  window.__keibaSapporoFrameV194Mounted=true;

  function clamp(x,a,b){return Math.max(a,Math.min(b,x));}

  function install(){
    if(typeof window.frameDetailV89!=='function'){
      setTimeout(install,120);
      return;
    }
    if(window.frameDetailV89.__keibaV194)return;

    const original=window.frameDetailV89;
    function patchedFrameDetailV194(h){
      try{
        const courseEl=document.getElementById('course');
        const surfaceEl=document.getElementById('surface');
        const distanceEl=document.getElementById('distance');
        const course=String(courseEl&&courseEl.value||'');
        const surface=String(surfaceEl&&surfaceEl.value||'');
        const distance=Number(distanceEl&&distanceEl.value||0);
        if(course==='札幌競馬場'&&surface==='芝'&&distance===1200){
          const f=Number(h&&h.frame||1);
          const style=String(h&&h.style||'差し');
          const byFrame={1:-0.20,2:-0.10,3:0.00,4:0.10,5:0.30,6:0.40,7:0.30,8:0.10};
          let z=Number(byFrame[f]||0);
          if((style==='逃げ'||style==='先行')&&f<=4)z+=0.10;
          if(style==='差し'&&f>=5&&f<=7)z+=0.10;
          if(style==='追込'&&f<=2)z-=0.10;
          z=clamp(z,-0.50,0.50);
          const side=f<=3?'内':f>=6?'外':'中';
          return {bonus:z,reason:'札幌 芝1200m・'+style+'・'+side+'枠（枠×脚質補正 v194）'};
        }
      }catch(e){}
      return original(h);
    }
    patchedFrameDetailV194.__keibaV194=true;

    window.frameDetailV89=patchedFrameDetailV194;
    try{frameDetailV89=patchedFrameDetailV194;}catch(e){}

    try{if(typeof lastStats!=='undefined')lastStats=null;}catch(e){}
    try{if(typeof renderStats==='function')renderStats();}catch(e){}
  }

  install();
})();

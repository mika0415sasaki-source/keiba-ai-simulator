(function(){
  'use strict';
  if(window.__keibaSapporoFrameV195TestMounted)return;
  window.__keibaSapporoFrameV195TestMounted=true;

  function clamp(x,a,b){return Math.max(a,Math.min(b,x));}

  function fieldSize(){
    try{
      if(typeof horses!=='undefined'&&Array.isArray(horses)&&horses.length)return horses.length;
    }catch(e){}
    return 0;
  }

  function shrinkByField(n){
    if(!n)return 1;
    if(n<=8)return 0.60;
    if(n<=12)return 0.80;
    return 1.00;
  }

  function install(){
    if(typeof window.frameDetailV89!=='function'){
      setTimeout(install,120);
      return;
    }
    if(window.frameDetailV89.__keibaV195Test)return;

    const original=window.frameDetailV89;

    function patchedFrameDetailV195Test(h){
      try{
        const course=String((document.getElementById('course')||{}).value||'');
        const surface=String((document.getElementById('surface')||{}).value||'');
        const distance=Number((document.getElementById('distance')||{}).value||0);

        if(course==='札幌競馬場'&&surface==='芝'&&distance===1200){
          const f=Number(h&&h.frame||0);
          if(!Number.isInteger(f)||f<1||f>8)return original(h);

          const style=String(h&&h.style||'');
          const n=fieldSize();
          const scale=shrinkByField(n);

          // 札幌芝1200mの近年データに合わせ、枠だけで大きく評価を動かさない。
          // 8枠・6枠をややプラス、2～3枠をわずかにマイナス、1枠はほぼ中立。
          const byFrame={
            1: 0.04,
            2:-0.06,
            3:-0.08,
            4: 0.00,
            5: 0.03,
            6: 0.12,
            7: 0.10,
            8: 0.20
          };

          let z=Number(byFrame[f]||0);

          // 脚質との相互作用も小幅に限定する。
          if((style==='逃げ'||style==='先行')&&f<=2)z+=0.04;
          if((style==='差し'||style==='追込')&&f>=6)z+=0.05;
          if(style==='追込'&&f<=2)z-=0.04;

          z=clamp(z*scale,-0.30,0.30);
          const side=f<=3?'内':f>=6?'外':'中';
          const nText=n?('・'+n+'頭立て補正'):'・頭数未取得';
          return {
            bonus:z,
            reason:'札幌 芝1200m・'+style+'・'+side+'枠'+nText+'（枠×脚質補正 TEST v195）'
          };
        }
      }catch(e){}
      return original(h);
    }

    patchedFrameDetailV195Test.__keibaV195Test=true;
    patchedFrameDetailV195Test.__keibaBase=original;

    window.frameDetailV89=patchedFrameDetailV195Test;
    try{frameDetailV89=patchedFrameDetailV195Test;}catch(e){}

    try{if(typeof lastStats!=='undefined')lastStats=null;}catch(e){}
    try{if(typeof renderStats==='function')renderStats();}catch(e){}
  }

  install();
})();

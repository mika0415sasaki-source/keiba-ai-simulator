(()=>{
  if(window.__mobileHistoryUiFixV288)return;
  window.__mobileHistoryUiFixV288=true;

  function installStyle(){
    if(document.getElementById('mobileHistoryUiFixV288Style'))return;
    const s=document.createElement('style');
    s.id='mobileHistoryUiFixV288Style';
    s.textContent=`
      html{background:#09101d !important;min-height:100% !important;overscroll-behavior-y:none;}
      body{background-color:#09101d !important;min-height:100dvh !important;overflow-x:hidden !important;}
      .wrap{min-height:100dvh !important;padding-bottom:calc(44px + env(safe-area-inset-bottom)) !important;}
      header{background:#09101d !important;}
      @supports (-webkit-touch-callout:none){
        html,body{min-height:-webkit-fill-available !important;}
        .wrap{min-height:-webkit-fill-available !important;}
      }
    `;
    (document.head||document.documentElement).appendChild(s);
    document.documentElement.style.backgroundColor='#09101d';
    if(document.body)document.body.style.backgroundColor='#09101d';
  }

  function installHistoryCompat(){
    try{
      if(typeof nkFallback!=='function'||nkFallback.__mobileHistoryUiFixV288)return false;
      const previous=nkFallback;
      const wrapped=async function(names,race_url){
        const j=await previous.apply(this,arguments);
        if(j && !Array.isArray(j.rows) && Array.isArray(j.results))j.rows=j.results;
        if(j && !Array.isArray(j.results) && Array.isArray(j.rows))j.results=j.rows;
        return j;
      };
      wrapped.__mobileHistoryUiFixV288=true;
      wrapped.__previous=previous;
      nkFallback=wrapped;
      try{window.nkFallback=wrapped}catch(_){}
      return true;
    }catch(e){console.warn('history api compat v288',e);return false}
  }

  function keepDark(){
    try{
      document.documentElement.style.backgroundColor='#09101d';
      if(document.body)document.body.style.backgroundColor='#09101d';
    }catch(_){ }
  }

  installStyle();
  addEventListener('pageshow',()=>{installStyle();keepDark()});
  addEventListener('orientationchange',()=>setTimeout(keepDark,50));
  let tries=0;
  const tick=()=>{
    tries++;
    installStyle();
    if(installHistoryCompat()||tries>40)return;
    setTimeout(tick,250);
  };
  tick();
})();

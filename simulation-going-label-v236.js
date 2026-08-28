(function(){
  'use strict';
  if(window.__keibaSimulationGoingLabelV236)return;
  window.__keibaSimulationGoingLabelV236=true;

  let busy=false;

  function apply(){
    if(busy)return;
    const summary=document.getElementById('aiSummary');
    const going=document.getElementById('going');
    if(!summary||!going)return;

    const head=summary.querySelector(':scope > div.small');
    if(!head)return;

    const current=String(going.value||'').trim();
    if(!/^(良|稍重|重|不良)$/.test(current))return;

    const html=String(head.innerHTML||'');
    const re=/シミュレーション:\s*<b>([^<]+回)<\/b>\s*\/(?:\s*馬場:\s*(?:<b>)?(?:良|稍重|重|不良)(?:<\/b>)?\s*\/\s*)*/;
    if(!re.test(html))return;

    const cleaned=html.replace(re,
      'シミュレーション: <b>$1</b> / 馬場: <b>'+current+'</b> / ');

    if(cleaned!==html){
      busy=true;
      head.innerHTML=cleaned;
      busy=false;
    }
  }

  function mount(){
    apply();
    const body=document.body;
    if(body){
      new MutationObserver(function(){setTimeout(apply,0);})
        .observe(body,{childList:true,subtree:true,characterData:true});
    }
    const going=document.getElementById('going');
    if(going)going.addEventListener('change',function(){setTimeout(apply,0);});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else setTimeout(mount,0);
})();

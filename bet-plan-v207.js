(function(){
  'use strict';
  if(window.__keibaBetPlanV207)return;
  window.__keibaBetPlanV207=true;

  function renameCard(){
    const el=document.getElementById('trifectaPlan');
    if(!el||!el.parentElement)return;
    const title=Array.from(el.parentElement.children||[]).find(x=>x&&x.tagName==='B');
    if(title&&String(title.textContent||'').trim()==='3連複AI買い目'){
      title.textContent='AI買い目';
    }else if(title&&String(title.textContent||'').trim()==='AI買い目（3連複 / ワイド）'){
      title.textContent='AI買い目';
    }
  }

  function convertTwoAxisToWide(){
    const el=document.getElementById('trifectaPlan');
    if(!el)return;
    renameCard();

    const text=String(el.innerText||el.textContent||'');
    if(!/推奨方式\s*:\s*2頭軸流し/.test(text)){
      if(el.dataset.v207Wide)delete el.dataset.v207Wide;
      return;
    }

    const m=text.match(/2頭軸\s*:\s*(\d{1,2})\s*[・･]\s*(\d{1,2})/);
    if(!m)return;
    const a=m[1],b=m[2];
    const sig=a+'-'+b;
    if(el.dataset.v207Wide===sig)return;
    el.dataset.v207Wide=sig;

    el.innerHTML=
      '<b style="font-size:14px">ワイド</b><br>'+ 
      '<div style="margin-top:8px;padding:9px;border:1px solid #30363d;border-radius:7px;background:#0d1117;line-height:1.8">'+
      '<b style="font-size:16px">'+a+'－'+b+'</b><br>'+ 
      '<span style="opacity:.75">1点</span>'+ 
      '</div>';
  }

  let queued=false;
  function schedule(){
    if(queued)return;queued=true;
    setTimeout(function(){queued=false;convertTwoAxisToWide();},0);
  }

  function mount(){
    const el=document.getElementById('trifectaPlan');
    if(!el){setTimeout(mount,150);return;}
    renameCard();
    convertTwoAxisToWide();
    new MutationObserver(schedule).observe(el,{childList:true,subtree:true,characterData:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
})();

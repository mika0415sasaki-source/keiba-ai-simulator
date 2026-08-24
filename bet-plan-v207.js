(function(){
  'use strict';
  if(window.__keibaBetPlanV207)return;
  window.__keibaBetPlanV207=true;

  function renameCard(){
    const el=document.getElementById('trifectaPlan');
    if(!el||!el.parentElement)return;
    const title=Array.from(el.parentElement.children||[]).find(x=>x&&x.tagName==='B');
    if(title&&String(title.textContent||'').trim()==='3連複AI買い目'){
      title.textContent='AI買い目（3連複 / ワイド）';
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
      '推奨方式: <b style="font-size:14px">ワイド</b><br>'+ 
      '<span style="opacity:.78">3連複の2頭軸は採用しません。軸上位2頭を両方高く評価する場面は、2頭とも馬券内に来れば的中するワイドへ切り替えます。</span><br><br>'+ 
      '<b>ワイド:</b> '+a+'－'+b+'<br>'+ 
      '<b>点数: 1点</b>　<span style="opacity:.75">100円なら100円</span><br>'+ 
      '<div style="margin-top:6px;padding:8px;border:1px solid #30363d;border-radius:7px;background:#0d1117;line-height:1.75">'+ 
      '<b>実買い目</b><br>'+a+'－'+b+
      '</div>'+ 
      '<div style="margin-top:7px;opacity:.72">※3連複は1頭軸またはフォーメーションのみ。2頭軸推奨は今後出しません。</div>';
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

(()=>{
  if(window.__netkeibaMarketStatusV279)return;
  window.__netkeibaMarketStatusV279=true;

  const isNk=()=>/netkeiba\.com/i.test(String(document.getElementById('raceUrl')?.value||''));
  const horseCount=()=>{try{return Array.isArray(horses)?horses.filter(h=>!/取消|除外|中止|失格/.test(String(h?.status||h?.result_status||''))).length:0}catch(_){return 0}};
  function state(){try{return typeof window.__getNetkeibaForecastState==='function'?window.__getNetkeibaForecastState():null}catch(_){return null}}

  function settle(){
    if(!isNk())return;
    const st=state(),n=horseCount();if(!st)return;
    const type=String(st.oddsType||'unavailable').toLowerCase();
    const unavailable=st.status==='error'||(st.status==='ready'&&(type==='unavailable'||Number(st.count||0)<n));
    if(!unavailable)return;

    document.querySelectorAll('#ranking .small,#comparison .small,.summary-market,.comparison-market').forEach(el=>{
      const s=String(el.textContent||'');
      if(/netkeiba予想オッズ取得中/.test(s))el.textContent=s.replace(/netkeiba予想オッズ取得中/g,'netkeiba予想オッズ未取得');
    });

    const ev=document.getElementById('evidence');
    if(ev){
      let s=ev.innerHTML;
      s=s.replace(/netkeiba予想オッズ・人気を表示（AI指数と妙味判定には未使用）/g,'netkeiba予想オッズ・人気：未取得（AI指数と妙味判定には未使用）');
      s=s.replace(/netkeiba予想オッズ・人気を表示 \(AI指数と妙味判定には未使用\)/g,'netkeiba予想オッズ・人気：未取得（AI指数と妙味判定には未使用）');
      if(s!==ev.innerHTML)ev.innerHTML=s;
    }
  }

  let timer=0;
  new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(settle,40)}).observe(document.body,{subtree:true,childList:true,characterData:true});
  document.addEventListener('click',e=>{const t=e.target;if(t&&(t.id==='analyze'||t.id==='importRace'||/AI分析|出馬表取込/.test(String(t.textContent||'')))){setTimeout(settle,500);setTimeout(settle,1800)}},true);
  setInterval(settle,1500);
  setTimeout(settle,200);
})();
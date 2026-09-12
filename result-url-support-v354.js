(()=>{
  if(window.__resultUrlSupportV354)return;
  window.__resultUrlSupportV354=true;

  function parseRaceId(url){
    let s=String(url||'');
    for(let i=0;i<3;i++){try{s=decodeURIComponent(s)}catch(_){break}}

    let m=s.match(/(?:race_id[=:_\/-]*|\/race\/)(20\d{10})/i)||s.match(/\b(20\d{10})\b/);
    if(m)return m[1];

    // JRA 出馬表・結果（PC/スマホ両方）
    m=s.match(/(?:sw01|pw01)(?:ddd|dde|sde)(?:10|01)?(\d{2})(20\d{2})(\d{2})(\d{2})(\d{2})(?:20\d{6})?/i);
    if(m)return `${m[2]}${m[1]}${m[3]}${m[4]}${m[5]}`;

    return '';
  }

  // 既存の結果照合でもスマホJRA結果URL(sw01sde)を同じレースIDとして扱う。
  try{window.raceIdFromUrl=parseRaceId}catch(_){ }

  function applyUi(){
    const input=document.getElementById('resultUrl');
    if(input)input.placeholder='JRA / netkeiba のレース結果URL';
    const btn=document.getElementById('resultImport');
    if(btn)btn.setAttribute('aria-label','JRAまたはnetkeibaから結果取込');
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',applyUi,{once:true});
  else applyUi();
  addEventListener('pageshow',applyUi);
  document.documentElement.dataset.resultUrlSupport='v354';
})();

(()=>{
  if(window.__netkeibaStyleSourceV367)return;
  window.__netkeibaStyleSourceV367=true;

  const ENRICH='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/keiba-race-enrich-v1';
  const VALID=new Set(['逃','先','差','追']);
  const styleByKey=new Map();
  let loadedKey='';
  let loadingKey='';
  let timer=0;

  const el=id=>document.getElementById(id);
  const norm=s=>String(s||'').normalize('NFKC').replace(/[\s　]+/g,'').trim();
  const horseKey=h=>String(h?.netkeiba_horse_id||h?.horse_id||'').trim()||norm(h?.name);
  const validStyle=s=>VALID.has(String(s||''))?String(s):'';

  function currentRaceId(){
    try{
      const x=String(raceMeta?.race_id||'');
      if(/^20\d{10}$/.test(x))return x;
    }catch(_){}
    const url=String(el('raceUrl')?.value||'');
    try{if(typeof raceIdFromUrl==='function'){const x=String(raceIdFromUrl(url)||'');if(/^20\d{10}$/.test(x))return x}}catch(_){}
    return (url.match(/(?:race_id[=:_-]*|\/race\/)(20\d{10})/i)||url.match(/\b(20\d{10})\b/)||[])[1]||'';
  }

  function raceKey(){
    const rid=currentRaceId();
    let hs=[];try{hs=Array.isArray(horses)?horses:[]}catch(_){}
    return rid+'|'+hs.map(h=>`${+h.no||0}:${norm(h.name)}`).join('|');
  }

  function officialStyle(h){
    const k=horseKey(h);
    const saved=styleByKey.get(k)||styleByKey.get(norm(h?.name));
    if(saved)return saved;
    if(validStyle(h?.style)&&/netkeiba/.test(String(h?.style_source||'')))return validStyle(h.style);
    return '';
  }

  function applyOfficialStyles(){
    let hs=[];try{hs=Array.isArray(horses)?horses:[]}catch(_){}
    if(!hs.length)return 0;
    let count=0;
    hs.forEach(h=>{
      const s=officialStyle(h);
      if(s){
        h.style=s;
        h.style_source='netkeiba競馬新聞';
        h.netkeiba_style=s;
        count++;
      }else{
        // netkeibaに脚質が無い/取れない馬を、JRA通過順の推定値で偽装しない。
        h.style='';
        h.style_source='';
        delete h.netkeiba_style;
      }
    });
    return count;
  }

  function renderOfficialPace(){
    const box=el('paceReason');if(!box)return;
    let hs=[];try{hs=Array.isArray(horses)?horses:[]}catch(_){}
    if(!hs.length){box.innerHTML='出馬表取込後に自動判定します。';return}
    const styles=hs.map(officialStyle),known=styles.filter(Boolean).length;
    const esc=styles.filter(x=>x==='逃').length;
    const lead=styles.filter(x=>x==='先').length;
    const diff=styles.filter(x=>x==='差').length;
    const clos=styles.filter(x=>x==='追').length;
    const manual=String(el('pace')?.value||'自動');
    if(known<Math.ceil(hs.length*.6)){
      try{raceMeta.autoPace=''}catch(_){}
      box.innerHTML=`<b>適用ペース：${manual==='自動'?'判定待ち':manual}</b><br>netkeiba脚質 ${known}/${hs.length}頭（逃げ ${esc} / 先行 ${lead} / 差し ${diff} / 追込 ${clos} / 不明 ${hs.length-known}）<br>${manual==='自動'?'netkeiba掲載脚質が6割以上そろってから自動判定します。':'手動設定をAI分析へ反映'}`;
      return;
    }
    const auto=esc>=2||esc+lead>=Math.max(5,Math.ceil(known*.5))?'ハイ':esc===0&&lead<=2?'スロー':'ミドル';
    try{raceMeta.autoPace=auto}catch(_){}
    const applied=manual==='自動'?auto:manual;
    box.innerHTML=`<b>適用ペース：${applied}</b><br>逃げ ${esc}頭 / 先行 ${lead}頭 / 差し ${diff}頭 / 追込 ${clos}頭 / 不明 ${hs.length-known}頭<br>${manual==='自動'?`netkeiba競馬新聞の脚質をそのまま使用 → ${auto}想定`:'手動設定をAI分析へ反映'}`;
  }

  function relabelHorseCards(){
    let hs=[];try{hs=Array.isArray(horses)?horses:[]}catch(_){}
    const cards=[...(el('horses')?.querySelectorAll(':scope > .card')||[])];
    cards.forEach((card,i)=>{
      const h=hs[i];if(!h)return;
      const line=[...card.querySelectorAll('.small')].find(x=>/^脚質推定：/.test(String(x.textContent||''))||/^脚質：/.test(String(x.textContent||'')));
      if(!line)return;
      const s=officialStyle(h);
      line.textContent=`脚質：${s||'—'}${s?'（netkeiba）':'（netkeiba未取得）'}　父：${h.sire||'—'}　母：${h.dam||'—'}　母父：${h.damsire||'—'}`;
    });
  }

  function updateHistoryStatus(){
    const box=el('histStatus');if(!box)return;
    let hs=[];try{hs=Array.isArray(horses)?horses:[]}catch(_){}
    if(!hs.length)return;
    const n=hs.filter(h=>officialStyle(h)).length;
    const target=box.querySelector('.status')||box;
    const html=String(target.innerHTML||'');
    if(!html)return;
    const replaced=html.replace(/(?:netkeiba)?脚質\s*\d+\/\d+頭/g,`netkeiba脚質 ${n}/${hs.length}頭`);
    if(replaced!==html)target.innerHTML=replaced;
  }

  function installFunctionGuards(){
    // 本体のJRA通過順推定を停止。AIのペース補正もnetkeiba掲載脚質だけを使う。
    const styleFn=h=>officialStyle(h);
    try{window.inferStyleFromJra=styleFn}catch(_){}
    try{inferStyleFromJra=styleFn}catch(_){}
    try{window.renderPaceReason=renderOfficialPace}catch(_){}
    try{renderPaceReason=renderOfficialPace}catch(_){}

    try{
      const oldRender=window.renderHorses;
      if(typeof oldRender==='function'&&!oldRender.__netkeibaStyleV367){
        const fn=function(...args){applyOfficialStyles();const out=oldRender.apply(this,args);relabelHorseCards();return out};
        fn.__netkeibaStyleV367=true;fn.__original=oldRender;
        window.renderHorses=fn;try{renderHorses=fn}catch(_){}
      }
    }catch(_){}

    try{
      const oldEval=window.evalAll;
      if(typeof oldEval==='function'&&!oldEval.__netkeibaStyleV367){
        const fn=function(...args){
          applyOfficialStyles();
          const out=oldEval.apply(this,args);
          applyOfficialStyles();
          renderOfficialPace();
          relabelHorseCards();
          return out;
        };
        fn.__netkeibaStyleV367=true;fn.__original=oldEval;
        window.evalAll=fn;try{evalAll=fn}catch(_){}
      }
    }catch(_){}
  }

  async function loadNetkeibaStyles(force=false){
    installFunctionGuards();
    let hs=[];try{hs=Array.isArray(horses)?horses:[]}catch(_){}
    const rid=currentRaceId(),key=raceKey();
    if(!rid||!hs.length)return;
    if(!force&&key===loadedKey){applyOfficialStyles();renderOfficialPace();relabelHorseCards();updateHistoryStatus();return}
    if(loadingKey===key)return;
    loadingKey=key;
    const ac=new AbortController();const timeout=setTimeout(()=>ac.abort(),12000);
    try{
      const items=hs.map(h=>({name:h.name,id:String(h.netkeiba_horse_id||h.horse_id||'')}));
      const r=await fetch(ENRICH,{method:'POST',cache:'no-store',signal:ac.signal,headers:{'Content-Type':'application/json','Cache-Control':'no-cache'},body:JSON.stringify({race_id:rid,url:String(el('raceUrl')?.value||''),race_date:raceMeta?.race_date||raceMeta?.date||'',items,mode:'style'})});
      const j=await r.json();if(!r.ok)throw new Error(j?.error||`HTTP ${r.status}`);
      styleByKey.clear();
      for(const row of (Array.isArray(j?.horses)?j.horses:[])){
        const s=validStyle(row?.style);
        if(!s||String(row?.style_source||'')!=='netkeiba競馬新聞')continue;
        const id=String(row?.id||row?.netkeiba_horse_id||row?.horse_id||'').trim();
        if(id)styleByKey.set(id,s);
        if(row?.name)styleByKey.set(norm(row.name),s);
      }
      loadedKey=key;
      applyOfficialStyles();
      renderOfficialPace();
      try{if(typeof renderHorses==='function')renderHorses()}catch(_){}
      try{if(typeof evalAll==='function')evalAll()}catch(_){}
      relabelHorseCards();
      updateHistoryStatus();
      document.documentElement.dataset.netkeibaStyle=`${hs.filter(h=>officialStyle(h)).length}/${hs.length}`;
    }catch(e){
      console.warn('netkeiba style v367',e);
      // 取得失敗時も推定値へ勝手に戻さない。
      loadedKey=key;
      applyOfficialStyles();renderOfficialPace();relabelHorseCards();updateHistoryStatus();
    }finally{clearTimeout(timeout);if(loadingKey===key)loadingKey=''}
  }

  function schedule(force=false,delay=40){clearTimeout(timer);timer=setTimeout(()=>loadNetkeibaStyles(force),delay)}
  function start(){installFunctionGuards();schedule(false,80)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  addEventListener('pageshow',()=>schedule(false,60));
  addEventListener('keiba-patches-ready',()=>{installFunctionGuards();schedule(false,60)});
  addEventListener('keiba-data-updated',()=>schedule(false,80));
  el('pace')?.addEventListener('change',()=>{applyOfficialStyles();renderOfficialPace()});

  // histStatusが旧コードで書き直された時も、出所表示だけ正す。
  const hist=el('histStatus');
  if(hist){
    const mo=new MutationObserver(()=>{const t=String(hist.textContent||'');if(/脚質\s*\d+\/\d+頭/.test(t)&&!/netkeiba脚質/.test(t))setTimeout(updateHistoryStatus,0)});
    mo.observe(hist,{childList:true,subtree:true,characterData:true});
  }
})();

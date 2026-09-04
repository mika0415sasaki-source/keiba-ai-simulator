(()=>{
  if(window.__netkeibaPaceBloodFixV273)return;
  window.__netkeibaPaceBloodFixV273=true;

  const PROFILE_API='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/netkeiba-horse-profile-v1';
  const clean=v=>String(v||'').normalize('NFKC').replace(/[\s　]+/g,'').trim();
  const isNk=()=>/netkeiba\.com/i.test(String(document.getElementById('raceUrl')?.value||''));
  const validStyle=s=>['逃','先','差','追'].includes(String(s||''));
  const badPed=v=>{
    const s=String(v||'').replace(/[\[\]【】]/g,'').trim();
    return !s||/^(?:-|—|―|名|父|母|母父|父名|母名|血統|未取得|不明|name|sire|dam|damsire)$/i.test(s);
  };
  const horseList=()=>{try{if(typeof horses!=='undefined'&&Array.isArray(horses))return horses}catch(_){}return Array.isArray(window.horses)?window.horses:[]};

  function usableRows(h){
    const nk=(Array.isArray(h?.history)?h.history:[]).filter(r=>Array.isArray(r?.passage)&&r.passage.some(x=>Number.isFinite(+x)&&+x>0));
    if(nk.length)return nk;
    return (Array.isArray(h?.jra_history)?h.jra_history:[]).filter(r=>Array.isArray(r?.passage)&&r.passage.some(x=>Number.isFinite(+x)&&+x>0));
  }

  function inferStyle(h){
    const rows=usableRows(h).slice(0,5);
    if(!rows.length)return validStyle(h?.style)?h.style:'差';
    let n=0,d=0;
    const rw=[1,.86,.74,.63,.54];
    rows.forEach((r,i)=>{
      const p=(r.passage||[]).map(Number).find(x=>Number.isFinite(x)&&x>0);
      if(!p)return;
      const field=Math.max(+r.field_size||+r.fieldSize||16,p,2);
      const x=p/field,w=rw[i]||.5;
      n+=x*w;d+=w;
    });
    if(!d)return validStyle(h?.style)?h.style:'差';
    const x=n/d;
    return x<=.18?'逃':x<=.38?'先':x<=.68?'差':'追';
  }

  function refreshStyles(){
    const hs=horseList();
    hs.forEach(h=>{h.style=inferStyle(h)});
    return hs;
  }

  function renderPace(){
    const hs=refreshStyles(),box=document.getElementById('paceReason');
    if(!box)return;
    if(!hs.length){box.innerHTML='出馬表取込後に自動判定します。';return}
    const st=hs.map(h=>h.style),esc=st.filter(x=>x==='逃').length,lead=st.filter(x=>x==='先').length,diff=st.filter(x=>x==='差').length,clos=st.filter(x=>x==='追').length;
    let auto=esc>=2||esc+lead>=Math.max(5,Math.ceil(hs.length*.5))?'ハイ':esc===0&&lead<=2?'スロー':'ミドル';
    try{if(typeof raceMeta==='object'&&raceMeta)raceMeta.autoPace=auto}catch(_){}
    const manual=document.getElementById('pace')?.value||'自動',applied=manual==='自動'?auto:manual;
    box.innerHTML=`<b>適用ペース：${applied}</b><br>逃げ ${esc}頭 / 先行 ${lead}頭 / 差し ${diff}頭 / 追込 ${clos}頭<br>${manual==='自動'?`netkeiba過去走の通過順を優先して脚質判定 → ${auto}想定`:'手動設定をAI分析へ反映'}`;
  }

  async function repairPedigrees(list){
    if(!Array.isArray(list)||!list.length)return false;
    const targets=list.filter(h=>badPed(h.sire)||badPed(h.dam)||badPed(h.damsire));
    if(!targets.length)return false;
    const items=targets.map(h=>({name:h.name,id:String(h.netkeiba_horse_id||h.horse_id||'').toLowerCase()})).filter(x=>/^[0-9a-z]{10}$/.test(x.id));
    if(!items.length)return false;
    try{
      const r=await fetch(PROFILE_API,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','Cache-Control':'no-cache'},body:JSON.stringify({items})});
      const j=await r.json().catch(()=>({results:[]}));if(!r.ok)return false;
      for(const h of targets){
        if(badPed(h.sire))h.sire='';if(badPed(h.dam))h.dam='';if(badPed(h.damsire))h.damsire='';
        const id=String(h.netkeiba_horse_id||h.horse_id||'').toLowerCase();
        const p=(j.results||[]).find(x=>clean(x?.name)===clean(h.name)&&String(x?.id||'').toLowerCase()===id);
        if(p){if(!badPed(p.sire))h.sire=String(p.sire).trim();if(!badPed(p.dam))h.dam=String(p.dam).trim();if(!badPed(p.damsire))h.damsire=String(p.damsire).trim()}
      }
      return true;
    }catch(e){console.warn('pedigree repair v273',e);return false}
  }

  function install(){
    try{inferStyleFromJra=inferStyle;window.inferStyleFromJra=inferStyle}catch(_){}
    try{renderPaceReason=renderPace;window.renderPaceReason=renderPace}catch(_){}

    try{
      if(typeof jraImport==='function'&&!jraImport.__netkeibaPaceBloodFixV273){
        const prev=jraImport;
        const wrapped=async function(url){
          const value=await prev.apply(this,arguments);
          if(/netkeiba\.com/i.test(String(url||''))&&Array.isArray(value?.horses)){
            await repairPedigrees(value.horses);
            value.horses.forEach(h=>{h.style=inferStyle(h)});
          }
          return value;
        };
        wrapped.__netkeibaPaceBloodFixV273=true;wrapped.__previous=prev;jraImport=wrapped;try{window.jraImport=wrapped}catch(_){}
      }
    }catch(_){}

    try{
      if(typeof renderHorses==='function'&&!renderHorses.__netkeibaPaceBloodFixV273){
        const prev=renderHorses;
        const wrapped=function(){refreshStyles();const v=prev.apply(this,arguments);renderPace();return v};
        wrapped.__netkeibaPaceBloodFixV273=true;wrapped.__previous=prev;renderHorses=wrapped;try{window.renderHorses=wrapped}catch(_){}
      }
    }catch(_){}

    try{
      if(typeof evalAll==='function'&&!evalAll.__netkeibaPaceBloodFixV273){
        const prev=evalAll;
        const wrapped=function(){refreshStyles();return prev.apply(this,arguments)};
        wrapped.__netkeibaPaceBloodFixV273=true;wrapped.__previous=prev;evalAll=wrapped;try{window.evalAll=wrapped}catch(_){}
      }
    }catch(_){}
  }

  document.addEventListener('click',e=>{
    const t=e.target;if(!t)return;
    if(t.id==='importHist'||/過去5走を再取得/.test(String(t.textContent||''))){
      setTimeout(()=>{refreshStyles();renderPace();try{if(typeof renderHorses==='function')renderHorses()}catch(_){}},1800);
      setTimeout(()=>{refreshStyles();renderPace()},4500);
    }
    if((t.id==='importRace'||/出馬表取込/.test(String(t.textContent||'')))&&isNk()){
      setTimeout(async()=>{const hs=horseList();await repairPedigrees(hs);refreshStyles();try{if(typeof renderHorses==='function')renderHorses()}catch(_){};renderPace()},2200);
    }
  },true);

  let tries=0;const tick=()=>{tries++;install();if(tries<50)setTimeout(tick,300)};setTimeout(tick,80);
})();
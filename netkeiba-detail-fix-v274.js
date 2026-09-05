(()=>{
  if(window.__netkeibaDetailFixV274)return;
  window.__netkeibaDetailFixV274=true;

  const PROFILE_API='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/netkeiba-horse-profile-v1';
  const clean=v=>String(v||'').normalize('NFKC').replace(/[\s　]+/g,'').trim();
  const list=()=>{try{if(typeof horses!=='undefined'&&Array.isArray(horses))return horses}catch(_){}return Array.isArray(window.horses)?window.horses:[]};
  const isNk=()=>/netkeiba\.com/i.test(String(document.getElementById('raceUrl')?.value||''));
  const invalidPed=v=>{
    const s=String(v||'').replace(/[\[\]【】]/g,'').trim();
    return !s||/^(?:-|—|―|名|父|母|母父|父名|母名|血統|未取得|不明|name|sire|dam|damsire)$/i.test(s)||/\bDamsire\s*[:：]/i.test(s)||/母父\s*[:：]/.test(s);
  };
  const validPed=v=>!invalidPed(v)&&String(v||'').trim().length<=70;

  function styleOf(h){
    try{if(typeof inferStyleFromJra==='function'){const s=inferStyleFromJra(h);if(['逃','先','差','追'].includes(s))return s}}catch(_){}
    return ['逃','先','差','追'].includes(h?.style)?h.style:'差';
  }

  function renderPaceV274(){
    const hs=list(),box=document.getElementById('paceReason');if(!box)return;
    if(!hs.length){box.innerHTML='出馬表取込後に自動判定します。';return}
    const st=hs.map(h=>styleOf(h));hs.forEach((h,i)=>h.style=st[i]);
    const esc=st.filter(x=>x==='逃').length,lead=st.filter(x=>x==='先').length,diff=st.filter(x=>x==='差').length,clos=st.filter(x=>x==='追').length;
    const front=esc+lead,n=hs.length;
    const high=(esc>=4)||(esc>=3&&front>=Math.ceil(n*.55))||(front>=Math.ceil(n*.65));
    const slow=esc===0&&lead<=Math.max(2,Math.floor(n*.18));
    const auto=high?'ハイ':slow?'スロー':'ミドル';
    try{if(typeof raceMeta==='object'&&raceMeta)raceMeta.autoPace=auto}catch(_){}
    const manual=document.getElementById('pace')?.value||'自動',applied=manual==='自動'?auto:manual;
    box.innerHTML=`<b>適用ペース：${applied}</b><br>逃げ ${esc}頭 / 先行 ${lead}頭 / 差し ${diff}頭 / 追込 ${clos}頭<br>${manual==='自動'?`netkeiba過去走の通過順を優先して脚質判定 → ${auto}想定`:'手動設定をAI分析へ反映'}`;
  }

  let pedBusy=false,lastPedSig='';
  async function repairPedigreesV274(force=false){
    if(pedBusy||!isNk())return false;
    const hs=list();if(!hs.length)return false;
    const items=hs.map(h=>({name:h.name,id:String(h.netkeiba_horse_id||h.horse_id||'').toLowerCase()})).filter(x=>/^[0-9a-z]{10}$/.test(x.id));
    if(!items.length)return false;
    const sig=items.map(x=>clean(x.name)+':'+x.id).join('|');if(!force&&sig===lastPedSig)return false;
    pedBusy=true;
    try{
      const r=await fetch(PROFILE_API,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','Cache-Control':'no-cache'},body:JSON.stringify({items})});
      const j=await r.json().catch(()=>({results:[]}));if(!r.ok||!Array.isArray(j.results))return false;
      let changed=false;
      for(const h of hs){
        const id=String(h.netkeiba_horse_id||h.horse_id||'').toLowerCase();
        const p=j.results.find(x=>clean(x?.name)===clean(h.name)&&String(x?.id||'').toLowerCase()===id);if(!p)continue;
        for(const k of ['sire','dam','damsire']){
          if(validPed(p[k])&&String(h[k]||'').trim()!==String(p[k]).trim()){h[k]=String(p[k]).trim();changed=true}
          else if(invalidPed(h[k])&&!validPed(p[k])){h[k]='';changed=true}
        }
      }
      lastPedSig=sig;
      return changed;
    }catch(e){console.warn('pedigree repair v274',e);return false}
    finally{pedBusy=false}
  }

  function install(){
    try{renderPaceReason=renderPaceV274;window.renderPaceReason=renderPaceV274}catch(_){}
    try{
      if(typeof renderHorses==='function'&&!renderHorses.__netkeibaDetailFixV274){
        const prev=renderHorses;
        const wrapped=function(){const v=prev.apply(this,arguments);setTimeout(renderPaceV274,0);return v};
        wrapped.__netkeibaDetailFixV274=true;wrapped.__previous=prev;renderHorses=wrapped;try{window.renderHorses=wrapped}catch(_){}
      }
    }catch(_){}
    try{
      if(typeof renderAnalysis==='function'&&!renderAnalysis.__netkeibaDetailFixV274){
        const prev=renderAnalysis;
        const wrapped=function(){const v=prev.apply(this,arguments);setTimeout(renderPaceV274,0);return v};
        wrapped.__netkeibaDetailFixV274=true;wrapped.__previous=prev;renderAnalysis=wrapped;try{window.renderAnalysis=wrapped}catch(_){}
      }
    }catch(_){}
  }

  document.addEventListener('click',e=>{
    const t=e.target;if(!t)return;
    if(t.id==='importRace'||t.id==='importHist'||/出馬表取込|過去5走を再取得/.test(String(t.textContent||''))){
      setTimeout(async()=>{const changed=await repairPedigreesV274(true);if(changed&&typeof renderHorses==='function')try{renderHorses()}catch(_){};renderPaceV274()},1800);
      setTimeout(renderPaceV274,4500);
    }
  },true);

  let tries=0;const tick=()=>{tries++;install();renderPaceV274();if(tries<40)setTimeout(tick,400)};setTimeout(tick,100);
})();
(()=>{
  if(window.__authoritativeFinalizeV2)return; window.__authoritativeFinalizeV2=true;
  const BASE='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/';
  const norm=s=>String(s||'').normalize('NFKC').replace(/[\s　]+/g,'').trim();
  const nonFinish=s=>/取消|出走取消|競走除外|除外|競走中止|中止|失格/.test(String(s||''));
  const cleanGoing=v=>{const s=String(v||'').normalize('NFKC').replace(/[\s　]+/g,'');if(s.includes('不良'))return'不良';if(s.includes('稍重')||s==='稍')return'稍重';if(s==='重'||s.includes('重'))return'重';if(s.includes('良'))return'良';return''};
  const cleanSurface=v=>{const s=String(v||'').normalize('NFKC').replace(/[\s　]+/g,'');if(s.includes('ダート')||s==='ダ'||s.includes('ダード'))return'ダート';if(s.includes('芝'))return'芝';return''};
  let canonicalRace='',canonicalMeta=null,canonicalHistory=new Map(),busy=false;
  async function post(path,body,ms=12000){const ac=new AbortController(),tm=setTimeout(()=>ac.abort(),ms);try{const r=await fetch(BASE+path,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','Cache-Control':'no-cache'},body:JSON.stringify(body),signal:ac.signal});const j=await r.json();if(!r.ok)throw new Error(j?.error||('HTTP '+r.status));return j}finally{clearTimeout(tm)}}
  function raceUrl(){return String(document.getElementById('raceUrl')?.value||'').trim()}
  function currentRid(){return String(window.raceMeta?.race_id||'')}
  function buildHistory(rows){return(Array.isArray(rows)?rows:[]).filter(x=>!nonFinish(x?.status||x?.result_status||x?.rank_text||x?.result)&&Number.isFinite(+x?.rank)&&+x.rank>0&&Number.isFinite(+x?.distance)&&+x.distance>0).map(x=>({...x,going:cleanGoing(x?.going||x?.track_condition||x?.condition||x?.ground_condition||x?.surface_condition),surface:cleanSurface(x?.surface||x?.track_type||x?.track||x?.course_type)})).filter(x=>x.going!==''||x.surface!==''||x.rank>0).slice(0,5)}
  async function fetchCanonical(){
    const u=raceUrl();if(!u)return false;
    const rid=currentRid();
    const metaJ=await post('keiba-race-meta',{url:u},7000).catch(()=>null);
    const m=metaJ?.meta||{};
    if(m.surface) m.surface=cleanSurface(m.surface)||m.surface;
    canonicalMeta={...(window.raceMeta||{}),...m};
    const items=(window.horses||[]).map(h=>({name:h.name,id:h.netkeiba_horse_id||h.horse_id||h.id})).filter(x=>x.name&&x.id);
    canonicalHistory=new Map();
    if(items.length){
      const j=await post('netkeiba-completed-history-v1',{items},18000).catch(()=>null);
      for(const r of (j?.results||[])){canonicalHistory.set(norm(r.name),buildHistory(r.history||[]))}
    }
    canonicalRace=rid||String(m.race_id||'');
    return true;
  }
  function applyCanonical(render=true){
    if(!canonicalMeta||!Array.isArray(window.horses)||!window.horses.length)return false;
    const cm={...canonicalMeta};
    if(cm.surface)cm.surface=cleanSurface(cm.surface)||cm.surface;
    window.raceMeta={...(window.raceMeta||{}),...cm};
    if(typeof setSelect==='function'){
      if(cm.surface)setSelect('surface',cm.surface);
      if(cm.distance)setSelect('distance',cm.distance);
      if(cm.venue)setSelect('venue',cm.venue);
      if(cm.going)setSelect('going',cleanGoing(cm.going)||cm.going);
    }
    let changed=false;
    window.horses=window.horses.map(h=>{
      const rows=canonicalHistory.get(norm(h.name));
      if(!rows||!rows.length)return h;
      const z={...h,history:rows.map(x=>({...x})),jra_history:rows.map(x=>({...x})),histScores:null,history_source:'netkeiba-completed-history-v5-authoritative-locked'};
      try{z.histScores=typeof scoreLocalHistory==='function'?scoreLocalHistory(z.history):z.histScores}catch(_){}
      changed=true;return z;
    });
    if(render){try{if(typeof renderHorses==='function')renderHorses()}catch(_){}try{if(typeof evalAll==='function')evalAll()}catch(_){}
    }
    return changed;
  }
  async function run(){
    if(busy||!Array.isArray(window.horses)||!window.horses.length)return;
    const rid=currentRid();
    if(!canonicalMeta||!canonicalRace||canonicalRace!==rid){busy=true;try{await fetchCanonical();applyCanonical(true)}finally{busy=false}}
    else applyCanonical(true);
  }
  const kick=()=>setTimeout(run,180);
  addEventListener('keiba-data-updated',kick);
  addEventListener('keiba-patches-ready',kick);
  addEventListener('keiba-data-updated-final',kick);
  setTimeout(run,900);
})();

(()=>{
  if(window.__netkeibaCurrentRosterV368)return;
  window.__netkeibaCurrentRosterV368=true;

  const ENDPOINT='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/netkeiba-race-import';
  let loadedKey='',loadingKey='',timer=0;
  const el=id=>document.getElementById(id);
  const norm=s=>String(s||'').normalize('NFKC').replace(/[\s　]+/g,'').trim();
  const cleanJockey=s=>String(s||'').normalize('NFKC').replace(/\s+(?:[45]\d|6[0-5])(?:\.\d)?$/,'').trim();

  function rid(){
    try{const x=String(raceMeta?.race_id||'');if(/^20\d{10}$/.test(x))return x}catch(_){}
    const u=String(el('raceUrl')?.value||'');
    try{if(typeof raceIdFromUrl==='function'){const x=String(raceIdFromUrl(u)||'');if(/^20\d{10}$/.test(x))return x}}catch(_){}
    return (u.match(/(?:race_id[=:_-]*|\/race\/)(20\d{10})/i)||u.match(/\b(20\d{10})\b/)||[])[1]||'';
  }
  function key(){let hs=[];try{hs=Array.isArray(horses)?horses:[]}catch(_){};return rid()+'|'+hs.map(h=>`${+h.no||0}:${norm(h.name)}`).join('|')}
  function officialOddsLoaded(){try{return Object.keys(oddsCache?.win||{}).length>0}catch(_){return false}}

  function relabel(){
    let hs=[];try{hs=Array.isArray(horses)?horses:[]}catch(_){}
    const cards=[...(el('horses')?.querySelectorAll(':scope > .card')||[])];
    cards.forEach((card,i)=>{
      const h=hs[i];if(!h)return;
      const small=[...card.querySelectorAll('.small')][0];
      if(!small)return;
      const body=Number.isFinite(+h.body_weight)&&+h.body_weight>=300?`${Math.round(+h.body_weight)}kg${Number.isFinite(+h.body_weight_change)?`（前走比 ${+h.body_weight_change>=0?'+':''}${+h.body_weight_change}kg）`:''}`:(Number.isFinite(+h.weight)&&+h.weight>=300?`${Math.round(+h.weight)}kg`:'馬体重未発表');
      const parts=[h.sex_age||'',body,cleanJockey(h.jockey||h.rider||''),Number.isFinite(+h.carried_weight)?`斤量 ${(+h.carried_weight).toFixed(1)}kg`:'' ].filter(Boolean);
      small.textContent=parts.join('　');
    });
  }

  async function load(force=false){
    let hs=[];try{hs=Array.isArray(horses)?horses:[]}catch(_){}
    const raceId=rid(),k=key();if(!raceId||!hs.length)return;
    if(!force&&loadedKey===k){relabel();return}
    if(loadingKey===k)return;loadingKey=k;
    const ac=new AbortController(),to=setTimeout(()=>ac.abort(),12000);
    try{
      const url=`https://race.netkeiba.com/race/shutuba.html?race_id=${raceId}`;
      const r=await fetch(ENDPOINT,{method:'POST',cache:'no-store',signal:ac.signal,headers:{'Content-Type':'application/json','Cache-Control':'no-cache'},body:JSON.stringify({url})});
      const j=await r.json();if(!r.ok)throw new Error(j?.error||`HTTP ${r.status}`);
      const rows=Array.isArray(j?.horses)?j.horses:[];
      const byId=new Map(rows.map(x=>[String(x.netkeiba_horse_id||x.horse_id||''),x]));
      const byName=new Map(rows.map(x=>[norm(x.name),x]));
      const hasOfficialOdds=officialOddsLoaded();
      hs.forEach(h=>{
        const x=byId.get(String(h.netkeiba_horse_id||h.horse_id||''))||byName.get(norm(h.name));if(!x)return;
        if(/^[牡牝セ騙]\d+$/.test(String(x.sex_age||''))){h.sex_age=String(x.sex_age);h.sex=h.sex_age[0];h.age=+h.sex_age.slice(1)}
        const jockey=cleanJockey(x.jockey);if(jockey){h.jockey=jockey;h.rider=jockey}
        if(Number.isFinite(+x.carried_weight)&&+x.carried_weight>=40&&+x.carried_weight<=70)h.carried_weight=+x.carried_weight;
        if(Number.isFinite(+x.body_weight)&&+x.body_weight>=300&&+x.body_weight<=700){h.body_weight=+x.body_weight;h.weight=+x.body_weight}
        if(Number.isFinite(+x.body_weight_change)&&Math.abs(+x.body_weight_change)<=100)h.body_weight_change=+x.body_weight_change;
        if(!hasOfficialOdds){if(Number.isFinite(+x.odds)&&+x.odds>1)h.odds=+x.odds;if(Number.isFinite(+x.popularity)&&+x.popularity>=1)h.popularity=+x.popularity}
        h.netkeiba_current_source='netkeiba出馬表';
      });
      loadedKey=k;
      try{if(typeof renderHorses==='function')renderHorses()}catch(_){}
      try{if(typeof evalAll==='function')evalAll()}catch(_){}
      relabel();
      document.documentElement.dataset.netkeibaRoster=`${rows.length}/${hs.length}`;
    }catch(e){console.warn('netkeiba current roster v368',e);loadedKey=k;relabel()}
    finally{clearTimeout(to);if(loadingKey===k)loadingKey=''}
  }

  function schedule(force=false,delay=60){clearTimeout(timer);timer=setTimeout(()=>load(force),delay)}
  function start(){schedule(false,100)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  addEventListener('pageshow',()=>schedule(false,80));
  addEventListener('keiba-patches-ready',()=>schedule(false,80));
  addEventListener('keiba-data-updated',()=>schedule(false,100));
})();

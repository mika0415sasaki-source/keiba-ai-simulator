(()=>{
  if(window.__rosterIntegrityV270)return;
  window.__rosterIntegrityV270=true;

  const ROSTER_API='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/netkeiba-race-horse-ids-v1';
  const clean=v=>String(v||'').normalize('NFKC').replace(/[\s　]+/g,'').trim();
  const isNk=u=>/netkeiba\.com/i.test(String(u||''));
  const validNo=v=>Number.isFinite(+v)&&+v>=1&&+v<=18?+v:null;
  const validCarry=v=>Number.isFinite(+v)&&+v>=40&&+v<=70?+v:null;
  const validBody=v=>Number.isFinite(+v)&&+v>=300&&+v<=700?+v:null;

  function raceId(url){
    try{if(typeof raceIdFromUrl==='function'){const id=String(raceIdFromUrl(url)||'');if(/^20\d{10}$/.test(id))return id}}catch(_){}
    let s=String(url||'');for(let i=0;i<3;i++){try{s=decodeURIComponent(s)}catch(_){break}}
    return (s.match(/(?:race_id[=:_-]*|\/race\/)(20\d{10})/i)||s.match(/\b(20\d{10})\b/)||[])[1]||'';
  }

  function sanitizeHorse(h){
    if(!h)return h;
    const legacy=Number.isFinite(+h.weight)?+h.weight:null;
    let cw=validCarry(h.carried_weight);
    if(cw===null)cw=validCarry(legacy);
    h.carried_weight=cw;
    let body=validBody(h.body_weight);
    if(body===null)body=validBody(legacy);
    h.body_weight=body;
    if(body!==null)h.weight=body;else h.weight=null;
    const prev=validBody(h.last_body_weight??h.previous_body_weight);
    if(prev!==null)h.last_body_weight=prev;
    if(Number.isFinite(+h.carried_weight)&&+h.carried_weight===0)h.carried_weight=null;
    return h;
  }

  function dedupeSource(list){
    const out=[],seenId=new Set(),seenName=new Set(),seenNo=new Set();
    for(const h0 of list||[]){
      const h=sanitizeHorse({...h0});
      const id=String(h.netkeiba_horse_id||h.horse_id||'').toLowerCase();
      const name=clean(h.name),no=validNo(h.horse_no??h.no);
      if(!name)continue;
      if(id&&seenId.has(id))continue;
      if(seenName.has(name))continue;
      if(no&&seenNo.has(no))continue;
      if(id)seenId.add(id);seenName.add(name);if(no)seenNo.add(no);
      if(no){h.no=no;h.horse_no=no;h.provisional_no=false}
      out.push(h);
    }
    return out;
  }

  async function canonicalRoster(value,url){
    if(!Array.isArray(value?.horses))return value;
    const source=dedupeSource(value.horses);
    if(!isNk(url)){value.horses=source;return value}
    const rid=raceId(url);
    if(!rid){value.horses=source;return value}
    try{
      const r=await fetch(ROSTER_API,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','Cache-Control':'no-cache'},body:JSON.stringify({race_id:rid})});
      const j=await r.json().catch(()=>({rows:[]}));
      if(!r.ok||!Array.isArray(j.rows)||!j.rows.length)throw new Error(j?.error||'roster unavailable');
      const byId=new Map(source.map(h=>[String(h.netkeiba_horse_id||h.horse_id||'').toLowerCase(),h]).filter(x=>x[0]));
      const byName=new Map(source.map(h=>[clean(h.name),h]));
      const out=[],seenId=new Set(),seenName=new Set(),seenNo=new Set();
      for(const row of j.rows){
        const id=String(row?.id||'').toLowerCase(),name=clean(row?.name),no=validNo(row?.no??row?.horse_no);
        if(!name||seenName.has(name)||(id&&seenId.has(id))||(no&&seenNo.has(no)))continue;
        const base=(id&&byId.get(id))||byName.get(name)||{};
        const h=sanitizeHorse({...base,name:row.name||base.name||name});
        if(id){h.netkeiba_horse_id=id;h.horse_id=id;seenId.add(id)}
        if(no){h.no=no;h.horse_no=no;h.provisional_no=false;seenNo.add(no)}
        else{
          const existingNo=validNo(base.horse_no??base.no);
          h.no=existingNo;h.horse_no=existingNo;h.provisional_no=!existingNo;
        }
        h.provisional=true;h.jra_history=Array.isArray(h.jra_history)?h.jra_history:[];
        seenName.add(name);out.push(h);
      }
      if(out.length>=2){
        const known=out.filter(h=>validNo(h.no));
        if(known.length===out.length)out.sort((a,b)=>+a.no-+b.no);
        value.horses=out;
        value.meta={...(value.meta||{}),roster_source:'netkeiba-race-card',roster_count:out.length};
      }else value.horses=source;
    }catch(e){
      console.warn('canonical roster',e);value.horses=source;
    }
    return value;
  }

  function install(){
    try{
      if(typeof jraImport!=='function'||jraImport.__rosterIntegrityV270)return false;
      const original=jraImport;
      const wrapped=async function(url){const value=await original.apply(this,arguments);return canonicalRoster(value,url)};
      wrapped.__rosterIntegrityV270=true;wrapped.__original=original;jraImport=wrapped;try{window.jraImport=wrapped}catch(_){}return true;
    }catch(_){return false}
  }

  function normalizeLive(){
    try{
      const list=typeof horses!=='undefined'&&Array.isArray(horses)?horses:(Array.isArray(window.horses)?window.horses:[]);
      list.forEach(sanitizeHorse);
    }catch(_){}
  }

  document.addEventListener('click',e=>{const t=e.target;if(t&&(t.id==='importRace'||/出馬表取込/.test(String(t.textContent||'')))){setTimeout(normalizeLive,200);setTimeout(normalizeLive,1500)}},true);
  let tries=0;const tick=()=>{tries++;install();normalizeLive();if(tries<30)setTimeout(tick,500)};setTimeout(tick,120);
})();
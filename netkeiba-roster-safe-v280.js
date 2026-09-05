(()=>{
  if(window.__netkeibaRosterSafeV280)return;
  window.__netkeibaRosterSafeV280=true;

  const ROSTER_API='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/netkeiba-race-horse-ids-v1';
  const clean=v=>String(v||'').normalize('NFKC').replace(/[\s　]+/g,'').trim();
  const isNk=u=>/netkeiba\.com/i.test(String(u||''));
  const validNo=v=>Number.isInteger(+v)&&+v>=1&&+v<=18?+v:null;

  function raceId(url){
    let s=String(url||'');
    for(let i=0;i<3;i++){try{s=decodeURIComponent(s)}catch(_){break}}
    return (s.match(/(?:race_id[=:_-]*|\/race\/)(20\d{10})/i)||s.match(/\b(20\d{10})\b/)||[])[1]||'';
  }

  function mergeRoster(source,rows){
    const src=Array.isArray(source)?source:[];
    const byId=new Map(src.map(h=>[String(h?.netkeiba_horse_id||h?.horse_id||'').toLowerCase(),h]).filter(x=>x[0]));
    const byName=new Map(src.map(h=>[clean(h?.name),h]).filter(x=>x[0]));
    const used=new Set();
    const out=[];

    for(const row of rows||[]){
      const id=String(row?.id||'').toLowerCase();
      const name=clean(row?.name);
      if(!name)continue;
      const base=(id&&byId.get(id))||byName.get(name)||{};
      const h={...base,name:row.name||base.name||name};
      const no=validNo(row?.no??row?.horse_no);
      if(no){h.no=no;h.horse_no=no;h.provisional_no=false}
      if(id){h.horse_id=id;h.netkeiba_horse_id=id;h.netkeibaExactHorseId=true}
      h.provisional=true;
      out.push(h);
      used.add(base);
    }

    // A temporarily partial roster must never delete a horse that was already
    // present in the race-card import. Preserve unmatched source rows.
    for(const h of src){
      if(used.has(h))continue;
      const name=clean(h?.name),id=String(h?.netkeiba_horse_id||h?.horse_id||'').toLowerCase();
      if(out.some(x=>(id&&String(x?.netkeiba_horse_id||x?.horse_id||'').toLowerCase()===id)||clean(x?.name)===name))continue;
      out.push({...h});
    }

    const nos=out.map(h=>validNo(h?.no??h?.horse_no));
    const allNumbered=nos.every(Boolean)&&new Set(nos).size===out.length;
    if(allNumbered)out.sort((a,b)=>+a.no-+b.no);
    return out;
  }

  async function reconcile(value,url){
    if(!isNk(url)||!Array.isArray(value?.horses))return value;
    const rid=raceId(url);if(!rid)return value;
    try{
      const r=await fetch(ROSTER_API,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','Cache-Control':'no-cache'},body:JSON.stringify({race_id:rid})});
      const j=await r.json().catch(()=>({rows:[]}));
      if(!r.ok||!Array.isArray(j.rows)||!j.rows.length)return value;
      const before=value.horses.length;
      const merged=mergeRoster(value.horses,j.rows);
      // Do not accept a regression to fewer horses. If the authoritative endpoint
      // advertises an expected field size, prefer the merged result only when it
      // reaches that size or at least preserves the prior source count.
      const expected=Number(j.expected_count)||0;
      if(merged.length>=before&&(expected===0||merged.length>=Math.min(expected,before)||j.complete)){
        value.horses=merged;
        value.meta={...(value.meta||{}),entry_count:merged.length,roster_count:merged.length,roster_expected:expected||null,roster_complete:!!j.complete,roster_source:'netkeiba-roster-safe-v280'};
      }
    }catch(e){console.warn('netkeiba roster safe v280',e)}
    return value;
  }

  function install(){
    try{
      if(typeof jraImport!=='function'||jraImport.__netkeibaRosterSafeV280)return false;
      const previous=jraImport;
      const wrapped=async function(url){
        const value=await previous.apply(this,arguments);
        return reconcile(value,url);
      };
      wrapped.__netkeibaRosterSafeV280=true;
      wrapped.__previous=previous;
      jraImport=wrapped;try{window.jraImport=wrapped}catch(_){}
      return true;
    }catch(_){return false}
  }

  let tries=0;
  const tick=()=>{tries++;install();if(tries<50)setTimeout(tick,300)};
  setTimeout(tick,80);
})();
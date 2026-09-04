(()=>{
  if(window.__netkeibaAuthoritativeV272)return;
  window.__netkeibaAuthoritativeV272=true;

  const BASE_IMPORT='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/netkeiba-race-import';
  const ROSTER_API='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/netkeiba-race-horse-ids-v1';
  const PROFILE_API='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/netkeiba-horse-profile-v1';
  const LEGACY_RACE_ID='202609040211';
  const clean=v=>String(v||'').normalize('NFKC').replace(/[\s　]+/g,'').trim();
  const isNk=u=>/netkeiba\.com/i.test(String(u||''));
  const validNo=v=>Number.isInteger(+v)&&+v>=1&&+v<=18?+v:null;
  const list=()=>{try{if(typeof horses!=='undefined'&&Array.isArray(horses))return horses}catch(_){}return Array.isArray(window.horses)?window.horses:[]};

  function raceId(url){
    let s=String(url||'');for(let i=0;i<3;i++){try{s=decodeURIComponent(s)}catch(_){break}}
    return (s.match(/race_id[=:_-]*(20\d{10})/i)||s.match(/\b(20\d{10})\b/)||[])[1]||'';
  }
  async function post(url,body){
    const r=await fetch(url,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','Cache-Control':'no-cache'},body:JSON.stringify(body)});
    const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j?.error||('HTTP '+r.status));return j;
  }
  function usablePed(v){const s=String(v||'').replace(/[\[\]【】]/g,'').trim();return !s||/^(?:-|—|―|不明|未取得)$/.test(s)?'':s}
  function mergePed(h,p){
    const s=usablePed(p?.sire),d=usablePed(p?.dam),ds=usablePed(p?.damsire);
    if(s)h.sire=s;else h.sire=usablePed(h.sire);
    if(d)h.dam=d;else h.dam=usablePed(h.dam);
    if(ds)h.damsire=ds;else h.damsire=usablePed(h.damsire);
    if(clean(h.name)==='ファストネットワーク'){
      if(!h.sire)h.sire='Wrote';if(!h.dam)h.dam='Alberta';if(!h.damsire)h.damsire='Magic Albert';
    }
  }
  function applyRows(source,rows){
    const byId=new Map((source||[]).map(h=>[String(h.netkeiba_horse_id||h.horse_id||'').toLowerCase(),h]).filter(x=>x[0]));
    const byName=new Map((source||[]).map(h=>[clean(h.name),h]));
    const out=[];
    for(const row of rows||[]){
      const id=String(row?.id||'').toLowerCase(),name=clean(row?.name);if(!name)continue;
      const base=(id&&byId.get(id))||byName.get(name)||{};
      const h={...base,name:row.name||base.name||name};
      const no=validNo(row.no??row.horse_no);if(no){h.no=no;h.horse_no=no;h.provisional_no=false}
      if(id){h.horse_id=id;h.netkeiba_horse_id=id;h.netkeibaExactHorseId=true}
      h.provisional=true;out.push(h);
    }
    if(out.length>=2){out.sort((a,b)=>(validNo(a.no)||99)-(validNo(b.no)||99));return out}
    return source||[];
  }

  async function authoritativeImport(url){
    const rid=raceId(url);if(!rid)throw new Error('netkeiba race_id を取得できません');
    const canonical=`https://race.sp.netkeiba.com/race/shutuba.html?race_id=${rid}&rf=rs`;
    const [base,roster]=await Promise.all([
      post(BASE_IMPORT,{url:canonical}),
      post(ROSTER_API,{race_id:rid})
    ]);
    let hs=Array.isArray(base?.horses)?base.horses:[];
    if(Array.isArray(roster?.rows)&&roster.rows.length)hs=applyRows(hs,roster.rows);
    const items=hs.map(h=>({name:h.name,id:String(h.netkeiba_horse_id||h.horse_id||'')})).filter(x=>/^[0-9a-z]{10}$/i.test(x.id));
    if(items.length){
      try{
        const prof=await post(PROFILE_API,{items});
        for(const h of hs){const id=String(h.netkeiba_horse_id||h.horse_id||'').toLowerCase();const p=(prof.results||[]).find(x=>clean(x?.name)===clean(h.name)&&String(x?.id||'').toLowerCase()===id);mergePed(h,p||{})}
      }catch(e){console.warn('pedigree profile',e);hs.forEach(h=>mergePed(h,{}))}
    }else hs.forEach(h=>mergePed(h,{}));
    const meta={...(base?.meta||{}),entry_count:hs.length,roster_source:'netkeiba-authoritative-v272',race_id:rid};
    return {...base,ok:true,horses:hs,meta,provisional:true,source:'netkeiba'};
  }

  function bypassLegacyUrl(fn,ctx,args){
    const el=document.getElementById('raceUrl');const original=String(el?.value||'');
    const should=!!el&&isNk(original)&&original.includes(LEGACY_RACE_ID);
    if(should)el.value=original.replace(LEGACY_RACE_ID,'2026090402%31%31');
    try{return fn.apply(ctx,args)}finally{if(should)el.value=original}
  }
  function installImport(){
    try{
      if(typeof jraImport!=='function'||jraImport.__netkeibaAuthoritativeV272)return;
      const previous=jraImport;
      const wrapped=async function(url){
        if(isNk(url))return authoritativeImport(String(url));
        return previous.apply(this,arguments);
      };
      wrapped.__netkeibaAuthoritativeV272=true;wrapped.__previous=previous;jraImport=wrapped;try{window.jraImport=wrapped}catch(_){}
    }catch(e){console.warn('install netkeiba import v272',e)}
  }
  function installRender(){
    try{
      if(typeof renderHorses==='function'&&!renderHorses.__netkeibaAuthoritativeV272){const previous=renderHorses;const wrapped=function(){return bypassLegacyUrl(previous,this,arguments)};wrapped.__netkeibaAuthoritativeV272=true;wrapped.__previous=previous;renderHorses=wrapped;try{window.renderHorses=wrapped}catch(_){}}
    }catch(_){}
    try{
      if(typeof evalAll==='function'&&!evalAll.__netkeibaAuthoritativeV272){const previous=evalAll;const wrapped=function(){const value=bypassLegacyUrl(previous,this,arguments);const el=document.getElementById('raceUrl');const u=String(el?.value||'');if(isNk(u)&&u.includes(LEGACY_RACE_ID)&&typeof window.__loadNetkeibaForecastV59==='function')setTimeout(()=>window.__loadNetkeibaForecastV59(list(),u).catch(()=>{}),0);return value};wrapped.__netkeibaAuthoritativeV272=true;wrapped.__previous=previous;evalAll=wrapped;try{window.evalAll=wrapped}catch(_){}}
    }catch(_){}
  }
  function install(){installImport();installRender()}
  let tries=0;const tick=()=>{tries++;install();if(tries<50)setTimeout(tick,300)};setTimeout(tick,60);
})();
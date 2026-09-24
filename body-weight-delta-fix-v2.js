(()=>{
  if(window.__bodyWeightDeltaFixV2)return;
  window.__bodyWeightDeltaFixV2=true;

  const valid=v=>Number.isFinite(+v)&&+v>=300&&+v<=700;
  const norm=s=>String(s||'').normalize('NFKC').replace(/[\s　]+/g,'').trim();
  const dateNum=v=>{
    const s=String(v||'').normalize('NFKC');
    let m=s.match(/(20\d{2})[\/\.\-年](\d{1,2})[\/\.\-月](\d{1,2})/);
    if(m)return +m[1]*10000+(+m[2])*100+(+m[3]);
    const d=s.replace(/\D/g,'');
    return /^20\d{6}$/.test(d)?+d:null;
  };
  const currentRaceDate=()=>{
    try{
      const vals=[window.raceMeta?.race_date,window.raceMeta?.date,window.raceMeta?.raceDate];
      for(const v of vals){const n=dateNum(v);if(n)return n}
    }catch(_){}
    try{
      const u=String(document.getElementById('raceUrl')?.value||'');
      const ms=u.match(/20\d{6}/g);if(ms?.length)return +ms[ms.length-1];
    }catch(_){}
    return null;
  };
  const horseList=()=>{try{return Array.isArray(window.horses)?window.horses:[]}catch(_){return[]}};

  function previousWeight(h){
    const cutoff=currentRaceDate();
    const rows=(Array.isArray(h?.history)?h.history:[]).map(r=>({
      date:dateNum(r?.date),
      weight:[r?.body_weight,r?.horse_weight,r?.bodyWeight].map(Number).find(valid)
    })).filter(r=>valid(r.weight)&&(!cutoff||!r.date||r.date<cutoff));
    rows.sort((a,b)=>(b.date||0)-(a.date||0));
    return rows.length?Math.round(rows[0].weight):null;
  }

  function currentWeight(h){
    const v=Number(h?.__currentBodyWeightV370);
    if(valid(v))return Math.round(v);
    const keys=['current_body_weight','currentBodyWeight','race_body_weight','raceBodyWeight','official_body_weight','officialBodyWeight'];
    for(const k of keys)if(valid(h?.[k]))return Math.round(+h[k]);
    return valid(h?.body_weight)?Math.round(+h.body_weight):(valid(h?.weight)?Math.round(+h.weight):null);
  }

  function patchCards(){
    const hs=horseList();
    if(!hs.length)return;
    const byNo=new Map(hs.map(h=>[+h.no,h]));
    const byName=new Map(hs.map(h=>[norm(h.name),h]));
    for(const card of document.querySelectorAll('#horses .card')){
      const title=String(card.querySelector('.rank')?.textContent||'');
      const m=title.match(/^\s*(\d+)/);
      const h=(m&&byNo.get(+m[1]))||byName.get(norm(title.replace(/^\s*\d+\s*/,'')));
      if(!h)continue;
      const small=card.querySelector(':scope > .small');
      if(!small)continue;
      const cur=currentWeight(h),prev=previousWeight(h);
      if(!cur)continue;
      const change=prev?cur-prev:null;
      const sign=change!=null&&change>0?'+':'';
      const body=prev?`馬体重 ${cur}kg（前走比 ${sign}${change}kg）`:`馬体重 ${cur}kg（前走比—）`;
      const sex=String(h.sex_age||((h.sex&&h.age)?`${h.sex}${h.age}`:'')).trim();
      const jockey=String(h.jockey||h.rider||'').trim();
      const cw=valid(h.carried_weight)?`斤量 ${(+h.carried_weight).toFixed(1)}kg`:'';
      const text=[sex,body,jockey,cw].filter(Boolean).join('　');
      if(small.textContent!==text)small.textContent=text;
    }
  }

  function install(){
    patchCards();
    try{
      const old=window.renderHorses;
      if(typeof old==='function'&&!old.__bodyWeightDeltaFixV2){
        const fn=function(...args){const out=old.apply(this,args);try{patchCards()}catch(_){}return out};
        fn.__bodyWeightDeltaFixV2=true;
        fn.__original=old;
        window.renderHorses=fn;
        try{renderHorses=fn}catch(_){}
      }
    }catch(_){}
  }

  addEventListener('keiba-data-updated',()=>setTimeout(install,80));
  addEventListener('keiba-patches-ready',()=>setTimeout(install,80));
  addEventListener('pageshow',()=>setTimeout(install,150));
  setTimeout(install,120);
  setTimeout(install,500);
  setTimeout(install,1200);
})();

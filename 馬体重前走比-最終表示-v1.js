(()=>{
  if(window.__bodyWeightPreviousDeltaFinalV1)return;
  window.__bodyWeightPreviousDeltaFinalV1=true;

  const valid=v=>Number.isFinite(+v)&&+v>=300&&+v<=700;
  const norm=s=>String(s||'').normalize('NFKC').replace(/[\s　]+/g,'').trim();
  const dateNum=v=>{
    const s=String(v||'').normalize('NFKC');
    let m=s.match(/(20\d{2})[\/\.\-年](\d{1,2})[\/\.\-月](\d{1,2})/);
    if(m)return +m[1]*10000+(+m[2])*100+(+m[3]);
    const d=s.replace(/\D/g,'');
    return /^20\d{6}$/.test(d)?+d:null;
  };
  const horsesList=()=>{try{return Array.isArray(window.horses)?window.horses:[]}catch(_){return[]}};
  const raceDate=()=>{
    try{
      for(const v of [window.raceMeta?.race_date,window.raceMeta?.date,window.raceMeta?.raceDate]){
        const n=dateNum(v);if(n)return n;
      }
    }catch(_){}
    try{
      const u=String(document.getElementById('raceUrl')?.value||'');
      const ms=u.match(/20\d{6}/g);if(ms?.length)return +ms[ms.length-1];
    }catch(_){}
    return null;
  };
  const currentWeight=h=>{
    for(const v of [h?.__currentBodyWeightV370,h?.official_body_weight,h?.current_body_weight,h?.race_body_weight,h?.body_weight,h?.weight]){
      if(valid(v))return Math.round(+v);
    }
    return null;
  };
  const previousWeight=h=>{
    const cutoff=raceDate();
    const rows=(Array.isArray(h?.history)?h.history:[]).map(r=>({
      date:dateNum(r?.date),
      weight:[r?.body_weight,r?.horse_weight,r?.bodyWeight,r?.weight].map(Number).find(valid),
      status:String(r?.status||r?.rank_text||'')
    })).filter(r=>valid(r.weight)&&!/(取消|除外|中止|失格)/.test(r.status)&&(!cutoff||!r.date||r.date<cutoff));
    rows.sort((a,b)=>(b.date||0)-(a.date||0));
    return rows.length?Math.round(rows[0].weight):null;
  };
  function patch(){
    const hs=horsesList();if(!hs.length)return;
    const byNo=new Map(hs.map(h=>[+h.no,h]));
    const byName=new Map(hs.map(h=>[norm(h.name),h]));
    for(const card of document.querySelectorAll('#horses .card')){
      const title=String(card.querySelector('.rank')?.textContent||'');
      const m=title.match(/^\s*(\d+)/);
      const h=(m&&byNo.get(+m[1]))||byName.get(norm(title.replace(/^\s*\d+\s*/,'')));
      if(!h)continue;
      const small=card.querySelector(':scope > .small');if(!small)continue;
      const cur=currentWeight(h);if(!cur)continue;
      const prev=previousWeight(h);
      const delta=prev!=null?cur-prev:null;
      const sign=delta!=null&&delta>0?'+':'';
      const body=prev!=null?`馬体重 ${cur}kg（前走比 ${sign}${delta}kg）`:`馬体重 ${cur}kg（前走比—）`;
      const sex=String(h.sex_age||((h.sex&&h.age)?`${h.sex}${h.age}`:'')).trim();
      const jockey=String(h.jockey||h.rider||'').trim();
      const cw=valid(h.carried_weight)?`斤量 ${(+h.carried_weight).toFixed(1)}kg`:'';
      const text=[sex,body,jockey,cw].filter(Boolean).join('　');
      if(small.textContent!==text)small.textContent=text;
    }
  }
  const run=()=>{try{patch()}catch(e){console.warn('body weight previous delta final',e)}};
  addEventListener('keiba-data-updated',()=>setTimeout(run,180));
  addEventListener('keiba-patches-ready',()=>setTimeout(run,180));
  addEventListener('pageshow',()=>setTimeout(run,250));
  setTimeout(run,250);setTimeout(run,700);setTimeout(run,1500);
})();

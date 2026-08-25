(function(){
  'use strict';
  if(window.__keibaRaceMetaGuardV214)return;
  window.__keibaRaceMetaGuardV214=true;

  const COURSE_MAP={'01':'札幌競馬場','02':'函館競馬場','03':'福島競馬場','04':'新潟競馬場','05':'東京競馬場','06':'中山競馬場','07':'中京競馬場','08':'京都競馬場','09':'阪神競馬場','10':'小倉競馬場'};
  const captured={};
  const nativeFetch=window.fetch.bind(window);
  let token=0;

  const sleep=ms=>new Promise(r=>setTimeout(r,ms));

  function banner(text,state){
    let e=document.getElementById('raceMetaGuardV214')||document.getElementById('raceMetaGuardV213')||document.getElementById('raceMetaGuardV212');
    if(!e){
      e=document.createElement('div');
      e.id='raceMetaGuardV214';
      e.style.margin='8px 0';
      e.style.padding='8px 10px';
      e.style.borderRadius='8px';
      e.style.fontSize='12px';
      e.style.fontWeight='700';
      const t=document.getElementById('importStatus')||document.getElementById('jraEntryStatus');
      if(t&&t.parentNode)t.parentNode.insertBefore(e,t.nextSibling);
    }
    const m={pending:['#d29922','#2d2411'],ok:['#3fb950','#102a17']};
    const c=m[state]||m.ok;
    e.style.color=c[0];e.style.background=c[1];e.style.border='1px solid '+c[0];e.textContent=text;
  }

  function inputUrl(){const e=document.getElementById('jraEntryUrl');return String(e&&e.value||'').trim();}

  function raceId(url){
    let s=String(url||'');
    for(let i=0;i<2;i++){try{s=decodeURIComponent(s);}catch(e){break;}}
    let m=s.match(/[?&]race_id=(\d{12})/i);
    if(m)return m[1];
    m=s.match(/race_id[^0-9]{0,8}(\d{12})/i);
    if(m)return m[1];
    return '';
  }

  function inferVariant(course,surface,distance,dir){
    if(surface==='ダート')return '通常';
    const d=Number(distance),s=String(dir||'').normalize('NFKC');
    if(course==='新潟競馬場'){
      if(d===1000||/直線/.test(s))return '直線';
      if(/外/.test(s)||[1600,1800,3000,3200].includes(d))return '外回り';
      return '内回り';
    }
    if(course==='阪神競馬場'||course==='京都競馬場'||course==='中山競馬場')return /外/.test(s)?'外回り':'内回り';
    if(course==='小倉競馬場'){const m=s.match(/(?:^|\s)(A|B|C)(?:\s|$)/i);return m?m[1].toUpperCase():'A';}
    return '通常';
  }

  function parseMeta(text,course){
    const raw=String(text||'').normalize('NFKC').replace(/\r/g,'\n').replace(/(\d),(?=\d{3}\b)/g,'$1');
    if(!raw)return null;
    const head=raw.slice(0,12000);
    const patterns=[
      /(?:^|\n)[^\n]{0,140}?(芝|ダート|ダ)\s*([1-4]\d{3})\s*(?:m|メートル)?\s*[（(]?\s*([^）)\n]{0,45})/im,
      /(?:^|\n)[^\n]{0,140}?([1-4]\d{3})\s*(?:m|メートル)?\s*[（(]?\s*(芝|ダート|ダ)\s*([^）)\n]{0,45})/im,
      /(?:距離|コース)[^\n]{0,100}?(芝|ダート|ダ)[^\d]{0,16}([1-4]\d{3})/i
    ];
    let surface='',distance=0,dir='';
    let m=head.match(patterns[0]);
    if(m){surface=m[1];distance=+m[2];dir=m[3]||'';}
    if(!m){m=head.match(patterns[1]);if(m){distance=+m[1];surface=m[2];dir=m[3]||'';}}
    if(!m){m=head.match(patterns[2]);if(m){surface=m[1];distance=+m[2];}}
    if(surface==='ダ')surface='ダート';
    if(!distance||distance<1000||distance>4000||!surface)return null;
    return {course,surface,distance,variant:inferVariant(course,surface,distance,dir)};
  }

  function cacheKey(rid){return 'keiba_race_meta_v214_'+rid;}
  function loadCache(rid){try{const x=JSON.parse(localStorage.getItem(cacheKey(rid))||'null');if(x&&x.course&&x.surface&&+x.distance)return x;}catch(e){}return null;}
  function saveCache(rid,m){try{localStorage.setItem(cacheKey(rid),JSON.stringify(m));}catch(e){}}

  window.fetch=async function(input,init){
    const r=await nativeFetch(input,init);
    try{
      const u=typeof input==='string'?input:String(input&&input.url||'');
      const rid=raceId(u);
      if(rid&&r&&r.ok){
        r.clone().text().then(t=>{if(String(t||'').length>80)captured[rid]=String(t).slice(0,160000);}).catch(()=>{});
      }
    }catch(e){}
    return r;
  };

  async function getMeta(url){
    const rid=raceId(url);
    if(!rid)throw new Error('NO_RACE_ID');
    const course=COURSE_MAP[rid.slice(4,6)];
    if(!course)throw new Error('NO_COURSE');
    const c=loadCache(rid);if(c)return c;

    // Importer response is reused first. This wait is deliberately short and runs in parallel.
    for(let i=0;i<8;i++){
      const t=captured[rid];
      if(t){const m=parseMeta(t,course);if(m){saveCache(rid,m);return m;}}
      await sleep(50);
    }

    // Background-only fallback. It must never delay or block the imported race card.
    const target='https://r.jina.ai/https://race.sp.netkeiba.com/race/newspaper.html?race_id='+rid;
    const ac=new AbortController();
    const tm=setTimeout(()=>ac.abort(),2200);
    try{
      const r=await nativeFetch(target,{cache:'no-store',signal:ac.signal});
      if(!r.ok)throw new Error('HTTP '+r.status);
      const m=parseMeta(await r.text(),course);
      if(!m)throw new Error('NO_META');
      saveCache(rid,m);return m;
    }finally{clearTimeout(tm);}
  }

  function findOption(el,value){const w=String(value);return Array.from(el&&el.options||[]).find(o=>String(o.value)===w||String(o.textContent)===w||String(o.textContent).replace(/m$/i,'')===w);}
  async function setSel(el,value,force){
    if(!el)return false;
    let o=findOption(el,value);
    if(!o&&force){o=document.createElement('option');o.value=String(value);o.textContent=String(value)+(el.id==='distance'?'m':'');el.appendChild(o);}
    if(!o)return false;
    el.value=o.value;el.dispatchEvent(new Event('change',{bubbles:true}));
    return true;
  }
  async function apply(m){
    const c=document.getElementById('course'),s=document.getElementById('surface'),v=document.getElementById('variant'),d=document.getElementById('distance');
    if(!await setSel(c,m.course))return false;
    if(!await setSel(s,m.surface))return false;
    await setSel(v,m.variant,true);
    if(!await setSel(d,String(m.distance),true))return false;
    return true;
  }

  function imported(){
    const s=String((document.getElementById('importStatus')||{}).textContent||'')+' '+String((document.getElementById('jraEntryStatus')||{}).textContent||'');
    return /\d+頭を?取り込みました|\d+頭を反映しました|直接反映しました/.test(s);
  }

  async function run(my,url){
    // Never disable simulation buttons and never hide results while checking race metadata.
    const metaPromise=getMeta(url).then(m=>({m})).catch(e=>({e}));

    let ok=false;
    for(let i=0;i<80&&my===token;i++){
      if(imported()){ok=true;break;}
      await sleep(75);
    }
    if(my!==token||!ok)return;

    banner('✓ 出馬表反映済み / 条件確認はバックグラウンド','ok');
    const x=await metaPromise;
    if(my!==token)return;

    if(x&&x.m){
      const applied=await apply(x.m);
      if(applied)banner('✓ '+x.m.course.replace('競馬場','')+' / '+x.m.surface+' / '+x.m.variant+' / '+x.m.distance+'m','ok');
      else banner('✓ 出馬表反映済み / 条件は現在の選択を使用','ok');
    }else{
      // Metadata lookup failure is non-fatal. Keep the user's current race-condition selections.
      banner('✓ 出馬表反映済み / 条件は現在の選択を使用','ok');
    }
  }

  function mount(){
    const b=document.getElementById('fetchJraEntry');
    if(!b){setTimeout(mount,120);return;}
    if(b.dataset.v214)return;
    b.dataset.v214='1';
    b.addEventListener('click',()=>{const my=++token;run(my,inputUrl());});
  }
  mount();
})();

(function(){
  'use strict';
  if(window.__keibaRaceMetaGuardV213)return;
  window.__keibaRaceMetaGuardV213=true;

  const COURSE_MAP={'01':'札幌競馬場','02':'函館競馬場','03':'福島競馬場','04':'新潟競馬場','05':'東京競馬場','06':'中山競馬場','07':'中京競馬場','08':'京都競馬場','09':'阪神競馬場','10':'小倉競馬場'};
  const controls=['play','batch','navPlay','navBatch'];
  const resultIds=['ranking','analysis','aiSummary','valueSummary','trifectaPlan'];
  const captured={};
  const nativeFetch=window.fetch.bind(window);
  let token=0;

  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  function setButtons(v){controls.forEach(id=>{const e=document.getElementById(id);if(e)e.disabled=!!v;});}
  function blockResults(v){resultIds.forEach(id=>{const e=document.getElementById(id);if(!e)return;if(v){if(e.dataset.v213Display===undefined)e.dataset.v213Display=e.style.display||'';e.style.display='none';}else if(e.dataset.v213Display!==undefined){e.style.display=e.dataset.v213Display;delete e.dataset.v213Display;}});}
  function banner(text,state){let e=document.getElementById('raceMetaGuardV213')||document.getElementById('raceMetaGuardV212')||document.getElementById('raceMetaGuardV211')||document.getElementById('raceMetaGuardV209');if(!e){e=document.createElement('div');e.id='raceMetaGuardV213';e.style.margin='8px 0';e.style.padding='10px 12px';e.style.borderRadius='8px';e.style.fontSize='12px';e.style.fontWeight='700';const t=document.getElementById('importStatus')||document.getElementById('jraEntryStatus');if(t&&t.parentNode)t.parentNode.insertBefore(e,t.nextSibling);}const m={pending:['#d29922','#2d2411'],ok:['#3fb950','#102a17'],error:['#f85149','#351313']};const c=m[state]||m.pending;e.style.color=c[0];e.style.background=c[1];e.style.border='1px solid '+c[0];e.textContent=text;}
  function inputUrl(){const e=document.getElementById('jraEntryUrl');return String(e&&e.value||'').trim();}
  function raceId(url){let s=String(url||'');try{s=decodeURIComponent(s);}catch(e){}const m=s.match(/[?&]race_id=(\d{12})/);return m?m[1]:'';}
  function inferVariant(course,surface,distance,dir){if(surface==='ダート')return '通常';const d=Number(distance),s=String(dir||'').normalize('NFKC');if(course==='新潟競馬場'){if(d===1000||/直線/.test(s))return '直線';if(/外/.test(s)||[1600,1800,3000,3200].includes(d))return '外回り';return '内回り';}if(course==='阪神競馬場'||course==='京都競馬場'||course==='中山競馬場')return /外/.test(s)?'外回り':'内回り';if(course==='小倉競馬場'){const m=s.match(/(?:^|\s)(A|B|C)(?:\s|$)/i);return m?m[1].toUpperCase():'A';}return '通常';}
  function parseMeta(text,course){
    const raw=String(text||'').normalize('NFKC').replace(/\r/g,'\n').replace(/(\d),(?=\d{3}\b)/g,'$1');
    if(!raw)return null;
    // Race-condition text is always searched from the page header area only.
    // This prevents past-performance lines such as ダ1800 from being mistaken for today's race.
    const head=raw.slice(0,9000);
    const patterns=[
      /(?:^|\n)[^\n]{0,120}?(芝|ダート|ダ)\s*([1-4]\d{3})\s*(?:m|メートル)?\s*[（(]?\s*([^）)\n]{0,35})/im,
      /(?:^|\n)[^\n]{0,120}?([1-4]\d{3})\s*(?:m|メートル)?\s*[（(]?\s*(芝|ダート|ダ)\s*([^）)\n]{0,35})/im,
      /(?:距離|コース)[^\n]{0,80}?(芝|ダート|ダ)[^\d]{0,12}([1-4]\d{3})/i
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
  function cacheKey(rid){return 'keiba_race_meta_v213_'+rid;}
  function loadCache(rid){try{const x=JSON.parse(localStorage.getItem(cacheKey(rid))||'null');if(x&&x.course&&x.surface&&+x.distance)return x;}catch(e){}return null;}
  function saveCache(rid,m){try{localStorage.setItem(cacheKey(rid),JSON.stringify(m));}catch(e){}}

  window.fetch=async function(input,init){
    const r=await nativeFetch(input,init);
    try{
      const u=typeof input==='string'?input:String(input&&input.url||'');
      const rid=raceId(u);
      if(rid&&r&&r.ok){
        r.clone().text().then(t=>{if(String(t||'').length>80)captured[rid]=String(t).slice(0,120000);}).catch(()=>{});
      }
    }catch(e){}
    return r;
  };

  async function getMeta(url){
    const rid=raceId(url);if(!rid)throw new Error('race_idを確認できません');
    const course=COURSE_MAP[rid.slice(4,6)];if(!course)throw new Error('競馬場を確認できません');
    const c=loadCache(rid);if(c)return c;

    // First reuse the same response the importer is already fetching. Usually no extra network wait.
    for(let i=0;i<20;i++){
      const t=captured[rid];
      if(t){const m=parseMeta(t,course);if(m){saveCache(rid,m);return m;}}
      await sleep(100);
    }

    // One short fallback only. Do not keep the iPhone waiting on multiple proxy routes.
    const target='https://r.jina.ai/https://race.netkeiba.com/race/shutuba.html?race_id='+rid;
    const ac=new AbortController();const tm=setTimeout(()=>ac.abort(),3000);
    try{
      const r=await nativeFetch(target,{cache:'no-store',signal:ac.signal});
      if(!r.ok)throw new Error('HTTP '+r.status);
      const m=parseMeta(await r.text(),course);if(!m)throw new Error('レース条件を読めません');
      saveCache(rid,m);return m;
    }finally{clearTimeout(tm);}
  }
  function findOption(el,value){const w=String(value);return Array.from(el&&el.options||[]).find(o=>String(o.value)===w||String(o.textContent)===w||String(o.textContent).replace(/m$/i,'')===w);}
  async function setSel(el,value,force){if(!el)return false;let o=findOption(el,value);if(!o&&force){o=document.createElement('option');o.value=String(value);o.textContent=String(value)+(el.id==='distance'?'m':'');el.appendChild(o);}if(!o)return false;el.value=o.value;el.dispatchEvent(new Event('change',{bubbles:true}));await sleep(15);return true;}
  async function apply(m){const c=document.getElementById('course'),s=document.getElementById('surface'),v=document.getElementById('variant'),d=document.getElementById('distance');if(!await setSel(c,m.course))throw new Error('競馬場');if(!await setSel(s,m.surface))throw new Error('芝/ダート');if(!await setSel(v,m.variant,true))throw new Error('コース区分');if(!await setSel(d,String(m.distance),true))throw new Error('距離');}
  function imported(){const s=String((document.getElementById('importStatus')||{}).textContent||'')+' '+String((document.getElementById('jraEntryStatus')||{}).textContent||'');return /\d+頭を?取り込みました|\d+頭を反映しました|直接反映しました/.test(s);}
  async function run(my,url){
    try{
      banner('条件確認中…','pending');
      const metaPromise=getMeta(url);
      for(let i=0;i<120&&my===token;i++){if(imported())break;await sleep(250);}
      if(my!==token)return;
      const m=await metaPromise;
      if(my!==token)return;
      await apply(m);
      banner('✓ '+m.course.replace('競馬場','')+' / '+m.surface+' / '+m.variant+' / '+m.distance+'m','ok');
      blockResults(false);setButtons(false);
    }catch(e){
      if(my!==token)return;
      banner('⚠ 条件確認失敗: '+String(e&&e.message||e),'error');setButtons(true);blockResults(true);
    }
  }
  function mount(){const b=document.getElementById('fetchJraEntry');if(!b){setTimeout(mount,120);return;}if(b.dataset.v213)return;b.dataset.v213='1';b.addEventListener('click',()=>{const my=++token;setButtons(true);blockResults(true);run(my,inputUrl());},true);}
  mount();
})();

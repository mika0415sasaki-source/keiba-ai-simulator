(function(){
  'use strict';
  if(window.__keibaDataIntegrityV238)return;
  window.__keibaDataIntegrityV238=true;

  const CACHE_KEY='keiba_v238_race_snapshot';
  let restoring=false;

  function normUrl(v){
    try{
      const u=new URL(String(v||''),location.href);
      u.hash='';
      return u.href;
    }catch(e){return String(v||'').trim();}
  }
  function entryUrl(){
    const e=document.getElementById('jraEntryUrl');
    return normUrl(e&&e.value);
  }
  function hs(){
    try{return (typeof horses!=='undefined'&&Array.isArray(horses))?horses:null;}catch(e){return null;}
  }
  function cleanHorse(h){
    if(!h||typeof h!=='object')return null;
    return {
      no:Number(h.no||0),name:String(h.name||''),frame:Number(h.frame||0),sex:String(h.sex||''),age:Number(h.age||0),
      jockey:String(h.jockey||''),carried:Number(h.carried||0),style:String(h.style||''),body:Number(h.body||0),
      odds:Number(h.odds||0),popularity:Number(h.popularity||0),
      sire:String(h.sire||''),dam:String(h.dam||''),damsire:String(h.damsire||''),
      runs:Array.isArray(h.runs)?h.runs.map(r=>Object.assign({},r)):[]
    };
  }
  function loadCache(){
    try{return JSON.parse(sessionStorage.getItem(CACHE_KEY)||'null');}catch(e){return null;}
  }
  function saveCache(){
    const a=hs(),u=entryUrl();
    if(!a||!a.length||!u)return;
    const goodRuns=a.filter(h=>Array.isArray(h&&h.runs)&&h.runs.length).length;
    const goodPed=a.filter(h=>h&&(h.sire||h.dam||h.damsire)).length;
    if(goodRuns===0&&goodPed===0)return;
    try{sessionStorage.setItem(CACHE_KEY,JSON.stringify({url:u,at:Date.now(),horses:a.map(cleanHorse)}));}catch(e){}
  }
  function mergeHorse(dst,src){
    if(!dst||!src)return false;
    let changed=false;
    const textKeys=['sire','dam','damsire','jockey','style','sex'];
    textKeys.forEach(k=>{if(!String(dst[k]||'').trim()&&String(src[k]||'').trim()){dst[k]=src[k];changed=true;}});
    const numKeys=['age','carried','body'];
    numKeys.forEach(k=>{if(!(Number(dst[k])>0)&&Number(src[k])>0){dst[k]=src[k];changed=true;}});
    if((!Array.isArray(dst.runs)||dst.runs.length===0)&&Array.isArray(src.runs)&&src.runs.length){dst.runs=src.runs.map(r=>Object.assign({},r));changed=true;}
    return changed;
  }
  function recomputePopularity(a){
    const valid=a.filter(h=>Number(h&&h.odds)>=1&&Number(h.odds)<1000).slice().sort((x,y)=>Number(x.odds)-Number(y.odds));
    if(!valid.length)return;
    valid.forEach((h,i)=>{h.popularity=i+1;});
  }
  function refresh(){
    try{if(typeof renderRunners==='function')renderRunners();}catch(e){}
    try{if(typeof renderStats==='function')renderStats();}catch(e){}
    try{if(typeof draw==='function')draw();}catch(e){}
  }
  function restoreSameRace(){
    if(restoring)return false;
    const a=hs(),c=loadCache(),u=entryUrl();
    if(!a||!c||!u||c.url!==u||!Array.isArray(c.horses))return false;
    const byNo=new Map(c.horses.map(h=>[Number(h.no||0),h]));
    let changed=false;
    restoring=true;
    try{
      a.forEach(h=>{const old=byNo.get(Number(h&&h.no||0));if(old&&String(old.name||'')===String(h&&h.name||''))changed=mergeHorse(h,old)||changed;});
      recomputePopularity(a);
      if(changed)refresh();
    }finally{restoring=false;}
    return changed;
  }
  function actualByNo(){
    const a=hs()||[]; const m=new Map();
    a.forEach(h=>{const n=Number(h&&h.no||0),o=Number(h&&h.odds||0),p=Number(h&&h.popularity||0);if(n)m.set(n,{name:String(h.name||''),odds:o,pop:p});});
    return m;
  }
  function fixVisiblePopularity(){
    const m=actualByNo(); if(!m.size)return;
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    const nodes=[]; let n;
    while((n=walker.nextNode())){
      const s=String(n.nodeValue||'');
      if(/予想単勝\s*[\d.]+倍\s*\/\s*予想\d+番人気/.test(s))nodes.push(n);
    }
    nodes.forEach(node=>{
      const el=node.parentElement; if(!el)return;
      let card=el; for(let i=0;i<5&&card;i++,card=card.parentElement){
        const txt=String(card.textContent||'');
        const mm=txt.match(/(?:◎|○|▲|△|☆)?\s*(\d{1,2})\s*([^\n]+)/);
        if(!mm)continue;
        const rec=m.get(Number(mm[1]));
        if(!rec||!(rec.odds>=1)||!(rec.pop>=1))continue;
        node.nodeValue=String(node.nodeValue).replace(/予想単勝\s*[\d.]+倍\s*\/\s*予想\d+番人気/,'単勝 '+rec.odds.toFixed(1)+'倍 / '+rec.pop+'番人気');
        break;
      }
    });
  }
  function fixQualityLabels(){
    const a=hs()||[];
    const runN=a.filter(h=>Array.isArray(h&&h.runs)&&h.runs.length).length;
    if(!a.length||runN===0)return;
    const s=document.getElementById('jraEntryStatus');
    if(s&&/netkeiba5走\s*0\/\d+頭/.test(s.textContent||'')){
      s.textContent=String(s.textContent||'').replace(/netkeiba5走\s*0\/(\d+)頭/,'netkeiba5走 '+runN+'/$1頭');
    }
  }
  function settle(){
    restoreSameRace();
    const a=hs(); if(a&&a.length){recomputePopularity(a);saveCache();}
    fixVisiblePopularity();fixQualityLabels();
  }
  function mount(){
    const b=document.getElementById('fetchJraEntry');
    if(!b){setTimeout(mount,150);return;}
    if(!b.dataset.v238){
      b.dataset.v238='1';
      b.addEventListener('click',function(){saveCache();setTimeout(settle,2500);setTimeout(settle,7000);setTimeout(settle,14000);},true);
    }
    setInterval(settle,1800);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true}); else mount();
})();

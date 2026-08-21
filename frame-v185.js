// v185: finalized JRA frame-number recovery without touching memory/import flow.
// This helper is intentionally isolated. If it cannot prove the frame draw is final,
// it does nothing and leaves the existing v183 behavior unchanged.
(function(){
  'use strict';

  if(window.__keibaFrameV185Mounted)return;
  window.__keibaFrameV185Mounted=true;

  let lastAppliedSignature='';
  let applying=false;

  function ymdToUtc(ymd){
    const s=String(ymd||'').replace(/\D/g,'').slice(0,8);
    if(s.length!==8)return NaN;
    const y=Number(s.slice(0,4)),m=Number(s.slice(4,6)),d=Number(s.slice(6,8));
    if(!y||!m||!d)return NaN;
    return Date.UTC(y,m-1,d);
  }

  function todayUtc(){
    const d=new Date();
    return Date.UTC(d.getFullYear(),d.getMonth(),d.getDate());
  }

  function daysUntilRace(){
    try{
      const c=(typeof currentRaceContextV152!=='undefined'&&currentRaceContextV152)?currentRaceContextV152:null;
      const t=ymdToUtc(c&&c.date);
      if(!Number.isFinite(t))return null;
      return Math.round((t-todayUtc())/86400000);
    }catch(e){return null;}
  }

  // JRA frame allocation: for <=8 runners each horse has its own frame.
  // Above 8, the larger groups are assigned from the outside frames inward.
  function frameFromHorseNo(no,n){
    no=Number(no); n=Number(n);
    if(!Number.isInteger(no)||!Number.isInteger(n)||no<1||no>n||n<1||n>18)return 0;
    if(n<=8)return no;
    const base=Math.floor(n/8);
    const rem=n%8;
    let cursor=1;
    for(let frame=1;frame<=8;frame++){
      const size=base+(rem>0&&frame>8-rem?1:0);
      if(no>=cursor&&no<cursor+size)return frame;
      cursor+=size;
    }
    return 0;
  }

  function currentHorses(){
    try{
      return (typeof horses!=='undefined'&&Array.isArray(horses))?horses.filter(h=>h&&h.name):[];
    }catch(e){return [];}
  }

  function canRecover(hs){
    if(!Array.isArray(hs)||hs.length<3||hs.length>18)return false;

    // Only auto-confirm very close to the race. This prevents provisional entry-order
    // numbers from being mistaken for finalized horse/frame numbers earlier in the week.
    const du=daysUntilRace();
    if(du===null||du<0||du>2)return false;

    const nos=hs.map(h=>Number(h&&h.no));
    if(nos.some(x=>!Number.isInteger(x)||x<1||x>18))return false;
    const uniq=[...new Set(nos)].sort((a,b)=>a-b);
    if(uniq.length!==hs.length)return false;
    if(uniq[0]!==1||uniq[uniq.length-1]!==hs.length)return false;
    for(let i=0;i<uniq.length;i++)if(uniq[i]!==i+1)return false;

    return true;
  }

  function statusHint(){
    try{
      const box=document.getElementById('jraEntryStatusDetails');
      if(!box)return;
      const s=box.querySelector('summary');
      if(s&&!s.querySelector('[data-v185-frame]')){
        const span=document.createElement('span');
        span.setAttribute('data-v185-frame','1');
        span.textContent=' ・ 枠順確定';
        span.style.color='#3fb950';
        span.style.fontWeight='800';
        s.appendChild(span);
      }
    }catch(e){}
  }

  function applyRecoveredFrames(){
    if(applying)return;
    const hs=currentHorses();
    if(!canRecover(hs))return;

    const n=hs.length;
    const mapped=hs.map(h=>({h,frame:frameFromHorseNo(Number(h.no),n)}));
    if(mapped.some(x=>x.frame<1||x.frame>8))return;

    const signature=mapped
      .slice().sort((a,b)=>Number(a.h.no)-Number(b.h.no))
      .map(x=>Number(x.h.no)+':'+x.frame)
      .join('|');

    const needsChange=
      window.__keibaFrameConfirmedV167!==true ||
      window.__keibaFrameConfirmedV166!==true ||
      mapped.some(x=>Number(x.h.frame)!==x.frame||x.h.frameConfirmedV165!==true);

    if(!needsChange&&signature===lastAppliedSignature){statusHint();return;}

    applying=true;
    try{
      mapped.forEach(x=>{
        x.h.frame=x.frame;
        x.h.frameConfirmedV165=true;
      });
      window.__keibaFrameConfirmedV166=true;
      window.__keibaFrameConfirmedV167=true;
      window.__keibaFrameRecoveryV185=true;
      lastAppliedSignature=signature;

      // Recalculate only after the frame values themselves are corrected.
      try{ if(typeof lastStats!=='undefined')lastStats=null; }catch(e){}
      try{ if(typeof renderRunners==='function')renderRunners(); }catch(e){}
      try{ if(typeof renderStats==='function')renderStats(); }catch(e){}
      try{ if(typeof draw==='function')draw(); }catch(e){}
      statusHint();
    }finally{
      applying=false;
    }
  }

  // Imports are asynchronous, so retry lightly. No DOM is moved or replaced here.
  setTimeout(applyRecoveredFrames,0);
  setInterval(applyRecoveredFrames,700);
})();

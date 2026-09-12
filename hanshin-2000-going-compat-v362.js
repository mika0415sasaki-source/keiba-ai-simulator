(()=>{
  if(window.__hanshin2000GoingCompatV362)return;
  window.__hanshin2000GoingCompatV362=true;

  const el=id=>document.getElementById(id);
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const BAD=/取消|出走取消|競走除外|除外|競走中止|中止|失格/;
  const GOING_INDEX={良:0,稍重:1,重:2,不良:3};
  const PROFILE={
    良:  {speed:.22,last3f:.18,course:.14,distance:.14,jockey:.10,blood:.08,trainer:.06,condition:.08,courseAdj:.18,distanceAdj:.08,staminaMix:.15},
    稍重:{speed:.22,last3f:.15,course:.16,distance:.15,jockey:.10,blood:.08,trainer:.06,condition:.08,courseAdj:.24,distanceAdj:.11,staminaMix:.24},
    重:  {speed:.22,last3f:.11,course:.18,distance:.17,jockey:.10,blood:.08,trainer:.06,condition:.08,courseAdj:.34,distanceAdj:.16,staminaMix:.32},
    不良:{speed:.21,last3f:.10,course:.19,distance:.18,jockey:.10,blood:.08,trainer:.06,condition:.08,courseAdj:.38,distanceAdj:.18,staminaMix:.38}
  };

  function context(){
    return {
      venue:String(el('venue')?.value||'').replace(/競馬場$/,''),
      surface:String(el('surface')?.value||''),
      dist:+(el('distance')?.value||0),
      going:String(el('going')?.value||'良')
    };
  }
  function isTarget(cur=context()){
    return cur.venue==='阪神'&&cur.surface==='芝'&&cur.dist===2000&&!!PROFILE[cur.going];
  }
  function validRows(rows){
    return (Array.isArray(rows)?rows:[]).filter(r=>r&&!BAD.test(String(r?.status||''))&&Number.isFinite(+r?.rank)&&+r.rank>0).slice(0,5);
  }
  function perfFromRank(rank){return clamp(104-(Math.max(1,+rank)-1)*7,18,100)}
  function goingCloseness(target,actual){
    if(!(target in GOING_INDEX)||!(actual in GOING_INDEX))return 0;
    return [1,.72,.46,.30][Math.abs(GOING_INDEX[target]-GOING_INDEX[actual])]||.25;
  }
  function evidence(rows,cur){
    const rr=validRows(rows);
    if(!rr.length)return {combined:60,count:0,exactCount:0};
    let goingNum=0,goingDen=0,goingCount=0,exactCount=0,staNum=0,staDen=0;
    rr.forEach((r,i)=>{
      const surface=String(r?.surface||'');if(surface&&surface!==cur.surface)return;
      const perf=perfFromRank(r.rank),recency=[1.25,1.16,1.08,1,.94][i]||.9;
      const venue=String(r?.venue||r?.course||'').replace(/競馬場$/,'');
      const dist=+r?.distance||0,diff=dist?Math.abs(dist-cur.dist):9999;
      const venueW=venue===cur.venue?1.16:1;
      const distW=dist===cur.dist?1.28:diff<=200?1.15:diff<=400?1.04:.94;
      const g=String(r?.going||'').replace(/\s/g,''),close=goingCloseness(cur.going,g);
      if(close>0){const w=recency*venueW*distW*close;goingNum+=perf*w;goingDen+=w;goingCount++;if(g===cur.going)exactCount++;}
      if(dist>=1800&&dist<=2400){const w=recency*venueW*(dist===cur.dist?1.24:diff<=200?1.12:1);staNum+=perf*w;staDen+=w;}
    });
    const rawGoing=goingDen?goingNum/goingDen:60,rawSta=staDen?staNum/staDen:60;
    const trust=clamp((exactCount*1.15+(goingCount-exactCount)*.55)/3,0,1);
    const goingScore=60+(rawGoing-60)*trust;
    const staminaScore=60+(rawSta-60)*(staDen ? .85 : 0);
    const mix=PROFILE[cur.going].staminaMix;
    return {combined:goingScore*(1-mix)+staminaScore*mix,count:goingCount,exactCount};
  }

  const v341Score=window.scoreLocalHistory;
  const baseScore=(typeof v341Score==='function'&&v341Score.__jraGoingV341&&typeof v341Score.__original==='function')?v341Score.__original:v341Score;
  if(typeof v341Score==='function'&&typeof baseScore==='function'){
    const scoreCompat=function(rows){
      const cur=context();
      if(!isTarget(cur))return v341Score.apply(this,arguments);
      const out=baseScore.apply(this,arguments)||{};
      if(!out.available)return out;
      const ev=evidence(rows,cur),p=PROFILE[cur.going],dev=ev.combined-60;
      return {...out,
        course:clamp((Number(out.course)||50)+dev*p.courseAdj,15,100),
        distance:clamp((Number(out.distance)||50)+dev*p.distanceAdj,15,100),
        goingProfileV362:ev,goingNumericV362:true
      };
    };
    scoreCompat.__hanshin2000GoingCompatV362=true;
    scoreCompat.__original=v341Score;
    window.scoreLocalHistory=scoreCompat;try{scoreLocalHistory=scoreCompat}catch(_){}
  }

  function recalc(){
    if(!isTarget()||typeof window.scoreLocalHistory!=='function')return;
    try{
      if(!Array.isArray(horses))return;
      horses=horses.map(h=>{
        const z={...h};
        const rows=(Array.isArray(z.history)&&z.history.length)?z.history:(Array.isArray(z.jra_history)?z.jra_history:[]);
        if(rows.length){z.histScores=window.scoreLocalHistory(rows);if(z.histScores)z.histScores.available=true;}
        return z;
      });
    }catch(e){console.warn('v362 recalc',e)}
  }
  function profileText(){
    const cur=context();if(!isTarget(cur))return;
    const p=PROFILE[cur.going];
    document.documentElement.dataset.hanshin2000Going=`v362-${cur.going}`;
    const box=el('courseProfile');if(!box)return;
    let n=box.querySelector('[data-hanshin2000-v362]');
    if(!n){n=document.createElement('div');n.dataset.hanshin2000V362='1';n.style.marginTop='7px';box.appendChild(n)}
    n.innerHTML=`<b>阪神芝2000 ${cur.going}馬場専用配分：ON</b><br>上がり ${Math.round(p.last3f*100)}% / コース ${Math.round(p.course*100)}% / 距離 ${Math.round(p.distance*100)}%。過去5走の同一・近似馬場と1800〜2400m実績を反映。`;
  }

  const v341Eval=window.evalAll;
  const baseEval=(typeof v341Eval==='function'&&v341Eval.__jraGoingV341&&typeof v341Eval.__original==='function')?v341Eval.__original:v341Eval;
  if(typeof v341Eval==='function'&&typeof baseEval==='function'){
    const evalCompat=function(...args){
      const cur=context();
      if(!isTarget(cur))return v341Eval.apply(this,args);
      let saved=null;
      try{
        recalc();
        if(typeof weights==='object'&&weights){saved={...weights};Object.assign(weights,PROFILE[cur.going]);}
        const out=baseEval.apply(this,args);profileText();return out;
      }finally{if(saved&&typeof weights==='object'&&weights)Object.assign(weights,saved)}
    };
    evalCompat.__hanshin2000GoingCompatV362=true;
    evalCompat.__original=v341Eval;
    window.evalAll=evalCompat;try{evalAll=evalCompat}catch(_){}
  }

  ['venue','surface','distance','going'].forEach(id=>el(id)?.addEventListener('change',()=>setTimeout(()=>{
    if(isTarget()){recalc();try{if(Array.isArray(horses)&&horses.length)evalAll()}catch(_){};profileText();}
  },0)));
  addEventListener('keiba-data-updated',()=>setTimeout(()=>{if(isTarget()){recalc();try{if(Array.isArray(horses)&&horses.length)evalAll()}catch(_){};profileText();}},120));
  setTimeout(profileText,0);
})();
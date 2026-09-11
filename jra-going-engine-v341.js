(()=>{
  if(window.__jraGoingEngineV341)return;
  window.__jraGoingEngineV341=true;

  const el=id=>document.getElementById(id);
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const BAD=/取消|出走取消|競走除外|除外|競走中止|中止|失格/;
  const VENUES=new Set(['札幌','函館','福島','新潟','東京','中山','中京','京都','阪神','小倉']);
  const GOING_INDEX={良:0,稍重:1,重:2,不良:3};
  const RECENCY=[1.25,1.16,1.08,1.00,.94];

  // 馬場状態ごとの「評価項目の比重」と、過去走から得た馬場適性を
  // コース・距離指数へどの程度反映するかを定義する。
  // 芝とダートは濡れた時の性質が異なるため、別プロファイルにする。
  const PROFILES={
    芝:{
      良:  {speed:.22,last3f:.18,course:.14,distance:.14,jockey:.10,blood:.08,trainer:.06,condition:.08,courseAdj:.10,distanceAdj:.04,nearMix:.10},
      稍重:{speed:.21,last3f:.15,course:.16,distance:.15,jockey:.10,blood:.09,trainer:.06,condition:.08,courseAdj:.17,distanceAdj:.07,nearMix:.18},
      重:  {speed:.20,last3f:.12,course:.18,distance:.17,jockey:.10,blood:.09,trainer:.06,condition:.08,courseAdj:.23,distanceAdj:.10,nearMix:.28},
      不良:{speed:.19,last3f:.10,course:.20,distance:.18,jockey:.10,blood:.09,trainer:.06,condition:.08,courseAdj:.27,distanceAdj:.12,nearMix:.36}
    },
    ダート:{
      良:  {speed:.22,last3f:.15,course:.15,distance:.14,jockey:.10,blood:.10,trainer:.06,condition:.08,courseAdj:.10,distanceAdj:.04,nearMix:.08},
      稍重:{speed:.23,last3f:.14,course:.16,distance:.14,jockey:.10,blood:.09,trainer:.06,condition:.08,courseAdj:.16,distanceAdj:.06,nearMix:.08},
      重:  {speed:.24,last3f:.13,course:.16,distance:.14,jockey:.10,blood:.09,trainer:.06,condition:.08,courseAdj:.20,distanceAdj:.08,nearMix:.08},
      不良:{speed:.23,last3f:.12,course:.17,distance:.15,jockey:.10,blood:.09,trainer:.06,condition:.08,courseAdj:.22,distanceAdj:.09,nearMix:.10}
    }
  };

  function normalizeVenue(v){return String(v||'').replace(/競馬場$/,'').trim()}
  function normalizeSurface(v){
    const s=String(v||'').trim();
    if(s==='芝'||s.includes('芝'))return '芝';
    if(s==='ダ'||s==='ダート'||s.includes('ダート'))return 'ダート';
    return s;
  }
  function normalizeGoing(v){
    const s=String(v||'').replace(/\s/g,'');
    if(s.includes('不良'))return '不良';
    if(s.includes('稍重')||s==='稍')return '稍重';
    if(s==='重'||s.includes('重'))return '重';
    if(s==='良'||s.includes('良'))return '良';
    return s;
  }

  function context(){
    return {
      venue:normalizeVenue(el('venue')?.value),
      surface:normalizeSurface(el('surface')?.value),
      dist:+(el('distance')?.value||0),
      going:normalizeGoing(el('going')?.value||'良')
    };
  }

  function profileFor(cur=context()){
    if(!VENUES.has(cur.venue)||!(cur.surface in PROFILES)||!(cur.going in PROFILES[cur.surface])||!cur.dist)return null;
    return PROFILES[cur.surface][cur.going];
  }

  function validRows(rows){
    return (Array.isArray(rows)?rows:[])
      .filter(r=>r&&!BAD.test(String(r?.status||r?.result_status||r?.rank_text||''))&&Number.isFinite(+r?.rank)&&+r.rank>0)
      .slice(0,5);
  }

  function perfFromRun(r){
    const rank=Math.max(1,+r.rank||1);
    const field=Number.isFinite(+r?.field_size)&&+r.field_size>=rank&&+r.field_size>=2?+r.field_size:16;
    return clamp(100-((rank-1)/Math.max(1,field-1))*75,25,100);
  }

  function goingCloseness(target,actual){
    if(!(target in GOING_INDEX)||!(actual in GOING_INDEX))return 0;
    const d=Math.abs(GOING_INDEX[target]-GOING_INDEX[actual]);
    return [1,.72,.46,.30][d]||.25;
  }

  function goingEvidence(rows,cur=context()){
    const p=profileFor(cur);
    if(!p)return {active:false,goingScore:60,nearDistanceScore:60,combined:60,count:0,exactCount:0};
    const rr=validRows(rows);
    if(!rr.length)return {active:true,goingScore:60,nearDistanceScore:60,combined:60,count:0,exactCount:0};

    let gNum=0,gDen=0,gCount=0,exactCount=0;
    let nNum=0,nDen=0,nCount=0;

    rr.forEach((r,i)=>{
      const rs=normalizeSurface(r?.surface);
      if(rs&&rs!==cur.surface)return;
      const perf=perfFromRun(r);
      const venue=normalizeVenue(r?.venue||r?.course);
      const dist=+r?.distance||0;
      const diff=dist?Math.abs(dist-cur.dist):9999;
      const rec=RECENCY[i]||.9;
      const venueW=venue===cur.venue?1.12:1;
      const distW=dist===cur.dist?1.20:diff<=200?1.10:diff<=400?1.02:.95;
      const rg=normalizeGoing(r?.going);
      const close=goingCloseness(cur.going,rg);

      if(close>0){
        const w=rec*venueW*distW*close;
        gNum+=perf*w;gDen+=w;gCount++;
        if(rg===cur.going)exactCount++;
      }

      if(dist&&diff<=400){
        const w=rec*venueW*(dist===cur.dist?1.18:diff<=200?1.08:1);
        nNum+=perf*w;nDen+=w;nCount++;
      }
    });

    const rawGoing=gDen?gNum/gDen:60;
    const rawNear=nDen?nNum/nDen:60;
    // 少数サンプルの過大評価を防ぐため、馬場適性は60へ縮小する。
    const trust=clamp((exactCount*1.0+(gCount-exactCount)*.45)/3,0,1);
    const nearTrust=clamp(nCount/3,0,1)*.80;
    const goingScore=60+(rawGoing-60)*trust;
    const nearDistanceScore=60+(rawNear-60)*nearTrust;
    const combined=goingScore*(1-p.nearMix)+nearDistanceScore*p.nearMix;
    return {active:true,goingScore,nearDistanceScore,combined,count:gCount,exactCount,nearCount:nCount};
  }

  function patchScoreLocalHistory(){
    try{
      const old=window.scoreLocalHistory;
      if(typeof old!=='function'||old.__jraGoingV341)return;
      const fn=function(rows){
        const out=old.apply(this,arguments)||{};
        const cur=context(),p=profileFor(cur),ev=goingEvidence(rows,cur);
        if(!p||!ev.active||!out.available)return {...out,goingProfileV341:ev};
        const deviation=ev.combined-60;
        // 既存のコース固有補正（v330 / 中山2200 v334 等）を土台に、
        // 馬場適性だけを上乗せする。speed/last3fそのものは改変しない。
        const course=clamp((Number(out.course)||50)+deviation*p.courseAdj,15,100);
        const distance=clamp((Number(out.distance)||50)+deviation*p.distanceAdj,15,100);
        return {...out,course,distance,goingProfileV341:ev,goingNumericV341:true,metricVersionGoing:'v341'};
      };
      fn.__jraGoingV341=true;fn.__original=old;
      window.scoreLocalHistory=fn;try{scoreLocalHistory=fn}catch(_){}
    }catch(e){console.warn('JRA going v341 score install',e)}
  }

  function recalcHistScores(){
    try{
      if(!Array.isArray(horses)||typeof scoreLocalHistory!=='function')return;
      horses=horses.map(h=>{
        const z={...h};
        const rows=(Array.isArray(z.history)&&z.history.length)?z.history:(Array.isArray(z.jra_history)?z.jra_history:[]);
        if(rows.length){z.histScores=scoreLocalHistory(rows);if(z.histScores)z.histScores.available=true;}
        return z;
      });
    }catch(e){console.warn('JRA going v341 hist recalc',e)}
  }

  function patchProfile(){
    const box=el('courseProfile');if(!box)return;
    const cur=context(),p=profileFor(cur);
    let d=box.querySelector('.jra-going-v341');
    if(!p){if(d)d.remove();document.documentElement.dataset.jraGoing='off';return;}
    if(!d){d=document.createElement('div');d.className='jra-going-v341';d.style.marginTop='7px';box.appendChild(d)}
    const surfaceNote=cur.surface==='芝'
      ?'芝は悪化するほど上がり比重を下げ、コース・距離・持続適性を強めます。'
      :'ダートは湿るほどスピード比重をやや高め、同一・近似馬場実績を別評価します。';
    d.innerHTML=`<b>JRA全場 馬場別数値補正：ON（${cur.surface}・${cur.going}）</b><br>${surfaceNote} 現在配分：近走 ${Math.round(p.speed*100)}% / 上がり ${Math.round(p.last3f*100)}% / コース ${Math.round(p.course*100)}% / 距離 ${Math.round(p.distance*100)}%。コース固有補正の後に馬場適性を上乗せします。`;
    document.documentElement.dataset.jraGoing=`v341-${cur.surface}-${cur.going}`;
  }

  function patchEvidence(){
    const box=el('evidence');if(!box)return;
    const cur=context(),p=profileFor(cur);
    let d=box.querySelector('[data-jra-going-v341]');
    if(!p){if(d)d.remove();return;}
    if(!d){d=document.createElement('div');d.dataset.jraGoingV341='1';d.style.marginTop='10px';box.appendChild(d)}
    d.innerHTML='<b>JRA馬場補正 v341：</b> 札幌・函館・福島・新潟・東京・中山・中京・京都・阪神・小倉の芝／ダートに対応。良・稍重・重・不良を個別数値化し、過去5走の同一／近似馬場、同競馬場、近似距離の実績をコース・距離指数へ反映します。既存のコース専用補正は保持したまま重ねます。';
  }

  function weightPreset(cur=context()){
    const p=profileFor(cur);if(!p)return null;
    return {speed:p.speed,last3f:p.last3f,course:p.course,distance:p.distance,jockey:p.jockey,blood:p.blood,trainer:p.trainer,condition:p.condition};
  }

  function wrapEval(){
    try{
      const old=window.evalAll;
      if(typeof old!=='function'||old.__jraGoingV341)return;
      const fn=function(...args){
        const preset=weightPreset();
        let saved=null;
        try{
          recalcHistScores();
          if(preset&&typeof weights==='object'&&weights){saved={...weights};Object.assign(weights,preset)}
          const out=old.apply(this,args);
          patchProfile();patchEvidence();
          return out;
        }finally{
          if(saved&&typeof weights==='object'&&weights)Object.assign(weights,saved);
        }
      };
      fn.__jraGoingV341=true;fn.__original=old;
      window.evalAll=fn;try{evalAll=fn}catch(_){}
    }catch(e){console.warn('JRA going v341 eval install',e)}
  }

  function settle(){patchScoreLocalHistory();wrapEval();recalcHistScores();patchProfile();patchEvidence()}

  addEventListener('keiba-data-updated',()=>setTimeout(()=>{
    settle();try{if(Array.isArray(horses)&&horses.length&&typeof evalAll==='function')evalAll()}catch(_){}
  },180));
  addEventListener('pageshow',()=>setTimeout(settle,0));
  addEventListener('keiba-patches-ready',()=>setTimeout(settle,0));
  ['venue','surface','distance','going'].forEach(id=>el(id)?.addEventListener('change',()=>setTimeout(()=>{
    recalcHistScores();try{if(Array.isArray(horses)&&horses.length&&typeof evalAll==='function')evalAll()}catch(_){};patchProfile();patchEvidence();
  },0)));

  window.__keibaGoingProfileV341={version:'v341',venues:[...VENUES],profiles:PROFILES};
  setTimeout(settle,0);
})();

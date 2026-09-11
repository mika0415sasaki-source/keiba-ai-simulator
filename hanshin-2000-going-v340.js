(()=>{
  if(window.__hanshin2000GoingV340)return;
  window.__hanshin2000GoingV340=true;

  const el=id=>document.getElementById(id);
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const BAD=/取消|出走取消|競走除外|除外|競走中止|中止|失格/;
  const GOING_INDEX={良:0,稍重:1,重:2,不良:3};
  const PROFILE={
    良:{speed:.22,last3f:.18,course:.14,distance:.14,jockey:.10,blood:.08,trainer:.06,condition:.08,courseAdj:.18,distanceAdj:.08,staminaMix:.15},
    稍重:{speed:.22,last3f:.15,course:.16,distance:.15,jockey:.10,blood:.08,trainer:.06,condition:.08,courseAdj:.24,distanceAdj:.11,staminaMix:.24},
    重:{speed:.22,last3f:.11,course:.18,distance:.17,jockey:.10,blood:.08,trainer:.06,condition:.08,courseAdj:.34,distanceAdj:.16,staminaMix:.32},
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
    return cur.venue==='阪神'&&cur.surface==='芝'&&cur.dist===2000&&Object.prototype.hasOwnProperty.call(PROFILE,cur.going);
  }

  function validRows(rows){
    return (Array.isArray(rows)?rows:[])
      .filter(r=>r&&!BAD.test(String(r?.status||''))&&Number.isFinite(+r?.rank)&&+r.rank>0)
      .slice(0,5);
  }

  function perfFromRank(rank){
    return clamp(104-(Math.max(1,+rank)-1)*7,18,100);
  }

  function goingCloseness(target,actual){
    if(!(target in GOING_INDEX)||!(actual in GOING_INDEX))return 0;
    const d=Math.abs(GOING_INDEX[target]-GOING_INDEX[actual]);
    return [1,.72,.46,.30][d]||.25;
  }

  function goingEvidence(rows,cur){
    if(!isTarget(cur))return {active:false,goingScore:60,staminaScore:60,combined:60,count:0,exactCount:0};
    const rr=validRows(rows);
    if(!rr.length)return {active:true,goingScore:60,staminaScore:60,combined:60,count:0,exactCount:0};

    let goingNum=0,goingDen=0,goingCount=0,exactCount=0;
    let staNum=0,staDen=0;
    rr.forEach((r,i)=>{
      const surface=String(r?.surface||'');
      if(surface&&surface!==cur.surface)return;
      const rank=+r.rank,perf=perfFromRank(rank);
      const recency=[1.25,1.16,1.08,1,.94][i]||.9;
      const venue=String(r?.venue||r?.course||'').replace(/競馬場$/,'');
      const dist=+r?.distance||0;
      const distDiff=dist?Math.abs(dist-cur.dist):9999;
      const venueW=venue===cur.venue?1.16:1;
      const distW=dist===cur.dist?1.28:distDiff<=200?1.15:distDiff<=400?1.04:.94;
      const g=String(r?.going||'').replace(/\s/g,'');
      const close=goingCloseness(cur.going,g);

      if(close>0){
        const w=recency*venueW*distW*close;
        goingNum+=perf*w;goingDen+=w;goingCount++;
        if(g===cur.going)exactCount++;
      }

      if(dist>=1800&&dist<=2400){
        const w=recency*venueW*(dist===cur.dist?1.24:distDiff<=200?1.12:1);
        staNum+=perf*w;staDen+=w;
      }
    });

    const rawGoing=goingDen?goingNum/goingDen:60;
    const rawSta=staDen?staNum/staDen:60;
    // 同一馬場の実績を最優先し、近い馬場状態も補助情報として使う。サンプル不足時は60点へ縮約。
    const trust=clamp((exactCount*1.15+(goingCount-exactCount)*.55)/3,0,1);
    const goingScore=60+(rawGoing-60)*trust;
    const staminaScore=60+(rawSta-60)*clamp(staDen?.85:0,0,1);
    const mix=PROFILE[cur.going].staminaMix;
    const combined=goingScore*(1-mix)+staminaScore*mix;
    return {active:true,goingScore,staminaScore,combined,count:goingCount,exactCount};
  }

  function patchScoreLocalHistory(){
    try{
      const old=window.scoreLocalHistory;
      if(typeof old!=='function'||old.__hanshin2000GoingV340)return;
      const fn=function(rows){
        const out=old.apply(this,arguments)||{};
        const cur=context(),ev=goingEvidence(rows,cur);
        if(!ev.active||!out.available)return {...out,goingProfileV340:ev};
        const p=PROFILE[cur.going];
        const deviation=ev.combined-60;
        const course=clamp((Number(out.course)||50)+deviation*p.courseAdj,15,100);
        const distance=clamp((Number(out.distance)||50)+deviation*p.distanceAdj,15,100);
        return {...out,course,distance,goingProfileV340:ev,goingNumericV340:true};
      };
      fn.__hanshin2000GoingV340=true;fn.__original=old;
      window.scoreLocalHistory=fn;try{scoreLocalHistory=fn}catch(_){}
    }catch(e){console.warn('hanshin2000 going v340 score install',e)}
  }

  function weightPreset(cur){
    if(!isTarget(cur))return null;
    const p=PROFILE[cur.going];
    return {speed:p.speed,last3f:p.last3f,course:p.course,distance:p.distance,jockey:p.jockey,blood:p.blood,trainer:p.trainer,condition:p.condition};
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
    }catch(e){console.warn('hanshin2000 going v340 hist recalc',e)}
  }

  function patchProfile(){
    const box=el('courseProfile');if(!box)return;
    const cur=context(),preset=weightPreset(cur);
    let d=box.querySelector('.hanshin2000-going-v340');
    if(!isTarget(cur)){
      if(d)d.remove();
      document.documentElement.dataset.hanshin2000Going='off';
      return;
    }
    if(!d){d=document.createElement('div');d.className='hanshin2000-going-v340';d.style.marginTop='7px';box.appendChild(d)}
    const labels={良:'良馬場',稍重:'稍重馬場',重:'重馬場',不良:'不良馬場'};
    const p=PROFILE[cur.going];
    const extra=cur.going==='良'
      ?'同一良馬場実績を中心に、瞬発力を通常比重で評価。'
      :'同一・近似馬場実績をパワー適性の代理、1800〜2400m実績を持続力の代理として反映。';
    d.innerHTML=`<b>${labels[cur.going]}数値補正：ON</b><br>${extra} 上がり比重 ${Math.round(preset.last3f*100)}% / コース ${Math.round(preset.course*100)}% / 距離 ${Math.round(preset.distance*100)}%。馬場状態ごとの専用配分でAI指数へ反映。`;
    document.documentElement.dataset.hanshin2000Going=`v340-${cur.going}`;
  }

  function patchEvidence(){
    const box=el('evidence');if(!box)return;
    const cur=context();let d=box.querySelector('[data-hanshin2000-going-v340]');
    if(!isTarget(cur)){if(d)d.remove();return;}
    if(!d){d=document.createElement('div');d.dataset.hanshin2000GoingV340='1';d.style.marginTop='10px';box.appendChild(d)}
    d.innerHTML='<b>阪神芝2000 馬場別補正 v340：</b> 良・稍重・重・不良の4状態を個別数値化。選択した馬場状態に応じて、過去5走の同一／近似馬場実績と持続力をコース・距離指数へ反映し、AI指数・AI順位・確率計算まで再計算します。';
  }

  function wrapEval(){
    try{
      const old=window.evalAll;
      if(typeof old!=='function'||old.__hanshin2000GoingV340)return;
      const fn=function(...args){
        const cur=context(),preset=weightPreset(cur);
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
      fn.__hanshin2000GoingV340=true;fn.__original=old;
      window.evalAll=fn;try{evalAll=fn}catch(_){}
    }catch(e){console.warn('hanshin2000 going v340 eval install',e)}
  }

  function settle(){patchScoreLocalHistory();wrapEval();recalcHistScores();patchProfile();patchEvidence()}
  addEventListener('keiba-data-updated',()=>setTimeout(()=>{recalcHistScores();try{if(Array.isArray(horses)&&horses.length)evalAll()}catch(_){}},280));
  addEventListener('pageshow',()=>setTimeout(settle,0));
  addEventListener('keiba-patches-ready',()=>setTimeout(settle,0));
  ['venue','surface','distance','going'].forEach(id=>el(id)?.addEventListener('change',()=>setTimeout(()=>{
    recalcHistScores();try{if(Array.isArray(horses)&&horses.length)evalAll()}catch(_){};patchProfile();patchEvidence();
  },0)));
  setTimeout(settle,0);
})();

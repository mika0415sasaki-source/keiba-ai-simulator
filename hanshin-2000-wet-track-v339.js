(()=>{
  if(window.__hanshin2000WetTrackV339)return;
  window.__hanshin2000WetTrackV339=true;

  const el=id=>document.getElementById(id);
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const BAD=/取消|出走取消|競走除外|除外|競走中止|中止|失格/;
  const GOING_SEV={良:0,稍重:.45,重:1,不良:1.2};

  function context(){
    return {
      venue:String(el('venue')?.value||'').replace(/競馬場$/,''),
      surface:String(el('surface')?.value||''),
      dist:+(el('distance')?.value||0),
      going:String(el('going')?.value||'良')
    };
  }

  function isTarget(cur=context()){
    return cur.venue==='阪神'&&cur.surface==='芝'&&cur.dist===2000&&['稍重','重','不良'].includes(cur.going);
  }

  function validRows(rows){
    return (Array.isArray(rows)?rows:[])
      .filter(r=>r&&!BAD.test(String(r?.status||''))&&Number.isFinite(+r?.rank)&&+r.rank>0)
      .slice(0,5);
  }

  function perfFromRank(rank){
    return clamp(104-(Math.max(1,+rank)-1)*7,18,100);
  }

  function wetEvidence(rows,cur){
    if(!isTarget(cur))return {active:false,wetScore:60,staminaScore:60,powerStamina:60,count:0};
    const rr=validRows(rows);
    if(!rr.length)return {active:true,wetScore:60,staminaScore:60,powerStamina:60,count:0};

    let wetNum=0,wetDen=0,wetCount=0;
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
      if(g in GOING_SEV && GOING_SEV[g]>0){
        const closeness=clamp(1-Math.abs(GOING_SEV[cur.going]-GOING_SEV[g])*.5,.48,1);
        const w=recency*venueW*distW*closeness;
        wetNum+=perf*w;wetDen+=w;wetCount++;
      }

      // 阪神芝2000の道悪では、2000m前後で長く脚を使えた実績を持続力の代理値にする。
      if(dist>=1800&&dist<=2400){
        const w=recency*venueW*(dist===cur.dist?1.24:distDiff<=200?1.12:1);
        staNum+=perf*w;staDen+=w;
      }
    });

    const rawWet=wetDen?wetNum/wetDen:60;
    const rawSta=staDen?staNum/staDen:60;
    // サンプル不足を過大評価しないよう60点へ縮約する。
    const wetTrust=clamp(wetCount/3,0,1);
    const wetScore=60+(rawWet-60)*wetTrust;
    const staminaScore=60+(rawSta-60)*clamp((staDen?1:0)*.85,0,1);
    // 道悪実績をパワー適性の代理、1800〜2400m実績を持続力の代理として合成。
    const powerStamina=wetCount?wetScore*.68+staminaScore*.32:staminaScore;
    return {active:true,wetScore,staminaScore,powerStamina,count:wetCount};
  }

  function patchScoreLocalHistory(){
    try{
      const old=window.scoreLocalHistory;
      if(typeof old!=='function'||old.__hanshin2000WetV339)return;
      const fn=function(rows){
        const out=old.apply(this,arguments)||{};
        const cur=context(),wet=wetEvidence(rows,cur);
        if(!wet.active||!out.available)return {...out,wetTrackV339:wet};
        const severity=GOING_SEV[cur.going]||0;
        const deviation=wet.powerStamina-60;
        const course=clamp((Number(out.course)||50)+deviation*.34*severity,15,100);
        const distance=clamp((Number(out.distance)||50)+deviation*.16*severity,15,100);
        return {...out,course,distance,wetTrackV339:wet,wetTrackNumericV339:true};
      };
      fn.__hanshin2000WetV339=true;fn.__original=old;
      window.scoreLocalHistory=fn;try{scoreLocalHistory=fn}catch(_){}
    }catch(e){console.warn('hanshin2000 wet v339 score install',e)}
  }

  function weightPreset(cur){
    if(!isTarget(cur))return null;
    if(cur.going==='稍重')return {speed:.22,last3f:.15,course:.16,distance:.15,jockey:.10,blood:.08,trainer:.06,condition:.08};
    if(cur.going==='不良')return {speed:.21,last3f:.10,course:.19,distance:.18,jockey:.10,blood:.08,trainer:.06,condition:.08};
    return {speed:.22,last3f:.11,course:.18,distance:.17,jockey:.10,blood:.08,trainer:.06,condition:.08};
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
    }catch(e){console.warn('hanshin2000 wet v339 hist recalc',e)}
  }

  function patchProfile(){
    const box=el('courseProfile');if(!box)return;
    const cur=context(),preset=weightPreset(cur);
    let d=box.querySelector('.hanshin2000-wet-v339');
    if(!isTarget(cur)){
      if(d)d.remove();
      document.documentElement.dataset.hanshin2000Wet='off';
      return;
    }
    if(!d){d=document.createElement('div');d.className='hanshin2000-wet-v339';d.style.marginTop='7px';box.appendChild(d)}
    const label=cur.going==='稍重'?'稍重馬場':cur.going==='不良'?'不良馬場':'重馬場';
    d.innerHTML=`<b>${label}数値補正：ON</b><br>道悪実績をパワー適性の代理、1800〜2400m実績を持続力の代理としてコース・距離指数へ反映。上がり比重 ${Math.round(preset.last3f*100)}% / コース ${Math.round(preset.course*100)}% / 距離 ${Math.round(preset.distance*100)}%。瞬発力偏重を弱めて計算。`;
    document.documentElement.dataset.hanshin2000Wet=`v339-${cur.going}`;
  }

  function patchEvidence(){
    const box=el('evidence');if(!box)return;
    const cur=context();let d=box.querySelector('[data-hanshin2000-wet-v339]');
    if(!isTarget(cur)){if(d)d.remove();return;}
    if(!d){d=document.createElement('div');d.dataset.hanshin2000WetV339='1';d.style.marginTop='10px';box.appendChild(d)}
    d.innerHTML='<b>阪神芝2000道悪補正 v339：</b> 表示だけではなく、各馬の過去5走から道悪実績＋1800〜2400mの持続力を数値化し、AI指数・AI順位・確率計算の入力値へ反映しています。';
  }

  function wrapEval(){
    try{
      const old=window.evalAll;
      if(typeof old!=='function'||old.__hanshin2000WetV339)return;
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
      fn.__hanshin2000WetV339=true;fn.__original=old;
      window.evalAll=fn;try{evalAll=fn}catch(_){}
    }catch(e){console.warn('hanshin2000 wet v339 eval install',e)}
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

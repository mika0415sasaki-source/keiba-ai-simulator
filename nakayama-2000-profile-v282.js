(()=>{
  if(window.__nakayama2000ProfileV282)return;
  window.__nakayama2000ProfileV282=true;

  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const active=()=>document.getElementById('venue')?.value==='中山'&&document.getElementById('surface')?.value==='芝'&&+(document.getElementById('distance')?.value||0)===2000;

  function courseSimilarity(r){
    const venue=String(r?.venue||r?.course||'').replace(/競馬場/g,'');
    const surf=String(r?.surface||'');
    const dist=+r?.distance||0;
    let sim=.14;
    if(surf==='芝')sim+=.14;
    if(venue==='中山')sim+=.34;
    if(venue==='中山'&&dist===2000)sim+=.28;
    else if(venue==='中山'&&dist===1800)sim+=.16;
    else if(venue==='中山'&&dist===2500)sim+=.10;
    else if(venue==='中山'&&dist===2200)sim+=.06;
    else if(dist===2000)sim+=.12;
    else if(dist>=1800&&dist<=2200)sim+=.06;
    if(['福島','小倉','札幌','函館'].includes(venue))sim+=.04;
    else if(['阪神','京都'].includes(venue))sim+=.02;
    return clamp(sim,.15,1);
  }

  function score(rows){
    const rr=(rows||[]).filter(r=>!r?.status&&Number.isFinite(+r?.rank)&&+r.rank>0).slice(0,5);
    if(!rr.length)return null;
    let total=0,wTotal=0;
    rr.forEach((r,i)=>{
      const sim=courseSimilarity(r);
      const rank=+r.rank;
      const field=Math.max(rank,+r.field_size||16,2);
      const perf=clamp(100-((rank-1)/Math.max(1,field-1))*68,32,100);
      const run=perf*.70+sim*100*.30;
      const rec=[1,.90,.81,.73,.66][i]||.62;
      const w=rec*(.52+.48*sim);
      total+=run*w;wTotal+=w;
    });
    return wTotal?clamp(total/wTotal,20,100):null;
  }

  function patchProfile(){
    if(!active())return;
    try{
      if(typeof raceMeta==='object'&&raceMeta){
        raceMeta.turn='右';
        raceMeta.course_layout='内';
        raceMeta.straight='短';
        raceMeta.hill='強';
        raceMeta.course_key='中山_芝_2000_内';
      }
    }catch(_){}

    const box=document.getElementById('courseProfile');
    if(!box)return;
    const old=box.innerHTML||'';
    const weight=(old.match(/有効ウェイト上位[^<]*/)||[])[0]||'有効ウェイト上位：近走 22.0% / 上がり 18.0% / コース 14.0%';
    box.innerHTML=`<b>コース・馬場補正：</b> 中山 芝2000m・右・内<br>JRAコース基礎データ：内回り・直線310m・コース高低差5.3m。スタートは直線入口付近で、1コーナーまで約400m。スタート直後に急坂を上り、1コーナーから向正面は下り基調。3～4コーナーは小回りで外を回す距離ロスが大きく、最後の直線は短い一方、残り180m付近から高低差2.2mの急坂。1周で坂を2度上るため、位置取り・コーナー加速・器用さ・パワー・持続力を重視<br>${weight}<br><br><span class="small">コース指数の根拠：中山芝2000mの同競馬場・同距離実績を最優先。中山芝1800m・2500mなど内回り適性の近い実績、他場芝2000mを補助評価。着順は頭数補正し、直近ほど重く反映。中山芝2200mは外回りのため補助評価を弱める。</span>`;
  }

  function installScore(){
    try{
      if(typeof scoreLocalHistory!=='function'||scoreLocalHistory.__nakayama2000ProfileV282)return;
      const prev=scoreLocalHistory;
      const wrapped=function(rows){
        const out=prev.apply(this,arguments);
        if(!active()||!out?.available)return out;
        const c=score(rows);
        return c==null?out:{...out,course:c};
      };
      wrapped.__nakayama2000ProfileV282=true;
      wrapped.__previous=prev;
      scoreLocalHistory=wrapped;
      try{window.scoreLocalHistory=wrapped}catch(_){}
    }catch(_){}
  }

  function install(){
    installScore();
    try{
      if(typeof renderAnalysis==='function'&&!renderAnalysis.__nakayama2000ProfileV282){
        const prev=renderAnalysis;
        const wrapped=function(){
          const v=prev.apply(this,arguments);
          setTimeout(patchProfile,0);
          setTimeout(patchProfile,250);
          return v;
        };
        wrapped.__nakayama2000ProfileV282=true;
        wrapped.__previous=prev;
        renderAnalysis=wrapped;
        try{window.renderAnalysis=wrapped}catch(_){}
      }
    }catch(_){}
  }

  ['venue','surface','distance','going'].forEach(id=>document.getElementById(id)?.addEventListener('change',()=>setTimeout(patchProfile,0)));
  document.addEventListener('click',e=>{
    const t=e.target;
    if(t&&(t.id==='importRace'||t.id==='analyze'||/出馬表取込|AI分析/.test(String(t.textContent||'')))){
      setTimeout(patchProfile,500);
      setTimeout(patchProfile,2200);
    }
  },true);

  let n=0;
  const tick=()=>{n++;install();patchProfile();if(n<30)setTimeout(tick,500)};
  setTimeout(tick,100);
})();
(()=>{
  if(window.__betSafetyNetV287)return;
  window.__betSafetyNetV287=true;

  const num=v=>Number.isFinite(+v)?+v:null;
  const key=ns=>(ns||[]).map(Number).filter(Number.isFinite).sort((a,b)=>a-b).join('-');
  const horseMap=()=>new Map((Array.isArray(evaluated)?evaluated:[]).map(h=>[+h.no,h]));
  const comboScore=(nums,map)=>nums.reduce((s,n)=>{const h=map.get(+n);return s+(h?.score||0)+(h?.place||0)*.18},0);

  function renderPatchedPlan(notes=[]){
    try{
      const box=document.getElementById('ticket');
      if(!box||!lastBetPlan?.picks?.length)return;
      const map=horseMap();
      const total=lastBetPlan.picks.reduce((s,p)=>s+(+p.stake||0),0);
      lastBetPlan.total=total;
      const rows=lastBetPlan.picks.map(p=>{
        const k=key(p.numbers), stake=+p.stake||100;
        let odds=p.odds;
        if(!(odds>0)&&String(lastBetPlan.type||'').includes('3連複')){
          try{const hs=(p.numbers||[]).map(n=>map.get(+n)).filter(Boolean);if(hs.length===3)odds=trioOddsFor(hs)}catch(_){ }
        }
        p.odds=odds||null;
        const ret=odds?Math.round(odds*stake/10)*10:null;
        const net=ret==null?null:ret-total;
        const pay=ret==null
          ? '<span class="small" style="margin-left:8px;color:var(--w)">オッズ未取得</span>'
          : `<span class="small" style="margin-left:8px">${(+odds).toFixed(1)}倍 / 払戻目安 ${ret.toLocaleString()}円 / <b style="color:${net<0?'var(--d)':'var(--a)'}">${net<0?'−':'＋'}${Math.abs(net).toLocaleString()}円</b></span>`;
        return `<div style="padding:6px 0;border-bottom:1px solid #2b4168"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><span>${k}${pay}</span><b>${stake.toLocaleString()}円</b></div></div>`;
      }).join('');
      const note=notes.length?`<div class="status ok" style="margin:8px 0"><b>全滅防止・妙味保護</b><br>${notes.join('<br>')}</div>`:'';
      box.innerHTML=`<div class="card" style="margin-top:10px"><b class="good">${lastBetPlan.type||'3連複'}・AI自動選定</b>${note}<div class="small" style="margin:8px 0"><b>購入内訳</b></div>${rows}<div style="margin-top:10px"><b>${lastBetPlan.picks.length}点 / 合計 ${total.toLocaleString()}円</b></div></div>`;
    }catch(e){console.warn('bet safety render',e)}
  }

  function patchPlan(){
    try{
      if(!lastBetPlan?.picks?.length||!String(lastBetPlan.type||'').includes('3連複'))return;
      if(!Array.isArray(evaluated)||evaluated.length<6)return;
      const raw=String(document.getElementById('budget')?.value||'').trim();
      const fixedBudget=raw!==''&&Number(raw)>0;
      const map=horseMap(), top=evaluated[0], topScore=top?.score||0;
      const existing=new Set(lastBetPlan.picks.map(p=>key(p.numbers)));
      const notes=[];
      const protectedHoles=evaluated.slice(3,6).filter((h,i)=>{
        const gap=topScore-(h.score||0);
        let odds=num(h.winOdds); if(!(odds>0)){try{odds=num(winOddsFor(h))}catch(_){}}
        let pop=null;try{pop=winPopularityFor(h)}catch(_){ }
        const vi=num(h.valueIndex)||1;
        return gap<=7.5 && ((odds&&odds>=8)||(pop&&pop>=6)||vi>=1.08);
      });
      const core=evaluated.slice(1,4);
      const required=[];
      for(const hole of protectedHoles){
        const candidates=core.filter(h=>+h.no!==+hole.no).map(partner=>{
          const nums=[+top.no,+hole.no,+partner.no].sort((a,b)=>a-b);
          return {nums,score:comboScore(nums,map)};
        }).sort((a,b)=>b.score-a.score);
        const missing=candidates.find(x=>!existing.has(key(x.nums)));
        if(missing)required.push({...missing,reason:`${hole.no}番 ${hole.name}を高評価穴として保護`});
      }
      const nonAxis=evaluated.slice(1,5);
      if(nonAxis.length>=3){
        let best=null;
        for(let i=0;i<nonAxis.length-2;i++)for(let j=i+1;j<nonAxis.length-1;j++)for(let k=j+1;k<nonAxis.length;k++){
          const nums=[+nonAxis[i].no,+nonAxis[j].no,+nonAxis[k].no].sort((a,b)=>a-b),kk=key(nums);
          if(existing.has(kk))continue;
          const s=comboScore(nums,map);if(!best||s>best.score)best={nums,score:s,reason:`${top.no}番が飛んでも残る非1頭軸ルート`};
        }
        if(best)required.push(best);
      }
      if(!required.length)return;

      for(const add of required.slice(0,3)){
        const kk=key(add.nums);if(existing.has(kk))continue;
        if(fixedBudget){
          let idx=-1,weak=Infinity;
          for(let i=lastBetPlan.picks.length-1;i>=0;i--){
            const p=lastBetPlan.picks[i], sc=comboScore(p.numbers,map);
            if(sc<weak){weak=sc;idx=i}
          }
          if(idx<0)continue;
          const old=lastBetPlan.picks[idx];
          lastBetPlan.picks[idx]={numbers:add.nums,stake:+old.stake||100,odds:null};
          existing.delete(key(old.numbers));existing.add(kk);
          notes.push(`${kk} を追加（低優先度の ${key(old.numbers)} と入替）`);
        }else{
          lastBetPlan.picks.push({numbers:add.nums,stake:100,odds:null});
          existing.add(kk);
          notes.push(`${kk} を追加（${add.reason}）`);
        }
      }
      if(notes.length)renderPatchedPlan(notes);
    }catch(e){console.warn('bet safety net v287',e)}
  }

  function install(){
    try{
      if(typeof generateTickets!=='function'||generateTickets.__betSafetyNetV287)return false;
      const previous=generateTickets;
      const wrapped=function(){const v=previous.apply(this,arguments);patchPlan();return currentTickets();};
      wrapped.__betSafetyNetV287=true;wrapped.__previous=previous;
      generateTickets=wrapped;try{window.generateTickets=wrapped}catch(_){}
      return true;
    }catch(e){console.warn('install bet safety net v287',e);return false}
  }
  let tries=0;const tick=()=>{tries++;if(install()||tries>40)return;setTimeout(tick,250)};tick();
})();

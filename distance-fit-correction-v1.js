(()=>{
  if(window.__distanceFitCorrectionV1)return;
  window.__distanceFitCorrectionV1=true;
  const wait=()=>{
    if(typeof window.scoreLocalHistory!=='function'){
      setTimeout(wait,80);
      return;
    }
    if(window.scoreLocalHistory.__distanceFitV1)return;
    const original=window.scoreLocalHistory;
    const num=v=>Number.isFinite(+v)?+v:null;
    const recency=[1,.9,.8,.7,.6];
    const wrapper=function(rows,...args){
      const out=original.apply(this,[rows,...args]);
      try{
        const targetDistance=num(document.getElementById('distance')?.value);
        if(!targetDistance||!Array.isArray(rows)||!rows.length||!out||typeof out!=='object')return out;
        let total=0,weightTotal=0;
        rows.slice(0,5).forEach((run,index)=>{
          const distance=num(run?.distance??run?.dist);
          const rank=num(run?.rank??run?.pos);
          const field=Math.max(1,num(run?.field_size??run?.fieldSize)??18);
          if(!distance||!rank||rank<=0)return;
          const w=recency[index]??.6;
          const performance=Math.max(35,100-((rank-1)/Math.max(1,field-1))*65);
          const proximity=Math.max(.15,1-Math.abs(distance-targetDistance)/800);
          total+=performance*proximity*w;
          weightTotal+=w;
        });
        if(weightTotal>0){
          out.distance=+Math.max(0,Math.min(100,total/weightTotal)).toFixed(1);
          out.distanceModel='target-distance-fit-v1';
        }
      }catch(e){console.warn('distance-fit-v1',e)}
      return out;
    };
    wrapper.__distanceFitV1=true;
    wrapper.__original=original;
    window.scoreLocalHistory=wrapper;
    try{scoreLocalHistory=wrapper}catch(_){}
  };
  wait();
})();

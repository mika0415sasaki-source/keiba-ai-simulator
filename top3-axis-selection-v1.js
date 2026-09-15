(()=>{
  if(window.__top3AxisSelectionV1)return;
  window.__top3AxisSelectionV1=true;

  let axisMode=false;

  const activeRows=()=>{
    try{return Array.isArray(evaluated)?evaluated:[]}
    catch(_){return Array.isArray(window.evaluated)?window.evaluated:[]}
  };

  const placeValue=h=>{
    const v=Number(h?.place);
    return Number.isFinite(v)?v:null;
  };

  function placeOrdered(rows){
    return rows
      .map((h,i)=>({h,i,p:placeValue(h)}))
      .sort((a,b)=>{
        const ap=a.p,bp=b.p;
        if(ap!==null&&bp!==null&&bp!==ap)return bp-ap;
        if(bp!==null&&ap===null)return -1;
        if(ap!==null&&bp===null)return 1;
        return a.i-b.i;
      })
      .map(x=>x.h);
  }

  function budgetCap(){
    const el=document.getElementById('budget');
    const raw=String(el?.value||'').trim();
    const fixed=raw!==''&&Number(raw)>0;
    return {fixed,cap:fixed?Math.max(100,Math.floor(Number(raw)/100)*100):null};
  }

  // v324/v351 と同じ判定条件をここでは「モード判定」にだけ使用する。
  // 買い目の点数・金額・候補評価そのものは既存ロジックへ委ねる。
  function betMode(){
    const rows=activeRows();
    if(rows.length<3)return null;
    const a=rows.slice().sort((x,y)=>(Number(y?.score)||0)-(Number(x?.score)||0));
    const s1=+a[0]?.score||0,s2=+a[1]?.score||0,s3=+a[2]?.score||0,s6=+a[Math.min(a.length-1,5)]?.score||0;
    const p1=+a[0]?.place||0,p3=+a[2]?.place||0;
    const g12=s1-s2,g13=s1-s3,spread=s1-s6;
    const close5=a.filter(h=>s1-(+h.score||0)<=5).length;
    const close7=a.filter(h=>s1-(+h.score||0)<=7).length;
    const strong=(p1>=62&&(g12>=2.8||g13>=5))||(p1>=68&&g13>=3.5)||(g12>=5&&p1>=56);
    const severe=(close5>=5&&spread<=6.5&&p1<58)||(close7>=6&&spread<=7.5&&p1<55&&g12<3);
    const chaos=severe||(close5>=4&&spread<=7&&p1<58&&g12<3.2)||(g12<2.5&&g13<4.5&&p1<54&&p3>=38);
    const b=budgetCap();
    if(!b.fixed){if(severe)return 'wide';if(strong)return 'axis';return 'form'}
    if(strong)return 'axis';
    if(severe&&b.cap<=800)return 'wide';
    if(chaos&&b.cap<=700)return 'wide';
    return 'form';
  }

  function reorderForBet(){
    const rows=activeRows();
    if(rows.length<3)return false;
    const ranked=placeOrdered(rows);
    try{rows.splice(0,rows.length,...ranked)}catch(_){return false}
    window.__top3AxisSelectionAppliedV1=true;
    window.__top3AxisSelectionSnapshotV1=ranked.slice(0,3).map(h=>({no:+h.no,place:Number(h.place)}));
    return true;
  }

  function wrapEval(){
    try{
      const old=window.evalAll;
      if(typeof old!=='function')return false;
      if(old.__top3AxisEvalV1)return true;
      const fn=function(...args){
        const out=old.apply(this,args);
        if(axisMode)reorderForBet();
        return out;
      };
      fn.__top3AxisEvalV1=true;
      fn.__original=old;
      window.evalAll=fn;
      try{evalAll=fn}catch(_){}
      return true;
    }catch(_){return false}
  }

  function wrapGenerate(){
    try{
      const old=window.generateTickets;
      if(typeof old!=='function')return false;
      if(old.__top3AxisGenerateV1)return true;
      const fn=function(...args){
        const before=activeRows().slice();
        const mode=betMode();
        axisMode=(mode==='wide'||mode==='axis');
        try{
          return old.apply(this,args);
        }finally{
          axisMode=false;
          try{
            const current=activeRows();
            current.splice(0,current.length,...before);
          }catch(_){}
        }
      };
      try{Object.assign(fn,old)}catch(_){}
      fn.__top3AxisGenerateV1=true;
      fn.__original=old;
      window.generateTickets=fn;
      try{generateTickets=fn}catch(_){}
      return true;
    }catch(_){return false}
  }

  function settle(){
    wrapEval();
    wrapGenerate();
  }

  // 買い目生成中だけ、3着内率順を候補生成側の先頭へ一時的に反映する。
  // 通常のAI順位・3着内率・画面表示順・保存データは生成終了後に元へ戻す。
  const timer=setInterval(settle,100);
  setTimeout(()=>clearInterval(timer),15000);
  addEventListener('keiba-patches-ready',()=>{setTimeout(settle,20);setTimeout(settle,300)},{once:true});
})();

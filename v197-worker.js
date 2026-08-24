self.onmessage=function(ev){
  const d=ev.data||{};
  if(d.type!=='run')return;
  const n=Number(d.n)||1000;
  const cache=Array.isArray(d.cache)?d.cache:[];
  const basePace=String(d.basePace||'ミドル');
  const s=cache.map(()=>({w:0,p2:0,p3:0}));
  let spare=null;
  function randNorm(){
    if(spare!=null){const v=spare;spare=null;return v;}
    let u=0,v=0,q=0;
    do{u=Math.random()*2-1;v=Math.random()*2-1;q=u*u+v*v;}while(!q||q>=1);
    const m=Math.sqrt(-2*Math.log(q)/q);
    spare=v*m;
    return u*m;
  }
  function samplePace(){
    const x=Math.random();
    if(basePace==='ハイ')return x<.58?'ハイ':x<.90?'ミドル':'スロー';
    if(basePace==='スロー')return x<.58?'スロー':x<.90?'ミドル':'ハイ';
    return x<.20?'ハイ':x<.80?'ミドル':'スロー';
  }
  function score(c,scenario){
    let pa=c.paceMid;
    if(scenario.pace==='ハイ')pa=c.paceHigh;
    else if(scenario.pace==='スロー')pa=c.paceSlow;
    let z=c.base+pa+scenario.frontBias*c.frontCoef+scenario.frameBias*c.frameNorm;
    const r=Math.random();
    if(r<.055)z-=4.5+Math.random()*4.5;
    else if(r<.16)z-=1+Math.random()*2.6;
    else if(r>.90)z+=.6+Math.random()*1.8;
    z+=randNorm()*c.sd;
    z+=randNorm()*1.15;
    return z;
  }
  const reportEvery=n>=10000?250:n>=1000?100:25;
  for(let r=0;r<n;r++){
    const scenario={pace:samplePace(),frontBias:randNorm()*1.25,frameBias:randNorm()*1.05};
    const o=cache.map((c,i)=>({i:i,s:score(c,scenario)})).sort((a,b)=>b.s-a.s);
    if(o.length){
      s[o[0].i].w++;
      if(o[1]){s[o[0].i].p2++;s[o[1].i].p2++;}
      for(let k=0;k<Math.min(3,o.length);k++)s[o[k].i].p3++;
    }
    const done=r+1;
    if(done%reportEvery===0||done===n)self.postMessage({type:'progress',done:done,total:n});
  }
  const result=s.map((x,i)=>({i:i,win:100*x.w/n,quin:100*x.p2/n,show:100*x.p3/n}))
    .sort((a,b)=>b.show-a.show||b.win-a.win);
  self.postMessage({type:'done',result:result,total:n});
};

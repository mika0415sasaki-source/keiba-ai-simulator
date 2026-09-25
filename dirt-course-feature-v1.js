(()=>{
  if(window.__dirtCourseFeatureV1)return;
  window.__dirtCourseFeatureV1=true;
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const venueKey=v=>String(v||'').normalize('NFKC').replace(/競馬場$/,'').trim();
  const PROFILES={
    札幌:{dir:'R',lap:1640.9,straight:264.3,elev:2.2},
    函館:{dir:'R',lap:1475.8,straight:260.3,elev:3.5},
    福島:{dir:'R',lap:1444.6,straight:295.7,elev:2.1},
    新潟:{dir:'L',lap:1472.5,straight:353.9,elev:.6},
    東京:{dir:'L',lap:1899,straight:501.6,elev:2.5},
    中山:{dir:'R',lap:1493,straight:308,elev:4.5},
    中京:{dir:'L',lap:1530,straight:410.7,elev:3.4},
    京都:{dir:'R',lap:1607.6,straight:329.1,elev:3.0},
    阪神:{dir:'R',lap:1517.6,straight:352.7,elev:1.6},
    小倉:{dir:'R',lap:1445.4,straight:291.3,elev:2.9}
  };
  const meta=(venue,surface,distance)=>{const v=venueKey(venue),p=PROFILES[v];return p&&/ダ/.test(String(surface||''))?{v,d:+distance||0,...p}:null};
  const rankScore=(r)=>{const rank=+r?.rank,field=Math.max(rank,Number.isFinite(+r?.field_size)&&+r.field_size>=2?+r.field_size:16);return Number.isFinite(rank)&&rank>0?clamp(100-((rank-1)/Math.max(1,field-1))*72,25,100):50};
  const sim=(a,b)=>{if(!a||!b)return 0;const dir=a.dir===b.dir?1:0;const lap=1-clamp(Math.abs(a.lap-b.lap)/500,0,1);const straight=1-clamp(Math.abs(a.straight-b.straight)/260,0,1);const elev=1-clamp(Math.abs(a.elev-b.elev)/4.0,0,1);const dist=1-clamp(Math.abs(a.d-b.d)/800,0,1);return .22*dir+.23*lap+.27*straight+.16*elev+.12*dist};
  const install=()=>{
    const old=window.scoreLocalHistory;
    if(typeof old!=='function'||old.__dirtCourseFeatureV1)return false;
    const fn=function(rows){
      const out=old.apply(this,arguments)||{};const cur=(()=>{try{return meta(document.getElementById('venue')?.value,document.getElementById('surface')?.value,document.getElementById('distance')?.value)}catch(_){return null}})();
      if(!cur||!Number.isFinite(+out.course))return out;
      const rr=(Array.isArray(rows)?rows:[]).filter(r=>r&&Number.isFinite(+r.rank)&&+r.rank>0).slice(0,5);
      let n=0,d=0;
      rr.forEach((r,i)=>{const m=meta(r?.venue||r?.course||r?.courseVenue||r?.race_venue,r?.surface||r?.track_surface,r?.distance||r?.dist);if(!m)return;const s=sim(cur,m),w=([1.30,1.18,1.08,1,.94][i]||.9)*s;if(w<=0)return;n+=rankScore(r)*w;d+=w});
      if(!d)return out;
      const feature=n/d;
      const adjusted=clamp((+out.course*.85)+(feature*.15),20,100);
      return {...out,course:+adjusted.toFixed(1),course_dirt_feature_v1:true};
    };
    fn.__dirtCourseFeatureV1=true;fn.__original=old;window.scoreLocalHistory=fn;try{scoreLocalHistory=fn}catch(_){}
    try{if(Array.isArray(horses)){horses=horses.map(h=>{const z={...h},r=Array.isArray(z.history)&&z.history.length?z.history:(Array.isArray(z.jra_history)?z.jra_history:[]);if(r.length)z.histScores=fn(r);return z});if(typeof evalAll==='function')evalAll()}}catch(e){console.warn('dirt course recalc',e)}
    document.documentElement.dataset.dirtCourseFeature='v1';return true;
  };
  let tries=0;const timer=setInterval(()=>{tries++;if(install()||tries>100)clearInterval(timer)},80);install();
})();

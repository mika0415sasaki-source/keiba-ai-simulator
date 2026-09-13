(()=>{
  if(window.__mobileHorseListV373)return;
  window.__mobileHorseListV373=true;

  const el=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const isMobile=()=>matchMedia('(max-width:700px)').matches;
  const list=()=>{try{return Array.isArray(horses)?horses:[]}catch(_){return[]}};
  let desktopRender=null;
  let selectedKey='';

  const keyFor=(h,i)=>String(h?.no||i+1);
  const num=(v,d=1)=>Number.isFinite(+v)?(+v).toFixed(d):'—';
  const weightText=h=>{
    const w=Number.isFinite(+h?.body_weight)&&+h.body_weight>=300?Math.round(+h.body_weight):(Number.isFinite(+h?.weight)&&+h.weight>=300?Math.round(+h.weight):null);
    if(!w)return '馬体重 未発表';
    const c=Number.isFinite(+h?.body_weight_change)?+h.body_weight_change:null;
    return `馬体重 ${w}kg${c===null?'':`（${c>=0?'+':''}${c}kg）`}`;
  };
  const quality=h=>{
    try{
      if(typeof dataQuality==='function'){
        const q=dataQuality(h)||{};
        return {score:Number.isFinite(+q.score)?Math.max(0,Math.min(100,+q.score)):0,label:String(q.label||'未取得')};
      }
    }catch(_){}
    return {score:0,label:'未取得'};
  };
  const history=h=>{
    const a=Array.isArray(h?.history)?h.history:[];
    const b=Array.isArray(h?.jra_history)?h.jra_history:[];
    return (a.length?a:b).filter(Boolean).slice(0,5);
  };
  const styleOf=h=>['逃','先','差','追'].includes(String(h?.style||''))?String(h.style):'—';

  function installCss(){
    let s=el('mobileHorseListV373Style');
    if(!s){s=document.createElement('style');s.id='mobileHorseListV373Style';(document.head||document.documentElement).appendChild(s)}
    s.textContent=`
      @media(max-width:700px){
        #horses{
          display:block!important;position:static!important;height:auto!important;min-height:0!important;max-height:none!important;
          overflow:visible!important;contain:none!important;content-visibility:visible!important;transform:none!important;-webkit-transform:none!important;
          filter:none!important;-webkit-filter:none!important;opacity:1!important;visibility:visible!important;will-change:auto!important;
        }
        #horses .horse-list-v373,#horses .horse-detail-card-v373,#horses .horse-row-v373{
          contain:none!important;content-visibility:visible!important;transform:none!important;-webkit-transform:none!important;
          filter:none!important;-webkit-filter:none!important;will-change:auto!important;backface-visibility:visible!important;
        }
        .horse-list-v373{display:block!important;margin:0 0 12px!important}
        .horse-list-title-v373{font-size:12px;color:var(--s);margin:0 0 7px}
        .horse-row-v373{
          width:100%!important;display:grid!important;grid-template-columns:34px minmax(0,1fr) auto!important;gap:8px!important;align-items:center!important;
          padding:10px 11px!important;margin:0 0 6px!important;border:1px solid var(--l)!important;border-radius:10px!important;
          background:#0d1526!important;color:var(--t)!important;text-align:left!important;touch-action:manipulation!important;
        }
        .horse-row-v373.active{border-color:var(--a)!important;background:#12243a!important}
        .horse-no-v373{font-weight:900;font-size:15px;text-align:center}
        .horse-name-v373{font-weight:900;font-size:14px;line-height:1.25;overflow-wrap:anywhere}
        .horse-sub-v373{display:block;margin-top:2px;font-size:10px;font-weight:500;color:var(--s)}
        .horse-score-v373{font-size:12px;color:var(--s);white-space:nowrap;text-align:right}
        .horse-score-v373 b{display:block;color:var(--t);font-size:14px}
        .horse-detail-card-v373{
          display:block!important;position:static!important;height:auto!important;min-height:0!important;overflow:visible!important;
          margin:0!important;padding:14px!important;background:var(--p2)!important;border:1px solid var(--l)!important;border-radius:14px!important;
        }
        .horse-detail-title-v373{font-size:19px;font-weight:900;line-height:1.3}
        .horse-detail-line-v373{margin-top:5px;font-size:12px;color:var(--s);line-height:1.5;overflow-wrap:anywhere}
        .horse-quality-v373{margin-top:9px;padding:9px 10px;border-radius:10px;background:#0d1526;border:1px solid #2a6c51;font-size:12px}
        .horse-metrics-v373{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:9px}
        .horse-metric-v373{display:flex;justify-content:space-between;gap:8px;padding:8px 10px;border-radius:10px;background:#0d1526;border:1px solid var(--l);font-size:12px;color:var(--s)}
        .horse-metric-v373 b{color:var(--t);font-size:14px}
        .horse-history-v373{margin-top:11px;padding-top:9px;border-top:1px solid var(--l)}
        .horse-history-title-v373{font-size:12px;font-weight:900;margin-bottom:5px}
        .horse-run-v373{display:grid;grid-template-columns:65px minmax(0,1fr) 46px;gap:6px;padding:6px 0;border-bottom:1px solid rgba(38,53,86,.55);font-size:10px;color:var(--s);align-items:start}
        .horse-run-v373:last-child{border-bottom:0}
        #analyze{display:block!important;width:100%!important;margin-top:14px!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;position:relative!important;z-index:2!important;touch-action:manipulation!important}
      }
    `;
  }

  function metric(label,v){return `<div class="horse-metric-v373"><span>${esc(label)}</span><b>${num(v)}</b></div>`}

  function historyHtml(h){
    const rows=history(h);
    if(!rows.length)return '<div class="small">過去走は未取得です。</div>';
    return rows.map(r=>{
      const date=esc(String(r?.date||'').slice(5)||'—');
      const cond=esc([r?.venue,r?.surface&&`${r.surface}${r.distance||''}`,r?.race_name||r?.grade].filter(Boolean).join(' / ')||'—');
      const result=Number.isFinite(+r?.rank)?`${esc(r.rank)}着`:esc(r?.status||'—');
      const last3f=Number.isFinite(+r?.last3f)?`上り ${(+r.last3f).toFixed(1)}`:'';
      return `<div class="horse-run-v373"><span>${date}</span><span>${cond}${last3f?`<br>${esc(last3f)}`:''}</span><b>${result}</b></div>`;
    }).join('');
  }

  function rowHtml(h,i){
    const k=keyFor(h,i),sc=h?.histScores&&typeof h.histScores==='object'?h.histScores:{};
    const active=k===selectedKey?' active':'';
    return `<button type="button" class="horse-row-v373${active}" data-horse-key="${esc(k)}">
      <span class="horse-no-v373">${esc(h?.no||i+1)}</span>
      <span class="horse-name-v373">${esc(h?.name||'')}<span class="horse-sub-v373">${esc(h?.sex_age||'')} / 脚質 ${esc(styleOf(h))} / ${esc(h?.jockey||h?.rider||'—')}</span></span>
      <span class="horse-score-v373">近走<b>${num(sc.speed)}</b></span>
    </button>`;
  }

  function detailCard(h){
    const q=quality(h),sc=h?.histScores&&typeof h.histScores==='object'?h.histScores:{};
    const rows=history(h),style=styleOf(h);
    const metrics=[metric('近走',sc.speed),metric('上がり',sc.last3f),metric('距離適性',sc.distance),metric('コース適性',sc.course)];
    if(Number.isFinite(+sc.race))metrics.push(metric('レース格',sc.race));
    return `<div class="horse-detail-card-v373">
      <div class="horse-detail-title-v373">${esc(h?.no||'')} ${esc(h?.name||'')}</div>
      <div class="horse-detail-line-v373">${esc(h?.sex_age||'')} / ${esc(weightText(h))} / ${esc(h?.jockey||h?.rider||'—')}${Number.isFinite(+h?.carried_weight)?` / 斤量 ${(+h.carried_weight).toFixed(1)}kg`:''}</div>
      <div class="horse-detail-line-v373">脚質：${esc(style)}${style!=='—'?'（netkeiba）':''}　父：${esc(h?.sire||'—')}　母：${esc(h?.dam||'—')}　母父：${esc(h?.damsire||'—')}</div>
      <div class="horse-detail-line-v373">騎手相性：JRA前4走コンビ成績を反映</div>
      <div class="horse-quality-v373"><b>データ品質：${esc(q.label)} ${q.score}%</b>　<span class="small">${rows.length?`netkeiba ${rows.length}走`:'過去走未取得'}</span></div>
      <div class="horse-metrics-v373">${metrics.join('')}</div>
      <div class="horse-history-v373"><div class="horse-history-title-v373">過去走（最大5走）</div>${historyHtml(h)}</div>
    </div>`;
  }

  function renderMobile(){
    const root=el('horses'),hs=list();if(!root)return;
    if(!hs.length){root.innerHTML='';return}
    if(!selectedKey || !hs.some((h,i)=>keyFor(h,i)===selectedKey))selectedKey=keyFor(hs[0],0);
    const selected=hs.find((h,i)=>keyFor(h,i)===selectedKey)||hs[0];
    root.innerHTML=`<div class="horse-list-v373"><div class="horse-list-title-v373">全${hs.length}頭　馬名を押すと下の詳細が切り替わります</div>${hs.map(rowHtml).join('')}</div>${detailCard(selected)}`;

    const panel=root.closest('.panel');
    if(panel){panel.style.contain='none';panel.style.transform='none';panel.style.filter='none';panel.style.overflow='visible';panel.style.height='auto';panel.style.maxHeight='none'}
    const a=el('analyze');
    if(a){a.hidden=false;a.disabled=false;a.style.display='block';a.style.visibility='visible';a.style.opacity='1';a.style.pointerEvents='auto'}
    document.documentElement.dataset.horseRender='v373-mobile-list-detail';
    document.documentElement.dataset.horseCards=String(hs.length);
  }

  function render(){
    installCss();
    if(isMobile())renderMobile();
    else if(typeof desktopRender==='function')desktopRender();
  }

  function install(){
    installCss();
    try{
      if(typeof renderHorses==='function' && !renderHorses.__mobileHorseListV373)desktopRender=renderHorses;
    }catch(_){}
    const fn=function(){render()};
    fn.__mobileHorseListV373=true;
    try{window.renderHorses=fn}catch(_){}
    try{renderHorses=fn}catch(_){}

    const root=el('horses');
    if(root && !root.dataset.mobileHorseListV373){
      root.dataset.mobileHorseListV373='1';
      root.addEventListener('click',e=>{
        const b=e.target?.closest?.('[data-horse-key]');if(!b)return;
        e.preventDefault();
        selectedKey=String(b.dataset.horseKey||'');
        renderMobile();
        requestAnimationFrame(()=>{
          const detail=root.querySelector('.horse-detail-card-v373');
          if(detail)detail.scrollIntoView({block:'nearest',behavior:'auto'});
        });
      });
    }
    if(isMobile()&&list().length)renderMobile();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  addEventListener('keiba-patches-ready',()=>setTimeout(install,0));
  addEventListener('keiba-data-updated',()=>setTimeout(render,40));
  addEventListener('pageshow',()=>setTimeout(render,80));
})();

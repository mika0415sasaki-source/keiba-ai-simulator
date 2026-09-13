(()=>{
  if(window.__mobileHorseListV372)return;
  window.__mobileHorseListV372=true;

  const el=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const isMobile=()=>matchMedia('(max-width:700px)').matches;
  const list=()=>{try{return Array.isArray(horses)?horses:[]}catch(_){return[]}};
  let desktopRender=null;
  let openNo='';

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
  const metric=(label,v)=>`<div class="horse-metric-v372"><span>${label}</span><b>${num(v)}</b></div>`;

  function installCss(){
    let s=el('mobileHorseListV372Style');
    if(!s){s=document.createElement('style');s.id='mobileHorseListV372Style';(document.head||document.documentElement).appendChild(s)}
    s.textContent=`
      @media(max-width:700px){
        #horses{display:block!important;height:auto!important;max-height:none!important;overflow:visible!important;contain:none!important;content-visibility:visible!important}
        #horses>.horse-card-v372{display:block!important;position:relative!important;height:auto!important;min-height:0!important;overflow:visible!important;margin:0 0 12px!important;padding:14px!important;background:var(--p2)!important;border:1px solid var(--l)!important;border-radius:14px!important;contain:layout style!important;content-visibility:visible!important}
        .horse-head-v372{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
        .horse-title-v372{font-size:18px;font-weight:900;line-height:1.35}
        .horse-lines-v372{margin-top:5px;font-size:12px;color:var(--s);line-height:1.5;overflow-wrap:anywhere}
        .horse-badges-v372{margin-top:7px}
        .horse-quality-v372{margin-top:8px;padding:9px 10px;border-radius:10px;background:#0d1526;border:1px solid #2a6c51;font-size:12px}
        .horse-metrics-v372{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:9px}
        .horse-metric-v372{display:flex;justify-content:space-between;gap:8px;padding:8px 10px;border-radius:10px;background:#0d1526;border:1px solid var(--l);font-size:12px;color:var(--s)}
        .horse-metric-v372 b{color:var(--t);font-size:14px}
        .horse-toggle-v372{margin-top:9px;width:100%;text-align:left;touch-action:manipulation}
        .horse-detail-v372{margin-top:8px;padding-top:8px;border-top:1px solid var(--l)}
        .horse-run-v372{display:grid;grid-template-columns:70px 1fr 52px;gap:7px;padding:7px 0;border-bottom:1px solid rgba(38,53,86,.65);font-size:11px;color:var(--s);align-items:start}
        .horse-run-v372:last-child{border-bottom:0}
        #analyze{display:block!important;width:100%!important;margin-top:14px!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;position:relative!important;z-index:1!important;touch-action:manipulation!important}
      }
    `;
  }

  function detailHtml(h){
    const rows=history(h);
    if(!rows.length)return '<div class="small">過去走は未取得です。</div>';
    return rows.map(r=>{
      const date=esc(String(r?.date||'').slice(5)||'—');
      const cond=esc([r?.venue,r?.surface&&`${r.surface}${r.distance||''}`,r?.race_name||r?.grade].filter(Boolean).join(' / ')||'—');
      const result=Number.isFinite(+r?.rank)?`${esc(r.rank)}着`:esc(r?.status||'—');
      const last3f=Number.isFinite(+r?.last3f)?`上り ${(+r.last3f).toFixed(1)}`:'';
      return `<div class="horse-run-v372"><span>${date}</span><span>${cond}${last3f?`<br>${last3f}`:''}</span><b>${result}</b></div>`;
    }).join('');
  }

  function cardHtml(h){
    const q=quality(h),rows=history(h),sc=h?.histScores&&typeof h.histScores==='object'?h.histScores:{};
    const style=['逃','先','差','追'].includes(String(h?.style||''))?String(h.style):'—';
    const source=rows.length?`netkeiba ${rows.length}走`:'未取得';
    const metrics=[metric('近走',sc.speed),metric('上がり',sc.last3f),metric('距離適性',sc.distance),metric('コース適性',sc.course)];
    if(Number.isFinite(+sc.race))metrics.push(metric('レース格',sc.race));
    const no=String(h?.no||'');
    return `<div class="horse-card-v372" data-horse-no="${esc(no)}">
      <div class="horse-head-v372"><div class="horse-title-v372">${esc(no)} ${esc(h?.name||'')}</div></div>
      <div class="horse-lines-v372">${esc(h?.sex_age||'')} / ${esc(weightText(h))} / ${esc(h?.jockey||h?.rider||'—')}${Number.isFinite(+h?.carried_weight)?` / 斤量 ${(+h.carried_weight).toFixed(1)}kg`:''}</div>
      <div class="horse-lines-v372">脚質：${esc(style)}${style!=='—'?'（netkeiba）':''}　父：${esc(h?.sire||'—')}　母：${esc(h?.dam||'—')}　母父：${esc(h?.damsire||'—')}</div>
      <div class="horse-lines-v372">騎手相性：JRA前4走コンビ成績を反映</div>
      <div class="horse-badges-v372"><span class="badge good">${esc(source)}</span><span class="badge">品質 ${q.score}%</span></div>
      <div class="horse-quality-v372"><b>データ品質：${esc(q.label)} ${q.score}%</b></div>
      <div class="horse-metrics-v372">${metrics.join('')}</div>
      <button type="button" class="secondary horse-toggle-v372" data-toggle-horse="${esc(no)}">過去走を見る ▼</button>
      <div class="horse-detail-v372 hidden" data-detail-horse="${esc(no)}"></div>
    </div>`;
  }

  function renderMobile(){
    const root=el('horses'),hs=list();if(!root)return;
    root.innerHTML=hs.map(cardHtml).join('');
    const a=el('analyze');if(a){a.hidden=false;a.disabled=false;a.style.display='block';a.style.visibility='visible';a.style.opacity='1';a.style.pointerEvents='auto'}
    document.documentElement.dataset.horseRender='v372-mobile';
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
      if(typeof renderHorses==='function' && !renderHorses.__mobileHorseListV372)desktopRender=renderHorses;
    }catch(_){}
    const fn=function(){render()};
    fn.__mobileHorseListV372=true;
    try{window.renderHorses=fn}catch(_){}
    try{renderHorses=fn}catch(_){}
    const root=el('horses');
    if(root && !root.dataset.mobileHorseListV372){
      root.dataset.mobileHorseListV372='1';
      root.addEventListener('click',e=>{
        const b=e.target?.closest?.('[data-toggle-horse]');if(!b)return;
        e.preventDefault();
        const no=String(b.dataset.toggleHorse||'');
        const detail=root.querySelector(`[data-detail-horse="${CSS.escape(no)}"]`);if(!detail)return;
        if(openNo && openNo!==no){
          const old=root.querySelector(`[data-detail-horse="${CSS.escape(openNo)}"]`);const oldBtn=root.querySelector(`[data-toggle-horse="${CSS.escape(openNo)}"]`);
          if(old)old.classList.add('hidden');if(oldBtn)oldBtn.textContent='過去走を見る ▼';
        }
        const opening=detail.classList.contains('hidden');
        if(opening){
          const h=list().find(x=>String(x?.no||'')===no);detail.innerHTML=detailHtml(h||{});detail.classList.remove('hidden');b.textContent='過去走を閉じる ▲';openNo=no;
        }else{detail.classList.add('hidden');detail.innerHTML='';b.textContent='過去走を見る ▼';openNo=''}
      });
    }
    if(list().length)renderMobile();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  addEventListener('keiba-patches-ready',()=>setTimeout(install,0));
  addEventListener('keiba-data-updated',()=>setTimeout(render,40));
  addEventListener('pageshow',()=>setTimeout(render,80));
})();
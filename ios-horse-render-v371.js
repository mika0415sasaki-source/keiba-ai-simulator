(()=>{
  if(window.__iosHorseRenderV371)return;
  window.__iosHorseRenderV371=true;
  const el=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const hs=()=>{try{return Array.isArray(horses)?horses:[]}catch(_){return[]}};
  function installCss(){
    let s=el('iosHorseRenderV371Style');
    if(!s){s=document.createElement('style');s.id='iosHorseRenderV371Style';(document.head||document.documentElement).appendChild(s)}
    s.textContent=`
      @media(max-width:700px){
        html,body{background:#09101d!important;background-image:none!important;overflow-x:hidden!important;height:auto!important;min-height:100%!important}
        #input,#horses,#horses>.card,#horses>.card .grid,#horses>.card .metric,#horses>.card .hist,#horses>.card .hist-row{
          contain:none!important;content-visibility:visible!important;transform:none!important;-webkit-transform:none!important;
          filter:none!important;-webkit-filter:none!important;will-change:auto!important;backface-visibility:visible!important;
          visibility:visible!important;opacity:1!important;max-height:none!important;
        }
        #horses{display:block!important;position:static!important;height:auto!important;min-height:0!important;overflow:visible!important}
        #horses>.card{display:block!important;position:relative!important;height:auto!important;min-height:0!important;overflow:visible!important;margin-bottom:12px!important}
        #horses>.card .grid{display:block!important;height:auto!important;overflow:visible!important}
        #horses>.card .metric{display:flex!important;height:auto!important}
        #horses>.card .hist{display:block!important;height:auto!important;overflow:visible!important}
        #horses>.card .hist-row{display:grid!important;height:auto!important}
        #analyze{display:inline-block!important;position:relative!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;touch-action:manipulation!important;z-index:2!important}
      }
    `;
  }
  function safeRows(h){return Array.isArray(h?.history)&&h.history.length?h.history:(Array.isArray(h?.jra_history)?h.jra_history:[])}
  function safeQuality(h){try{const q=typeof dataQuality==='function'?dataQuality(h):null;return q&&Number.isFinite(+q.score)?q:{score:0,label:'未取得',issues:[]}}catch(_){return{score:0,label:'未取得',issues:[]}}}
  function fallback(){
    const root=el('horses'),list=hs();if(!root)return;
    root.innerHTML='';
    for(const h of list){
      try{
        const rows=safeRows(h).slice(0,5),q=safeQuality(h),sc=h?.histScores&&typeof h.histScores==='object'?h.histScores:null;
        const d=document.createElement('div');d.className='card';d.style.marginBottom='12px';
        const body=Number.isFinite(+h?.body_weight)&&+h.body_weight>=300?`${Math.round(+h.body_weight)}kg`:'未発表';
        const style=['逃','先','差','追'].includes(String(h?.style||''))?String(h.style):'—';
        d.innerHTML=`<div class="rank">${esc(h?.no||'')} ${esc(h?.name||'')}</div><div class="small">${esc(h?.sex_age||'')}　馬体重 ${esc(body)}　${esc(h?.jockey||h?.rider||'')}　${Number.isFinite(+h?.carried_weight)?`斤量 ${(+h.carried_weight).toFixed(1)}kg`:''}</div><div class="small">脚質：${esc(style)}${style!=='—'?'（netkeiba）':''}　父：${esc(h?.sire||'—')}　母：${esc(h?.dam||'—')}　母父：${esc(h?.damsire||'—')}</div><div style="margin-top:6px"><span class="badge good">${rows.length?'netkeiba 5走':'未取得'}</span><span class="badge">品質 ${Math.max(0,Math.min(100,+q.score||0))}%</span></div><div class="status ${(+q.score||0)>=85?'ok':'bad'}" style="margin-top:8px"><b>データ品質：${esc(q.label||'未取得')} ${Math.max(0,Math.min(100,+q.score||0))}%</b></div><div class="grid" style="margin-top:8px"><div class="metric"><span>近走</span><b>${Number.isFinite(+sc?.speed)?(+sc.speed).toFixed(1):'—'}</b></div><div class="metric"><span>上がり</span><b>${Number.isFinite(+sc?.last3f)?(+sc.last3f).toFixed(1):'—'}</b></div><div class="metric"><span>距離適性</span><b>${Number.isFinite(+sc?.distance)?(+sc.distance).toFixed(1):'—'}</b></div><div class="metric"><span>コース適性</span><b>${Number.isFinite(+sc?.course)?(+sc.course).toFixed(1):'—'}</b></div></div><div class="hist">${rows.map(r=>`<div class="hist-row"><span>${esc(String(r?.date||'').slice(5))}</span><span>${esc(r?.venue||'—')}</span><span>${esc(r?.surface||'')}${esc(r?.distance||'')}</span><span>${r?.rank?`${esc(r.rank)}着`:esc(r?.status||'—')}</span><span>${esc(r?.going||'')} 上り ${Number.isFinite(+r?.last3f)?(+r.last3f).toFixed(1):'—'}</span></div>`).join('')}</div>`;
        root.appendChild(d);
      }catch(e){console.warn('horse fallback row',h?.name,e)}
    }
    document.documentElement.dataset.horseRenderFallback='v371';
  }
  function ensure(){
    installCss();const root=el('horses'),list=hs();if(!root||!list.length)return;
    const count=root.querySelectorAll(':scope > .card').length;
    if(count<list.length)fallback();
    const a=el('analyze');if(a){a.hidden=false;a.disabled=false;a.style.display='inline-block';a.style.visibility='visible';a.style.opacity='1';a.style.pointerEvents='auto'}
    void root.offsetHeight;
    document.documentElement.dataset.horseCards=String(root.querySelectorAll(':scope > .card').length);
  }
  function wrap(){
    let base=null;try{base=typeof renderHorses==='function'?renderHorses:null}catch(_){}
    if(!base||base.__iosHorseRenderV371)return;
    const fn=function(){try{base()}catch(e){console.warn('renderHorses v371 fallback',e);fallback()}ensure()};
    fn.__iosHorseRenderV371=true;fn.__original=base;
    try{renderHorses=fn}catch(_){};try{window.renderHorses=fn}catch(_){}
  }
  function start(){installCss();wrap();setTimeout(ensure,120)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  addEventListener('keiba-patches-ready',()=>{wrap();setTimeout(ensure,120)});
  addEventListener('keiba-data-updated',()=>setTimeout(ensure,160));
  addEventListener('pageshow',()=>setTimeout(ensure,180));
})();

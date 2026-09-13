(function(){
  if(window.__mobileHorseListV374)return;
  window.__mobileHorseListV374=true;

  var selectedKey='';
  var rootObserver=null;
  var renderTimer=0;
  var boundRoot=null;

  function isMobile(){return window.matchMedia && window.matchMedia('(max-width:700px)').matches;}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function getHorses(){
    try{
      if(Array.isArray(window.horses))return window.horses;
      if(typeof horses!=='undefined' && Array.isArray(horses))return horses;
    }catch(e){}
    return [];
  }
  function keyFor(h,i){return String((h&&h.no)||i+1);}
  function score(h,k){var s=h&&h.histScores;var v=s&&s[k];return Number.isFinite(Number(v))?Number(v).toFixed(1):'—';}
  function styleOf(h){var s=String(h&&h.style||'');return ['逃','先','差','追'].indexOf(s)>=0?s:'—';}
  function qualityOf(h){
    try{
      if(typeof dataQuality==='function'){
        var q=dataQuality(h)||{};
        var n=Number(q.score);
        return {score:Number.isFinite(n)?Math.max(0,Math.min(100,n)):0,label:String(q.label||'未取得')};
      }
    }catch(e){}
    return {score:0,label:'未取得'};
  }
  function runsOf(h){
    var a=h&&Array.isArray(h.history)?h.history:[];
    var b=h&&Array.isArray(h.jra_history)?h.jra_history:[];
    return (a.length?a:b).filter(Boolean).slice(0,5);
  }
  function weightText(h){
    var w=Number(h&&h.body_weight);if(!(w>=300))w=Number(h&&h.weight);
    if(!(w>=300))return '馬体重 未発表';
    var c=Number(h&&h.body_weight_change);
    return '馬体重 '+Math.round(w)+'kg'+(Number.isFinite(c)?'（'+(c>=0?'+':'')+c+'kg）':'');
  }
  function installCss(){
    var id='mobileHorseListV374Style';
    var s=document.getElementById(id);
    if(!s){s=document.createElement('style');s.id=id;(document.head||document.documentElement).appendChild(s);}
    s.textContent='@media(max-width:700px){'+
      '#horses{display:block!important;position:static!important;height:auto!important;min-height:0!important;max-height:none!important;overflow:visible!important;contain:none!important;content-visibility:visible!important;transform:none!important;-webkit-transform:none!important;filter:none!important;-webkit-filter:none!important;opacity:1!important;visibility:visible!important;will-change:auto!important}'+
      '#horses .mh374-list,#horses .mh374-detail,#horses .mh374-row{contain:none!important;content-visibility:visible!important;transform:none!important;-webkit-transform:none!important;filter:none!important;-webkit-filter:none!important;will-change:auto!important}'+
      '.mh374-note{font-size:12px;color:var(--s);margin:0 0 8px}.mh374-row{display:grid!important;grid-template-columns:34px minmax(0,1fr) 64px!important;gap:8px!important;align-items:center!important;width:100%!important;padding:10px 11px!important;margin:0 0 6px!important;border:1px solid var(--l)!important;border-radius:10px!important;background:#0d1526!important;color:var(--t)!important;text-align:left!important;touch-action:manipulation!important}.mh374-row.active{border-color:var(--a)!important;background:#12243a!important}.mh374-no{font-weight:900;font-size:15px;text-align:center}.mh374-name{font-weight:900;font-size:14px;line-height:1.25;overflow-wrap:anywhere}.mh374-sub{display:block;margin-top:2px;font-size:10px;font-weight:500;color:var(--s)}.mh374-score{font-size:10px;color:var(--s);text-align:right;white-space:nowrap}.mh374-score b{display:block;color:var(--t);font-size:14px}.mh374-detail{margin-top:10px!important;padding:14px!important;border:1px solid var(--l)!important;border-radius:14px!important;background:var(--p2)!important;overflow:visible!important;height:auto!important}.mh374-title{font-size:19px;font-weight:900;line-height:1.3}.mh374-line{margin-top:5px;font-size:12px;color:var(--s);line-height:1.5;overflow-wrap:anywhere}.mh374-quality{margin-top:9px;padding:9px 10px;border-radius:10px;background:#0d1526;border:1px solid #2a6c51;font-size:12px}.mh374-metrics{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:9px}.mh374-metric{display:flex;justify-content:space-between;gap:8px;padding:8px 10px;border-radius:10px;background:#0d1526;border:1px solid var(--l);font-size:12px;color:var(--s)}.mh374-metric b{color:var(--t);font-size:14px}.mh374-runs{margin-top:11px;padding-top:9px;border-top:1px solid var(--l)}.mh374-run{display:grid;grid-template-columns:62px minmax(0,1fr) 44px;gap:6px;padding:6px 0;border-bottom:1px solid rgba(38,53,86,.55);font-size:10px;color:var(--s);align-items:start}.mh374-run:last-child{border-bottom:0}#analyze{display:block!important;width:100%!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;touch-action:manipulation!important}'+
    '}';
  }
  function metric(label,v){return '<div class="mh374-metric"><span>'+esc(label)+'</span><b>'+esc(v)+'</b></div>';}
  function runHtml(r){
    var date=String(r&&r.date||''); if(date.length>5)date=date.slice(5);
    var parts=[]; if(r&&r.venue)parts.push(r.venue); if(r&&r.surface)parts.push(String(r.surface)+(r.distance||'')); if(r&&(r.race_name||r.grade))parts.push(r.race_name||r.grade);
    var rank=Number(r&&r.rank); var result=Number.isFinite(rank)?rank+'着':String(r&&r.status||'—');
    var last3f=Number(r&&r.last3f); var extra=Number.isFinite(last3f)?'<br>上り '+last3f.toFixed(1):'';
    return '<div class="mh374-run"><span>'+esc(date||'—')+'</span><span>'+esc(parts.join(' / ')||'—')+extra+'</span><b>'+esc(result)+'</b></div>';
  }
  function detailHtml(h){
    var q=qualityOf(h),runs=runsOf(h),st=styleOf(h);
    var metrics=metric('近走',score(h,'speed'))+metric('上がり',score(h,'last3f'))+metric('距離適性',score(h,'distance'))+metric('コース適性',score(h,'course'));
    if(h&&h.histScores&&Number.isFinite(Number(h.histScores.race)))metrics+=metric('レース格',score(h,'race'));
    var carried=Number(h&&h.carried_weight);
    return '<div class="mh374-detail">'+
      '<div class="mh374-title">'+esc(h&&h.no||'')+' '+esc(h&&h.name||'')+'</div>'+
      '<div class="mh374-line">'+esc(h&&h.sex_age||'')+' / '+esc(weightText(h))+' / '+esc(h&&(h.jockey||h.rider)||'—')+(Number.isFinite(carried)?' / 斤量 '+carried.toFixed(1)+'kg':'')+'</div>'+
      '<div class="mh374-line">脚質：'+esc(st)+(st!=='—'?'（netkeiba）':'')+'　父：'+esc(h&&h.sire||'—')+'　母：'+esc(h&&h.dam||'—')+'　母父：'+esc(h&&h.damsire||'—')+'</div>'+
      '<div class="mh374-line">騎手相性：JRA前4走コンビ成績を反映</div>'+
      '<div class="mh374-quality"><b>データ品質：'+esc(q.label)+' '+esc(q.score)+'%</b>　<span class="small">'+(runs.length?'netkeiba '+runs.length+'走':'過去走未取得')+'</span></div>'+
      '<div class="mh374-metrics">'+metrics+'</div>'+
      '<div class="mh374-runs"><div style="font-size:12px;font-weight:900;margin-bottom:5px">過去走（最大5走）</div>'+(runs.length?runs.map(runHtml).join(''):'<div class="small">過去走は未取得です。</div>')+'</div>'+
    '</div>';
  }
  function rowHtml(h,i){
    var k=keyFor(h,i);var active=k===selectedKey?' active':'';
    return '<button type="button" class="mh374-row'+active+'" data-mh374-key="'+esc(k)+'">'+
      '<span class="mh374-no">'+esc(h&&h.no||i+1)+'</span>'+
      '<span class="mh374-name">'+esc(h&&h.name||'')+'<span class="mh374-sub">'+esc(h&&h.sex_age||'')+' / 脚質 '+esc(styleOf(h))+' / '+esc(h&&(h.jockey||h.rider)||'—')+'</span></span>'+
      '<span class="mh374-score">近走<b>'+esc(score(h,'speed'))+'</b></span>'+
    '</button>';
  }
  function stopWatch(){if(rootObserver){try{rootObserver.disconnect();}catch(e){}}}
  function startWatch(root){
    stopWatch();
    if(!window.MutationObserver||!root)return;
    rootObserver=new MutationObserver(function(){scheduleRender(0);});
    try{rootObserver.observe(root,{childList:true});}catch(e){}
  }
  function renderLite(){
    if(!isMobile())return;
    installCss();
    var root=document.getElementById('horses');
    var hs=getHorses();
    if(!root||!hs.length)return;
    if(!selectedKey||!hs.some(function(h,i){return keyFor(h,i)===selectedKey;}))selectedKey=keyFor(hs[0],0);
    var selected=hs[0];
    for(var i=0;i<hs.length;i++){if(keyFor(hs[i],i)===selectedKey){selected=hs[i];break;}}
    stopWatch();
    root.innerHTML='<div class="mh374-list"><div class="mh374-note">全'+hs.length+'頭　馬名を押すと詳細が切り替わります</div>'+hs.map(rowHtml).join('')+'</div>'+detailHtml(selected);
    root.dataset.mobileHorseListV374='1';
    document.documentElement.dataset.horseRender='v374-safe-transform';
    document.documentElement.dataset.horseCards=String(hs.length);
    var panel=root.closest?root.closest('.panel'):null;
    if(panel){panel.style.contain='none';panel.style.transform='none';panel.style.webkitTransform='none';panel.style.filter='none';panel.style.webkitFilter='none';panel.style.overflow='visible';panel.style.height='auto';panel.style.maxHeight='none';}
    var a=document.getElementById('analyze');
    if(a){a.hidden=false;a.disabled=false;a.style.display='block';a.style.visibility='visible';a.style.opacity='1';a.style.pointerEvents='auto';}
    startWatch(root);
  }
  function scheduleRender(delay){clearTimeout(renderTimer);renderTimer=setTimeout(renderLite,delay==null?0:delay);}
  function bind(){
    installCss();
    var root=document.getElementById('horses');
    if(root&&boundRoot!==root){
      boundRoot=root;
      root.addEventListener('click',function(e){
        var b=e.target&&e.target.closest?e.target.closest('[data-mh374-key]'):null;
        if(!b)return;
        e.preventDefault();
        selectedKey=String(b.getAttribute('data-mh374-key')||'');
        renderLite();
      });
      startWatch(root);
    }
    scheduleRender(0);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
  window.addEventListener('load',function(){setTimeout(bind,0);},{once:true});
  window.addEventListener('keiba-patches-ready',function(){setTimeout(bind,0);});
  window.addEventListener('keiba-data-updated',function(){scheduleRender(0);});
  window.addEventListener('pageshow',function(){setTimeout(bind,40);});
})();

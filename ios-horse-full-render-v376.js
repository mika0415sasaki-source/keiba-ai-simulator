(function(){
  if (window.__iosHorseFullRenderV376) return;
  window.__iosHorseFullRenderV376 = true;

  var renderToken = 0;

  function isMobile(){
    return !!(window.matchMedia && window.matchMedia('(max-width:700px)').matches);
  }
  function esc(v){
    return String(v == null ? '' : v).replace(/[&<>"']/g,function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function getHorses(){
    try { if (typeof horses !== 'undefined' && Array.isArray(horses)) return horses; } catch(_){ }
    try { if (Array.isArray(window.horses)) return window.horses; } catch(_){ }
    return [];
  }
  function getRows(h){
    var a = h && Array.isArray(h.history) ? h.history.filter(Boolean) : [];
    var b = h && Array.isArray(h.jra_history) ? h.jra_history.filter(Boolean) : [];
    return (a.length ? a : b).slice(0,5);
  }
  function getQuality(h){
    try {
      if (typeof dataQuality === 'function') {
        var q = dataQuality(h) || {};
        var n = Number(q.score);
        return {
          score: Number.isFinite(n) ? Math.max(0,Math.min(100,n)) : 0,
          label: String(q.label || (n === 100 ? '完全' : '未取得')),
          issues: Array.isArray(q.issues) ? q.issues : []
        };
      }
    } catch(_){ }
    return {score:0,label:'未取得',issues:[]};
  }
  function score(h,k){
    var v = h && h.histScores ? Number(h.histScores[k]) : NaN;
    return Number.isFinite(v) ? v.toFixed(1) : '—';
  }
  function weightText(h){
    var w = Number(h && h.body_weight);
    if (!(w >= 300)) w = Number(h && h.weight);
    if (!(w >= 300)) return '馬体重 未発表';
    var c = Number(h && h.body_weight_change);
    return '馬体重 ' + Math.round(w) + 'kg' + (Number.isFinite(c) ? '（' + (c >= 0 ? '+' : '') + c + 'kg）' : '');
  }
  function sourceText(h,rows){
    var hist = h && Array.isArray(h.history) ? h.history.filter(Boolean) : [];
    if (hist.length) return 'netkeiba ' + Math.min(hist.length,5) + '走';
    if (rows.length) return 'JRA補完 ' + rows.length + '走';
    return '未取得';
  }
  function runHtml(r){
    var date = String(r && r.date || '');
    if (date.length > 5) date = date.slice(5);
    var venue = r && r.venue || '—';
    var sd = String(r && r.surface || '') + String(r && r.distance || '');
    var result = r && r.rank ? String(r.rank) + '着' : String(r && r.status || '—');
    var last3f = Number(r && r.last3f);
    var tail = String(r && r.going || '') + ' 上り ' + (Number.isFinite(last3f) ? last3f.toFixed(1) : '—');
    return '<div class="hist-row"><span>'+esc(date || '—')+'</span><span>'+esc(venue)+'</span><span>'+esc(sd)+'</span><span>'+esc(result)+'</span><span>'+esc(tail)+'</span></div>';
  }
  function issueHtml(q,h){
    var filled = Number(h && h.jraFillCount || 0) > 0;
    if (q.issues.length) {
      var lines = q.issues.map(function(x){
        var d = String(x && x.date || '').slice(5);
        var miss = Array.isArray(x && x.missing) ? x.missing.join('・') : '';
        return esc(d + '：' + miss + '欠損');
      }).join('<br>');
      return '<div class="status '+(q.score >= 85 ? '' : 'bad')+'" style="margin-top:8px"><b>データ品質：'+esc(q.label)+' '+q.score+'%</b><br>'+lines+'<br><span class="small">JRAで補完できない欠損項目だけ指数計算から除外します。</span></div>';
    }
    return '<div class="status ok" style="margin-top:8px"><b>データ品質：'+(filled ? 'JRA補完後 ' : '')+'完全 100%</b></div>';
  }
  function fullCard(h){
    var rows = getRows(h);
    var q = getQuality(h);
    var d = document.createElement('div');
    d.className = 'card ios-full-horse-card-v376';
    d.style.marginBottom = '8px';
    var style = String(h && h.style || '');
    if (['逃','先','差','追'].indexOf(style) < 0) style = '—';
    var jockey = h && (h.jockey || h.rider) || '';
    var carried = Number(h && h.carried_weight);
    var carriedText = Number.isFinite(carried) ? '　斤量 '+carried.toFixed(1)+'kg' : '';
    var source = sourceText(h,rows);
    var filled = Number(h && h.jraFillCount || 0) > 0;
    d.innerHTML =
      '<div class="rank">'+esc(h && h.no || '')+' '+esc(h && h.name || '')+'</div>'+
      '<div class="small">'+esc(h && h.sex_age || '')+' / '+esc(weightText(h))+'　'+esc(jockey)+carriedText+'</div>'+
      '<div class="small">脚質：'+esc(style)+(style !== '—' ? '（netkeiba）' : '')+'　父：'+esc(h && h.sire || '—')+'　母：'+esc(h && h.dam || '—')+'　母父：'+esc(h && h.damsire || '—')+'</div>'+
      '<div class="small">騎手相性：'+esc(h && h.jockey_combo || 'JRA前4走コンビ成績を反映')+'</div>'+
      '<div style="margin-top:6px"><span class="badge good">'+esc(source)+'</span><span class="badge">品質 '+q.score+'%</span></div>'+
      '<div class="small" style="margin-top:5px">主データ：'+esc(source)+(filled ? ' / JRA補完 '+esc(h.jraFillCount)+'項目' : '')+'</div>'+
      issueHtml(q,h)+
      '<div class="grid" style="margin-top:8px">'+
        '<div class="metric"><span>近走</span><b>'+esc(score(h,'speed'))+'</b></div>'+
        '<div class="metric"><span>上がり</span><b>'+esc(score(h,'last3f'))+'</b></div>'+
        '<div class="metric"><span>距離適性</span><b>'+esc(score(h,'distance'))+'</b></div>'+
        '<div class="metric"><span>コース適性</span><b>'+esc(score(h,'course'))+'</b></div>'+
      '</div>'+
      '<div class="hist">'+rows.map(runHtml).join('')+'</div>';
    return d;
  }

  function installCss(){
    var id = 'iosHorseFullRenderV376Style';
    var s = document.getElementById(id);
    if (!s) {
      s = document.createElement('style');
      s.id = id;
      (document.head || document.documentElement).appendChild(s);
    }
    s.textContent = '@media(max-width:700px){'+
      '#horses{display:block!important;position:static!important;height:auto!important;min-height:0!important;max-height:none!important;overflow:visible!important;contain:none!important;content-visibility:visible!important;transform:none!important;-webkit-transform:none!important;filter:none!important;-webkit-filter:none!important;visibility:visible!important;opacity:1!important;will-change:auto!important}'+
      '#horses>.card{display:block!important;position:relative!important;height:auto!important;min-height:0!important;max-height:none!important;overflow:visible!important;contain:none!important;content-visibility:visible!important;transform:none!important;-webkit-transform:none!important;filter:none!important;-webkit-filter:none!important;visibility:visible!important;opacity:1!important;will-change:auto!important}'+
      '#horses>.card .grid,#horses>.card .metric,#horses>.card .hist,#horses>.card .hist-row{contain:none!important;content-visibility:visible!important;transform:none!important;-webkit-transform:none!important;filter:none!important;-webkit-filter:none!important;visibility:visible!important;opacity:1!important;will-change:auto!important}'+
      '#analyze{visibility:visible!important;opacity:1!important;pointer-events:auto!important;touch-action:manipulation!important}'+
    '}';
  }

  function renderChunked(){
    if (!isMobile()) return false;
    installCss();
    var root = document.getElementById('horses');
    var list = getHorses();
    if (!root || !list.length) return false;
    var token = ++renderToken;
    root.innerHTML = '';
    root.dataset.fullHorseRender = 'loading';
    var analyze = document.getElementById('analyze');
    if (analyze) {
      analyze.hidden = false;
      analyze.style.display = '';
      analyze.style.visibility = 'visible';
      analyze.style.opacity = '1';
      analyze.style.pointerEvents = 'none';
    }
    var i = 0;
    function batch(){
      if (token !== renderToken) return;
      var frag = document.createDocumentFragment();
      var stop = Math.min(i + 2, list.length);
      for (; i < stop; i++) frag.appendChild(fullCard(list[i]));
      root.appendChild(frag);
      void root.offsetHeight;
      if (i < list.length) {
        requestAnimationFrame(batch);
      } else {
        root.dataset.fullHorseRender = 'complete';
        document.documentElement.dataset.horseCards = String(list.length);
        document.documentElement.dataset.horseRender = 'full-v376';
        if (analyze) {
          analyze.disabled = false;
          analyze.style.pointerEvents = 'auto';
        }
      }
    }
    requestAnimationFrame(batch);
    return true;
  }

  function wrapRenderer(){
    var base = null;
    try { base = (typeof renderHorses === 'function') ? renderHorses : null; } catch(_){ }
    if (!base || base.__iosFullV376) return;
    var wrapped = function(){
      if (isMobile()) {
        if (!renderChunked()) return base.apply(this,arguments);
        return;
      }
      return base.apply(this,arguments);
    };
    wrapped.__iosFullV376 = true;
    wrapped.__original = base;
    try { renderHorses = wrapped; } catch(_){ }
    try { window.renderHorses = wrapped; } catch(_){ }
  }

  function ensure(){
    installCss();
    wrapRenderer();
    var root = document.getElementById('horses');
    var list = getHorses();
    if (!isMobile() || !root || !list.length) return;
    var count = root.querySelectorAll(':scope > .card').length;
    if (count !== list.length || root.dataset.fullHorseRender !== 'complete') renderChunked();
  }

  function start(){
    installCss();
    wrapRenderer();
    setTimeout(ensure,80);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
  window.addEventListener('keiba-patches-ready',function(){ setTimeout(start,0); });
  window.addEventListener('keiba-data-updated',function(){ setTimeout(ensure,80); });
  window.addEventListener('pageshow',function(){ setTimeout(ensure,120); });
})();

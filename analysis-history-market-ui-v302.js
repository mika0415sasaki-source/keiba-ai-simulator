(()=>{
  if(window.__analysisHistoryMarketUiV302)return;
  window.__analysisHistoryMarketUiV302=true;

  const NK_RACE='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/netkeiba-race-import';
  const el=id=>document.getElementById(id);
  const norm=s=>String(s||'').normalize('NFKC').replace(/[\s　]+/g,'').trim();
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const valid=v=>Number.isFinite(+v)&&+v>0;
  const validLast3f=v=>Number.isFinite(+v)&&+v>=20&&+v<=60;
  const ACTIVE_BAD=/取消|出走取消|競走除外|除外|競走中止|中止|失格/;
  const KNOWN_NONFINISH={
    'サムシングスイート':[{date:'2026/04/26',venue:'東京'}],
    'ロングトールサリー':[{date:'2026/04/18',venue:'阪神'}]
  };
  let marketBusy=false,lastMarketRace='';

  function raceId(){
    try{if(typeof raceIdFromUrl==='function'){const x=raceIdFromUrl(el('raceUrl')?.value||'');if(x)return x}}catch(_){}
    let s=String(el('raceUrl')?.value||raceMeta?.source_url||'');for(let i=0;i<3;i++){try{s=decodeURIComponent(s)}catch(_){break}}
    let m=s.match(/(?:race_id[=:_-]*|\/race\/)(20\d{10})/i)||s.match(/\b(20\d{10})\b/);if(m)return m[1];
    m=s.match(/sw01ddd(?:10|01)?(\d{2})(20\d{2})(\d{2})(\d{2})(\d{2})/i);return m?`${m[2]}${m[1]}${m[3]}${m[4]}${m[5]}`:'';
  }
  function md(v){const m=String(v||'').normalize('NFKC').replace(/[年月.\-]/g,'/').replace(/日/g,'').match(/(?:(20\d{2})\/)?(\d{1,2})\/(\d{1,2})/);return m?`${String(+m[2]).padStart(2,'0')}/${String(+m[3]).padStart(2,'0')}`:''}
  function sameKnown(run,x){if(md(run?.date)!==md(x?.date))return false;const a=norm(run?.venue||run?.course),b=norm(x?.venue);return !(a&&b&&!a.includes(b)&&!b.includes(a))}
  function isNonfinishRun(name,run){if(!run)return true;const st=[run.status,run.result_status,run.rank_text].filter(Boolean).join(' ');if(ACTIVE_BAD.test(st))return true;return (KNOWN_NONFINISH[norm(name)]||[]).some(x=>sameKnown(run,x))}
  function recalcHorse(h){
    if(!h)return;
    for(const field of ['history','jra_history'])if(Array.isArray(h[field]))h[field]=h[field].filter(r=>!isNonfinishRun(h.name,r)).slice(0,5);
    if(Array.isArray(h.history)&&h.history.length){try{h.histScores=scoreLocalHistory(h.history);if(h.histScores)h.histScores.available=true}catch(_){}}
  }
  function purgeNonfinish(){if(!Array.isArray(horses))return;horses.forEach(recalcHorse)}

  function injectCss(){
    if(el('analysisUiV302Style'))return;
    const s=document.createElement('style');s.id='analysisUiV302Style';s.textContent=`
      html,body{overflow-x:hidden!important;max-width:100%!important}
      .wrap,.panel,.card,#horses,#analysis,#ranking{max-width:100%!important;min-width:0!important}
      #horses .hist{overflow:hidden!important;max-width:100%!important}
      #horses .hist-row{min-width:0!important;max-width:100%!important}
      #horses .hist-row>span{min-width:0!important;overflow-wrap:anywhere!important}
      #ranking{display:grid!important;grid-template-columns:1fr!important;gap:10px!important}
      #ranking .ranking-card{padding:0!important;overflow:hidden!important}
      #ranking .ranking-card>summary{display:grid!important;grid-template-columns:minmax(0,1fr) auto 18px!important;align-items:center!important;gap:10px!important;padding:12px 14px!important;cursor:pointer!important;list-style:none!important}
      #ranking .ranking-card>summary::-webkit-details-marker{display:none!important}
      #ranking .ranking-summary-main{min-width:0!important}
      #ranking .ranking-card .rank{font-size:17px!important;line-height:1.3!important;margin:0!important;white-space:normal!important}
      #ranking .ranking-card .score{font-size:29px!important;margin:0!important;line-height:1!important}
      #ranking .summary-market{font-size:11px!important;color:#9fb0cf!important;margin-top:4px!important;line-height:1.3!important}
      #ranking .accordion-chevron{color:#9fb0cf!important;font-size:14px!important;transition:transform .16s ease!important}
      #ranking .ranking-card[open] .accordion-chevron{transform:rotate(180deg)!important}
      #ranking .ranking-card-details{padding:0 14px 13px!important;border-top:1px solid rgba(63,86,128,.32)!important}
      #ranking .ranking-card-details .metric{font-size:13px!important;margin:6px 0!important}
      .comparison-wrap{max-width:100%!important}
      .comparison-table{width:100%!important}
      @media(max-width:720px){
        #horses .hist-row{grid-template-columns:42px minmax(0,1fr) 48px 34px 76px!important;gap:4px!important;font-size:10px!important;align-items:start!important}
        #horses .hist-row span:nth-child(2){line-height:1.25!important}
        .comparison-wrap{overflow:visible!important}
        .comparison-table{display:block!important;width:100%!important;min-width:0!important;border-collapse:separate!important}
        .comparison-table thead{display:none!important}
        .comparison-table tbody{display:grid!important;gap:8px!important}
        .comparison-table tr{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;column-gap:12px!important;padding:10px 12px!important;border:1px solid #2b4068!important;border-radius:14px!important;background:#18243c!important}
        .comparison-table td{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:8px!important;min-width:0!important;padding:7px 0!important;border-bottom:1px solid rgba(73,99,145,.30)!important;text-align:right!important;font-size:13px!important;line-height:1.35!important;white-space:normal!important}
        .comparison-table td::before{content:attr(data-label)!important;flex:0 0 auto!important;color:#9fb0cf!important;font-size:11px!important;font-weight:500!important}
        .comparison-table td:first-child{display:block!important;padding:2px 0!important;border-bottom:0!important;color:#f2f6ff!important;font-size:15px!important;font-weight:800!important;text-align:left!important}
        .comparison-table td:first-child::before,.comparison-table td:nth-child(2)::before{display:none!important}
        .comparison-table td:nth-child(2){display:block!important;padding:2px 0!important;border-bottom:0!important;color:#61dfa9!important;font-size:20px!important;font-weight:900!important}
        .comparison-table tr:not(.is-open) td:nth-child(n+3){display:none!important}
        .comparison-table tr.is-open{grid-template-columns:repeat(2,minmax(0,1fr))!important}
        .comparison-table tr.is-open td:first-child{grid-column:1/2!important}.comparison-table tr.is-open td:nth-child(2){grid-column:2/3!important}
        .comparison-table tr.is-open td:nth-child(n+3){grid-column:1/-1!important}
        .comparison-toggle{all:unset!important;display:flex!important;width:100%!important;align-items:center!important;justify-content:space-between!important;gap:8px!important;cursor:pointer!important}
        .comparison-rank{color:#61dfa9!important;margin-right:5px!important}.comparison-chevron{display:inline-block!important;color:#9fb0cf!important;font-size:13px!important;transition:transform .16s ease!important}
        .comparison-table tr.is-open .comparison-chevron{transform:rotate(180deg)!important}
      }
    `;(document.head||document.documentElement).appendChild(s);
  }

  function marketFor(h){
    const no=String(+h.no),v=oddsCache?.win?.[no];let o=null,p=null;
    if(valid(v))o=+v;else if(v&&typeof v==='object'){for(const k of ['odds','value','price'])if(valid(v[k])){o=+v[k];break}for(const k of ['popularity','popular','rank','ninki'])if(Number.isInteger(+v[k])&&+v[k]>=1&&+v[k]<=18){p=+v[k];break}}
    if(!o&&valid(h.winOdds))o=+h.winOdds;if(!o&&valid(h.odds))o=+h.odds;
    if(!p&&Number.isInteger(+h.popularity)&&+h.popularity>=1&&+h.popularity<=18)p=+h.popularity;
    return {odds:o,popularity:p};
  }
  function marketText(h){const m=marketFor(h);return m.odds?`単勝 ${m.odds.toFixed(1)}倍${m.popularity?` / ${m.popularity}番人気`:''}`:'単勝オッズ未取得'}
  function bodyWeightText(h){const src=(Array.isArray(horses)?horses:[]).find(x=>+x.no===+h.no||norm(x.name)===norm(h.name))||h;const w=+(src.body_weight||src.weight||0),c=Number(src.body_weight_change);return w>=300&&w<=700?`${Math.round(w)}kg${Number.isFinite(c)?` (${c>=0?'+':''}${c})`:''}`:'未発表'}
  function metric(v){return Number.isFinite(+v)?(+v).toFixed(1):'—'}

  function restoreAnalysisUi(){
    if(!Array.isArray(evaluated)||!evaluated.length)return;
    const ranking=el('ranking');if(ranking){
      ranking.innerHTML=evaluated.map((h,i)=>{
        const mark=['◎','○','▲','△','☆','注'][i]||'';const grade=Number.isFinite(+h.gradeScore)?(+h.gradeScore).toFixed(1):'—';const last=validLast3f(h.last3f)?(+h.last3f).toFixed(1):'—';
        return `<details class="card ranking-card"><summary><div class="ranking-summary-main"><div class="rank">${i+1}位　${mark} ${esc(h.no)} ${esc(h.name)}</div><div class="summary-market">${esc(marketText(h))}</div></div><div class="score">${metric(h.score)}</div><span class="accordion-chevron">▼</span></summary><div class="ranking-card-details"><div class="metric"><span>近走</span><b>${metric(h.speed)}</b></div><div class="metric"><span>上がり</span><b>${last}</b></div><div class="metric"><span>レース格</span><b>${grade}</b></div><div class="metric"><span>距離適性</span><b>${metric(h.distance)}</b></div><div class="metric"><span>コース適性</span><b>${metric(h.course)}</b></div><div class="metric"><span>1着率</span><b>${metric(h.winP)}%</b></div><div class="metric"><span>3着内率</span><b>${metric(h.place)}%</b></div></div></details>`;
      }).join('');
    }
    const rows=el('rows'),table=rows?.closest('table');if(rows&&table){
      table.classList.add('comparison-table');table.parentElement?.classList.add('comparison-wrap');
      const head=table.querySelector('thead tr');if(head)head.innerHTML='<th>馬</th><th>AI指数</th><th>近走</th><th>上がり</th><th>レース格</th><th>馬体重</th><th>距離</th><th>コース</th><th>単勝オッズ・人気</th><th>1着率</th><th>3着内率</th>';
      rows.innerHTML=evaluated.map((h,i)=>{const mark=['◎','○','▲','△','☆','注'][i]||'',last=validLast3f(h.last3f)?(+h.last3f).toFixed(1):'—',grade=Number.isFinite(+h.gradeScore)?(+h.gradeScore).toFixed(1):'—';return `<tr data-v302-row="1"><td data-label="馬"><button type="button" class="comparison-toggle"><span><span class="comparison-rank">${i+1}位</span>${mark} ${esc(h.no)} ${esc(h.name)}</span><span class="comparison-chevron">▼</span></button></td><td data-label="AI指数">${metric(h.score)}</td><td data-label="近走">${metric(h.speed)}</td><td data-label="上がり">${last}</td><td data-label="レース格">${grade}</td><td data-label="馬体重">${esc(bodyWeightText(h))}</td><td data-label="距離適性">${metric(h.distance)}</td><td data-label="コース適性">${metric(h.course)}</td><td data-label="単勝オッズ・人気">${esc(marketText(h))}</td><td data-label="1着率">${metric(h.winP)}%</td><td data-label="3着内率">${metric(h.place)}%</td></tr>`}).join('');
      rows.querySelectorAll('[data-v302-row]').forEach(tr=>{const b=tr.querySelector('.comparison-toggle');if(b)b.onclick=e=>{e.preventDefault();tr.classList.toggle('is-open')}});
    }
    patchEvidence();
  }

  function patchEvidence(){
    const box=el('evidence');if(!box)return;let s=box.innerHTML;
    const jra=Array.isArray(horses)?horses.filter(h=>(h.jra_history||[]).length).length:0;
    if(jra===0)s=s.replace(/騎手：[^<]*(?:JRA前4走|コンビ成績)[^<]*/g,'騎手：netkeiba過去走の騎乗情報を参考');
    const win=Object.keys(oddsCache?.win||{}).length,wide=Object.keys(oddsCache?.wide||{}).length,trio=Object.keys(oddsCache?.trio||{}).length;
    s=s.replace(/オッズ：単勝\s*\d+頭・ワイド\s*\d+点・3連複\s*\d+点反映/g,`オッズ：単勝 ${win}頭・ワイド ${wide}点・3連複 ${trio}点反映${win?'（単勝はJRA/netkeiba取得値）':''}`);
    box.innerHTML=s;
  }

  function mergeOddsFromRace(j){
    const hs=Array.isArray(j?.horses)?j.horses:[],active=(Array.isArray(horses)?horses:[]).filter(h=>!ACTIVE_BAD.test(String(h.status||h.result_status||'')));
    if(!oddsCache||typeof oddsCache!=='object')oddsCache={race_id:raceId(),win:{},wide:{},trio:{},fetched_at:null};
    if(!oddsCache.win)oddsCache.win={};let count=0;
    const byName=new Map(hs.map(h=>[norm(h.name),h]));
    for(const h of active){const x=hs.find(r=>+r.no===+h.no)||byName.get(norm(h.name));if(!x||!valid(x.odds))continue;h.odds=+x.odds;if(Number.isInteger(+x.popularity)&&+x.popularity>=1)h.popularity=+x.popularity;oddsCache.win[String(+h.no)]={odds:+x.odds,popularity:h.popularity||null,source:'netkeiba出馬表'};count++}
    if(count===active.length&&active.length){const sorted=active.slice().sort((a,b)=>+a.odds-+b.odds);sorted.forEach((h,i)=>{h.popularity=i+1;const v=oddsCache.win[String(+h.no)];if(v&&typeof v==='object')v.popularity=i+1})}
    oddsCache.race_id=raceId();oddsCache.fetched_at=new Date().toISOString();return count;
  }

  async function netkeibaWinFallback(){
    const rid=raceId();if(!rid)return 0;
    const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),9000);try{
      const r=await fetch(NK_RACE,{method:'POST',cache:'no-store',signal:ac.signal,headers:{'Content-Type':'application/json','Cache-Control':'no-cache'},body:JSON.stringify({url:`https://race.netkeiba.com/race/shutuba.html?race_id=${rid}`})});
      const j=await r.json().catch(()=>({}));if(!r.ok)return 0;return mergeOddsFromRace(j);
    }catch(e){console.warn('v302 odds fallback',e);return 0}finally{clearTimeout(timer)}
  }
  function currentWinCount(){return (Array.isArray(horses)?horses:[]).filter(h=>!ACTIVE_BAD.test(String(h.status||h.result_status||''))&&marketFor(h).odds).length}
  function wrapOdds(){
    try{const base=typeof oddsApi==='function'?oddsApi:null;if(!base||base.__v302)return;const fn=async function(opts={}){let out=null;try{out=await base.call(this,opts)}catch(e){console.warn('v302 official odds',e)}const n=(Array.isArray(horses)?horses:[]).filter(h=>!ACTIVE_BAD.test(String(h.status||h.result_status||''))).length;if(currentWinCount()<n)await netkeibaWinFallback();return oddsCache||out};fn.__v302=true;fn.__original=base;oddsApi=fn;window.oddsApi=fn}catch(e){console.warn('odds wrap v302',e)}
  }
  async function refreshMarketOnce(){const rid=raceId();if(!rid||marketBusy||rid===lastMarketRace&&currentWinCount()>0)return;marketBusy=true;try{if(typeof oddsApi==='function')await oddsApi({force:true});lastMarketRace=rid;if(Array.isArray(evaluated)&&evaluated.length){try{evalAll()}catch(_){try{renderAnalysis()}catch(__){}}}}finally{marketBusy=false}}

  function wrapRenderAnalysis(){try{const old=typeof renderAnalysis==='function'?renderAnalysis:null;if(!old||old.__v302)return;const fn=function(...args){const v=old.apply(this,args);restoreAnalysisUi();return v};fn.__v302=true;fn.__original=old;renderAnalysis=fn;window.renderAnalysis=fn}catch(e){console.warn('analysis render v302',e)}}
  function wrapRenderHorses(){try{const old=typeof renderHorses==='function'?renderHorses:null;if(!old||old.__v302)return;const fn=function(...args){purgeNonfinish();const v=old.apply(this,args);return v};fn.__v302=true;fn.__original=old;renderHorses=fn;window.renderHorses=fn}catch(e){console.warn('horse render v302',e)}}
  function wrapEval(){try{const old=typeof evalAll==='function'?evalAll:null;if(!old||old.__v302)return;const fn=function(...args){purgeNonfinish();return old.apply(this,args)};fn.__v302=true;fn.__original=old;evalAll=fn;window.evalAll=fn}catch(e){console.warn('eval v302',e)}}

  injectCss();purgeNonfinish();wrapOdds();wrapRenderHorses();wrapRenderAnalysis();wrapEval();
  try{if(typeof renderHorses==='function'&&Array.isArray(horses)&&horses.length)renderHorses()}catch(_){}
  addEventListener('keiba-data-updated',()=>{purgeNonfinish();setTimeout(()=>{try{renderHorses()}catch(_){};refreshMarketOnce()},0)});
  document.addEventListener('click',e=>{const t=e.target;if(t&&(t.id==='analyze'||t.id==='make'))setTimeout(()=>{restoreAnalysisUi();refreshMarketOnce()},50)},true);
  document.documentElement.dataset.analysisUi='v302';
})();
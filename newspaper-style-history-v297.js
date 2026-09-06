(()=>{
  if(window.__newspaperStyleHistoryV297)return;
  window.__newspaperStyleHistoryV297=true;
  const ENRICH='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/keiba-race-enrich-v1';
  const el=id=>document.getElementById(id);
  const norm=s=>String(s||'').normalize('NFKC').replace(/[\s　]+/g,'').trim();
  const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const status=(id,msg,err=false)=>{const x=el(id);if(x)x.innerHTML=`<div class="status ${err?'err':'ok'}">${esc(msg).replace(/\n/g,'<br>')}</div>`};
  const local={loading:false,controller:null};

  async function post(body,ms){
    const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),ms);
    try{
      const r=await fetch(ENRICH,{method:'POST',cache:'no-store',signal:ac.signal,headers:{'Content-Type':'application/json','Cache-Control':'no-cache'},body:JSON.stringify(body)});
      const j=await r.json().catch(()=>({error:`応答JSONを読めません (${r.status})`}));if(!r.ok)throw new Error(j.error||`通信エラー (${r.status})`);return j;
    }catch(e){if(ac.signal.aborted)throw new Error('通信が規定時間を超えたため中断しました。');throw e}finally{clearTimeout(timer)}
  }

  function newspaperStyle(h){return ['逃','先','差','追'].includes(h?.style)&&h?.style_source==='netkeiba競馬新聞'?h.style:''}
  function passageStyle(rows){
    const vals=(Array.isArray(rows)?rows:[]).filter(r=>Array.isArray(r?.passage)&&r.passage.length&&+r.passage[0]>0).map(r=>Math.max(1,+r.passage[0])/Math.max(2,+r.field_size||16));
    if(!vals.length)return'';vals.sort((a,b)=>a-b);const x=vals[Math.floor(vals.length/2)];return x<=.16?'逃':x<=.38?'先':x<=.72?'差':'追';
  }
  function styleOf(h){return newspaperStyle(h)||passageStyle(h?.history)||passageStyle(h?.jra_history)||(['逃','先','差','追'].includes(h?.style)?h.style:'')}

  function renderPace(){
    const box=el('paceReason');if(!box)return;
    if(!Array.isArray(horses)||!horses.length){box.innerHTML='出馬表取込後に自動判定します。';return}
    const styles=horses.map(styleOf),known=styles.filter(Boolean).length,news=horses.filter(h=>newspaperStyle(h)).length;
    if(known<Math.ceil(horses.length*.6)){
      raceMeta.autoPace='';box.innerHTML=`<b>適用ペース：判定待ち</b><br>脚質データ ${known}/${horses.length}頭（競馬新聞 ${news}頭）<br>netkeiba競馬新聞の脚質を優先し、6割以上そろってから自動判定します。`;return;
    }
    const e=styles.filter(x=>x==='逃').length,l=styles.filter(x=>x==='先').length,d=styles.filter(x=>x==='差').length,c=styles.filter(x=>x==='追').length;
    const auto=e>=2||e+l>=Math.max(5,Math.ceil(known*.5))?'ハイ':e===0&&l<=2?'スロー':'ミドル';
    const manual=el('pace')?.value||'自動',applied=manual==='自動'?auto:manual;raceMeta.autoPace=auto;
    horses.forEach((h,i)=>{if(styles[i])h.style=styles[i]});
    box.innerHTML=`<b>適用ペース：${applied}</b><br>逃げ ${e}頭 / 先行 ${l}頭 / 差し ${d}頭 / 追込 ${c}頭 / 不明 ${horses.length-known}頭<br>脚質ソース：netkeiba競馬新聞 ${news}/${horses.length}頭${news<known?`＋過去走通過順 ${known-news}頭`:''} → ${manual==='自動'?auto+'想定':'手動設定'}`;
  }
  try{renderPaceReason=renderPace;window.renderPaceReason=renderPace}catch(_){}

  function redraw(){try{if(typeof renderHorses==='function')renderHorses()}catch(_){};try{if(typeof evalAll==='function')evalAll()}catch(_){};renderPace()}
  function items(){return (Array.isArray(horses)?horses:[]).map(h=>({name:h.name,id:String(h.netkeiba_horse_id||h.horse_id||'')}))}
  function baseBody(mode){const url=String(el('raceUrl')?.value||raceMeta?.source_url||'');return{mode,race_id:raceMeta?.race_id||'',url,race_date:raceMeta?.race_date||raceMeta?.date||'',items:items()}}

  function merge(j,includeHistory){
    const rows=Array.isArray(j?.horses)?j.horses:[],byId=new Map(rows.map(r=>[String(r.id||r.netkeiba_horse_id||r.horse_id||''),r])),byName=new Map(rows.map(r=>[norm(r.name),r]));let histN=0,runs=0,ped=0,styles=0,news=0;
    horses=horses.map(h=>{
      const x=byId.get(String(h.netkeiba_horse_id||h.horse_id||''))||byName.get(norm(h.name));if(!x)return h;const z={...h};
      for(const k of ['sire','dam','damsire'])if(x[k])z[k]=x[k];
      if(['逃','先','差','追'].includes(x.style)){z.style=x.style;z.style_source=x.style_source||'netkeiba競馬新聞'}
      if(includeHistory){if(Array.isArray(x.history)&&x.history.length){z.history=x.history.slice(0,5);histN++;runs+=z.history.length;try{z.histScores=scoreLocalHistory(z.history);if(z.histScores)z.histScores.available=true}catch(_){z.histScores=null}}else{z.history=[];z.histScores=null}}
      if(z.sire&&z.dam&&z.damsire)ped++;if(styleOf(z))styles++;if(newspaperStyle(z))news++;return z;
    });
    const hc=el('histCount');if(hc){const ok=horses.filter(h=>(h.history||[]).length).length,total=horses.reduce((s,h)=>s+Math.min(5,(h.history||[]).length),0),jr=horses.filter(h=>(h.jra_history||[]).length).length;hc.textContent=`netkeiba ${ok}/${horses.length}頭・合計${total}走 / JRA照合 ${jr}頭`}
    redraw();return{histN,runs,ped,styles,news};
  }

  async function hydrateStyle(){
    if(!Array.isArray(horses)||!horses.length)return{news:0,styles:0};
    try{const j=await post(baseBody('style'),11000);return merge(j,false)}catch(e){console.warn('newspaper style v297',e);renderPace();return{news:0,styles:0,error:e?.message||String(e)}}
  }

  async function fullHistory(){
    const btn=el('importHist');if(local.loading){try{local.controller?.abort()}catch(_){};return}
    if(!Array.isArray(horses)||!horses.length){status('histStatus','先に出馬表を取り込んでください。',true);return}
    local.loading=true;if(btn){btn.disabled=true;btn.textContent='取得中…'};status('histStatus','過去5走を取得しています。脚質はnetkeiba競馬新聞を優先します。');
    try{
      const j=await post(baseBody('full'),24000),r=merge(j,true);
      const extra=[];if(j.newspaper_error)extra.push('競馬新聞:'+j.newspaper_error);if(j.history_api_error)extra.push('馬DB:'+j.history_api_error);if(j.fallback_error)extra.push('予備経路:'+j.fallback_error);
      status('histStatus',`過去走 ${r.histN}/${horses.length}頭・合計${r.runs}走 / 血統 ${r.ped}/${horses.length}頭 / 脚質 ${r.styles}/${horses.length}頭（競馬新聞 ${r.news}頭）を取得しました。${extra.length?'\n'+extra.join(' / '):''}`,r.histN===0);
    }catch(e){status('histStatus',e?.message||String(e),true)}finally{local.loading=false;if(btn){btn.disabled=false;btn.textContent='過去5走を再取得'}}
  }

  function replaceHist(){const old=el('importHist');if(!old)return;const b=old.cloneNode(true);old.replaceWith(b);b.disabled=false;b.textContent='過去5走を再取得';b.onclick=e=>{e.preventDefault();e.stopPropagation();fullHistory()}}
  function replaceRace(){
    const old=el('importRace');if(!old||!window.__keibaImportV296?.importRace)return;const b=old.cloneNode(true);old.replaceWith(b);b.disabled=false;b.textContent='出馬表取込';
    b.onclick=async e=>{e.preventDefault();e.stopPropagation();await window.__keibaImportV296.importRace();if(Array.isArray(horses)&&horses.length){status('raceStatus',`${horses.length}頭の出馬表を取得しました。\n血統は保存データから補完済み。netkeiba競馬新聞から脚質を取得しています。`);const r=await hydrateStyle();status('raceStatus',`${horses.length}頭の出馬表を取得しました。\n血統を保存データから補完。脚質は競馬新聞 ${r.news||0}/${horses.length}頭を取得しました。${r.news?' ペースへ反映済みです。':' 「過去5走を再取得」で再試行できます。'}`,false)}};
  }
  replaceRace();replaceHist();document.documentElement.dataset.importController='v297';
})();
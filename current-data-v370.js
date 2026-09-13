(()=>{
  if(window.__currentDataV370)return;
  window.__currentDataV370=true;

  const ENDPOINT='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/netkeiba-newspaper-v2';
  const VALID_STYLE=new Set(['逃','先','差','追']);
  const cache=new Map();
  let loadingKey='',timer=0;

  const el=id=>document.getElementById(id);
  const norm=s=>String(s||'').normalize('NFKC').replace(/[\s　]+/g,'').trim();
  const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const validStyle=s=>VALID_STYLE.has(String(s||''))?String(s):'';
  const cleanJockey=s=>String(s||'').normalize('NFKC').replace(/^替/,'').replace(/\s+(?:[4-6]\d)(?:\.\d)?\s*$/,'').trim();
  const horseList=()=>{try{return Array.isArray(horses)?horses:[]}catch(_){return[]}};

  function raceId(){
    try{const x=String(raceMeta?.race_id||'');if(/^20\d{10}$/.test(x))return x}catch(_){}
    const u=String(el('raceUrl')?.value||'');
    try{if(typeof raceIdFromUrl==='function'){const x=String(raceIdFromUrl(u)||'');if(/^20\d{10}$/.test(x))return x}}catch(_){}
    let m=u.match(/(?:race_id[=:_-]*|\/race\/)(20\d{10})/i)||u.match(/\b(20\d{10})\b/);if(m)return m[1];
    m=u.match(/sw01ddd(?:10|01)?(\d{2})(20\d{2})(\d{2})(\d{2})(\d{2})/i);return m?`${m[2]}${m[1]}${m[3]}${m[4]}${m[5]}`:'';
  }
  function key(){return raceId()+'|'+horseList().map(h=>`${+h.no||0}:${norm(h.name)}`).join('|')}

  function normalizeQuality(base){
    const q=base&&typeof base==='object'?{...base}:{};
    q.score=Number.isFinite(+q.score)?Math.max(0,Math.min(100,+q.score)):0;
    q.label=String(q.label|| (q.score===100?'完全':q.score?'一部取得':'未取得'));
    q.issues=(Array.isArray(q.issues)?q.issues:[]).map(x=>({
      ...(x&&typeof x==='object'?x:{}),
      date:String(x?.date||''),
      missing:Array.isArray(x?.missing)?x.missing.map(String):[]
    }));
    return q;
  }
  function dateKey(v){const m=String(v||'').normalize('NFKC').replace(/[年月]/g,'-').replace(/日/g,'').match(/(20\d{2})[\/.-](\d{1,2})[\/.-](\d{1,2})/);return m?+m[1]*10000+(+m[2])*100+(+m[3]):99999999}
  function careerComplete(h){
    const rows=(Array.isArray(h?.history)?h.history:[]).filter(r=>r&&!/取消|除外|中止|失格/.test(String(r.status||r.rank_text||''))&&Number.isFinite(+r.rank)&&+r.rank>0).slice(0,5);
    if(rows.length>=5)return true;if(!rows.length)return false;
    const earliest=rows.slice().sort((a,b)=>dateKey(a.date)-dateKey(b.date))[0];
    return /新馬/.test([earliest?.grade,earliest?.race_grade,earliest?.class_name,earliest?.race_class,earliest?.class,earliest?.race_name,earliest?.raceName,earliest?.title,earliest?.race].filter(Boolean).join(' '));
  }
  function installQualityGuard(){
    let base=null;try{base=typeof dataQuality==='function'?dataQuality:null}catch(_){}
    if(!base||base.__currentDataV370)return;
    const fn=function(h){
      let q;try{q=normalizeQuality(base(h))}catch(_){q=normalizeQuality(null)}
      if(careerComplete(h)){
        q.issues=q.issues.filter(x=>x.date!=='0000/履歴'&&!x.missing.some(v=>/\/5走/.test(v)));
        if(!q.issues.length){q.score=100;q.label='完全'}
      }
      return q;
    };
    fn.__currentDataV370=true;fn.__original=base;
    try{dataQuality=fn}catch(_){};try{window.dataQuality=fn}catch(_){}
  }

  function currentRowFor(h){return cache.get(norm(h?.name))||null}
  function styleFor(h){
    const row=currentRowFor(h),s=validStyle(row?.style);
    if(s)return s;
    if(validStyle(h?.style)&&/netkeiba/.test(String(h?.style_source||'')))return validStyle(h.style);
    return '';
  }
  function applyCurrentData(){
    const hs=horseList();
    for(const h of hs){
      const x=currentRowFor(h);
      if(x){
        const id=String(x.netkeiba_horse_id||x.horse_id||'').trim();if(id){h.netkeiba_horse_id=id;h.horse_id=id}
        const sa=String(x.sex_age||'').replace(/\s+/g,'');if(/^[牡牝セ騙]\d+$/.test(sa)){h.sex_age=sa;h.sex=sa[0];h.age=+sa.slice(1)}
        const j=cleanJockey(x.jockey);if(j){h.jockey=j;h.rider=j}
        if(Number.isFinite(+x.carried_weight)&&+x.carried_weight>=40&&+x.carried_weight<=70)h.carried_weight=+x.carried_weight;
        if(Number.isFinite(+x.body_weight)&&+x.body_weight>=300&&+x.body_weight<=700){h.body_weight=+x.body_weight;h.weight=+x.body_weight}
        for(const k of ['sire','dam','damsire'])if(String(x[k]||'').trim())h[k]=String(x[k]).trim();
      }
      const s=styleFor(h);h.style=s;h.style_source=s?'netkeiba競馬新聞':'';if(s)h.netkeiba_style=s;else delete h.netkeiba_style;
    }
  }

  function renderPace(){
    const box=el('paceReason'),hs=horseList();if(!box)return;
    if(!hs.length){box.innerHTML='出馬表取込後に自動判定します。';return}
    const styles=hs.map(styleFor),known=styles.filter(Boolean).length;
    const escN=styles.filter(x=>x==='逃').length,lead=styles.filter(x=>x==='先').length,diff=styles.filter(x=>x==='差').length,clos=styles.filter(x=>x==='追').length;
    const manual=String(el('pace')?.value||'自動');
    if(known<Math.ceil(hs.length*.6)){
      try{raceMeta.autoPace=''}catch(_){}
      box.innerHTML=`<b>適用ペース：${manual==='自動'?'判定待ち':esc(manual)}</b><br>netkeiba脚質 ${known}/${hs.length}頭（逃げ ${escN} / 先行 ${lead} / 差し ${diff} / 追込 ${clos} / 不明 ${hs.length-known}）<br>${manual==='自動'?'netkeiba競馬新聞の脚質が6割以上そろってから自動判定します。':'手動設定をAI分析へ反映'}`;
      return;
    }
    const auto=escN>=2||escN+lead>=Math.max(5,Math.ceil(known*.5))?'ハイ':escN===0&&lead<=2?'スロー':'ミドル';
    try{raceMeta.autoPace=auto}catch(_){}
    const applied=manual==='自動'?auto:manual;
    box.innerHTML=`<b>適用ペース：${esc(applied)}</b><br>逃げ ${escN}頭 / 先行 ${lead}頭 / 差し ${diff}頭 / 追込 ${clos}頭 / 不明 ${hs.length-known}頭<br>${manual==='自動'?`netkeiba競馬新聞の脚質をそのまま使用 → ${auto}想定`:'手動設定をAI分析へ反映'}`;
  }

  function bodyText(h){
    const w=Number.isFinite(+h?.body_weight)&&+h.body_weight>=300?Math.round(+h.body_weight):(Number.isFinite(+h?.weight)&&+h.weight>=300?Math.round(+h.weight):null);
    return w?`馬体重 ${w}kg`:'馬体重 未発表';
  }
  function patchCards(){
    const hs=horseList(),root=el('horses');if(!root)return;
    const byName=new Map(hs.map(h=>[norm(h.name),h]));
    for(const card of root.querySelectorAll(':scope > .card')){
      const title=card.querySelector('.rank');const name=String(title?.textContent||'').replace(/^\s*\d+\s*/,'').trim();const h=byName.get(norm(name));if(!h)continue;
      const smalls=[...card.querySelectorAll('.small')];
      if(smalls[0])smalls[0].textContent=[h.sex_age||'',bodyText(h),cleanJockey(h.jockey||h.rider||''),Number.isFinite(+h.carried_weight)?`斤量 ${(+h.carried_weight).toFixed(1)}kg`:'' ].filter(Boolean).join('　');
      const styleLine=smalls.find(x=>/^(脚質推定：|脚質：)/.test(String(x.textContent||'')));
      const s=styleFor(h);if(styleLine)styleLine.textContent=`脚質：${s||'—'}${s?'（netkeiba）':'（netkeiba未取得）'}　父：${h.sire||'—'}　母：${h.dam||'—'}　母父：${h.damsire||'—'}`;
    }
  }

  function installFunctionGuards(){
    installQualityGuard();
    try{window.inferStyleFromJra=h=>styleFor(h);inferStyleFromJra=h=>styleFor(h)}catch(_){}
    try{window.renderPaceReason=renderPace;renderPaceReason=renderPace}catch(_){}
  }
  function renderOnce(){
    installFunctionGuards();applyCurrentData();
    try{if(typeof renderHorses==='function')renderHorses()}catch(e){console.warn('render horses v370',e)}
    patchCards();renderPace();
  }

  async function load(force=false){
    installFunctionGuards();
    const hs=horseList(),rid=raceId(),k=key();if(!rid||!hs.length)return false;
    if(!force&&cache.size&&document.documentElement.dataset.currentDataRace===rid){renderOnce();return true}
    if(loadingKey===k)return false;loadingKey=k;
    const ac=new AbortController(),to=setTimeout(()=>{try{ac.abort()}catch(_){}},15000);
    try{
      const r=await fetch(ENDPOINT,{method:'POST',cache:'no-store',signal:ac.signal,headers:{'Content-Type':'application/json','Cache-Control':'no-cache'},body:JSON.stringify({race_id:rid,url:`https://race.sp.netkeiba.com/race/shutuba.html?race_id=${rid}`})});
      const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j?.error||`HTTP ${r.status}`);
      cache.clear();for(const x of (Array.isArray(j?.horses)?j.horses:[])){const n=norm(x?.name);if(n)cache.set(n,x)}
      document.documentElement.dataset.currentDataRace=rid;
      document.documentElement.dataset.netkeibaStyle=`${hs.filter(h=>validStyle(cache.get(norm(h.name))?.style)).length}/${hs.length}`;
      renderOnce();
      const st=el('raceStatus');if(st){const n=hs.filter(h=>!!currentRowFor(h)).length,s=hs.filter(h=>!!styleFor(h)).length;st.innerHTML=`<div class="status ok">${hs.length}頭の出馬表を取得しました。<br>netkeiba現在情報 ${n}/${hs.length}頭・脚質 ${s}/${hs.length}頭を照合済みです。</div>`}
      return true;
    }catch(e){console.warn('current data v370',e);renderOnce();return false}
    finally{clearTimeout(to);if(loadingKey===k)loadingKey=''}
  }
  function schedule(force=false,delay=120){clearTimeout(timer);timer=setTimeout(()=>load(force),delay)}

  function start(){installFunctionGuards();schedule(false,160);const p=el('pace');if(p&&!p.dataset.currentDataV370){p.dataset.currentDataV370='1';p.addEventListener('change',()=>{applyCurrentData();renderPace()})}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  addEventListener('keiba-patches-ready',()=>schedule(false,100));
  addEventListener('keiba-data-updated',()=>schedule(false,140));
  addEventListener('pageshow',()=>schedule(false,180));
})();

(()=>{
  if(window.__dataAuthorityV369)return;
  window.__dataAuthorityV369=true;

  const BASE='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/';
  const RACE_ENDPOINT=BASE+'netkeiba-race-import';
  const NEWS_ENDPOINT=BASE+'netkeiba-newspaper-v2';
  const ENRICH_ENDPOINT=BASE+'keiba-race-enrich-v1';
  const VALID_STYLE=new Set(['逃','先','差','追']);
  const rosterByName=new Map();
  const rosterById=new Map();
  const styleByName=new Map();
  const styleById=new Map();
  let authorityKey='';
  let authorityPromise=null;
  let histLoading=false;
  let histController=null;
  let domGuard=false;
  let scheduleTimer=0;

  const el=id=>document.getElementById(id);
  const norm=s=>String(s||'').normalize('NFKC').replace(/[\s　]+/g,'').trim();
  const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const validStyle=s=>VALID_STYLE.has(String(s||''))?String(s):'';
  const cleanJockey=s=>String(s||'').normalize('NFKC').replace(/\s+(?:[4-6]\d)(?:\.\d)?\s*$/,'').replace(/^替/,'').trim();
  const horseList=()=>{try{return Array.isArray(horses)?horses:[]}catch(_){return[]}};
  const currentUrl=()=>String(el('raceUrl')?.value||'');

  function raceId(){
    try{const x=String(raceMeta?.race_id||'');if(/^20\d{10}$/.test(x))return x}catch(_){}
    const url=currentUrl();
    try{if(typeof raceIdFromUrl==='function'){const x=String(raceIdFromUrl(url)||'');if(/^20\d{10}$/.test(x))return x}}catch(_){}
    let m=url.match(/(?:race_id[=:_-]*|\/race\/)(20\d{10})/i)||url.match(/\b(20\d{10})\b/);if(m)return m[1];
    m=url.match(/sw01ddd(?:10|01)?(\d{2})(20\d{2})(\d{2})(\d{2})(\d{2})/i);if(m)return `${m[2]}${m[1]}${m[3]}${m[4]}${m[5]}`;
    return'';
  }
  function horseId(h){return String(h?.netkeiba_horse_id||h?.horse_id||'').trim()}
  function currentKey(){const hs=horseList();return raceId()+'|'+hs.map(h=>`${+h.no||0}:${norm(h.name)}`).join('|')}

  async function postJson(url,body,timeoutMs,controller){
    const ac=controller||new AbortController();
    const timer=setTimeout(()=>{try{ac.abort('timeout')}catch(_){}},timeoutMs);
    try{
      const r=await fetch(url,{method:'POST',cache:'no-store',signal:ac.signal,headers:{'Content-Type':'application/json','Cache-Control':'no-cache'},body:JSON.stringify(body)});
      const j=await r.json().catch(()=>({error:`応答JSONを読めません (${r.status})`}));
      if(!r.ok)throw new Error(j?.error||`通信エラー (${r.status})`);
      return j;
    }finally{clearTimeout(timer)}
  }

  function rememberRow(row){
    if(!row)return;
    const name=norm(row.name),id=String(row.netkeiba_horse_id||row.horse_id||row.id||'').trim();
    if(name)rosterByName.set(name,row);if(id)rosterById.set(id,row);
    const s=validStyle(row.style);
    if(s&&/netkeiba/.test(String(row.style_source||row.source||''))){if(name)styleByName.set(name,s);if(id)styleById.set(id,s)}
  }
  function styleFor(h){
    const id=horseId(h),name=norm(h?.name);
    return (id&&styleById.get(id))||styleByName.get(name)||(validStyle(h?.style)&&/netkeiba/.test(String(h?.style_source||''))?validStyle(h.style):'')||'';
  }
  function rosterFor(h){const id=horseId(h),name=norm(h?.name);return(id&&rosterById.get(id))||rosterByName.get(name)||null}

  function applyAuthorityToData(){
    const hs=horseList();
    for(const h of hs){
      const r=rosterFor(h);
      if(r){
        const id=String(r.netkeiba_horse_id||r.horse_id||r.id||'').trim();if(id){h.netkeiba_horse_id=id;h.horse_id=id}
        const sa=String(r.sex_age||'').replace(/\s+/g,'');if(/^[牡牝セ騙]\d+$/.test(sa)){h.sex_age=sa;h.sex=sa[0];h.age=+sa.slice(1)}
        const j=cleanJockey(r.jockey);if(j){h.jockey=j;h.rider=j}
        if(Number.isFinite(+r.carried_weight)&&+r.carried_weight>=40&&+r.carried_weight<=70){h.carried_weight=+r.carried_weight}
        if(Number.isFinite(+r.body_weight)&&+r.body_weight>=300&&+r.body_weight<=700){h.body_weight=+r.body_weight;h.weight=+r.body_weight}
        if(Number.isFinite(+r.body_weight_change)&&Math.abs(+r.body_weight_change)<=100)h.body_weight_change=+r.body_weight_change;
        for(const k of ['sire','dam','damsire'])if(r[k])h[k]=r[k];
      }
      const s=styleFor(h);
      h.style=s;
      h.style_source=s?'netkeiba競馬新聞':'';
      if(s)h.netkeiba_style=s;else delete h.netkeiba_style;
    }
    return hs;
  }

  function paceHtml(){
    const hs=horseList();if(!hs.length)return'出馬表取込後に自動判定します。';
    const styles=hs.map(styleFor),known=styles.filter(Boolean).length;
    const escN=styles.filter(x=>x==='逃').length,lead=styles.filter(x=>x==='先').length,diff=styles.filter(x=>x==='差').length,clos=styles.filter(x=>x==='追').length;
    const manual=String(el('pace')?.value||'自動');
    if(known<Math.ceil(hs.length*.6)){
      try{raceMeta.autoPace=''}catch(_){}
      return `<b>適用ペース：${manual==='自動'?'判定待ち':esc(manual)}</b><br>netkeiba脚質 ${known}/${hs.length}頭（逃げ ${escN} / 先行 ${lead} / 差し ${diff} / 追込 ${clos} / 不明 ${hs.length-known}）<br>${manual==='自動'?'netkeiba競馬新聞の脚質が6割以上そろってから自動判定します。':'手動設定をAI分析へ反映'}`;
    }
    const auto=escN>=2||escN+lead>=Math.max(5,Math.ceil(known*.5))?'ハイ':escN===0&&lead<=2?'スロー':'ミドル';
    try{raceMeta.autoPace=auto}catch(_){}
    const applied=manual==='自動'?auto:manual;
    return `<b>適用ペース：${esc(applied)}</b><br>逃げ ${escN}頭 / 先行 ${lead}頭 / 差し ${diff}頭 / 追込 ${clos}頭 / 不明 ${hs.length-known}頭<br>${manual==='自動'?`netkeiba競馬新聞の脚質をそのまま使用 → ${auto}想定`:'手動設定をAI分析へ反映'}`;
  }
  function renderPace(){const box=el('paceReason');if(!box)return;const html=paceHtml();if(box.innerHTML!==html)box.innerHTML=html}

  function bodyText(h){
    const w=Number.isFinite(+h?.body_weight)&&+h.body_weight>=300?Math.round(+h.body_weight):(Number.isFinite(+h?.weight)&&+h.weight>=300?Math.round(+h.weight):null);
    if(!w)return'馬体重 未発表';
    const ch=Number.isFinite(+h?.body_weight_change)&&Math.abs(+h.body_weight_change)<=100?+h.body_weight_change:null;
    return ch==null?`馬体重 ${w}kg`:`馬体重 ${w}kg（前走比 ${ch>=0?'+':''}${ch}kg）`;
  }
  function setText(node,text){if(node&&node.textContent!==text)node.textContent=text}
  function patchCards(){
    if(domGuard)return;domGuard=true;
    try{
      const hs=horseList(),root=el('horses');if(!root)return;
      const cards=[...root.querySelectorAll(':scope > .card')];
      cards.forEach((card,i)=>{
        const h=hs[i];if(!h)return;
        const smalls=[...card.querySelectorAll('.small')];
        const meta=smalls[0];
        const metaText=[h.sex_age||'',bodyText(h),cleanJockey(h.jockey||h.rider||''),Number.isFinite(+h.carried_weight)?`斤量 ${(+h.carried_weight).toFixed(1)}kg`:'' ].filter(Boolean).join('　');
        setText(meta,metaText);
        const styleLine=smalls.find(x=>/^(脚質推定：|脚質：)/.test(String(x.textContent||'')));
        const s=styleFor(h);
        if(styleLine)setText(styleLine,`脚質：${s||'—'}${s?'（netkeiba）':'（netkeiba未取得）'}　父：${h.sire||'—'}　母：${h.dam||'—'}　母父：${h.damsire||'—'}`);
        if(histLoading){
          const badges=[...card.querySelectorAll('.badge')];
          const src=badges.find(x=>/未取得|netkeiba|JRA/.test(String(x.textContent||'')));if(src)setText(src,'取得中');
          const qb=badges.find(x=>/品質/.test(String(x.textContent||'')));if(qb)setText(qb,'品質 取得中');
          const main=smalls.find(x=>/主データ：/.test(String(x.textContent||'')));if(main)setText(main,'主データ：netkeiba取得中');
          const qbox=[...card.querySelectorAll('.status')].find(x=>/データ品質/.test(String(x.textContent||'')));if(qbox){const t='<b>データ取得中</b><br><span class="small">netkeibaの過去走を取得しています。</span>';if(qbox.innerHTML!==t)qbox.innerHTML=t}
        }
      });
    }finally{domGuard=false}
  }
  function updateHistCount(){
    const hs=horseList(),node=el('histCount');if(!node)return;
    const ok=hs.filter(h=>Array.isArray(h.history)&&h.history.length).length;
    const runs=hs.reduce((s,h)=>s+Math.min(5,Array.isArray(h.history)?h.history.length:0),0);
    const jr=hs.filter(h=>Array.isArray(h.jra_history)&&h.jra_history.length).length;
    const text=`netkeiba ${ok}/${hs.length}頭・合計${runs}走 / JRA照合 ${jr}頭`;
    if(node.textContent!==text)node.textContent=text;
  }

  async function loadAuthority(force=false){
    const hs=horseList(),rid=raceId(),key=currentKey();if(!rid||!hs.length)return false;
    if(!force&&authorityKey===key){applyAuthorityToData();renderPace();patchCards();return true}
    if(authorityPromise)return authorityPromise;
    const nkUrl=`https://race.netkeiba.com/race/shutuba.html?race_id=${rid}`;
    authorityPromise=(async()=>{
      const [raceRes,newsRes]=await Promise.allSettled([
        postJson(RACE_ENDPOINT,{url:nkUrl},12000),
        postJson(NEWS_ENDPOINT,{race_id:rid,url:nkUrl},14000)
      ]);
      if(raceRes.status==='fulfilled')for(const row of (raceRes.value?.horses||[]))rememberRow({...row,source:'netkeiba出馬表'});
      if(newsRes.status==='fulfilled')for(const row of (newsRes.value?.horses||[]))rememberRow({...row,style_source:validStyle(row?.style)?'netkeiba競馬新聞':'',source:'netkeiba競馬新聞'});
      if(raceRes.status==='rejected'&&newsRes.status==='rejected')throw raceRes.reason||newsRes.reason||new Error('netkeiba現在データを取得できません');
      authorityKey=key;
      applyAuthorityToData();
      try{if(typeof renderHorses==='function')renderHorses()}catch(_){}
      try{if(typeof evaluated!=='undefined'&&Array.isArray(evaluated)&&evaluated.length&&typeof evalAll==='function')evalAll()}catch(_){}
      renderPace();patchCards();
      document.documentElement.dataset.dataAuthority=`${hs.filter(h=>!!rosterFor(h)).length}/${hs.length}`;
      document.documentElement.dataset.netkeibaStyle=`${hs.filter(h=>!!styleFor(h)).length}/${hs.length}`;
      return true;
    })().catch(e=>{console.warn('data authority v369',e);applyAuthorityToData();renderPace();patchCards();return false}).finally(()=>{authorityPromise=null});
    return authorityPromise;
  }

  function completedHistory(h){
    return (Array.isArray(h?.history)?h.history:[]).filter(r=>r&&!/取消|除外|中止|失格/.test(String(r.status||r.rank_text||''))&&Number.isFinite(+r.rank)&&+r.rank>0).slice(0,5);
  }
  function dateKey(v){const m=String(v||'').normalize('NFKC').replace(/[年月]/g,'-').replace(/日/g,'').match(/(20\d{2})[\/.-](\d{1,2})[\/.-](\d{1,2})/);return m?+m[1]*10000+(+m[2])*100+(+m[3]):99999999}
  function debutRun(r){return /新馬/.test([r?.grade,r?.race_grade,r?.class_name,r?.race_class,r?.class,r?.race_name,r?.raceName,r?.title,r?.race].filter(Boolean).join(' '))}
  function careerComplete(h){const rows=completedHistory(h);if(rows.length>=5)return true;if(!rows.length)return false;const earliest=rows.slice().sort((a,b)=>dateKey(a.date)-dateKey(b.date))[0];return debutRun(earliest)}

  function installQuality(){
    try{
      const base=typeof dataQuality==='function'?dataQuality:null;if(!base||base.__dataAuthorityV369)return;
      const raw=typeof base.__original==='function'?base.__original:base;
      const fn=function(h){
        let q;try{q=base(h)}catch(_){q={score:0,label:'未取得',issues:[]}}
        if(!careerComplete(h))return q;
        let r;try{r=raw(h)}catch(_){r=q}
        r=r&&typeof r==='object'?{...r}:{...q};
        r.issues=(Array.isArray(r.issues)?r.issues:[]).filter(x=>String(x?.date||'')!=='0000/履歴'&&!String((x?.missing||[]).join(' ')).includes('/5走'));
        const n=completedHistory(h).length;r.history_count=n;r.history_target=n;r.career_complete=true;
        if(!r.issues.length){r.label='完全';r.score=100}
        return r;
      };
      fn.__dataAuthorityV369=true;fn.__original=raw;
      try{dataQuality=fn}catch(_){};try{window.dataQuality=fn}catch(_){}
    }catch(e){console.warn('quality v369',e)}
  }

  function installWrappers(){
    installQuality();
    try{
      const old=window.renderHorses;
      if(typeof old==='function'&&!old.__dataAuthorityV369){
        const fn=function(...args){applyAuthorityToData();const out=old.apply(this,args);patchCards();return out};fn.__dataAuthorityV369=true;fn.__original=old;window.renderHorses=fn;try{renderHorses=fn}catch(_){}
      }
    }catch(_){}
    try{
      const old=window.evalAll;
      if(typeof old==='function'&&!old.__dataAuthorityV369){
        const fn=function(...args){applyAuthorityToData();const out=old.apply(this,args);applyAuthorityToData();renderPace();patchCards();return out};fn.__dataAuthorityV369=true;fn.__original=old;window.evalAll=fn;try{evalAll=fn}catch(_){}
      }
    }catch(_){}
    try{window.inferStyleFromJra=h=>styleFor(h);inferStyleFromJra=h=>styleFor(h)}catch(_){}
    try{window.renderPaceReason=renderPace;renderPaceReason=renderPace}catch(_){}
  }

  function mergeHistoryPayload(j){
    const rows=Array.isArray(j?.horses)?j.horses:[];
    for(const x of rows)rememberRow(x);
    const byId=new Map(rows.map(x=>[String(x.netkeiba_horse_id||x.horse_id||x.id||''),x]));
    const byName=new Map(rows.map(x=>[norm(x.name),x]));
    let ok=0,runs=0,ped=0;
    for(const h of horseList()){
      const x=byId.get(horseId(h))||byName.get(norm(h.name));if(!x)continue;
      const id=String(x.netkeiba_horse_id||x.horse_id||x.id||'').trim();if(id){h.netkeiba_horse_id=id;h.horse_id=id}
      if(Array.isArray(x.history)&&x.history.length){h.history=x.history.slice(0,5);ok++;runs+=h.history.length;try{h.histScores=scoreLocalHistory(h.history);if(h.histScores)h.histScores.available=true}catch(_){h.histScores=null}}
      for(const k of ['sire','dam','damsire'])if(x[k])h[k]=x[k];
      const s=validStyle(x.style);if(s&&/netkeiba/.test(String(x.style_source||''))){h.style=s;h.style_source='netkeiba競馬新聞';styleByName.set(norm(h.name),s);if(id)styleById.set(id,s)}
      if(h.sire&&h.dam&&h.damsire)ped++;
    }
    applyAuthorityToData();updateHistCount();return{ok,runs,ped,styles:horseList().filter(h=>!!styleFor(h)).length}
  }

  async function robustHistory(){
    const btn=el('importHist');
    if(histLoading){try{histController?.abort('user')}catch(_){};return}
    const hs=horseList();if(!hs.length){const s=el('histStatus');if(s)s.innerHTML='<div class="status err">先に出馬表を取り込んでください。</div>';return}
    histLoading=true;histController=new AbortController();if(btn){btn.disabled=false;btn.textContent='取得中（押すと中断）'};
    const status=el('histStatus');if(status)status.innerHTML='<div class="status ok">netkeiba馬IDで過去走を取得しています。若い馬は「実際の全出走分」を取得します。</div>';
    patchCards();
    try{
      loadAuthority(false).catch(()=>{});
      const rid=raceId(),items=hs.map(h=>({name:h.name,id:horseId(h)}));
      const j=await postJson(ENRICH_ENDPOINT,{race_id:rid,url:currentUrl(),race_date:(typeof raceMeta!=='undefined'&&(raceMeta?.race_date||raceMeta?.date))||'',items},45000,histController);
      const r=mergeHistoryPayload(j);
      installWrappers();
      try{if(typeof renderHorses==='function')renderHorses()}catch(_){}
      try{if(typeof evalAll==='function')evalAll()}catch(_){}
      renderPace();patchCards();
      const extra=j?.history_api_error?`<br>履歴API: ${esc(j.history_api_error)}`:'';
      if(status)status.innerHTML=`<div class="status ${r.ok?'ok':'err'}">過去走 ${r.ok}/${hs.length}頭・合計${r.runs}走 / 血統 ${r.ped}/${hs.length}頭 / netkeiba脚質 ${r.styles}/${hs.length}頭 を取得しました。${extra}</div>`;
    }catch(e){
      const aborted=histController?.signal?.aborted;
      const msg=aborted&&histController?.signal?.reason==='user'?'中断しました。':(e?.name==='AbortError'?'通信が規定時間を超えたため中断しました。':String(e?.message||e));
      if(status)status.innerHTML=`<div class="status err">${esc(msg)}</div>`;
    }finally{
      histLoading=false;histController=null;if(btn){btn.disabled=false;btn.textContent='過去5走を再取得'};
      try{if(typeof renderHorses==='function')renderHorses()}catch(_){}applyAuthorityToData();renderPace();patchCards();updateHistCount();
    }
  }

  function replaceHistoryButton(){
    const old=el('importHist');if(!old||old.dataset.dataAuthorityV369)return;
    const neu=old.cloneNode(true);old.replaceWith(neu);neu.dataset.dataAuthorityV369='1';neu.disabled=false;neu.textContent='過去5走を再取得';neu.onclick=e=>{e.preventDefault();e.stopPropagation();robustHistory()};
  }
  function schedule(force=false,delay=80){clearTimeout(scheduleTimer);scheduleTimer=setTimeout(()=>{installWrappers();replaceHistoryButton();loadAuthority(force).catch(()=>{})},delay)}

  function observe(){
    const root=el('horses');if(root){new MutationObserver(()=>{if(!domGuard)setTimeout(()=>{applyAuthorityToData();patchCards()},0)}).observe(root,{childList:true,subtree:true,characterData:true})}
    const pace=el('paceReason');if(pace){new MutationObserver(()=>{if(!domGuard)setTimeout(renderPace,0)}).observe(pace,{childList:true,subtree:true,characterData:true})}
    const input=el('pace');if(input)input.addEventListener('change',()=>setTimeout(renderPace,0));
  }
  function start(){installWrappers();replaceHistoryButton();observe();schedule(false,60);let n=0,last='';const timer=setInterval(()=>{n++;installWrappers();replaceHistoryButton();const k=currentKey();if(k&&k!==last){last=k;schedule(true,20)}else{applyAuthorityToData();renderPace();patchCards()}if(n>=40)clearInterval(timer)},500)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  addEventListener('keiba-patches-ready',()=>schedule(true,40));
  addEventListener('keiba-data-updated',()=>schedule(false,60));
  addEventListener('pageshow',()=>schedule(false,60));
})();

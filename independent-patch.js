(()=>{
  const NETKEIBA_RACE_IMPORT='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/netkeiba-race-import';
  const MEMORY_API_URL='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/keiba-memory-v55';
  const NK_FALLBACK_API='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/keiba-netkeiba-fallback';
  const wait=()=>{
    if(typeof jraImport!=='function'||typeof loadNetkeibaHistories!=='function'||!document.getElementById('raceUrl')){setTimeout(wait,60);return;}
    if(window.__independentPatchApplied)return;
    window.__independentPatchApplied=true;

    function memoryRunToHistory(r){
      if(!r)return null;
      const passage=Array.isArray(r.passage)?r.passage:String(r.corners||'').split('-').map(Number).filter(Number.isFinite);
      return {date:r.date||'',venue:r.venue||r.course||'',surface:r.surface||'',distance:+(r.distance??r.dist)||0,going:r.going||'',rank:+(r.rank??r.pos)||0,last3f:Number.isFinite(+(r.last3f??r.last3))?+(r.last3f??r.last3):null,jockey:r.jockey||'',passage,field_size:+(r.field_size||0)||null,source:r.source||'netkeiba-memory'};
    }
    function currentRaceDate(){
      const s=String(document.getElementById('raceUrl')?.value||'');
      const ms=s.match(/20\d{6}/g)||[]; return ms.length?+ms[ms.length-1]:null;
    }
    function applyHistoryToHorse(h,rows,via='memory'){
      const cutoff=currentRaceDate();
      const clean=(rows||[]).map(memoryRunToHistory).filter(Boolean).filter(x=>x.rank&&x.distance).filter(x=>{
        if(!cutoff)return true; const m=String(x.date||'').match(/(20\d{2})[\/.-](\d{1,2})[\/.-](\d{1,2})/); if(!m)return true;
        return (+m[1]*10000+(+m[2])*100+(+m[3]))<cutoff;
      });
      const uniq=[],seen=new Set();
      for(const x of clean.sort((a,b)=>String(b.date).localeCompare(String(a.date)))){
        const k=[x.date,x.venue,x.surface,x.distance,x.rank].join('|'); if(seen.has(k))continue; seen.add(k); uniq.push(x); if(uniq.length>=5)break;
      }
      if(!uniq.length)return false;
      h.history=uniq; h.histScores=scoreLocalHistory(h.history); h.histScores.available=true; h.netkeibaVia=via; h.netkeibaRejected=false; h.netkeibaError=''; mergeNetkeibaWithJra(h); return true;
    }
    function inferStyle(h){
      const rows=(h.history||[]).filter(r=>Array.isArray(r.passage)&&r.passage.length&&r.passage[0]>0);
      if(!rows.length)return ['逃','先','差','追'].includes(h.style)?h.style:'';
      const vals=rows.map(r=>{const fs=+r.field_size||18;return Math.max(1,+r.passage[0])/fs}).sort((a,b)=>a-b);
      const x=vals[Math.floor(vals.length/2)];
      return x<=0.14?'逃':x<=0.36?'先':x<=0.72?'差':'追';
    }
    function preentry(){return !!window.__preentryMode||/netkeiba\.com/i.test(String(document.getElementById('raceUrl')?.value||''))}
    function replaceHtml(el){
      if(!el||!preentry())return;
      let s=el.innerHTML;
      s=s.replace(/JRA実データ/g,'コース基礎データ');
      s=s.replace(/騎手相性\s*：\s*JRA前4走コンビ成績を反映/g,'騎手相性：netkeiba過去走の騎乗情報を参考');
      s=s.replace(/騎手\s*：\s*現騎手×当馬のJRA前4走コンビ成績を反映/g,'騎手：netkeiba過去走の騎乗情報を参考（JRA出馬表確定後に照合）');
      s=s.replace(/実オッズ\s*：\s*単勝\s*\d+\/\d+頭\s*・\s*3連複\s*\d+点/g,'予想オッズ：netkeiba掲載値を使用（JRA実オッズ未反映）');
      s=s.replace(/オッズ\s*：\s*単勝\s*\d+頭\s*・\s*ワイド\s*\d+点\s*・\s*3連複\s*\d+点反映/g,'オッズ：netkeiba予想オッズを参考（JRA実オッズ未反映）');
      s=s.replace(/単勝\s*([0-9.]+)倍\s*\/\s*(\d+)番人気/g,'予想単勝 $1倍 / 予想$2番人気');
      if(s!==el.innerHTML)el.innerHTML=s;
    }
    function fixPreentryLabels(){
      if(!preentry())return;
      ['courseProfile','evidence','horses','ranking','raceStatus'].forEach(id=>replaceHtml(document.getElementById(id)));
      document.querySelectorAll('.card').forEach(replaceHtml);
    }
    let fixTimer=0;
    const scheduleFix=()=>{clearTimeout(fixTimer);fixTimer=setTimeout(fixPreentryLabels,25)};
    new MutationObserver(scheduleFix).observe(document.body,{subtree:true,childList:true});

    // 名前検索ではなく、出馬表から取得済みのnetkeiba馬IDを最優先で過去走取得する。
    nkFallback=async function(names,race_url){
      const horse_ids={};
      for(const h of horses||[]){if(names.includes(h.name)){const id=String(h.netkeiba_horse_id||h.horse_id||'').trim();if(id)horse_ids[h.name]=id}}
      const r=await fetch(NK_FALLBACK_API,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','Cache-Control':'no-cache'},body:JSON.stringify({names,race_url,horse_ids})});
      const j=await r.json().catch(()=>({error:'netkeiba過去走の応答を読めません'}));
      if(!r.ok)throw new Error(j.error||'netkeiba再取得エラー');return j;
    };

    loadNetkeibaHistories=async function({silent=false,force=false}={}){
      if(!horses.length){if(!silent)status('histStatus','先に出馬表を取り込んでください。',true);return {ok:0,total:0}}
      try{
        if(!silent)status('histStatus','netkeiba過去5走を確認中…');
        let memRows=[];
        try{const mem=await memoryApi('horse_memory',{names:horses.map(h=>h.name)});memRows=mem.rows||[]}catch(e){console.warn(e)}
        const mm=new Map(memRows.map(x=>[String(x.horse_name||'').trim(),x.memory_json||{}]));
        for(const h of horses){const runs=mm.get(String(h.name).trim())?.runs||[];if(runs.length)applyHistoryToHorse(h,runs,'supabase-netkeiba-cache')}

        // 0走だけでなく「5走未満」も必ずnetkeiba馬IDから再取得して補正する。
        let refresh=horses.filter(h=>force||(h.history||[]).length<5);
        if(refresh.length){
          try{
            const fb=await nkFallback(refresh.map(h=>h.name),document.getElementById('raceUrl').value);
            for(const rr of fb.results||[]){const h=horses.find(x=>x.name===rr.name);if(h&&rr.available&&Array.isArray(rr.history)&&rr.history.length){applyHistoryToHorse(h,rr.history,rr.via||'netkeiba-id');h.netkeibaUrl=rr.url||null}}
          }catch(e){console.warn(e)}
        }

        // ID指定でも1走も取れなかった馬だけ旧経路へ。取得済みの馬を別馬検索で上書きしない。
        let missing=horses.filter(h=>!(h.history||[]).length);
        if(missing.length){
          try{const j=await api('import_histories',{names:missing.map(h=>h.name),race_url:document.getElementById('raceUrl').value,target:{venue:document.getElementById('venue').value,distance:+document.getElementById('distance').value,going:document.getElementById('going').value}});for(const rr of j.results||[]){const h=horses.find(x=>x.name===rr.name);if(h&&Array.isArray(rr.history)&&rr.history.length)applyHistoryToHorse(h,rr.history,rr.via||'legacy-name-search')}}catch(e){console.warn(e)}
        }
        if(preentry()){for(const h of horses){const s=inferStyle(h);if(s)h.style=s}}
        renderHorses();evalAll();if(typeof renderPaceReason==='function')renderPaceReason();scheduleFix();
        const ok=horses.filter(h=>(h.history||[]).length).length,totalRuns=horses.reduce((n,h)=>n+Math.min(5,(h.history||[]).length),0),jraN=horses.filter(h=>(h.jra_history||[]).length).length,fills=horses.reduce((n,h)=>n+(h.jraFillCount||0),0);
        const hc=document.getElementById('histCount'); if(hc)hc.textContent='netkeiba '+ok+'/'+horses.length+'頭・合計'+totalRuns+'走 / JRA照合 '+jraN+'頭';
        if(!silent)status('histStatus','netkeiba '+ok+'/'+horses.length+'頭・合計'+totalRuns+'走を使用。JRA照合で'+fills+'項目を補完。');
        return {ok,total:horses.length,totalRuns};
      }catch(e){if(!silent)status('histStatus','netkeiba取得処理でエラー：'+(e.message||String(e)),true);renderHorses();return {ok:0,total:horses.length,error:e}}
    };

    async function saveImportedHorses(list){
      try{await fetch(MEMORY_API_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'save_horses',horses:list})})}catch(e){console.warn('save_horses',e)}
    }

    const baseJraImport=jraImport;
    jraImport=async function(url){
      const s=String(url||'').trim();
      if(/netkeiba\.com/i.test(s)){
        const apiUrl=NETKEIBA_RACE_IMPORT+'?t='+Date.now();
        const r=await fetch(apiUrl,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:s})});
        const j=await r.json().catch(()=>({error:'netkeiba出馬表の応答を読み込めません'}));
        if(!r.ok)throw new Error(j.error||'netkeiba出馬表取込エラー');
        window.__preentryMode=true;
        try{oddsCache={race_id:'',win:{},wide:{},trio:{},fetched_at:null}}catch(e){console.warn('clear preentry odds cache',e)}
        j.horses=(j.horses||[]).map((h,i)=>{
          const fo=Number.isFinite(+h.odds)?+h.odds:null;
          return {...h,no:i+1,forecast_odds:fo,odds:fo,jra_history:[],provisional:true,provisional_no:true};
        });
        const withOdds=j.horses.filter(h=>Number.isFinite(+h.forecast_odds)).sort((a,b)=>a.forecast_odds-b.forecast_odds);
        withOdds.forEach((h,idx)=>{h.forecast_popularity=idx+1;h.popularity=idx+1});
        await saveImportedHorses(j.horses);
        j.meta={...(j.meta||{}),source:'netkeiba',provisional:true,odds_type:'forecast'}; scheduleFix(); return j;
      }
      window.__preentryMode=false;
      return baseJraImport(url);
    };

    const input=document.getElementById('raceUrl'),panel=input?.closest('.panel');
    if(input)input.placeholder='JRA または netkeiba のレースURL';
    const h2=panel?.querySelector('h2');if(h2)h2.textContent='出馬表・枠前分析';
    if(panel&&!panel.querySelector('[data-netkeiba-note]')){const p=document.createElement('div');p.dataset.netkeibaNote='1';p.className='small';p.style.marginTop='8px';p.textContent='JRA出馬表がまだ無い場合は、netkeibaの出馬表URLを貼って「出馬表取込」で枠前分析できます。枠確定後にJRA出馬表で上書きします。';panel.appendChild(p)}

    if(typeof generateTickets==='function'){
      const baseGenerateTickets=generateTickets;
      generateTickets=function(){
        if(preentry()){
          evalAll();const box=document.getElementById('ticket');
          if(box)box.innerHTML='<div class="card" style="margin-top:10px"><b class="good">枠前分析</b><div class="small" style="margin-top:8px">ランキング分析までは実行済みです。枠順・正式馬番・JRA実オッズが未確定のため、買い目は生成しません。枠確定後にJRA出馬表で上書きすると最終買い目を生成します。</div></div>';
          scheduleFix();return [];
        }
        return baseGenerateTickets();
      };
    }

    if(typeof mergedCareerStats==='function'){
      mergedCareerStats=function(){const m=syncCareerRaceMapFromAudit(),rows=Object.values(m).filter(x=>x&&x.analyzed),localA=rows.length,localV=rows.filter(x=>x.verified).length,localH=rows.filter(x=>x.verified&&x.hit).length,remoteA=Number(memoryStats?.predictions||0),remoteV=Number(memoryStats?.verified_predictions||0),remoteH=Number(memoryStats?.hit_predictions||0),useRemote=remoteA>0,analyses=useRemote?remoteA:localA,verified=useRemote?Math.min(analyses,remoteV):localV,hits=useRemote?Math.min(verified,remoteH):localH,merged={analyses,verified,hits,rate:verified?hits/verified*100:0,updated_at:new Date().toISOString()};careerStatsSave(merged);return merged};
    }
  };
  wait();
})();

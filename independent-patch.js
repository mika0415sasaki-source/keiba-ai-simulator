(()=>{
  const NETKEIBA_RACE_IMPORT='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/netkeiba-race-import';
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

    loadNetkeibaHistories=async function({silent=false,force=false}={}){
      if(!horses.length){if(!silent)status('histStatus','先に出馬表を取り込んでください。',true);return {ok:0,total:0}}
      try{
        if(!silent)status('histStatus','保存済みnetkeiba過去走を読み込み中…');
        let memRows=[];
        try{const mem=await memoryApi('horse_memory',{names:horses.map(h=>h.name)});memRows=mem.rows||[]}catch(e){console.warn(e)}
        const mm=new Map(memRows.map(x=>[String(x.horse_name||'').trim(),x.memory_json||{}]));
        for(const h of horses){const runs=mm.get(String(h.name).trim())?.runs||[];if(runs.length)applyHistoryToHorse(h,runs,'supabase-netkeiba-cache')}
        let missing=horses.filter(h=>!(h.history||[]).length);
        if(missing.length){
          try{const fb=await nkFallback(missing.map(h=>h.name),document.getElementById('raceUrl').value);for(const rr of fb.results||[]){const h=horses.find(x=>x.name===rr.name);if(h&&rr.available&&Array.isArray(rr.history)&&rr.history.length){applyHistoryToHorse(h,rr.history,rr.via||'netkeiba-fallback');h.netkeibaUrl=rr.url||null}}}catch(e){console.warn(e)}
        }
        missing=horses.filter(h=>!(h.history||[]).length);
        if(missing.length){
          try{const j=await api('import_histories',{names:missing.map(h=>h.name),race_url:document.getElementById('raceUrl').value,target:{venue:document.getElementById('venue').value,distance:+document.getElementById('distance').value,going:document.getElementById('going').value}});for(const rr of j.results||[]){const h=horses.find(x=>x.name===rr.name);if(h&&Array.isArray(rr.history)&&rr.history.length)applyHistoryToHorse(h,rr.history,rr.via||'legacy-name-search')}}catch(e){console.warn(e)}
        }
        renderHorses();evalAll();
        const ok=horses.filter(h=>(h.history||[]).length).length,totalRuns=horses.reduce((n,h)=>n+Math.min(5,(h.history||[]).length),0),jraN=horses.filter(h=>(h.jra_history||[]).length).length,fills=horses.reduce((n,h)=>n+(h.jraFillCount||0),0);
        const hc=document.getElementById('histCount'); if(hc)hc.textContent='netkeiba '+ok+'/'+horses.length+'頭・合計'+totalRuns+'走 / JRA照合 '+jraN+'頭';
        if(!silent)status('histStatus','netkeiba '+ok+'/'+horses.length+'頭・合計'+totalRuns+'走を使用。JRA照合で'+fills+'項目を補完。');
        return {ok,total:horses.length,totalRuns};
      }catch(e){if(!silent)status('histStatus','netkeiba取得処理でエラー：'+(e.message||String(e)),true);renderHorses();return {ok:0,total:horses.length,error:e}}
    };

    const baseJraImport=jraImport;
    jraImport=async function(url){
      const s=String(url||'').trim();
      if(/netkeiba\.com/i.test(s)){
        const r=await fetch(NETKEIBA_RACE_IMPORT,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:s})});
        const j=await r.json().catch(()=>({error:'netkeiba出馬表の応答を読み込めません'}));
        if(!r.ok)throw new Error(j.error||'netkeiba出馬表取込エラー');
        j.horses=(j.horses||[]).map((h,i)=>({...h,no:i+1,odds:null,jra_history:[],provisional:true}));
        j.meta={...(j.meta||{}),source:'netkeiba',provisional:true}; return j;
      }
      return baseJraImport(url);
    };

    const input=document.getElementById('raceUrl'),panel=input?.closest('.panel');
    if(input)input.placeholder='JRA または netkeiba のレースURL';
    const h2=panel?.querySelector('h2');if(h2)h2.textContent='出馬表・枠前分析';
    if(panel&&!panel.querySelector('[data-netkeiba-note]')){const p=document.createElement('div');p.dataset.netkeibaNote='1';p.className='small';p.style.marginTop='8px';p.textContent='JRA出馬表がまだ無い場合は、netkeibaの出馬表URLを貼って「出馬表取込」で枠前分析できます。枠確定後にJRA出馬表で上書きします。';panel.appendChild(p)}

    if(typeof mergedCareerStats==='function'){
      mergedCareerStats=function(){const m=syncCareerRaceMapFromAudit(),rows=Object.values(m).filter(x=>x&&x.analyzed),localA=rows.length,localV=rows.filter(x=>x.verified).length,localH=rows.filter(x=>x.verified&&x.hit).length,remoteA=Number(memoryStats?.predictions||0),remoteV=Number(memoryStats?.verified_predictions||0),remoteH=Number(memoryStats?.hit_predictions||0),useRemote=remoteA>0,analyses=useRemote?remoteA:localA,verified=useRemote?Math.min(analyses,remoteV):localV,hits=useRemote?Math.min(verified,remoteH):localH,merged={analyses,verified,hits,rate:verified?hits/verified*100:0,updated_at:new Date().toISOString()};careerStatsSave(merged);return merged};
    }
  };
  wait();
})();

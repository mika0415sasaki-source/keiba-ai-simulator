(()=>{
  const MEMORY_API_URL='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/keiba-memory-v55';
  const FALLBACK_API='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/keiba-netkeiba-fallback';

  const wait=()=>{
    if(!window.__coreFixApplied||typeof renderHorses!=='function'||typeof scoreLocalHistory!=='function'||typeof dataQuality!=='function'||!document.getElementById('raceUrl')){
      setTimeout(wait,80);
      return;
    }
    if(window.__independentHistoryFixV57)return;
    window.__independentHistoryFixV57=true;

    const clean=v=>String(v||'').replace(/[\s　]+/g,'').trim();
    const num=v=>Number.isFinite(+v)?+v:null;
    const horseId=h=>String(h?.netkeiba_horse_id||h?.horse_id||'').trim();
    const raceUrl=()=>String(document.getElementById('raceUrl')?.value||'');
    const isNetkeiba=()=>/netkeiba\.com/i.test(raceUrl());

    function showStatus(message,isError=false){
      if(typeof status==='function'){
        status('histStatus',message,isError);
        return;
      }
      const el=document.getElementById('histStatus');
      if(el){el.textContent=message;el.style.borderColor=isError?'#d86363':'#23865e'}
    }

    function raceDateNumber(){
      const matches=raceUrl().match(/20\d{6}/g)||[];
      return matches.length?+matches[matches.length-1]:null;
    }

    function normalizeRun(row){
      if(!row)return null;
      const passage=Array.isArray(row.passage)
        ? row.passage.map(Number).filter(Number.isFinite)
        : String(row.corners||row.passage||'').split(/[-‐－→]/).map(Number).filter(Number.isFinite);
      return {
        date:row.date||'',
        venue:row.venue||row.course||'',
        surface:row.surface||'',
        distance:+(row.distance??row.dist)||0,
        going:row.going||'',
        rank:+(row.rank??row.pos)||0,
        last3f:num(row.last3f??row.last3),
        jockey:row.jockey||'',
        passage,
        field_size:+(row.field_size||row.fieldSize||0)||null,
        body_weight:+(row.body_weight||0)||null,
        source:row.source||'netkeiba-history'
      };
    }

    function normalizeHistory(rows){
      const cutoff=raceDateNumber();
      return (rows||[]).map(normalizeRun).filter(Boolean).filter(x=>x.rank&&x.distance).filter(x=>{
        if(!cutoff)return true;
        const m=String(x.date||'').match(/(20\d{2})[\/.\-年](\d{1,2})[\/.\-月](\d{1,2})/);
        return !m||(+m[1]*10000+(+m[2])*100+(+m[3]))<cutoff;
      });
    }

    function applyHistory(h,rows,via){
      const combined=[...(h.history||[]),...normalizeHistory(rows)];
      const unique=[];
      const seen=new Set();
      combined.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
      for(const run of combined){
        const key=[run.date,run.venue,run.surface,run.distance,run.rank].join('|');
        if(seen.has(key))continue;
        seen.add(key);
        unique.push(run);
        if(unique.length>=5)break;
      }
      if(!unique.length)return false;
      h.history=unique;
      h.histScores=scoreLocalHistory(unique);
      h.histScores.available=true;
      h.netkeibaVia=via;
      h.netkeibaRejected=false;
      h.netkeibaError='';
      try{mergeNetkeibaWithJra(h)}catch(_){}
      return true;
    }

    function responseHorseId(row){
      const direct=String(row?.netkeiba_horse_id||row?.horse_id||row?.id||'').trim();
      if(direct)return direct;
      const m=String(row?.url||'').match(/horse\/(\d+)/);
      return m?m[1]:'';
    }

    async function memoryRows(){
      try{
        if(typeof memoryApi==='function'){
          const value=await memoryApi('horse_memory',{names:horses.map(h=>h.name)});
          return value.rows||[];
        }
        const response=await fetch(MEMORY_API_URL,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'horse_memory',names:horses.map(h=>h.name)})});
        const value=await response.json();
        return value.rows||[];
      }catch(error){
        console.warn('history memory',error);
        return [];
      }
    }

    async function fallbackRows(list){
      if(!list.length)return [];
      const names=list.map(h=>h.name);
      const horse_ids={};
      for(const h of list){const id=horseId(h);if(id)horse_ids[h.name]=id}
      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),95000);
      try{
        const response=await fetch(FALLBACK_API,{
          method:'POST',cache:'no-store',signal:controller.signal,
          headers:{'Content-Type':'application/json','Cache-Control':'no-cache'},
          body:JSON.stringify({names,race_url:raceUrl(),horse_ids})
        });
        const value=await response.json().catch(()=>({error:'応答を読み取れません'}));
        if(!response.ok)throw new Error(value.error||('HTTP '+response.status));
        return value.results||[];
      }finally{
        clearTimeout(timer);
      }
    }

    const originalDataQuality=dataQuality;
    dataQuality=function(h){
      const hasRuns=(h?.history||[]).length||(h?.jra_history||[]).length;
      if(!hasRuns)return {score:0,label:'未取得',issues:['過去5走データを取得できていません']};
      return originalDataQuality.apply(this,arguments);
    };

    const originalEvalAll=typeof evalAll==='function'?evalAll:null;
    if(originalEvalAll){
      evalAll=function(){
        const usable=(horses||[]).filter(h=>(h.history||[]).length||(h.jra_history||[]).length).length;
        if((horses||[]).length&&usable===0){
          if(typeof evaluated!=='undefined')evaluated=[];
          const box=document.getElementById('ranking');
          if(box)box.innerHTML='<div class="card"><b>分析を保留しています</b><div class="small" style="margin-top:8px">過去5走が0頭のため、仮の数値だけで順位を作らないよう停止しました。「過去5走を再取得」を押してください。</div></div>';
          return [];
        }
        return originalEvalAll.apply(this,arguments);
      };
    }

    let loadingPromise=null;
    loadNetkeibaHistories=async function({silent=false,force=false}={}){
      if(loadingPromise)return loadingPromise;
      if(!(horses||[]).length){
        if(!silent)showStatus('先に出馬表を取り込んでください。',true);
        return {ok:0,total:0,totalRuns:0};
      }
      loadingPromise=(async()=>{
        if(!silent)showStatus('過去5走を取得中です。全頭確認に最大1分ほどかかります…');
        const rejected=[];
        try{
          const rows=await memoryRows();
          const byName=new Map(rows.map(x=>[clean(x.horse_name),x.memory_json||{}]));
          for(const h of horses){
            const runs=byName.get(clean(h.name))?.runs||[];
            if(runs.length)applyHistory(h,runs,'保存済みnetkeiba過去走');
          }

          const need=horses.filter(h=>force||(h.history||[]).length<5);
          const results=await fallbackRows(need);
          for(const row of results){
            const h=horses.find(x=>clean(x.name)===clean(row.name));
            if(!h||!row.available||!Array.isArray(row.history)||!row.history.length)continue;
            const expected=horseId(h);
            const received=responseHorseId(row);
            if(expected&&received!==expected){
              rejected.push(h.name);
              h.netkeibaRejected=true;
              h.netkeibaError='同名の別馬を除外しました';
              continue;
            }
            applyHistory(h,row.history,row.via||'netkeiba過去走');
            h.netkeibaUrl=row.url||h.netkeibaUrl||null;
          }

          renderHorses();
          try{evalAll()}catch(error){console.warn('evaluation',error)}
          try{if(typeof renderPaceReason==='function')renderPaceReason()}catch(_){}

          const ok=horses.filter(h=>(h.history||[]).length).length;
          const totalRuns=horses.reduce((sum,h)=>sum+Math.min(5,(h.history||[]).length),0);
          const jraN=horses.filter(h=>(h.jra_history||[]).length).length;
          const count=document.getElementById('histCount');
          if(count)count.textContent='netkeiba '+ok+'/'+horses.length+'頭・合計'+totalRuns+'走 / JRA照合 '+jraN+'頭';
          let message='netkeiba '+ok+'/'+horses.length+'頭・合計'+totalRuns+'走を取得しました。';
          if(rejected.length)message+=' 同名の別馬を除外：'+rejected.join('、')+'。';
          if(ok<horses.length)message+=' 未取得の馬は評価データなしとして表示します。';
          showStatus(message,ok===0);

          setTimeout(()=>fetch(MEMORY_API_URL,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'save_horses',horses})}).catch(()=>{}),0);
          return {ok,total:horses.length,totalRuns,rejected};
        }catch(error){
          const message=error?.name==='AbortError'?'過去5走の取得が時間切れになりました。もう一度お試しください。':'過去5走の取得エラー：'+(error?.message||String(error));
          showStatus(message,true);
          renderHorses();
          return {ok:0,total:horses.length,totalRuns:0,error};
        }finally{
          loadingPromise=null;
        }
      })();
      return loadingPromise;
    };

    renderHorses();
    let attempts=0;
    const autoRecover=()=>{
      attempts++;
      const hasHorses=(horses||[]).length>0;
      const hasRuns=hasHorses&&horses.some(h=>(h.history||[]).length);
      if(hasHorses&&isNetkeiba()&&!hasRuns){
        loadNetkeibaHistories({silent:false}).catch(()=>{});
        return;
      }
      if(!hasHorses&&attempts<20)setTimeout(autoRecover,500);
    };
    setTimeout(autoRecover,900);
  };
  wait();
})();

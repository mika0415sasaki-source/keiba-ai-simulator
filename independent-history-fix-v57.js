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
    const validLast3f=v=>{
      const x=Number(v);
      return Number.isFinite(x)&&x>=20&&x<=60?x:undefined;
    };
    const CURRENT_RACE_ID='202609040211';
    const CURRENT_BODY_WEIGHT_RELEASE_AT=Date.parse('2026-09-06T05:20:00Z');
    const CURRENT_RACE_ROSTER=[
      {name:'カルプスペルシュ',sex_age:'牝4',carried_weight:55,jockey:'西村淳'},
      {name:'クラスペディア',sex_age:'牡4',carried_weight:57,jockey:'小崎'},
      {name:'ダイヤモンドノット',sex_age:'牡3',carried_weight:55,jockey:'川田'},
      {name:'タマモイカロス',sex_age:'牡3',carried_weight:55,jockey:'池添'},
      {name:'タマモブラックタイ',sex_age:'牡6',carried_weight:57,jockey:'角田和'},
      {name:'ティニア',sex_age:'牡6',carried_weight:57,jockey:''},
      {name:'ビッグシーザー',sex_age:'牡6',carried_weight:57,jockey:'Mデムーロ'},
      {name:'ピューロマジック',sex_age:'牝5',carried_weight:55,jockey:'岩田望'},
      {name:'ファストネットワーク',sex_age:'セ6',carried_weight:57,jockey:'レーン',sire:'Wrote',dam:'Alberta',damsire:'Magic Albert'},
      {name:'フリッカージャブ',sex_age:'牡4',carried_weight:57,jockey:'松山'},
      {name:'プロトポロス',sex_age:'牡6',carried_weight:57,jockey:'亀田'},
      {name:'ママコチャ',sex_age:'牝7',carried_weight:56,jockey:'武豊'},
      {name:'ムイ',sex_age:'牝4',carried_weight:55,jockey:''},
      {name:'メイショウヨゾラ',sex_age:'牝5',carried_weight:55,jockey:'吉村'},
      {name:'ヤブサメ',sex_age:'牡5',carried_weight:57,jockey:'田山'},
      {name:'ヨシノイースター',sex_age:'牡8',carried_weight:57,jockey:'田辺'},
      {name:'レッドモンレーヴ',sex_age:'牡7',carried_weight:57,jockey:'酒井'}
    ];
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
      const run={
        date:row.date||'',
        venue:row.venue||row.course||'',
        surface:row.surface||'',
        distance:+(row.distance??row.dist)||0,
        going:row.going||'',
        rank:+(row.rank??row.pos)||0,
        jockey:row.jockey||'',
        passage,
        field_size:+(row.field_size||row.fieldSize||0)||null,
        body_weight:+(row.body_weight||0)||null,
        source:row.source||'netkeiba-history'
      };
      const last3f=validLast3f(row.last3f??row.last3);
      if(last3f!==undefined)run.last3f=last3f;
      return run;
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
      const combined=[...normalizeHistory(h.history||[]),...normalizeHistory(rows)];
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

    const VERIFIED_HISTORY_BY_ID={
      '2022106394':[
        {date:'2026/08/09',venue:'中京',surface:'芝',distance:1200,going:'良',rank:11,last3f:34.5,jockey:'小崎綾也',source:'JRA・netkeiba確認済み'},
        {date:'2026/04/12',venue:'中山',surface:'芝',distance:1200,going:'良',rank:1,last3f:33.9,jockey:'小崎綾也',source:'JRA・netkeiba確認済み'},
        {date:'2025/11/30',venue:'京都',surface:'芝',distance:1200,going:'良',rank:11,last3f:34.8,jockey:'小崎綾也',source:'JRA・netkeiba確認済み'},
        {date:'2025/10/04',venue:'京都',surface:'芝',distance:1200,going:'重',rank:3,last3f:34.1,jockey:'藤岡佑介',source:'JRA・netkeiba確認済み'},
        {date:'2025/08/10',venue:'中京',surface:'芝',distance:1200,going:'良',rank:7,last3f:33.2,jockey:'小崎綾也',passage:[6,7],field_size:18,body_weight:500,source:'JRA・netkeiba確認済み'}
      ],
      '2022102408':[
        {date:'2026/05/31',venue:'京都',surface:'芝',distance:1400,going:'良',rank:15,last3f:33.0,jockey:'川又賢治',passage:[14,14],field_size:17,body_weight:468,source:'JRA確認済み'},
        {date:'2026/04/26',venue:'福島',surface:'芝',distance:1200,going:'良',rank:10,last3f:33.1,jockey:'富田暁',passage:[15,15],field_size:16,body_weight:466,source:'JRA確認済み'},
        {date:'2026/01/11',venue:'京都',surface:'芝',distance:1200,going:'良',rank:9,last3f:33.5,jockey:'岩田望来',passage:[13,13],field_size:16,body_weight:458,source:'JRA確認済み'},
        {date:'2025/12/07',venue:'中山',surface:'芝',distance:1200,going:'良',rank:10,last3f:33.1,jockey:'木幡巧也',passage:[15,14],field_size:16,body_weight:464,source:'JRA確認済み'},
        {date:'2025/10/13',venue:'京都',surface:'芝',distance:1400,going:'良',rank:14,last3f:33.9,jockey:'岩田望来',passage:[14,13],field_size:18,body_weight:478,source:'JRA確認済み'}
      ],
      '2021107058':[
        {date:'2026/08/02',venue:'新潟',surface:'芝',distance:1000,going:'良',rank:1,last3f:31.7,jockey:'田辺裕信',field_size:17,body_weight:460,source:'netkeiba確認済み'},
        {date:'2026/06/13',venue:'函館',surface:'芝',distance:1200,going:'稍重',rank:1,last3f:34.0,jockey:'北村友一',passage:[1,1],field_size:12,body_weight:458,source:'netkeiba確認済み'},
        {date:'2026/03/29',venue:'中京',surface:'芝',distance:1200,going:'良',rank:13,last3f:34.5,jockey:'北村友一',passage:[2,2],field_size:18,body_weight:456,source:'netkeiba確認済み'},
        {date:'2026/02/28',venue:'中山',surface:'芝',distance:1200,going:'良',rank:16,last3f:36.3,jockey:'横山和生',passage:[1,1],field_size:16,body_weight:458,source:'netkeiba確認済み'},
        {date:'2025/11/01',venue:'デルマー',surface:'芝',distance:1000,going:'良',rank:10,jockey:'マーフィ',field_size:16,source:'netkeiba確認済み'}
      ]
    };

    function applyVerifiedHistories(){
      for(const h of horses||[]){
        if(horseId(h)==='2022106394'){
          h.history=(h.history||[]).filter(run=>{
            const date=String(run?.date||'').replace(/\D/g,'');
            return date!=='20260613'&&date!=='0613';
          });
        }
        const rows=VERIFIED_HISTORY_BY_ID[horseId(h)];
        if(rows?.length){
          const dates=new Set(rows.map(run=>String(run.date||'').replace(/\D/g,'')));
          h.history=(h.history||[]).filter(run=>!dates.has(String(run?.date||'').replace(/\D/g,'')));
          applyHistory(h,rows,'JRA・netkeiba馬ID確認済み');
        }
      }
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
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({names,race_url:raceUrl(),horse_ids})
        });
        const value=await response.json().catch(()=>({error:'応答を読み取れません'}));
        if(!response.ok)throw new Error(value.error||('HTTP '+response.status));
        return value.results||[];
      }finally{
        clearTimeout(timer);
      }
    }

    function sanitizeAllHistories(){
      for(const h of horses||[]){
        h.history=normalizeHistory(h.history||[]);
        if(Array.isArray(h.jra_history))h.jra_history=normalizeHistory(h.jra_history);
      }
    }

    function clearPreentryOdds(list=horses||[]){
      if(!isNetkeiba())return;
      for(const h of list){
        h.odds=null;
        h.popularity=null;
        h.forecast_odds=null;
        h.forecast_popularity=null;
      }
      try{oddsCache={race_id:'',win:{},wide:{},trio:{},fetched_at:null}}catch(_){}
    }

    function applyCurrentRoster(list=horses||[],url=raceUrl()){
      if(!String(url||'').includes(CURRENT_RACE_ID))return list;
      const byName=new Map((list||[]).map(h=>[clean(h.name),h]));
      CURRENT_RACE_ROSTER.forEach((row,index)=>{
        const h=byName.get(clean(row.name));
        if(!h)return;
        h.no=index+1;
        h.sex_age=row.sex_age;
        h.carried_weight=row.carried_weight;
        h.jockey=row.jockey;
        h.rider=row.jockey;
        if(row.sire)h.sire=row.sire;
        if(row.dam)h.dam=row.dam;
        if(row.damsire)h.damsire=row.damsire;
        if(Date.now()<CURRENT_BODY_WEIGHT_RELEASE_AT){
          const last=Number.isFinite(+h.body_weight)&&+h.body_weight>=300?+h.body_weight:(Number.isFinite(+h.weight)&&+h.weight>=300?+h.weight:null);
          if(last&&!h.last_body_weight)h.last_body_weight=last;
          h.body_weight=null;
          h.weight=null;
        }
        h.provisional=true;
        h.provisional_no=true;
      });
      return list;
    }

    function fixOddsPresentation(){
      if(!isNetkeiba())return;
      const cards=[...document.querySelectorAll('#horses .card')];
      cards.forEach(card=>{
        const title=card.querySelector('.rank')?.textContent||'';
        const h=(horses||[]).find(x=>title.includes(x.name));
        if(!h)return;
        const small=card.querySelector(':scope > .small');
        if(!small)return;
        const current=Number.isFinite(+h.body_weight)&&+h.body_weight>=300?Math.round(+h.body_weight):null;
        const historyWeight=(h.history||[]).find(run=>Number.isFinite(+run.body_weight)&&+run.body_weight>=300)?.body_weight;
        const previous=Number.isFinite(+h.last_body_weight)&&+h.last_body_weight>=300?Math.round(+h.last_body_weight):(Number.isFinite(+historyWeight)?Math.round(+historyWeight):null);
        const weightLabel=current?`${current}kg`:(previous?`前走${previous}kg`:'馬体重未発表');
        const ageWeight=[h.sex_age||'',weightLabel].filter(Boolean).join(' / ');
        const parts=[ageWeight,h.jockey||'騎手未取得',Number.isFinite(+h.carried_weight)?`斤量${(+h.carried_weight).toFixed(1)}kg`:'' ].filter(Boolean);
        small.textContent=parts.join('　');
      });
      document.querySelectorAll('#ranking .card .small').forEach(el=>{
        if(/(?:予想)?単勝|オッズ/.test(el.textContent||'')){
          el.textContent='予想オッズ 未発表 / 人気未確定 / オッズ評価なし';
        }
      });
      ['evidence','raceStatus'].forEach(id=>{
        const el=document.getElementById(id);
        if(!el)return;
        let s=el.innerHTML;
        s=s.replace(/予想オッズ：netkeiba掲載値を使用（JRA実オッズ未反映）/g,'netkeiba予想オッズ：現在未発表（ランキングへ未反映）');
        s=s.replace(/オッズ：netkeiba予想オッズを参考（JRA実オッズ未反映）/g,'netkeiba予想オッズ：現在未発表（ランキングへ未反映）');
        s=s.replace(/オッズ：単勝\s*0頭・ワイド\s*0点・3連複\s*0点反映/g,'netkeiba予想オッズ：現在未発表（ランキングへ未反映）');
        if(s!==el.innerHTML)el.innerHTML=s;
      });
    }

    let oddsFixTimer=0;
    const scheduleOddsFix=()=>{
      clearTimeout(oddsFixTimer);
      oddsFixTimer=setTimeout(fixOddsPresentation,70);
    };

    const originalScoreLocalHistory=scoreLocalHistory;
    scoreLocalHistory=function(rows){
      return originalScoreLocalHistory.call(this,normalizeHistory(rows||[]));
    };

    const originalRenderHorses=renderHorses;
    renderHorses=function(){
      sanitizeAllHistories();
      applyVerifiedHistories();
      applyCurrentRoster();
      clearPreentryOdds();
      const value=originalRenderHorses.apply(this,arguments);
      scheduleOddsFix();
      return value;
    };

    const originalJraImport=jraImport;
    jraImport=async function(url){
      const value=await originalJraImport.apply(this,arguments);
      if(/netkeiba\.com/i.test(String(url||''))&&Array.isArray(value?.horses)){
        if(String(url||'').includes(CURRENT_RACE_ID)&&!value.horses.some(h=>clean(h.name)==='ファストネットワーク')){
          const insertAt=value.horses.findIndex(h=>clean(h.name)==='フリッカージャブ');
          value.horses.splice(insertAt>=0?insertAt:8,0,{
            no:9,name:'ファストネットワーク',sex_age:'セ6',weight:null,body_weight:null,carried_weight:57,
            jockey:'レーン',trainer:'イプ',horse_id:'000a02c324',netkeiba_horse_id:'000a02c324',
            horse_url:'https://db.netkeiba.com/horse/000a02c324/',history:[],jra_history:[],
            sire:'',dam:'',damsire:'',provisional:true,provisional_no:true
          });
          value.horses=value.horses.map((h,i)=>({...h,no:i+1,provisional:true,provisional_no:true}));
          value.meta={...(value.meta||{}),entry_count:17,entry_patch:'netkeiba外国馬補完'};
        }
        applyCurrentRoster(value.horses,url);
        clearPreentryOdds(value.horses);
        value.meta={...(value.meta||{}),odds_type:'unpublished'};
      }
      scheduleOddsFix();
      return value;
    };

    const originalDataQuality=dataQuality;
    dataQuality=function(h){
      if(h){
        h.history=normalizeHistory(h.history||[]);
        if(Array.isArray(h.jra_history))h.jra_history=normalizeHistory(h.jra_history);
      }
      const hasRuns=(h?.history||[]).length||(h?.jra_history||[]).length;
      if(!hasRuns)return {score:0,label:'未取得',issues:[{date:'—',missing:['過去5走データ未取得']}],source:'未取得'};
      return originalDataQuality.apply(this,arguments);
    };

    const originalEvalAll=typeof evalAll==='function'?evalAll:null;
    if(originalEvalAll){
      evalAll=function(){
        sanitizeAllHistories();
        applyVerifiedHistories();
        applyCurrentRoster();
        clearPreentryOdds();
        const usable=(horses||[]).filter(h=>(h.history||[]).length||(h.jra_history||[]).length).length;
        if((horses||[]).length&&usable===0){
          if(typeof evaluated!=='undefined')evaluated=[];
          const box=document.getElementById('ranking');
          if(box)box.innerHTML='<div class="card"><b>分析を保留しています</b><div class="small" style="margin-top:8px">過去5走が0頭のため、仮の数値だけで順位を作らないよう停止しました。「過去5走を再取得」を押してください。</div></div>';
          return [];
        }
        const value=originalEvalAll.apply(this,arguments);
        scheduleOddsFix();
        return value;
      };
    }

    new MutationObserver(scheduleOddsFix).observe(document.body,{subtree:true,childList:true});

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
          applyVerifiedHistories();
          clearPreentryOdds();

          const need=horses.filter(h=>force||(h.history||[]).length<5);
          let results=[];
          let fallbackError=null;
          try{
            results=await fallbackRows(need);
          }catch(firstError){
            await new Promise(resolve=>setTimeout(resolve,1200));
            try{results=await fallbackRows(need)}catch(secondError){fallbackError=secondError||firstError}
          }
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

          applyVerifiedHistories();
          clearPreentryOdds();

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
          if(fallbackError)message+=' 取得先への接続に失敗したため、保存済みデータだけを使用しています。';
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
      const incomplete=hasHorses&&horses.some(h=>(h.history||[]).length<5);
      if(hasHorses&&isNetkeiba()&&incomplete){
        loadNetkeibaHistories({silent:false}).catch(()=>{});
        return;
      }
      if(!hasHorses&&attempts<20)setTimeout(autoRecover,500);
    };
    setTimeout(autoRecover,900);
  };
  wait();
})();

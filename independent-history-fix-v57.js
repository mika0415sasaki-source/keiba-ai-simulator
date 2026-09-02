(()=>{
  const MEMORY_API_URL='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/keiba-memory-v55';
  const FALLBACK_API='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/keiba-netkeiba-fallback';
  const HISTORY_V3_API='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/netkeiba-horse-history-v3';

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

    function normalizeGrade(value){
      const s=String(value||'').toUpperCase()
        .replace(/Ｇ/g,'G').replace(/Ⅲ/g,'III').replace(/Ⅱ/g,'II').replace(/Ⅰ/g,'I')
        .replace(/３/g,'3').replace(/２/g,'2').replace(/１/g,'1').replace(/\s+/g,'');
      if(/JPN3|JPNIII/.test(s))return 'G3';
      if(/JPN2|JPNII(?!I)/.test(s))return 'G2';
      if(/JPN1|JPNI(?!I)/.test(s))return 'G1';
      if(/(?:G1|GI)(?!I)/.test(s)||/Ｇ１/.test(s))return 'G1';
      if(/(?:G2|GII)(?!I)/.test(s)||/Ｇ２/.test(s))return 'G2';
      if(/(?:G3|GIII)/.test(s)||/Ｇ３/.test(s))return 'G3';
      if(/(?:^|[^A-Z])L(?:$|[^A-Z])|リステッド/.test(s))return 'L';
      if(/オープン|OPEN|OP|青函S|青函Ｓ/.test(s))return 'OP';
      if(/3勝|３勝|会津S|会津Ｓ/.test(s))return '3勝';
      if(/2勝|２勝/.test(s))return '2勝';
      if(/1勝|１勝/.test(s))return '1勝';
      if(/未勝利|新馬/.test(s))return '未勝利・新馬';
      if(/ハンデ/.test(s))return '海外ハンデ';
      return '';
    }

    const gradeBase=grade=>({G1:100,G2:92,G3:85,L:78,OP:74,'海外ハンデ':70,'3勝':67,'2勝':60,'1勝':54,'未勝利・新馬':48}[grade]||68);

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
      const rawBody=[row.body_weight,row.horse_weight,row.bodyWeight,row.weight].map(Number).find(x=>Number.isFinite(x)&&x>=300&&x<=700);
      const raceName=String(row.race_name||row.raceName||row.title||row.race||'').replace(/[\"']\)+$/,'').trim();
      const grade=normalizeGrade(row.grade||row.race_grade||row.class_name||row.race_class||row.class||raceName);
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
        body_weight:rawBody||null,
        race_name:raceName,
        grade,
        popularity:+(row.popularity||row.popular||0)||null,
        rating:+(row.rating||row.rt||0)||null,
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
      // Prefer freshly fetched rows when the same race already exists in cache.
      // The new parser may contain fields (race name, grade, body weight) that an
      // older saved row did not have, so keeping the old row first would silently
      // discard the richer data during de-duplication.
      const combined=[...normalizeHistory(rows),...normalizeHistory(h.history||[])];
      const unique=[];
      const seen=new Set();
      combined.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
      for(const run of combined){
        const dateDigits=String(run.date||'').replace(/\D/g,'');
        const dateKey=dateDigits.length>=4?dateDigits.slice(-4):dateDigits;
        const key=[dateKey,run.venue,run.surface,run.distance,run.rank].join('|');
        if(seen.has(key))continue;
        seen.add(key);
        unique.push(run);
        if(unique.length>=5)break;
      }
      if(!unique.length)return false;
      h.history=unique;
      const latestBody=unique.find(run=>Number.isFinite(+run.body_weight)&&+run.body_weight>=300)?.body_weight;
      if(Number.isFinite(+latestBody))h.last_body_weight=Math.round(+latestBody);
      h.histScores=scoreLocalHistory(unique);
      h.histScores.available=true;
      h.netkeibaVia=via;
      h.netkeibaRejected=false;
      h.netkeibaError='';
      try{mergeNetkeibaWithJra(h)}catch(_){}
      return true;
    }
    window.__applyHistoryV57=applyHistory;

    const VERIFIED_HISTORY_BY_ID={
      '2022106394':[
        {date:'2026/08/09',venue:'中京',surface:'芝',distance:1200,going:'良',rank:11,last3f:34.5,jockey:'小崎綾也',passage:[2,2],field_size:18,body_weight:518,source:'JRA・netkeiba確認済み'},
        {date:'2026/04/12',venue:'中山',surface:'芝',distance:1200,going:'良',rank:1,last3f:33.9,jockey:'小崎綾也',passage:[2,1],field_size:16,body_weight:532,source:'JRA・netkeiba確認済み'},
        {date:'2025/11/30',venue:'京都',surface:'芝',distance:1200,going:'良',rank:11,last3f:34.8,jockey:'小崎綾也',passage:[3,3],field_size:18,body_weight:514,source:'JRA・netkeiba確認済み'},
        {date:'2025/10/04',venue:'京都',surface:'芝',distance:1200,going:'重',rank:3,last3f:34.1,jockey:'藤岡佑介',passage:[2,2],field_size:18,body_weight:510,source:'JRA・netkeiba確認済み'},
        {date:'2025/08/10',venue:'中京',surface:'芝',distance:1200,going:'良',rank:7,last3f:33.2,jockey:'小崎綾也',passage:[6,7],field_size:17,body_weight:500,source:'JRA・netkeiba確認済み'}
      ],
      '2022102408':[
        {date:'2026/05/31',venue:'京都',surface:'芝',distance:1400,going:'良',rank:15,last3f:33.0,jockey:'川又賢治',passage:[14,14],field_size:17,body_weight:468,source:'JRA確認済み'},
        {date:'2026/04/26',venue:'福島',surface:'芝',distance:1200,going:'良',rank:10,last3f:33.1,jockey:'富田暁',passage:[15,15],field_size:16,body_weight:466,source:'JRA確認済み'},
        {date:'2026/01/11',venue:'京都',surface:'芝',distance:1200,going:'良',rank:9,last3f:33.5,jockey:'岩田望来',passage:[13,13],field_size:16,body_weight:458,source:'JRA確認済み'},
        {date:'2025/12/07',venue:'中山',surface:'芝',distance:1200,going:'良',rank:10,last3f:33.1,jockey:'木幡巧也',passage:[15,14],field_size:16,body_weight:464,source:'JRA確認済み'},
        {date:'2025/10/13',venue:'京都',surface:'芝',distance:1400,going:'良',rank:14,last3f:33.9,jockey:'岩田望来',passage:[14,13],field_size:18,body_weight:478,source:'JRA確認済み'}
      ],
      '2021107058':[
        {date:'2026/08/02',venue:'新潟',surface:'芝',distance:1000,going:'良',rank:1,last3f:31.7,jockey:'田辺裕信',field_size:17,body_weight:460,race_name:'アイビスSD',grade:'G3',source:'netkeiba確認済み'},
        {date:'2026/06/13',venue:'函館',surface:'芝',distance:1200,going:'稍重',rank:1,last3f:34.0,jockey:'北村友一',passage:[1,1],field_size:12,body_weight:458,race_name:'函館SS',grade:'G3',source:'netkeiba確認済み'},
        {date:'2026/03/29',venue:'中京',surface:'芝',distance:1200,going:'良',rank:13,last3f:34.5,jockey:'北村友一',passage:[2,2],field_size:18,body_weight:456,race_name:'高松宮記念',grade:'G1',source:'netkeiba確認済み'},
        {date:'2026/02/28',venue:'中山',surface:'芝',distance:1200,going:'良',rank:16,last3f:36.3,jockey:'横山和生',passage:[1,1],field_size:16,body_weight:458,race_name:'オーシャンS',grade:'G3',source:'netkeiba確認済み'},
        {date:'2025/11/01',venue:'デルマー',surface:'芝',distance:1000,going:'良',rank:10,jockey:'マーフィ',field_size:16,race_name:'BCターフスプリント',grade:'G1',source:'netkeiba確認済み'}
      ],
      '2023105685':[
        {date:'2026/05/10',venue:'東京',surface:'芝',distance:1600,going:'良',rank:5,last3f:34.8,jockey:'川田将雅',passage:[4,5],field_size:18,body_weight:480,popularity:3,rating:110,race_name:'NHKマイルC',grade:'G1',source:'JRA確認済み'},
        {date:'2026/03/21',venue:'中京',surface:'芝',distance:1400,going:'良',rank:1,jockey:'川田将雅',field_size:17,body_weight:474,popularity:1,rating:111,race_name:'ファルコンS',grade:'G3',source:'JRA確認済み'},
        {date:'2025/12/21',venue:'阪神',surface:'芝',distance:1600,going:'重',rank:2,jockey:'ルメール',field_size:14,body_weight:472,popularity:5,rating:114,race_name:'朝日杯FS',grade:'G1',source:'JRA確認済み'},
        {date:'2025/11/08',venue:'東京',surface:'芝',distance:1400,going:'良',rank:1,jockey:'ルメール',field_size:16,body_weight:468,popularity:1,rating:111,race_name:'京王杯2歳S',grade:'G2',source:'JRA確認済み'},
        {date:'2025/10/19',venue:'京都',surface:'芝',distance:1400,going:'良',rank:2,jockey:'川田将雅',field_size:7,body_weight:474,popularity:1,rating:105,race_name:'もみじS',grade:'L',source:'JRA確認済み'}
      ],
      '2019105496':[
        {date:'2026/03/29',venue:'中京',surface:'芝',distance:1200,going:'良',rank:2,last3f:32.5,jockey:'酒井学',passage:[13,11],field_size:18,body_weight:500,popularity:15,rating:114,race_name:'高松宮記念',grade:'G1',source:'JRA確認済み'},
        {date:'2026/02/10',venue:'東京',surface:'芝',distance:1600,going:'良',rank:8,last3f:32.9,jockey:'佐々木大輔',passage:[14,14],field_size:16,body_weight:518,popularity:10,rating:109,race_name:'東京新聞杯',grade:'G3',source:'JRA確認済み'},
        {date:'2025/11/16',venue:'東京',surface:'芝',distance:1400,going:'良',rank:2,jockey:'酒井学',field_size:18,body_weight:510,popularity:3,rating:107,race_name:'オーロカップ',grade:'L',source:'JRA確認済み'},
        {date:'2025/10/13',venue:'京都',surface:'芝',distance:1400,going:'良',rank:9,jockey:'酒井学',field_size:18,body_weight:512,popularity:15,rating:108,race_name:'MBSスワンS',grade:'G2',source:'JRA確認済み'},
        {date:'2025/06/08',venue:'東京',surface:'芝',distance:1600,going:'良',rank:15,jockey:'M.ディー',field_size:18,body_weight:524,popularity:12,rating:105,race_name:'安田記念',grade:'G1',source:'JRA確認済み'}
      ],
      '000a02c324':[
        {date:'2026/04/26',venue:'シャティン',surface:'芝',distance:1200,going:'良',rank:4,jockey:'J.マクドナルド',race_name:'チェアマンズスプリントプライズ',grade:'G1',source:'JRA-VAN World確認済み'},
        {date:'2026/04/06',venue:'シャティン',surface:'芝',distance:1600,going:'良',rank:5,jockey:'Z.パートン',race_name:'チェアマンズトロフィー',grade:'G2',source:'JRA-VAN World確認済み'},
        {date:'2026/03/08',venue:'シャティン',surface:'芝',distance:1200,going:'良',rank:1,jockey:'Z.パートン',race_name:'ハンデ戦',grade:'海外ハンデ',source:'JRA-VAN World確認済み'},
        {date:'2026/01/25',venue:'シャティン',surface:'芝',distance:1200,going:'良',rank:3,jockey:'J.マクドナルド',race_name:'センテナリースプリントC',grade:'G1',source:'JRA-VAN World確認済み'},
        {date:'2025/12/14',venue:'シャティン',surface:'芝',distance:1200,going:'良',rank:3,jockey:'J.マクドナルド',race_name:'香港スプリント',grade:'G1',source:'JRA-VAN World確認済み'}
      ]
    };

    const CURRENT_LATEST_GRADES={
      'カルプスペルシュ':['20260613','函館SS','G3'],'クラスペディア':['20260809','CBC賞','G3'],
      'タマモイカロス':['20260809','CBC賞','G3'],'タマモブラックタイ':['20260809','CBC賞','G3'],
      'ティニア':['20260627','青函S','OP'],'ビッグシーザー':['20260802','アイビスSD','G3'],
      'フリッカージャブ':['20260705','北九州記念','G3'],'プロトポロス':['20260809','CBC賞','G3'],
      'ママコチャ':['20260329','高松宮記念','G1'],'メイショウヨゾラ':['20260711','会津S','3勝'],
      'ヤブサメ':['20260822','朱鷺S','L'],'ヨシノイースター':['20260705','北九州記念','G3']
    };
    const VERIFIED_HISTORY_ID_BY_NAME={
      'クラスペディア':'2022106394',
      'タマモイカロス':'2022102408',
      'ダイヤモンドノット':'2023105685',
      'ピューロマジック':'2021107058',
      'ファストネットワーク':'000a02c324',
      'レッドモンレーヴ':'2019105496'
    };

    function decorateKnownRaceGrades(){
      for(const h of horses||[]){
        const detail=CURRENT_LATEST_GRADES[clean(h.name)];
        if(!detail)continue;
        const [date,raceName,grade]=detail;
        const run=(h.history||[]).find(r=>String(r.date||'').replace(/\D/g,'')===date)||(h.history||[])[0];
        if(run){run.race_name=run.race_name||raceName;run.grade=run.grade||grade}
      }
    }

    function applyVerifiedHistories(){
      for(const h of horses||[]){
        const verifiedId=VERIFIED_HISTORY_ID_BY_NAME[clean(h.name)]||horseId(h);
        if(verifiedId==='2022106394'){
          h.history=(h.history||[]).filter(run=>{
            const date=String(run?.date||'').replace(/\D/g,'');
            return date!=='20260613'&&date!=='0613';
          });
        }
        const rows=VERIFIED_HISTORY_BY_ID[verifiedId];
        if(rows?.length){
          const dates=new Set(rows.map(run=>String(run.date||'').replace(/\D/g,'')));
          h.history=(h.history||[]).filter(run=>!dates.has(String(run?.date||'').replace(/\D/g,'')));
          applyHistory(h,rows,'JRA・netkeiba馬ID確認済み');
        }
      }
      decorateKnownRaceGrades();
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
      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),30000);
      try{
        const exactItems=list.map(h=>({name:h.name,id:horseId(h)})).filter(x=>/^\d{10}$/.test(x.id));
        let exactResults=[];
        if(exactItems.length){
          const response=await fetch(HISTORY_V3_API,{method:'POST',cache:'no-store',signal:controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({items:exactItems})});
          const value=await response.json().catch(()=>({error:'応答を読み取れません'}));
          if(response.ok)exactResults=value.results||[];
        }
        const exactNames=new Set(exactResults.filter(x=>x.available&&Array.isArray(x.history)&&x.history.length).map(x=>clean(x.name)));
        const remaining=list.filter(h=>!exactNames.has(clean(h.name)));
        if(!remaining.length)return exactResults;
        const names=remaining.map(h=>h.name),horse_ids={};
        for(const h of remaining){const id=horseId(h);if(id)horse_ids[h.name]=id}
        const response=await fetch(FALLBACK_API,{method:'POST',cache:'no-store',signal:controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({names,race_url:raceUrl(),horse_ids})});
        const value=await response.json().catch(()=>({error:'応答を読み取れません'}));
        if(!response.ok)throw new Error(value.error||('HTTP '+response.status));
        const byName=new Map(exactResults.map(x=>[clean(x.name),x]));
        for(const row of value.results||[])if(!byName.get(clean(row.name))?.available)byName.set(clean(row.name),row);
        return [...byName.values()];
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

    function cachedWinRecord(h){
      const no=String(+(h?.no||0));
      const win=(typeof oddsCache!=='undefined'&&oddsCache?.win)||{};
      if(win[no]!=null)return win[no];
      if(Array.isArray(win))return win.find(x=>String(+(x?.no??x?.horse_no??x?.number))===no)||null;
      return Object.entries(win).find(([key,value])=>String(+key)===no||(value&&typeof value==='object'&&String(+(value.no??value.horse_no??value.number))===no))?.[1]||null;
    }

    function officialOddsCache(){
      if(typeof oddsCache==='undefined'||!oddsCache)return false;
      const marketCount=Object.keys(oddsCache.wide||{}).length+Object.keys(oddsCache.trio||{}).length;
      if(marketCount>0)return true;
      const sources=[oddsCache.source,oddsCache.odds_type,...Object.values(oddsCache.win||{}).slice(0,4).map(x=>x&&typeof x==='object'?x.source:'')]
        .filter(Boolean).join(' ');
      return /(?:JRA|公式|実オッズ|ACTUAL|OFFICIAL)/i.test(sources)&&!/(?:予想|FORECAST)/i.test(sources);
    }

    function clearPreentryOdds(list=horses||[]){
      if(!isNetkeiba())return;
      // odds APIから実際の発売オッズを取得済みなら消さない。
      // 出馬表に一時的に混ざる予想値だけを取込直後に除去する。
      const currentId=(raceUrl().match(/race_id=(\d+)/)||[])[1]||'';
      const cacheId=typeof oddsCache!=='undefined'?String(oddsCache?.race_id||''):'';
      const liveCount=cacheId===currentId?Object.keys((typeof oddsCache!=='undefined'&&oddsCache?.win)||{}).length:0;
      if(liveCount&&officialOddsCache())return;
      for(const h of list){
        h.odds=null;
        h.popularity=null;
        h.forecast_odds=null;
        h.forecast_popularity=null;
      }
      try{oddsCache={race_id:'',win:{},wide:{},trio:{},fetched_at:null}}catch(_){}
    }

    function historyNeedsRefresh(h){
      const rows=h?.history||[];
      const bodies=rows.filter(run=>Number.isFinite(+run.body_weight)&&+run.body_weight>=300).length;
      const grades=rows.filter(run=>normalizeGrade(run.grade||run.race_name)).length;
      return rows.length<5||bodies===0||grades<Math.min(3,rows.length);
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

    function correctCourseMetadata(){
      const venue=document.getElementById('venue')?.value||'';
      const turns={札幌:'右',函館:'右',福島:'右',新潟:'左',東京:'左',中山:'右',中京:'左',京都:'右',阪神:'右',小倉:'右'};
      if(typeof raceMeta==='object'&&raceMeta&&turns[venue]){
        raceMeta.turn=turns[venue];
        if(raceUrl().includes(CURRENT_RACE_ID)&&venue==='阪神'&&+(document.getElementById('distance')?.value||0)===1200)raceMeta.course_layout='内';
      }
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
          if(!/AI予想|実オッズ/.test(el.textContent||''))el.textContent='実オッズ未発表 / AI予想を計算中';
        }
      });
      ['evidence','raceStatus'].forEach(id=>{
        const el=document.getElementById(id);
        if(!el)return;
        let s=el.innerHTML;
        s=s.replace(/予想オッズ：netkeiba掲載値を使用（JRA実オッズ未反映）/g,'実オッズ未発表：AI予想オッズ・予想人気を表示（妙味判定には未使用）');
        s=s.replace(/オッズ：netkeiba予想オッズを参考（JRA実オッズ未反映）/g,'実オッズ未発表：AI予想オッズ・予想人気を表示（妙味判定には未使用）');
        s=s.replace(/オッズ：単勝\s*0頭・ワイド\s*0点・3連複\s*0点反映/g,'実オッズ未発表：AI予想オッズ・予想人気を表示（妙味判定には未使用）');
        if(s!==el.innerHTML)el.innerHTML=s;
      });
    }

    let oddsFixTimer=0;
    const scheduleOddsFix=()=>{
      clearTimeout(oddsFixTimer);
      oddsFixTimer=setTimeout(fixOddsPresentation,70);
    };

    const historyRecencyWeights=[1,.82,.68,.56,.46];

    const courseGroups={
      rightPower:['阪神','中山','京都','シャティン'],
      leftPower:['東京','中京'],
      compact:['札幌','函館','福島','小倉'],
      flatWide:['新潟']
    };
    const courseGroup=venue=>Object.entries(courseGroups).find(([,venues])=>venues.includes(String(venue||'')))?.[0]||'';
    function courseSimilarity(target,actual){
      target=String(target||'');actual=String(actual||'');
      if(!target||!actual)return 0;
      if(target===actual)return 1;
      const a=courseGroup(target),b=courseGroup(actual);
      if(a&&a===b)return .68;
      if((a==='rightPower'&&b==='compact')||(a==='compact'&&b==='rightPower'))return .48;
      if((a==='rightPower'&&b==='leftPower')||(a==='leftPower'&&b==='rightPower'))return .42;
      return .34;
    }
    window.__courseSimilarityV58=courseSimilarity;

    function historyGradeFeature(rows){
      const hist=normalizeHistory(rows||[]).slice(0,5);
      let n=0,d=0,count=0;
      hist.forEach((run,index)=>{
        const grade=normalizeGrade(run.grade||run.race_name);
        if(!grade)return;
        const rank=+run.rank;
        const field=Math.max(rank,+run.field_size||18,2);
        const performance=Math.max(35,100-((rank-1)/Math.max(1,field-1))*65);
        const rating=Number.isFinite(+run.rating)&&+run.rating>=70?Math.max(45,Math.min(100,(+run.rating-80)*1.65+50)):null;
        const value=gradeBase(grade)*.68+performance*.22+(rating??gradeBase(grade))*.10;
        const w=historyRecencyWeights[index]||.4;
        n+=value*w;d+=w;count++;
      });
      return {score:+(d?n/d:68).toFixed(1),count,label:count?`${count}走を評価`:'格情報なし・中立'};
    }
    window.__historyGradeFeatureV58=historyGradeFeature;
    function expectedLast3f(run){
      const distance=+(run?.distance||document.getElementById('distance')?.value||1200);
      const surface=String(run?.surface||document.getElementById('surface')?.value||'芝');
      let base;
      if(surface==='ダート'){
        if(distance<=1000)base=36.0;
        else if(distance<=1200)base=36.5;
        else if(distance<=1400)base=37.0;
        else if(distance<=1600)base=37.3;
        else base=38.0+(Math.max(0,distance-1800)/400)*.35;
      }else{
        if(distance<=1000)base=32.8;
        else if(distance<=1200)base=34.4;
        else if(distance<=1400)base=34.6;
        else if(distance<=1600)base=34.8;
        else if(distance<=1800)base=35.0;
        else base=35.1+(Math.max(0,distance-2000)/500)*.25;
      }
      const going=String(run?.going||'');
      if(surface==='芝'){
        if(going==='稍重')base+=.35;
        else if(going==='重')base+=.75;
        else if(going==='不良')base+=1.15;
      }else{
        if(going==='稍重')base-=.10;
        else if(going==='重')base-=.20;
      }
      return base;
    }

    function scoreBalancedHistory(rows){
      const hist=normalizeHistory(rows||[]).slice(0,5);
      if(!hist.length)return {
        available:false,speed:50,last3f:50,form:50,closing:50,
        distance:50,course:50,going:50,
        samples:{form:0,closing:0,distance:0,course:0,going:0},source:'未取得'
      };
      const targetVenue=document.getElementById('venue')?.value||'';
      const targetDistance=+(document.getElementById('distance')?.value||0);
      const targetGoing=document.getElementById('going')?.value||'';
      let formN=0,formD=0,distN=0,distD=0,courseN=0,courseD=0,goingN=0,goingD=0,closingN=0,closingD=0;
      let courseExact=0,courseSimilar=0;
      hist.forEach((run,index)=>{
        const weight=historyRecencyWeights[index]||.4;
        const rank=+run.rank;
        const field=Math.max(rank,+run.field_size||18,2);
        const performance=Number.isFinite(rank)&&rank>0
          ? Math.max(35,100-((rank-1)/Math.max(1,field-1))*65)
          : null;
        if(performance!==null){
          formN+=performance*weight;formD+=weight;
          if(Number.isFinite(+run.distance)){
            const proximity=Math.max(.15,1-Math.abs(+run.distance-targetDistance)/800);
            distN+=performance*weight*proximity;distD+=weight*proximity;
          }
          if(run.venue&&(!run.surface||run.surface===(document.getElementById('surface')?.value||'芝'))){
            const similarity=courseSimilarity(targetVenue,run.venue);
            const distanceFit=Number.isFinite(+run.distance)?Math.max(.25,1-Math.abs(+run.distance-targetDistance)/800):.5;
            if(similarity){
              const courseWeight=weight*similarity*distanceFit;
              courseN+=performance*courseWeight;courseD+=courseWeight;
              if(similarity===1)courseExact++;else courseSimilar++;
            }
          }
          if(run.going&&run.going===targetGoing){goingN+=performance*weight;goingD+=weight}
        }
        const last3f=validLast3f(run.last3f);
        if(last3f!==undefined){
          // 距離・芝ダート・馬場別の標準値との差を点数化する。
          // 短距離の33秒台を一律100点にせず、35～97点に分散させる。
          const closing=Math.max(35,Math.min(97,75+(expectedLast3f(run)-last3f)*9.5));
          closingN+=closing*weight;closingD+=weight;
        }
      });
      const form=+(formD?formN/formD:65).toFixed(1);
      const closing=+(closingD?closingN/closingD:65).toFixed(1);
      const grade=historyGradeFeature(hist);
      return {
        available:true,
        // 現在版の speed/last3f と旧描画の form/closing の両方へ同じ値を渡す。
        speed:form,
        last3f:closing,
        form,
        closing,
        distance:+(distD?distN/distD:70).toFixed(1),
        course:+(courseD?courseN/courseD:65).toFixed(1),
        going:+(goingD?goingN/goingD:70).toFixed(1),
        grade:grade.score,
        gradeSamples:grade.count,
        courseBasis:{exact:courseExact,similar:courseSimilar,label:`同競馬場${courseExact}走＋類似形状${courseSimilar}走`},
        samples:{form:+formD.toFixed(2),closing:+closingD.toFixed(2),distance:+distD.toFixed(2),course:+courseD.toFixed(2),going:+goingD.toFixed(2)},
        source:'netkeiba距離別上がり・コース形状・レース格補正'
      };
    }

    scoreLocalHistory=function(rows){
      return scoreBalancedHistory(rows);
    };

    function bodyWeightFeature(h){
      const current=Number.isFinite(+h?.body_weight)&&+h.body_weight>=300?Math.round(+h.body_weight):null;
      const historyWeight=(h?.history||[]).find(run=>Number.isFinite(+run.body_weight)&&+run.body_weight>=300)?.body_weight;
      const previous=Number.isFinite(+h?.last_body_weight)&&+h.last_body_weight>=300
        ?Math.round(+h.last_body_weight)
        :(Number.isFinite(+historyWeight)?Math.round(+historyWeight):null);
      if(!current){
        return {score:75,current:null,previous,change:null,published:false,label:previous?`未発表（前走${previous}kg・評価は中立）`:'未発表（評価は中立）'};
      }
      if(!previous){
        return {score:75,current,previous:null,change:null,published:true,label:`${current}kg（前走比較なし・評価は中立）`};
      }
      const change=current-previous;
      const rate=Math.abs(change)/previous*100;
      let score=80;
      if(rate>1.5)score=75;
      if(rate>3)score=68;
      if(rate>5)score=58;
      // 大幅減は消耗の可能性を考えて同率の増加より少し慎重に扱う。
      if(change<0&&rate>2)score-=3;
      score=Math.max(50,Math.min(84,score));
      const sign=change>0?'+':'';
      return {score,current,previous,change,published:true,label:`${current}kg（${sign}${change}kg）`};
    }
    window.__bodyWeightFeatureV57=bodyWeightFeature;

    function currentRaceActualOdds(h){
      if(!officialOddsCache())return null;
      const record=cachedWinRecord(h);
      let fromCache=null;
      try{fromCache=typeof oddsNumber==='function'?oddsNumber(record):Number(record?.odds??record)}catch(_){}
      const direct=[fromCache,h?.actual_odds,h?.winOdds,h?.odds].map(Number).find(x=>Number.isFinite(x)&&x>1);
      return direct||null;
    }

    function addAnalysisEvidence(){
      const evidence=document.getElementById('evidence');
      if(evidence){
        evidence.querySelector?.('[data-grade-odds-evidence]')?.remove();
        const line=document.createElement('div');
        line.dataset.gradeOddsEvidence='1';
        line.textContent='追加評価：過去走のレース格 10% / 馬体重 6%。実オッズ未発表時はAI予想オッズ・予想人気を表示し、購入額と妙味判定には使いません。';
        evidence.appendChild(line);
      }
      const profile=document.getElementById('courseProfile');
      if(profile){
        profile.querySelector?.('[data-course-basis]')?.remove();
        const line=document.createElement('div');
        line.dataset.courseBasis='1';
        line.className='small';
        line.style.marginTop='6px';
        const venue=document.getElementById('venue')?.value||'';
        const distance=document.getElementById('distance')?.value||'';
        line.textContent=`コース指数の根拠：${venue}${distance}mの同競馬場実績を最優先し、同じ回り・直線形状・坂の近い競馬場と距離差を段階補正。着順を頭数で正規化し、直近ほど重く評価。`;
        profile.appendChild(line);
      }
    }

    function improveHorseHistoryPresentation(){
      const cards=[...document.querySelectorAll('#horses .card')];
      cards.forEach(card=>{
        const title=card.querySelector('.rank')?.textContent||'';
        const h=(horses||[]).find(x=>title.includes(x.name));
        if(!h)return;
        const runs=(h.histScores?.available?(h.history||[]):((h.jra_history||[]))).slice(0,5);
        const histRows=[...card.querySelectorAll('.hist-row')];
        histRows.forEach((row,index)=>{
          const run=runs[index];
          const spans=row.querySelectorAll('span');
          if(!run||spans.length<3)return;
          const grade=normalizeGrade(run.grade||run.race_name);
          spans[2].textContent=[`${run.surface||''}${run.distance||''}`,grade||'格未取得'].join(' ');
          if(run.race_name)spans[1].textContent=`${run.venue||'—'}・${run.race_name}`;
        });
        card.querySelector?.('[data-grade-summary]')?.remove();
        const grade=historyGradeFeature(runs);
        const summary=document.createElement('div');
        summary.dataset.gradeSummary='1';
        summary.className='metric';
        summary.innerHTML=`<span>レース格</span><b>${grade.score.toFixed(1)}（${grade.label}）</b>`;
        const hist=card.querySelector('.hist');
        if(hist)card.insertBefore(summary,hist);else card.appendChild(summary);
      });
    }

    function bodyWeightEvidence(){
      const box=document.getElementById('evidence');
      if(!box||!(horses||[]).length)return;
      const current=(horses||[]).filter(h=>bodyWeightFeature(h).published).length;
      const previous=(horses||[]).filter(h=>bodyWeightFeature(h).previous).length;
      const old=box.querySelector?.('[data-body-weight-evidence]');
      if(old)old.remove();
      const line=document.createElement('div');
      line.dataset.bodyWeightEvidence='1';
      line.textContent=`馬体重：現在 ${current}/${horses.length}頭発表 / 前走体重 ${previous}/${horses.length}頭 / 総合指数6%（未発表は中立）`;
      const detail=box.querySelector?.('.small');
      if(detail)box.insertBefore(line,detail);else box.appendChild(line);
    }

    function rerenderBodyAwareRanking(){
      if(typeof evaluated==='undefined'||!Array.isArray(evaluated)||!evaluated.length)return;
      evaluated=evaluated.map(h=>{
        const body=bodyWeightFeature(h);
        const grade=historyGradeFeature((h.history||[]).length?h.history:h.jra_history||[]);
        const score=Math.max(40,Math.min(99,(+h.score||65)*.84+grade.score*.10+body.score*.06));
        const baseScore=Math.max(40,Math.min(99,(+h.baseScore||+h.score||65)*.84+grade.score*.10+body.score*.06));
        return {...h,score,baseScore,gradeScore:grade.score,gradeLabel:grade.label,bodyWeightScore:body.score,bodyWeightLabel:body.label,bodyWeightPublished:body.published};
      }).sort((a,b)=>b.score-a.score);
      const ex=evaluated.map(h=>Math.exp((h.score-75)/7));
      const total=ex.reduce((sum,value)=>sum+value,0)||1;
      evaluated=evaluated.map((h,index)=>{
        const win=ex[index]/total*100;
        const place=Math.max(4,Math.min(88,win*2.35+(h.score-70)*.55));
        return {...h,win,place,aiForecastOdds:+Math.max(1.1,80/Math.max(.75,win)).toFixed(1)};
      });
      const forecastOrder=[...evaluated].sort((a,b)=>a.aiForecastOdds-b.aiForecastOdds);
      const forecastPopularity=new Map(forecastOrder.map((h,index)=>[clean(h.name),index+1]));
      evaluated=evaluated.map(h=>({...h,aiForecastPopularity:forecastPopularity.get(clean(h.name))||null}));
      const ranking=document.getElementById('ranking');
      if(ranking){
        ranking.innerHTML=evaluated.slice(0,6).map((h,index)=>{
          const actual=currentRaceActualOdds(h);
          const odds=actual?`${actual.toFixed(1)}倍 / 実オッズ`:`${h.aiForecastOdds.toFixed(1)}倍 / AI予想${h.aiForecastPopularity}番人気 / 実オッズ未発表`;
          let popularity='';
          if(actual){try{const p=typeof winPopularityFor==='function'?winPopularityFor(h):null;if(p)popularity=` / ${p}番人気`}catch(_){}}
          const value=h.valueIndex?` / 妙味${h.valueIndex>=1.18?'あり':h.valueIndex<=.82?'薄め':'中立'}`:'';
          const bodyMetric=h.bodyWeightPublished?`${h.bodyWeightLabel} / ${h.bodyWeightScore.toFixed(1)}`:h.bodyWeightLabel;
          return `<div class="card"><div class="rank">${['◎','○','▲','△','☆','注'][index]||''} ${h.no} ${h.name}</div><div class="score">${h.score.toFixed(1)}</div><div class="metric"><span>近走</span><b>${(+h.speed).toFixed(1)}</b></div><div class="metric"><span>上がり</span><b>${(+h.last3f).toFixed(1)}</b></div><div class="metric"><span>コース</span><b>${(+h.course).toFixed(1)}</b></div><div class="metric"><span>レース格</span><b>${h.gradeScore.toFixed(1)}</b></div><div class="metric"><span>馬体重</span><b>${bodyMetric}</b></div><div class="metric"><span>1着率</span><b>${h.win.toFixed(1)}%</b></div><div class="metric"><span>3着内率</span><b>${h.place.toFixed(1)}%</b></div><div class="small" style="margin-top:7px">単勝 ${odds}${popularity}${actual?value:''}</div></div>`;
        }).join('');
      }
      const rows=document.getElementById('rows');
      if(rows){
        const table=rows.closest?.('table');
        const head=table?.querySelector('thead tr');
        if(head)head.innerHTML='<th>馬</th><th>AI指数</th><th>近走</th><th>上がり</th><th>レース格</th><th>馬体重</th><th>距離</th><th>コース</th><th>AI予想オッズ</th><th>1着率</th><th>3着内率</th>';
        rows.innerHTML=evaluated.map(h=>{const actual=currentRaceActualOdds(h);const odds=actual?`${actual.toFixed(1)}倍（実オッズ）`:`${h.aiForecastOdds.toFixed(1)}倍（AI予想${h.aiForecastPopularity}番人気）`;return `<tr><td>${h.no} ${h.name}</td><td>${h.score.toFixed(1)}</td><td>${(+h.speed).toFixed(1)}</td><td>${(+h.last3f).toFixed(1)}</td><td>${h.gradeScore.toFixed(1)}</td><td>${h.bodyWeightPublished?`${h.bodyWeightLabel} / ${h.bodyWeightScore.toFixed(1)}`:h.bodyWeightLabel}</td><td>${(+h.distance).toFixed(1)}</td><td>${(+h.course).toFixed(1)}</td><td>${odds}</td><td>${h.win.toFixed(1)}%</td><td>${h.place.toFixed(1)}%</td></tr>`}).join('');
      }
      bodyWeightEvidence();
      addAnalysisEvidence();
      improveHorseHistoryPresentation();
      const raceStatus=document.getElementById('raceStatus');
      if(raceStatus&&/最新オッズを取得してAI分析中/.test(raceStatus.textContent||'')){
        raceStatus.innerHTML='<div class="status ok">AI分析が完了しました。馬体重・距離別上がり・コース形状・過去走のレース格を反映済みです。実オッズ未発表中はAI予想オッズを表示します。</div>';
      }
    }

    const originalRenderHorses=renderHorses;
    renderHorses=function(){
      sanitizeAllHistories();
      applyVerifiedHistories();
      applyCurrentRoster();
      clearPreentryOdds();
      const value=originalRenderHorses.apply(this,arguments);
      improveHorseHistoryPresentation();
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
        correctCourseMetadata();
        clearPreentryOdds();
        for(const h of horses||[]){
          if((h.history||[]).length)h.histScores=scoreBalancedHistory(h.history);
          else if((h.jra_history||[]).length)h.histScores=scoreBalancedHistory(h.jra_history);
        }
        const usable=(horses||[]).filter(h=>(h.history||[]).length||(h.jra_history||[]).length).length;
        if((horses||[]).length&&usable===0){
          if(typeof evaluated!=='undefined')evaluated=[];
          const box=document.getElementById('ranking');
          if(box)box.innerHTML='<div class="card"><b>分析を保留しています</b><div class="small" style="margin-top:8px">過去5走が0頭のため、仮の数値だけで順位を作らないよう停止しました。「過去5走を再取得」を押してください。</div></div>';
          return [];
        }
        const value=originalEvalAll.apply(this,arguments);
        rerenderBodyAwareRanking();
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
        if(!silent)showStatus('過去5走を取得中です。通常30秒以内で完了します…');
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

          const need=horses.filter(h=>force||historyNeedsRefresh(h));
          let results=[];
          let fallbackError=null;
          try{
            results=await fallbackRows(need);
          }catch(error){
            fallbackError=error;
          }
          for(const row of results){
            const h=horses.find(x=>clean(x.name)===clean(row.name));
            if(!h||!Array.isArray(row.history)||!row.history.length)continue;
            const expected=horseId(h);
            const received=responseHorseId(row);
            const trustedForeign=clean(h.name)==='ファストネットワーク'&&expected==='000a02c324'&&clean(row.name)===clean(h.name);
            if(expected&&received!==expected&&!trustedForeign){
              rejected.push(h.name);
              h.netkeibaRejected=true;
              h.netkeibaError='同名の別馬を除外しました';
              continue;
            }
            applyHistory(h,row.history,row.via||'netkeiba過去走');
            if(trustedForeign&&received){h.horse_id=received;h.netkeiba_horse_id=received}
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
      const incomplete=hasHorses&&horses.some(historyNeedsRefresh);
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

(function(){
  'use strict';
  if(window.__keibaPredictionTrackerV237)return;
  window.__keibaPredictionTrackerV237=true;

  const SUPABASE_URL='https://qhzccahbevnqaoxdfnbx.supabase.co';
  const SUPABASE_KEY='sb_publishable_i_5mqOMlvWvUI99_8gjdYw_g5TaSwrm';
  const APP_ID='keiba-ai-simulator';
  const TABLE='keiba_prediction_snapshots';

  function headers(extra){
    return Object.assign({
      apikey:SUPABASE_KEY,
      Authorization:'Bearer '+SUPABASE_KEY,
      'Content-Type':'application/json'
    },extra||{});
  }

  function text(id){
    const e=document.getElementById(id);
    return e?String(e.innerText||e.textContent||'').trim():'';
  }

  function val(id){
    const e=document.getElementById(id);
    return e?String(e.value||'').trim():'';
  }

  function currentRaceId(){
    const probes=[val('jraEntryUrl'),val('jraResultUrl'),text('jraEntryStatus'),text('jraResultStatus'),document.body?document.body.innerText:''];
    for(const s of probes){
      const m=String(s||'').match(/(?:race_id=|race_id\s+|\b)(20\d{10})(?:\b|&)/);
      if(m)return m[1];
    }
    return '';
  }

  function raceDateFromIdOrText(){
    const body=document.body?String(document.body.innerText||''):'';
    const m=body.match(/(20\d{2})[年\/.-](\d{1,2})[月\/.-](\d{1,2})日?/);
    if(m)return m[1]+String(m[2]).padStart(2,'0')+String(m[3]).padStart(2,'0');
    return '';
  }

  function planElement(){
    return document.getElementById('trifectaPlan')||
      Array.from(document.querySelectorAll('.card')).find(e=>/3連複買い目|推奨方式/.test(String(e.innerText||'')))||null;
  }

  function parsePlan(){
    const el=planElement();
    const raw=el?String(el.innerText||el.textContent||''):'';
    if(!raw)return null;
    const mm=raw.match(/推奨方式\s*[:：]\s*(1頭軸流し|2頭軸流し|フォーメーション)/);
    const mode=mm?mm[1]:'';
    const tickets=[];
    const seen=new Set();
    const re=/(?:^|[^\d])(\d{1,2})\s*[-－]\s*(\d{1,2})\s*[-－]\s*(\d{1,2})(?=$|[^\d])/g;
    let m;
    while((m=re.exec(raw))){
      const a=[+m[1],+m[2],+m[3]].filter(n=>n>=1&&n<=18).sort((x,y)=>x-y);
      if(a.length!==3||new Set(a).size!==3)continue;
      const k=a.join('-');
      if(!seen.has(k)){seen.add(k);tickets.push(a);}
    }
    const pc=raw.match(/点数\s*[:：]?\s*(\d+)\s*点/);
    const ticketCount=pc?+pc[1]:tickets.length;
    const a1=raw.match(/(?:^|\n)\s*軸\s*[:：]\s*([\d・,、\s]+)/);
    const a2=raw.match(/2頭軸\s*[:：]\s*([\d・,、\s]+)/);
    const axisRaw=(a2&&a2[1])||(a1&&a1[1])||'';
    const axes=(axisRaw.match(/\d{1,2}/g)||[]).map(Number).filter(n=>n>=1&&n<=18);
    return {raw,mode,tickets,ticketCount,axes};
  }

  function extractHorseNo(cells){
    const first=String((cells&&cells[0])||'').trim();
    let m=first.match(/(?:^|\s)(\d{1,2})(?:\s|$)/);
    if(m&&+m[1]>=1&&+m[1]<=18)return +m[1];
    for(const c of (cells||[])){
      const s=String(c||'').trim();
      m=s.match(/^\s*(\d{1,2})\s*(?:番)?(?:\s|$)/);
      if(m&&+m[1]>=1&&+m[1]<=18)return +m[1];
    }
    return null;
  }

  function extractScore(cells){
    for(const c of (cells||[]).slice().reverse()){
      const nums=String(c||'').match(/\d+(?:\.\d+)?/g)||[];
      for(let i=nums.length-1;i>=0;i--){
        const n=Number(nums[i]);
        if(Number.isFinite(n)&&n>=0&&n<=100)return n;
      }
    }
    return null;
  }

  function parseRanking(){
    const body=document.getElementById('ranking');
    if(!body)return [];
    return Array.from(body.querySelectorAll('tr')).map((tr,i)=>{
      const cells=Array.from(tr.querySelectorAll('td')).map(td=>String(td.innerText||td.textContent||'').trim());
      return {rank:i+1,no:extractHorseNo(cells),score:extractScore(cells),cells};
    }).filter(x=>x.cells.length).slice(0,18);
  }

  function parseOddsFromRunners(){
    const out={};
    const root=document.getElementById('runners');
    if(!root)return out;
    Array.from(root.children).forEach(row=>{
      const ins=Array.from(row.querySelectorAll('input,select'));
      if(ins.length<2)return;
      const vals=ins.map(x=>String(x.value||'').trim());
      const no=vals.find(v=>/^\d{1,2}$/.test(v)&&+v>=1&&+v<=18);
      if(!no)return;
      const odds=vals.map(Number).find(v=>Number.isFinite(v)&&v>=1&&v<=999.9);
      if(Number.isFinite(odds))out[no]=odds;
    });
    return out;
  }

  function statusNode(){
    let e=document.getElementById('predictionTrackerV237Status');
    if(e)return e;
    const old=document.getElementById('predictionTrackerV232Status');
    if(old)old.remove();
    e=document.createElement('div');
    e.id='predictionTrackerV237Status';
    e.style.cssText='margin:8px 0 2px;font-size:12px;font-weight:700;color:#8b949e;line-height:1.55';
    const a=document.getElementById('memoryStatus')||document.getElementById('importStatus')||document.getElementById('jraEntryStatus');
    if(a&&a.parentNode)a.parentNode.insertBefore(e,a.nextSibling);
    return e;
  }

  function setStatus(s,warn){
    const e=statusNode();
    if(e){e.textContent=s;e.style.color=warn?'#d29922':'#8b949e';}
  }

  function dedupeByRace(rows){
    const map=new Map();
    (Array.isArray(rows)?rows:[]).forEach(r=>{
      const k=String(r.race_id||'');
      if(!k)return;
      const prev=map.get(k);
      if(!prev){map.set(k,r);return;}
      const pt=new Date(prev.settled_at||prev.snapshot_at||0).getTime()||0;
      const rt=new Date(r.settled_at||r.snapshot_at||0).getTime()||0;
      if(rt>=pt)map.set(k,r);
    });
    return Array.from(map.values());
  }

  function rankingMetrics(rec){
    const result=Array.isArray(rec.result_top3)?rec.result_top3.map(Number):[];
    const ranking=Array.isArray(rec.ranking)?rec.ranking:[];
    const rankedNos=ranking.map(r=>Number(r&&r.no)).filter(n=>n>=1&&n<=18);
    if(result.length<3||rankedNos.length===0)return null;
    const top1=rankedNos[0];
    const top3=rankedNos.slice(0,3);
    return {
      top1Win:top1===result[0],
      top1Place:result.includes(top1),
      top3ExactSet:top3.length===3&&top3.every(n=>result.includes(n)),
      top3Covered:top3.filter(n=>result.includes(n)).length
    };
  }

  async function refreshStats(){
    try{
      const url=SUPABASE_URL+'/rest/v1/'+TABLE+'?app_id=eq.'+encodeURIComponent(APP_ID)+'&select=race_id,hit,payout_yen,stake_yen,settled_at,snapshot_at,result_top3,ranking';
      const r=await fetch(url,{headers:headers(),cache:'no-store'});
      if(!r.ok)throw new Error('stats HTTP '+r.status);
      const rows=dedupeByRace(await r.json());
      const settled=rows.filter(x=>x.settled_at&&Array.isArray(x.result_top3)&&x.result_top3.length>=3);
      const hits=settled.filter(x=>x.hit===true).length;
      const stake=settled.reduce((s,x)=>s+Number(x.stake_yen||0),0);
      const payout=settled.reduce((s,x)=>s+Number(x.payout_yen||0),0);
      const hitRate=settled.length?(hits/settled.length*100).toFixed(1):'-';
      const roi=stake>0?(payout/stake*100).toFixed(1):'-';
      const rm=settled.map(rankingMetrics).filter(Boolean);
      const top1Win=rm.length?(rm.filter(x=>x.top1Win).length/rm.length*100).toFixed(1):'-';
      const top1Place=rm.length?(rm.filter(x=>x.top1Place).length/rm.length*100).toFixed(1):'-';
      const top3Exact=rm.length?(rm.filter(x=>x.top3ExactSet).length/rm.length*100).toFixed(1):'-';
      const avgTop3=rm.length?(rm.reduce((s,x)=>s+x.top3Covered,0)/rm.length).toFixed(2):'-';
      setStatus('📊 AI予想保存 '+rows.length+'R / 結果照合 '+settled.length+'R / 3連複的中率 '+hitRate+'% / AI1位→1着 '+top1Win+'% / AI1位→3着内 '+top1Place+'% / AI上位3頭一致 '+top3Exact+'% / 上位3頭平均的中 '+avgTop3+'頭 / 回収率 '+roi+'%',false);
    }catch(e){
      setStatus('⚠ AI予想実績の集計は次回再試行',true);
    }
  }

  async function getExisting(raceId){
    try{
      const u=SUPABASE_URL+'/rest/v1/'+TABLE+'?app_id=eq.'+encodeURIComponent(APP_ID)+'&race_id=eq.'+encodeURIComponent(raceId)+'&select=*';
      const r=await fetch(u,{headers:headers(),cache:'no-store'});
      if(!r.ok)return [];
      const a=await r.json();
      return Array.isArray(a)?a:[];
    }catch(e){return [];}
  }

  async function replaceRaceRecord(raceId,payload){
    const delUrl=SUPABASE_URL+'/rest/v1/'+TABLE+'?app_id=eq.'+encodeURIComponent(APP_ID)+'&race_id=eq.'+encodeURIComponent(raceId);
    const dr=await fetch(delUrl,{method:'DELETE',headers:headers({Prefer:'return=minimal'})});
    if(!dr.ok&&dr.status!==404)throw new Error('dedupe DELETE '+dr.status);
    const r=await fetch(SUPABASE_URL+'/rest/v1/'+TABLE,{
      method:'POST',headers:headers({Prefer:'return=minimal'}),body:JSON.stringify(payload)
    });
    if(!r.ok)throw new Error('snapshot POST '+r.status);
  }

  async function saveSnapshot(){
    try{
      const raceId=currentRaceId();
      const plan=parsePlan();
      const ranking=parseRanking();
      if(!raceId||!plan||!plan.mode||!plan.ticketCount||!ranking.length)return false;
      const old=(await getExisting(raceId))[0]||{};
      const payload={
        app_id:APP_ID,
        race_id:raceId,
        race_date:raceDateFromIdOrText()||old.race_date||null,
        course:val('course').replace(/競馬場$/,'')||old.course||null,
        race_no:Number(raceId.slice(-2))||old.race_no||null,
        surface:val('surface')||old.surface||null,
        distance:Number(val('distance')||0)||old.distance||null,
        mode:plan.mode,
        ticket_count:plan.ticketCount,
        tickets:plan.tickets,
        ranking:ranking,
        odds:parseOddsFromRunners(),
        snapshot_at:new Date().toISOString(),
        stake_yen:plan.ticketCount*100,
        result_top3:old.result_top3||null,
        hit:typeof old.hit==='boolean'?old.hit:null,
        miss_type:old.miss_type||null,
        payout_yen:old.payout_yen!=null?old.payout_yen:null,
        settled_at:old.settled_at||null
      };
      await replaceRaceRecord(raceId,payload);
      setStatus('📌 このレースのAI分析・ランキング・3連複買い目・スコアを1件に更新保存',false);
      setTimeout(refreshStats,250);
      return true;
    }catch(e){
      setStatus('⚠ AI予想保存を再試行してください',true);
      return false;
    }
  }

  function resultRowsFromScreen(){
    const body=document.body?String(document.body.innerText||''):'';
    const idx=body.lastIndexOf('確定着順（全頭）');
    const src=idx>=0?body.slice(idx,idx+7000):'';
    const rows=[];
    const re=/(\d{1,2})着\s+(\d{1,2})(?:\s+|\t)([^\n]+)/g;
    let m;
    while((m=re.exec(src))){
      const pos=+m[1],no=+m[2];
      if(pos>=1&&pos<=18&&no>=1&&no<=18&&!rows.some(x=>x.no===no))rows.push({pos,no,name:String(m[3]||'').trim()});
    }
    return rows;
  }

  function payoutFromResultText(){
    const raw=val('resultText')+'\n'+text('jraResultStatus')+'\n'+(document.body?document.body.innerText:'');
    const near=raw.match(/3連複[\s\S]{0,220}?([0-9]{1,3}(?:,[0-9]{3})*)\s*円/);
    return near?Number(near[1].replace(/,/g,'')):null;
  }

  async function settleCurrentRace(){
    try{
      const raceId=currentRaceId()||((val('jraResultUrl').match(/20\d{10}/)||[])[0]||'');
      if(!raceId)return false;
      const rows=resultRowsFromScreen();
      const eligible=rows.filter(x=>x.pos>=1&&x.pos<=3).map(x=>x.no);
      if(eligible.length<3)return false;
      const recs=await getExisting(raceId);
      const rec=dedupeByRace(recs)[0]||recs[0];
      if(!rec)return false;
      const tickets=Array.isArray(rec.tickets)?rec.tickets:[];
      const winning=tickets.find(t=>Array.isArray(t)&&t.length===3&&t.every(n=>eligible.includes(Number(n))));
      const hit=!!winning;
      let missType='組合せ抜け';
      if(!hit){
        const plan=parsePlan();
        const axes=plan&&plan.axes||[];
        if((rec.mode==='1頭軸流し'||rec.mode==='2頭軸流し')&&axes.length&&axes.some(n=>!eligible.includes(Number(n))))missType='軸飛び';
        else if(rec.mode==='1頭軸流し'||rec.mode==='2頭軸流し')missType='相手抜け';
      }else missType=null;
      rec.result_top3=eligible;
      rec.hit=hit;
      rec.miss_type=missType;
      rec.payout_yen=hit?payoutFromResultText():0;
      rec.stake_yen=Number(rec.stake_yen||rec.ticket_count*100||0);
      rec.settled_at=new Date().toISOString();
      await replaceRaceRecord(raceId,rec);
      const rm=rankingMetrics(rec);
      const extra=rm?' / AI1位 '+(rm.top1Win?'1着':'1着外')+' / AI上位3頭 '+rm.top3Covered+'/3頭':'';
      setStatus((hit?'🎯 3連複的中':'📉 3連複不的中: '+missType)+extra,false);
      setTimeout(refreshStats,250);
      return true;
    }catch(e){
      return false;
    }
  }

  function scheduleSnapshot(){[500,1400,3000].forEach(ms=>setTimeout(saveSnapshot,ms));}
  function scheduleSettle(){[1200,3000,6000,10000].forEach(ms=>setTimeout(settleCurrentRace,ms));}

  function hook(id,fn){
    const e=document.getElementById(id);
    if(!e||e.dataset.predictionTrackerV237)return;
    e.dataset.predictionTrackerV237='1';
    e.addEventListener('click',fn,false);
  }

  function mount(){
    hook('batch',scheduleSnapshot);
    hook('play',scheduleSnapshot);
    hook('navAnalyze',scheduleSnapshot);
    hook('fetchJraEntry',function(){setTimeout(scheduleSnapshot,2500);});
    hook('fetchJraResult',scheduleSettle);
    hook('autoLearnResult',scheduleSettle);
    refreshStats();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else setTimeout(mount,0);
})();

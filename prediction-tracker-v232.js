(function(){
  'use strict';
  if(window.__keibaPredictionTrackerV232)return;
  window.__keibaPredictionTrackerV232=true;

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
    const probes=[val('jraEntryUrl'),text('jraEntryStatus'),document.body?document.body.innerText:''];
    for(const s of probes){
      const m=String(s||'').match(/(?:race_id=|race_id\s+|\b)(20\d{10})(?:\b|&)/);
      if(m)return m[1];
    }
    return '';
  }

  function raceDateFromIdOrText(raceId){
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

  function parseRanking(){
    const body=document.getElementById('ranking');
    if(!body)return [];
    return Array.from(body.querySelectorAll('tr')).map((tr,i)=>{
      const cells=Array.from(tr.querySelectorAll('td')).map(td=>String(td.innerText||td.textContent||'').trim());
      return {rank:i+1,cells};
    }).slice(0,18);
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
    let e=document.getElementById('predictionTrackerV232Status');
    if(e)return e;
    e=document.createElement('div');
    e.id='predictionTrackerV232Status';
    e.style.cssText='margin:6px 0 2px;font-size:11px;font-weight:700;color:#8b949e;line-height:1.45';
    const a=document.getElementById('memoryStatus')||document.getElementById('importStatus')||document.getElementById('jraEntryStatus');
    if(a&&a.parentNode)a.parentNode.insertBefore(e,a.nextSibling);
    return e;
  }

  function setStatus(s,warn){
    const e=statusNode();
    if(e){e.textContent=s;e.style.color=warn?'#d29922':'#8b949e';}
  }

  async function refreshStats(){
    try{
      const url=SUPABASE_URL+'/rest/v1/'+TABLE+'?app_id=eq.'+encodeURIComponent(APP_ID)+'&select=race_id,hit,payout_yen,stake_yen,settled_at';
      const r=await fetch(url,{headers:headers(),cache:'no-store'});
      if(!r.ok)throw new Error('stats HTTP '+r.status);
      const rows=await r.json();
      const all=Array.isArray(rows)?rows:[];
      const settled=all.filter(x=>x.settled_at);
      const hits=settled.filter(x=>x.hit===true).length;
      const stake=settled.reduce((s,x)=>s+Number(x.stake_yen||0),0);
      const payout=settled.reduce((s,x)=>s+Number(x.payout_yen||0),0);
      const hitRate=settled.length?(hits/settled.length*100).toFixed(1):'-';
      const roi=stake>0?(payout/stake*100).toFixed(1):'-';
      setStatus('📊 予想記録 '+all.length+'R / 結果照合 '+settled.length+'R / 的中率 '+hitRate+'% / 回収率 '+roi+'%',false);
    }catch(e){
      setStatus('⚠ 予想実績の集計は次回再試行',true);
    }
  }

  async function saveSnapshot(){
    try{
      const raceId=currentRaceId();
      const plan=parsePlan();
      if(!raceId||!plan||!plan.mode||!plan.ticketCount)return false;
      const course=val('course').replace(/競馬場$/,'');
      const surface=val('surface');
      const distance=Number(val('distance')||0)||null;
      const raceNo=Number(raceId.slice(-2))||null;
      const payload={
        app_id:APP_ID,
        race_id:raceId,
        race_date:raceDateFromIdOrText(raceId)||null,
        course:course||null,
        race_no:raceNo,
        surface:surface||null,
        distance:distance,
        mode:plan.mode,
        ticket_count:plan.ticketCount,
        tickets:plan.tickets,
        ranking:parseRanking(),
        odds:parseOddsFromRunners(),
        snapshot_at:new Date().toISOString(),
        stake_yen:plan.ticketCount*100,
        result_top3:null,
        hit:null,
        miss_type:null,
        payout_yen:null,
        settled_at:null
      };
      const url=SUPABASE_URL+'/rest/v1/'+TABLE+'?on_conflict=app_id,race_id';
      const r=await fetch(url,{
        method:'POST',
        headers:headers({Prefer:'resolution=merge-duplicates,return=minimal'}),
        body:JSON.stringify(payload)
      });
      if(!r.ok)throw new Error('snapshot HTTP '+r.status);
      setStatus('📌 今回のAI買い目をSupabaseへ記録済み',false);
      setTimeout(refreshStats,250);
      return true;
    }catch(e){
      setStatus('⚠ 予想スナップショット保存を再試行してください',true);
      return false;
    }
  }

  function resultRowsFromScreen(){
    const body=document.body?String(document.body.innerText||''):'';
    const idx=body.lastIndexOf('確定着順（全頭）');
    const src=idx>=0?body.slice(idx,idx+5000):'';
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
    const raw=val('resultText')+'\n'+text('jraResultStatus');
    const near=raw.match(/3連複[\s\S]{0,180}?([0-9]{1,3}(?:,[0-9]{3})*)\s*円/);
    return near?Number(near[1].replace(/,/g,'')):null;
  }

  async function settleCurrentRace(){
    try{
      const raceId=currentRaceId()||((val('jraResultUrl').match(/20\d{10}/)||[])[0]||'');
      if(!raceId)return false;
      const rows=resultRowsFromScreen();
      const eligible=rows.filter(x=>x.pos>=1&&x.pos<=3).map(x=>x.no);
      if(eligible.length<3)return false;

      const getUrl=SUPABASE_URL+'/rest/v1/'+TABLE+'?app_id=eq.'+encodeURIComponent(APP_ID)+'&race_id=eq.'+encodeURIComponent(raceId)+'&select=*';
      const gr=await fetch(getUrl,{headers:headers(),cache:'no-store'});
      if(!gr.ok)throw new Error('lookup HTTP '+gr.status);
      const recs=await gr.json();
      const rec=recs&&recs[0];
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
      const payout=hit?payoutFromResultText():0;
      const patch={
        result_top3:eligible,
        hit:hit,
        miss_type:missType,
        payout_yen:payout,
        stake_yen:Number(rec.stake_yen||rec.ticket_count*100||0),
        settled_at:new Date().toISOString()
      };
      const url=SUPABASE_URL+'/rest/v1/'+TABLE+'?app_id=eq.'+encodeURIComponent(APP_ID)+'&race_id=eq.'+encodeURIComponent(raceId);
      const r=await fetch(url,{method:'PATCH',headers:headers({Prefer:'return=minimal'}),body:JSON.stringify(patch)});
      if(!r.ok)throw new Error('settle HTTP '+r.status);
      setStatus(hit?'🎯 結果照合: 的中':'📉 結果照合: '+missType,false);
      setTimeout(refreshStats,250);
      return true;
    }catch(e){
      return false;
    }
  }

  function scheduleSnapshot(){
    [500,1400,3000].forEach(ms=>setTimeout(saveSnapshot,ms));
  }
  function scheduleSettle(){
    [1200,3000,6000,10000].forEach(ms=>setTimeout(settleCurrentRace,ms));
  }

  function hook(id,fn){
    const e=document.getElementById(id);
    if(!e||e.dataset.predictionTrackerV232)return;
    e.dataset.predictionTrackerV232='1';
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
    setTimeout(saveSnapshot,3500);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else setTimeout(mount,0);
})();

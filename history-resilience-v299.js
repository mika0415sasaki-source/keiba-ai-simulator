(()=>{
  if(window.__historyResilienceV299)return;
  window.__historyResilienceV299=true;
  const ENRICH='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/keiba-race-enrich-v1';
  const el=id=>document.getElementById(id);
  const norm=s=>String(s||'').normalize('NFKC').replace(/[\s　]+/g,'').trim();
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const show=(msg,err=false)=>{const x=el('histStatus');if(x)x.innerHTML=`<div class="status ${err?'err':'ok'}">${esc(msg).replace(/\n/g,'<br>')}</div>`};
  const state={loading:false,controller:null,seq:0};

  function items(){
    return (Array.isArray(horses)?horses:[]).map(h=>({
      name:h.name,
      id:String(h.netkeiba_horse_id||h.horse_id||''),
      sire:h.sire||'',dam:h.dam||'',damsire:h.damsire||'',
      style:['逃','先','差','追'].includes(h.style)?h.style:'',
      style_source:h.style_source||'',
      history:Array.isArray(h.history)?h.history.slice(0,5):[]
    }));
  }
  function body(){
    const url=String(el('raceUrl')?.value||raceMeta?.source_url||'');
    return {mode:'full',race_id:raceMeta?.race_id||'',url,race_date:raceMeta?.race_date||raceMeta?.date||'',items:items()};
  }
  async function post(payload,controller,ms=45000){
    let timer;
    try{
      timer=setTimeout(()=>{try{controller.abort('timeout')}catch(_){}},ms);
      const r=await fetch(ENRICH,{method:'POST',cache:'no-store',signal:controller.signal,headers:{'Content-Type':'application/json','Cache-Control':'no-cache'},body:JSON.stringify(payload)});
      const j=await r.json().catch(()=>({error:`応答JSONを読めません (${r.status})`}));
      if(!r.ok)throw new Error(j.error||`通信エラー (${r.status})`);
      return j;
    }catch(e){
      if(controller.signal.aborted){
        if(controller.signal.reason==='user')throw new Error('中断しました。');
        throw new Error('通信が規定時間を超えたため中断しました。');
      }
      const m=String(e?.message||e);
      if(/signal has been aborted|AbortError/i.test(m))throw new Error('取得先の応答が遅いため一部経路を中断しました。');
      if(/Load failed/i.test(m))throw new Error('通信に失敗しました。もう一度実行できます。');
      throw e;
    }finally{if(timer)clearTimeout(timer)}
  }
  function styleOf(h){return ['逃','先','差','追'].includes(h?.style)?h.style:''}
  function merge(j){
    const rows=Array.isArray(j?.horses)?j.horses:[];
    const byId=new Map(rows.map(r=>[String(r.id||r.netkeiba_horse_id||r.horse_id||''),r]));
    const byName=new Map(rows.map(r=>[norm(r.name),r]));
    let fresh=0,preserved=0;
    horses=horses.map(h=>{
      const x=byId.get(String(h.netkeiba_horse_id||h.horse_id||''))||byName.get(norm(h.name));
      if(!x)return h;
      const z={...h};
      for(const k of ['sire','dam','damsire'])if(x[k])z[k]=x[k];
      if(x.id||x.netkeiba_horse_id||x.horse_id){z.netkeiba_horse_id=String(x.id||x.netkeiba_horse_id||x.horse_id);z.horse_id=z.netkeiba_horse_id}
      if(['逃','先','差','追'].includes(x.style)){z.style=x.style;z.style_source=x.style_source||z.style_source||'netkeiba競馬新聞'}
      if(Array.isArray(x.history)&&x.history.length){
        z.history=x.history.slice(0,5);fresh++;
      }else if(Array.isArray(z.history)&&z.history.length){
        z.history=z.history.slice(0,5);preserved++;
      }else z.history=[];
      if(z.history.length){try{z.histScores=scoreLocalHistory(z.history);if(z.histScores)z.histScores.available=true}catch(_){}}
      else z.histScores=null;
      return z;
    });
    const ok=horses.filter(h=>(h.history||[]).length).length;
    const runs=horses.reduce((s,h)=>s+Math.min(5,(h.history||[]).length),0);
    const ped=horses.filter(h=>h.sire&&h.dam&&h.damsire).length;
    const sty=horses.filter(h=>styleOf(h)).length;
    const news=horses.filter(h=>h.style_source==='netkeiba競馬新聞').length;
    const graded=horses.reduce((s,h)=>s+(h.history||[]).filter(r=>r.grade||r.race_grade||r.class_name||r.race_class||r.class||r.race_name||r.raceName||r.title||r.race).length,0);
    const hc=el('histCount');if(hc)hc.textContent=`netkeiba ${ok}/${horses.length}頭・合計${runs}走 / レース格 ${Math.min(graded,runs)}/${runs}走 / JRA照合 ${horses.filter(h=>(h.jra_history||[]).length).length}頭`;
    try{if(typeof renderHorses==='function')renderHorses()}catch(_){}
    try{if(typeof evalAll==='function')evalAll()}catch(_){}
    try{if(typeof renderPaceReason==='function')renderPaceReason()}catch(_){}
    try{dispatchEvent(new Event('keiba-data-updated'))}catch(_){}
    return {ok,runs,ped,sty,news,fresh,preserved,cached:+j?.cached_history_count||0,graded:+j?.graded_count||0};
  }
  async function fullHistory(){
    const btn=el('importHist');
    if(state.loading){try{state.controller?.abort('user')}catch(_){};return}
    if(!Array.isArray(horses)||!horses.length){show('先に出馬表を取り込んでください。',true);return}
    const seq=++state.seq;state.loading=true;state.controller=new AbortController();
    if(btn){btn.disabled=false;btn.textContent='取得中（押すと中断）'};
    show('過去5走を取得しています。取得済みデータは、通信失敗時も消さずに維持します。');
    try{
      const j=await post(body(),state.controller,45000);if(seq!==state.seq)return;
      const r=merge(j),extra=[];
      if(j.newspaper_error)extra.push('競馬新聞:'+j.newspaper_error);
      if(j.history_api_error)extra.push('馬DB:'+j.history_api_error);
      if(j.fallback_error)extra.push('予備経路:'+j.fallback_error);
      if(j.grade_error)extra.push('レース格:'+j.grade_error);
      if(j.profile_error)extra.push('血統:'+j.profile_error);
      const kept=r.preserved?` / 既存履歴維持 ${r.preserved}頭`:'';
      const cache=r.cached?` / 保存履歴利用 ${r.cached}頭`:'';
      show(`過去走 ${r.ok}/${horses.length}頭・合計${r.runs}走 / 血統 ${r.ped}/${horses.length}頭 / 脚質 ${r.sty}/${horses.length}頭（競馬新聞 ${r.news}頭）${kept}${cache}。${extra.length?'\n'+extra.join(' / '):''}`,r.ok===0);
    }catch(e){
      if(seq===state.seq)show(e?.message||String(e),true);
    }finally{
      if(seq===state.seq){state.loading=false;state.controller=null;if(btn){btn.disabled=false;btn.textContent='過去5走を再取得'}}
    }
  }
  function install(){
    const old=el('importHist');if(!old)return;
    const b=old.cloneNode(true);old.replaceWith(b);b.disabled=false;b.textContent='過去5走を再取得';
    b.onclick=e=>{e.preventDefault();e.stopPropagation();fullHistory()};
    document.documentElement.dataset.historyController='v299';
  }
  install();
  window.__historyResilienceV299={state,fullHistory};
})();

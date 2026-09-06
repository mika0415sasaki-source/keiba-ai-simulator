(()=>{
  if(window.__detailAccuracyMobileV300)return;
  window.__detailAccuracyMobileV300=true;
  const el=id=>document.getElementById(id);
  const norm=s=>String(s||'').normalize('NFKC').replace(/[\s　]+/g,'').trim();
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const CONF={0:0,1:48,2:61,3:74,4:87,5:100};

  function compactHeader(){
    if(!document.getElementById('compactHeaderV300Style')){
      const s=document.createElement('style');s.id='compactHeaderV300Style';s.textContent=`
        header{padding:7px 12px !important;min-height:0 !important;background:rgba(9,16,29,.985) !important;}
        header h1{font-size:17px !important;line-height:1.2 !important;margin:0 !important;}
        header .sub{font-size:10px !important;line-height:1.25 !important;margin-top:2px !important;white-space:nowrap !important;overflow:hidden !important;text-overflow:ellipsis !important;display:block !important;}
        @media (max-width:700px){header{padding-top:6px !important;padding-bottom:6px !important}header h1{font-size:16px !important}header .sub{font-size:9.5px !important}}
      `;(document.head||document.documentElement).appendChild(s);
    }
    const sub=document.querySelector('header .sub');if(sub){if(!sub.dataset.fullV300)sub.dataset.fullV300=sub.textContent||'';sub.textContent='netkeiba5走＋JRA照合＋血統＋脚質＋ペース＋買い目';}
  }

  function normalizeGrade(v){
    const s=String(v||'').normalize('NFKC').toUpperCase().replace(/Ｇ/g,'G').replace(/Ⅲ/g,'III').replace(/Ⅱ/g,'II').replace(/Ⅰ/g,'I').replace(/３/g,'3').replace(/２/g,'2').replace(/１/g,'1').replace(/\s+/g,'');
    if(/JPN3|JPNIII|G3|GIII/.test(s))return'G3';if(/JPN2|JPNII(?!I)|G2|GII(?!I)/.test(s))return'G2';if(/JPN1|JPNI(?!I)|G1|GI(?!I)/.test(s))return'G1';
    if(/リステッド/.test(s)||/(?:^|[^A-Z])L(?:$|[^A-Z])/.test(s))return'L';if(/オープン|OPEN|OP/.test(s))return'OP';
    if(/3勝/.test(s))return'3勝';if(/2勝/.test(s))return'2勝';if(/1勝/.test(s))return'1勝';if(/未勝利/.test(s))return'未勝利';if(/新馬/.test(s))return'新馬';return'';
  }
  function rawRaceName(r){return String(r?.race_name||r?.raceName||r?.title||r?.race||'').trim()}
  function runGrade(r){return normalizeGrade(r?.grade||r?.race_grade||r?.class_name||r?.race_class||r?.class||rawRaceName(r))}
  function cleanRaceName(v){
    let s=String(v||'').normalize('NFKC');
    s=s.replace(/\s*[（(]\s*(?:JPN\s*)?G(?:I{1,3}|[123])\s*["'”’＂]*\s*[）)]*/gi,'')
       .replace(/\s*[（(]\s*L\s*["'”’＂]*\s*[）)]*/gi,'')
       .replace(/\s*[（(]\s*OP\s*["'”’＂]*\s*[）)]*/gi,'')
       .replace(/\s*[（(]\s*[123]勝クラス\s*["'”’＂]*\s*[）)]*/g,'')
       .replace(/["'”’＂]+/g,'').replace(/[）)]+$/g,'').replace(/\s+/g,' ').trim();
    return s;
  }
  function redundantGrade(name,g){
    if(!g)return true;const s=String(name||'').normalize('NFKC').toUpperCase();
    if(g==='新馬'&&/新馬/.test(s))return true;if(g==='未勝利'&&/未勝利/.test(s))return true;
    if(g==='1勝'&&/1勝クラス/.test(s))return true;if(g==='2勝'&&/2勝クラス/.test(s))return true;if(g==='3勝'&&/3勝クラス/.test(s))return true;
    if(g==='OP'&&/(オープン|\bOP\b)/.test(s))return true;return false;
  }
  function validLast3f(v){const n=Number(v);return Number.isFinite(n)&&n>=20&&n<=60?n:null}
  function normalizeRun(r){
    const z={...r},raw=rawRaceName(z),g=runGrade(z);z.race_name=cleanRaceName(raw);if(g)z.grade=g;z.last3f=validLast3f(z.last3f);return z;
  }
  function normalizeHorseHistory(){
    if(!Array.isArray(horses))return;
    horses=horses.map(h=>{const z={...h};if(Array.isArray(z.history))z.history=z.history.slice(0,5).map(normalizeRun);if(Array.isArray(z.jra_history))z.jra_history=z.jra_history.slice(0,5).map(normalizeRun);return z});
  }

  function activeRows(h){
    let rows=[];try{rows=typeof activeHistory==='function'?activeHistory(h):((h?.history||[]).length?h.history:(h?.jra_history||[]))}catch(_){rows=(h?.history||[]).length?h.history:(h?.jra_history||[])}
    return (Array.isArray(rows)?rows:[]).filter(r=>r&&!/取消|除外|中止|失格/.test(String(r.status||''))&&+r.rank>0).slice(0,5);
  }
  function completeCareer(rows){if(!rows.length)return false;if(rows.length>=5)return true;const oldest=rows[rows.length-1],t=[oldest?.grade,oldest?.race_name,oldest?.raceName,oldest?.class_name,oldest?.race_class].filter(Boolean).join(' ');return /新馬/.test(String(t))}
  function qualityFor(h){
    const rows=activeRows(h),n=rows.length;if(!n)return{score:0,label:'未取得',issues:[{date:'0000/履歴',missing:['過去走']}],source:'未取得',history_count:0,history_target:5,career_complete:false};
    let have=0,total=0;const issues=[];
    rows.forEach((r,i)=>{const miss=[],checks=[['着順',+r.rank>0],['競馬場',!!r.venue],['芝ダ',!!r.surface],['距離',Number.isFinite(+r.distance)&&+r.distance>0],['馬場',!!r.going],['上がり',validLast3f(r.last3f)!=null],['騎手',!!r.jockey]];for(const [k,ok] of checks){total++;if(ok)have++;else miss.push(k)}if(miss.length)issues.push({index:i,date:r.date||`${i+1}走前`,missing:miss})});
    const fields=Math.round((have/Math.max(1,total))*100),career=completeCareer(rows),cap=career?100:(CONF[n]??100),score=Math.min(fields,cap);
    if(!career&&n<5)issues.unshift({date:'0000/履歴',missing:[`履歴 ${n}/5走`]});
    const label=career&&n<5?(score===100?`全キャリア ${n}走・完全`:`全キャリア ${n}走`):(n===5&&score===100?'完全':`履歴 ${n}/5走`);
    return{score,label,issues,source:(h?.history||[]).length?'netkeiba':'JRA',history_count:n,history_target:career?n:5,career_complete:career};
  }
  function patchDataQuality(){const fn=function(h){return qualityFor(h)};fn.__v300=true;try{dataQuality=fn;window.dataQuality=fn}catch(e){console.warn('dataQuality v300',e)}}

  function patchScoreLocal(){
    try{const old=typeof scoreLocalHistory==='function'?scoreLocalHistory:null;if(!old||old.__v300)return;const fn=function(rows){const clean=(Array.isArray(rows)?rows:[]).map(r=>({...r,last3f:validLast3f(r?.last3f)??undefined}));return old.call(this,clean)};fn.__v300=true;fn.__original=old;scoreLocalHistory=fn;window.scoreLocalHistory=fn}catch(e){console.warn('scoreLocal v300',e)}
  }

  function findHorse(card){const t=norm(card?.querySelector('.rank')?.textContent||'');return (Array.isArray(horses)?horses:[]).find(h=>t.includes(norm(h.name)))||null}
  function displayVenue(r){const rn=cleanRaceName(rawRaceName(r)),g=runGrade(r),suffix=redundantGrade(rn,g)?'':(g?` ${g}`:'');return [r?.venue||'',rn].filter(Boolean).join('・')+suffix}
  function patchCards(){
    normalizeHorseHistory();
    for(const card of document.querySelectorAll('#horses .card')){
      const h=findHorse(card);if(!h)continue;const n=(h.history||[]).length;
      const badge=[...card.querySelectorAll('.badge')].find(b=>/netkeiba/.test(b.textContent||''));if(badge)badge.textContent=`netkeiba ${n}走`;
      const hist=card.querySelector('.hist');if(hist&&n){hist.innerHTML=h.history.slice(0,5).map(r=>{const last=validLast3f(r.last3f),lastText=last==null?'上り —':`上り ${last.toFixed(1)}`;return `<div class="hist-row" style="grid-template-columns:58px minmax(108px,1.7fr) 54px 42px minmax(76px,1fr)"><span>${esc(String(r.date||'').replace(/^20\d{2}[\/.-]/,''))}</span><span>${esc(displayVenue(r)||'—')}</span><span>${esc((r.surface||'')+(r.distance||''))}</span><span>${+r.rank?esc(r.rank+'着'):'—'}</span><span>${esc((r.going||'')+' '+lastText)}</span></div>`}).join('')}
    }
    const list=Array.isArray(horses)?horses:[],total=list.reduce((s,h)=>s+(h.history||[]).length,0),graded=list.reduce((s,h)=>s+(h.history||[]).filter(r=>!!runGrade(r)).length,0),ok=list.filter(h=>(h.history||[]).length).length,jr=list.filter(h=>(h.jra_history||[]).length).length;if(el('histCount'))el('histCount').textContent=`netkeiba ${ok}/${list.length}頭・合計${total}走 / レース格 ${graded}/${total}走 / JRA照合 ${jr}頭`;
  }
  function recalcScores(){if(!Array.isArray(horses))return;horses=horses.map(h=>{const z={...h};if((z.history||[]).length){try{z.histScores=scoreLocalHistory(z.history);if(z.histScores)z.histScores.available=true}catch(_){}}return z})}

  function wrapRender(){try{const old=typeof renderHorses==='function'?renderHorses:null;if(!old||old.__v300)return;const fn=function(...args){normalizeHorseHistory();recalcScores();const v=old.apply(this,args);patchCards();return v};fn.__v300=true;fn.__original=old;renderHorses=fn;window.renderHorses=fn}catch(e){console.warn('render v300',e)}}
  function wrapEval(){try{const old=typeof evalAll==='function'?evalAll:null;if(!old||old.__v300)return;const fn=function(...args){normalizeHorseHistory();recalcScores();return old.apply(this,args)};fn.__v300=true;fn.__original=old;evalAll=fn;window.evalAll=fn}catch(e){console.warn('eval v300',e)}}

  compactHeader();patchDataQuality();patchScoreLocal();wrapRender();wrapEval();normalizeHorseHistory();recalcScores();patchCards();
  addEventListener('resize',compactHeader,{passive:true});document.documentElement.dataset.detailAccuracy='v300';
})();
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type, cache-control","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{...cors,"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
const clean=s=>String(s||"").replace(/\s+/g," ").trim();
const plain=x=>clean(String(x||"").replace(/!\[[^\]]*\]\([^)]+\)/g,"").replace(/\[([^\]]+)\]\([^)]+\)/g,"$1").replace(/\*\*/g,"").replace(/^\s*[-*#]+\s*/,""));
const stripHtml=x=>clean(String(x||"").replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<br\s*\/?>/gi," ").replace(/<[^>]+>/g," ").replace(/&nbsp;|&#160;/gi," ").replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/&#39;/gi,"'"));
const normalizeName=x=>clean(String(x||"")).normalize("NFKC").replace(/[\s　]+/g,"");

function decodeBuf(buf){
  let t=new TextDecoder("utf-8").decode(buf);
  const head=t.slice(0,6000);
  if(/charset\s*=\s*["']?(?:shift_jis|shift-jis|sjis|windows-31j)/i.test(head)||/�/.test(t.slice(0,20000))){
    try{t=new TextDecoder("shift_jis").decode(buf)}catch{}
  }
  return t;
}
async function fetchText(url,ms=6500){
  const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),ms);
  try{
    const r=await fetch(url,{headers:{"User-Agent":"Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1","Accept-Language":"ja-JP,ja;q=0.9,en;q=0.7","Referer":"https://race.netkeiba.com/"},redirect:"follow",signal:ac.signal});
    if(!r.ok)throw new Error(`HTTP ${r.status}`);
    return decodeBuf(await r.arrayBuffer());
  }finally{clearTimeout(timer)}
}
async function retry(url,ms=6500){const t=await fetchText(url,ms);if(t.length<=200)throw new Error("empty response");return t}
function normalizeGoing(x){const s=String(x||"");return s.includes("稍")?"稍重":s.includes("不良")?"不良":s.includes("重")?"重":s.includes("良")?"良":""}
function validJockey(x){const n=plain(x).replace(/^[△▲☆★◇]\s*/,"").replace(/^(?:替|初)\s*/,"");if(!n||n.length>30||/^(騎手|調教師|斤量|未定)$/.test(n)||/^\d/.test(n))return "";return n}
function dateKey(v){const m=String(v||"").replace(/[年月]/g,"-").replace(/日/g,"").replace(/[.]/g,"/").match(/(20\d{2})[\/-](\d{1,2})[\/-](\d{1,2})/);return m?+m[1]*10000+(+m[2])*100+(+m[3]):null}
function raceDateFromAny(v){
  let s=String(v||"");for(let i=0;i<3;i++){try{s=decodeURIComponent(s)}catch{break}}
  const m=s.match(/(20\d{2})[\/\.\-年](\d{1,2})[\/\.\-月](\d{1,2})/);
  if(m)return +m[1]*10000+(+m[2])*100+(+m[3]);
  // netkeibaの12桁race_idは開催回・開催日・Rの識別子で、先頭8桁を暦日として扱わない。
  // JRAのCNAMEに含まれる実施日(8桁)は、race_id部分を除いた後でのみ読む。
  const jraDate=s.match(/(?:pw01(?:dde|sde)|sw01ddd)(?:10|01)?\d{2}20\d{8}(20\d{6})/i);
  if(jraDate)return +jraDate[1];
  const withoutRaceIds=s
    .replace(/(?:race_id[=:_-]*|\/race\/)(20\d{10})/gi," ")
    .replace(/\b20\d{10}\b/g," ");
  const hits=[...withoutRaceIds.matchAll(/\b(20\d{6})\b/g)].map(x=>x[1]);
  for(let i=hits.length-1;i>=0;i--){
    const z=hits[i],mo=+z.slice(4,6),da=+z.slice(6,8);
    if(mo>=1&&mo<=12&&da>=1&&da<=31)return +z;
  }
  return null;
}
function raceIdFromAny(v){
  let s=String(v||"");for(let i=0;i<3;i++){try{s=decodeURIComponent(s)}catch{break}}
  let m=s.match(/(?:race_id[=:_-]*|\/race\/)(20\d{10})/i)||s.match(/\b(20\d{10})\b/);if(m)return m[1];
  m=s.match(/pw01(?:dde|sde)(?:10|01)?(\d{2})(20\d{2})(\d{2})(\d{2})(\d{2})/i);if(m)return `${m[2]}${m[1]}${m[3]}${m[4]}${m[5]}`;
  m=s.match(/sw01ddd(?:10|01)?(\d{2})(20\d{2})(\d{2})(\d{2})(\d{2})/i);if(m)return `${m[2]}${m[1]}${m[3]}${m[4]}${m[5]}`;
  return "";
}
function idFromAny(text,name){
  const src=String(text||"").normalize("NFKC"),wanted=normalizeName(name);
  for(const m of src.matchAll(/\[([^\]]+)\]\((?:https?:\/\/db\.netkeiba\.com)?\/horse\/(?:ped\/|result\/)?(\d{10})\/?[^)]*\)/gi)){if(normalizeName(m[1])===wanted)return m[2]}
  for(const m of src.matchAll(/<a\b[^>]*href=["'](?:https?:\/\/db\.netkeiba\.com)?\/horse\/(?:ped\/|result\/)?(\d{10})\/?["'][^>]*>([\s\S]{0,300}?)<\/a>/gi)){if(normalizeName(stripHtml(m[2]))===wanted)return m[1]}
  return "";
}
async function resolve(name){
  const q=encodeURIComponent(name),urls=[`https://db.netkeiba.com/index.php?pid=horse_list&ml=1&range=1&word=${q}`,`https://db.netkeiba.com/horse/search_all.html?word=${q}`];
  const attempts=urls.flatMap(u=>[{url:u,via:"direct-search"},{url:"https://r.jina.ai/"+u,via:"jina-search"}]);
  const settled=await Promise.allSettled(attempts.map(async a=>{const t=await retry(a.url,5000),id=idFromAny(t,name);if(!id)throw new Error("exact horse name not found");return{id,via:a.via}}));
  for(const item of settled)if(item.status==="fulfilled")return item.value;
  return{id:"",via:""};
}
function toNum(s){const n=Number(String(s??"").replace(/[^0-9.\-]/g,""));return Number.isFinite(n)?n:null}
const VENUES=["札幌","函館","福島","新潟","東京","中山","中京","京都","阪神","小倉","門別","盛岡","水沢","浦和","船橋","大井","川崎","金沢","笠松","名古屋","園田","姫路","高知","佐賀","香港","ア首","ドバイ","サンタアニタ","デルマー","シャティン"];
function rowObj(c0,headcountIndex=-1,rawRow=""){
  const c=c0.map(plain),di=c.findIndex(x=>/^(20\d{2})[\/.\-](\d{1,2})[\/.\-](\d{1,2})$/.test(x));if(di<0)return null;
  let xi=-1,surface="",distance=0;
  for(let i=di+1;i<c.length;i++){
    let m=c[i].match(/^(芝|ダート|ダ|障)\s*([0-9]{3,4})m?$/);if(m){xi=i;surface=m[1]==="ダ"?"ダート":m[1];distance=+m[2];break}
    if(/^(芝|ダート|ダ|障)$/.test(c[i])){const n=toNum(c[i+1]);if(n&&n>=800&&n<=4000){xi=i;surface=c[i]==="ダ"?"ダート":c[i];distance=n;break}}
    const n=toNum(c[i]);if(n&&n>=800&&n<=4000&&/^(芝|ダート|ダ|障)$/.test(c[i-1]||"")){xi=i-1;surface=c[i-1]==="ダ"?"ダート":c[i-1];distance=n;break}
  }
  if(xi<0||!distance)return null;
  // netkeiba DBでは競走除外が「除」と1文字で記録される。馬番などの数値を着順として誤採用しない。
  if(c.some(x=>/^(?:取|取消|出走取消|除|除外|競走除外|中|中止|競走中止|失|失格)$/.test(x)))return null;
  let wi=-1;for(let i=xi-1;i>=Math.max(di+1,xi-8);i--){const z=toNum(c[i]);if(z!==null&&z>=48&&z<=62){wi=i;break}}
  let jockey="",rank=0;
  if(wi>=1){jockey=validJockey(c[wi-1]);const r0=toNum(c[wi-2]);if(Number.isInteger(r0)&&r0>=1&&r0<=30)rank=r0;if(!rank){for(let i=wi-2;i>=Math.max(di+1,wi-8);i--){const z=toNum(c[i]);if(Number.isInteger(z)&&z>=1&&z<=30){rank=z;break}}}}
  if(!rank){for(let i=Math.max(di+1,xi-12);i<xi;i++){const z=toNum(c[i]);if(Number.isInteger(z)&&z>=1&&z<=30)rank=z}}
  if(!rank)return null;
  const race_id=(String(rawRow||"").match(/(?:\/race\/|race_id[=:_-]*)(20\d{10})/i)||[])[1]||"";
  let venue="";
  const raceNameIndex=di+4;
  for(let i=di+1;i<c.length;i++){
    if(i===raceNameIndex)continue;
    const cell=String(c[i]||"").trim();
    const z=VENUES.find(x=>cell===x||new RegExp("^"+x+"(?:\\\\s|[0-9]|$)").test(cell));
    if(z){venue=z;break}
  }
  // 国内開催の列位置フォールバックに必要な開催区分を、この行の開催場から明示的に決める。
  // 海外開催は列位置を推測せず、表見出し「頭数」で取得できた値だけを採用する。
  const domesticRow=["札幌","函館","福島","新潟","東京","中山","中京","京都","阪神","小倉"].includes(venue);
  const overseasRow=!!venue&&!domesticRow;
  const overseasAltRow=false,overseasAltField=null,overseasField=null;
  let going="";for(let i=xi+1;i<Math.min(c.length,xi+8);i++){going=normalizeGoing(c[i]);if(going)break}
  let passage=[];for(let i=xi+1;i<c.length;i++){if(/^\d{1,2}(?:-\d{1,2}){1,3}$/.test(c[i])){passage=c[i].split("-").map(Number);break}}
  let last3f=null;for(let i=c.length-1;i>xi;i--){const z=toNum(c[i]);if(z!==null&&z>=30&&z<50){last3f=z;break}}
  let field_size=null;
  // 先にテーブル見出し「頭数」の列を使う。海外開催は列配置が国内と異なるため、
  // 開催地や空欄セルの並びから推測せず、見出しと同じ列の値だけを採用する。
  const headerFieldRaw=Number.isInteger(headcountIndex)&&headcountIndex>=0?String(c[headcountIndex]??"").normalize("NFKC").trim():"";
  const headerFieldMatch=headerFieldRaw.match(/^\s*(\d{1,2})\s*(?:頭|頭立て)?\s*$/);
  if(headerFieldMatch){const n=+headerFieldMatch[1];if(n>=2&&n<=30)field_size=n}
  // 見出しが取得できない形式に限り、既存の厳密な列判定をフォールバックとして使う。
  if(field_size===null){
    if(domesticRow){
      const cell5=String(c[di+5]??"").trim();
      const fieldIndex=(cell5===""||/^(?:Image|画像)$/i.test(cell5)||/movie\.html|映像|動画/i.test(cell5))?di+6:di+5;
      const rawField=String(c[fieldIndex]??"").trim();
      const fm=rawField.match(/^(\d{1,2})(?:頭)?$/);
      if(fm){const n=+fm[1];if(n>=2&&n<=30)field_size=n}
    }else if(overseasAltRow){
      field_size=overseasAltField;
    }else if(overseasRow){
      field_size=overseasField;
    }
  }
  let body_weight=null,body_weight_change=null;for(let i=xi+1;i<c.length;i++){const m=String(c[i]).match(/^(\d{3})(?:\(([+\-]?\d+)\))?$/);if(m){const w=+m[1];if(w>=300&&w<=700){body_weight=w;body_weight_change=m[2]!=null?+m[2]:null;break}}}
  return{date:String(c[di]).replace(/[.]/g,"/").replace(/-/g,"/"),race_id:/^20\\d{10}$/.test(race_id)?race_id:null,venue,race_name:plain(c[di+4]||""),surface,distance,going,rank,last3f,jockey,passage,field_size,body_weight,body_weight_change,source:"netkeiba-horse-db-v13",_field_debug:{di,xi,domesticRow:!!domesticRow,overseasRow:!!overseasRow,overseasAltRow:!!overseasAltRow,cell5:String(c[di+5]??""),fieldIndex:domesticRow?di+((String(c[di+5]??"")===""||/^(?:Image|画像)$/i.test(String(c[di+5]??"")))?6:5):overseasAltRow?di+6:null,rawCells:c.slice(di,Math.min(c.length,di+10))}};
}
function parseMarkdown(text){
  const out=[];let headcountIndex=-1;
  for(const raw of String(text||"").normalize("NFKC").replace(/\r/g,"").split("\n")){
    if(!raw.includes("|"))continue;
    const cells=raw.split("|").map(plain);
    const detectedHeadcountIndex=cells.findIndex(x=>/頭\s*数/.test(x));
    if(detectedHeadcountIndex>=0)headcountIndex=detectedHeadcountIndex;
    if(cells.some(x=>/日付|年月日|開催日/.test(x)))continue;
    const separator=cells.every(x=>!x.trim()||/^:?-{2,}:?$/.test(x.trim()));
    if(separator)continue;
    const r=rowObj(cells,headcountIndex,raw);if(r)out.push(r);
  }
  return out;
}
function parseHtml(text){
  const out=[];
  const tables=[...String(text||"").normalize("NFKC").matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/gi)];
  for(const table of tables){
    const trs=[...table[0].matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)];
    let headcountIndex=-1;
    for(const tr of trs){
      const cells=[...tr[0].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(x=>stripHtml(x[1]));
      const detectedHeadcountIndex=cells.findIndex(x=>/頭\s*数/.test(x));
      if(detectedHeadcountIndex>=0){headcountIndex=detectedHeadcountIndex;break;}
    }
    for(const tr of trs){
      const cells=[...tr[0].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(x=>stripHtml(x[1]));
      const r=rowObj(cells,headcountIndex,tr[0]);if(r)out.push(r);
    }
  }
  return out;
}
function parseLoose(text){const out=[];for(const line of String(text||"").normalize("NFKC").replace(/\r/g,"").split("\n")){if(!/20\d{2}[\/.\-]\d{1,2}[\/.\-]\d{1,2}/.test(line))continue;const r=rowObj(line.split(/\s{2,}|\t+/).map(plain).filter(Boolean));if(r)out.push(r)}return out}
function dedupe(a){
  const byKey=new Map();
  for(const row of a){
    const key=row.race_id?[row.race_id,row.rank].join("|"):[row.date,row.venue,row.surface,row.distance,row.rank].join("|");
    const current=byKey.get(key);
    if(!current){byKey.set(key,{...row});continue}
    for(const field of ["field_size","jockey","going","last3f","passage","body_weight","body_weight_change","race_name","race_id"]){
      const oldValue=current[field],newValue=row[field];
      const oldMissing=field==="field_size"
        ?!(Number.isInteger(Number(oldValue))&&Number(oldValue)>=2&&Number(oldValue)<=30)
        :field==="passage"?(!Array.isArray(oldValue)||!oldValue.length):(oldValue==null||oldValue==="");
      const newValid=field==="field_size"
        ?Number.isInteger(Number(newValue))&&Number(newValue)>=2&&Number(newValue)<=30
        :field==="passage"?(Array.isArray(newValue)&&newValue.length>0):(newValue!=null&&newValue!=="");
      if(oldMissing&&newValid)current[field]=newValue;
    }
  }
  return [...byKey.values()].sort((x,y)=>(dateKey(y.date)||0)-(dateKey(x.date)||0));
}
async function historyFor(id,cutoff){
  const url=`https://db.netkeiba.com/horse/result/${id}/`,all=[];
  const [jina,direct]=await Promise.allSettled([retry("https://r.jina.ai/"+url,6000),retry(url,6000)]);
  if(jina.status==="fulfilled")all.push(...parseMarkdown(jina.value),...parseLoose(jina.value));
  if(direct.status==="fulfilled")all.push(...parseHtml(direct.value),...parseMarkdown(direct.value),...parseLoose(stripHtml(direct.value)));
  let h=dedupe(all);if(cutoff)h=h.filter(r=>{const k=dateKey(r.date);return k?k<cutoff:true});
  return{url,history:h};
}
function parseRaceIds(html){
  const out=new Map();
  for(const m of String(html||"").matchAll(/<a\b[^>]*href=["'][^"']*\/horse\/(?:result\/|ped\/)?([0-9a-z]{10})\/?[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi)){
    const id=String(m[1]).toLowerCase(),name=normalizeName(stripHtml(m[2]));if(name&&id&&!out.has(name))out.set(name,id);
  }
  return out;
}
async function idsFromRace(rid){
  if(!rid)return new Map();
  const urls=[`https://race.netkeiba.com/race/shutuba.html?race_id=${rid}`,`https://race.sp.netkeiba.com/race/shutuba.html?race_id=${rid}&rf=rs`];
  const settled=await Promise.allSettled(urls.map(u=>retry(u,6000)));
  const out=new Map();
  for(const x of settled){if(x.status!=="fulfilled")continue;for(const [name,id] of parseRaceIds(x.value))if(!out.has(name))out.set(name,id)}
  return out;
}
async function mapLimited(items,limit,work){
  const out=new Array(items.length);let next=0;
  const workers=Array.from({length:Math.min(limit,items.length)},async()=>{while(true){const i=next++;if(i>=items.length)return;out[i]=await work(items[i])}});
  await Promise.all(workers);return out;
}

Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  try{
    if(req.method==="GET"){
      const u=new URL(req.url),id=String(u.searchParams.get("horse_id")||"").replace(/[^0-9a-z]/gi,"").toLowerCase();
      if(!/^[0-9a-z]{10}$/.test(id))return json({error:"horse_id must be a 10-character netkeiba ID"},400);
      const cutoff=raceDateFromAny(u.searchParams.get("race_date")||"");
      const got=await historyFor(id,cutoff);
      return json({id,url:got.url,history:got.history,total_history:got.history.length,cutoff,history_mode:"full-career-readonly"});
    }
    const b=await req.json();
    const names=Array.isArray(b.names)?b.names.slice(0,18):[];
    const cutoff=raceDateFromAny(b.race_date||b.race_url);
    const rid=String(b.race_id||raceIdFromAny(b.race_url)||"");
    const providedIds=(b.horse_ids&&typeof b.horse_ids==="object")?b.horse_ids:{};
    let raceIds=new Map();try{raceIds=await idsFromRace(rid)}catch{}
    const requestStarted=Date.now();
    const results=await mapLimited(names,6,async name=>{
      const horseStarted=Date.now();
      let stage="id-match",id="",via="",got=null;
      try{
        id=String(providedIds[name]||raceIds.get(normalizeName(name))||"");
        via=providedIds[name]?"entry-id":raceIds.get(normalizeName(name))?"race-id-map":"";
        if(id){
          stage="history-by-matched-id";
          try{got=await historyFor(id,cutoff);if(!got.history.length)throw new Error("matched ID returned no parsed history")}
          catch(e){got=null;id="";via="";stage="id-search-fallback"}
        }
        if(!id){
          stage="horse-id-search";
          const rr=await resolve(name);id=rr.id;via=rr.via;
          if(!id)return{name,available:false,error:"馬ID未検出",diagnostic:{stage,elapsed_ms:Date.now()-horseStarted,id_found:false}};
          stage="history-by-searched-id";
          got=await historyFor(id,cutoff);
        }
        if(!got?.history?.length)return{name,id,available:false,error:"戦績を解析できません",diagnostic:{stage,elapsed_ms:Date.now()-horseStarted,id_found:!!id,via,parsed_runs:0}};
        return{name,id,url:got.url,via:via+">result",history:got.history,available:true,diagnostic:{stage:"complete",elapsed_ms:Date.now()-horseStarted,id_found:true,via,parsed_runs:got.history.length}};
      }catch(e){return{name,id:id||undefined,available:false,error:String(e?.message||e),diagnostic:{stage,elapsed_ms:Date.now()-horseStarted,id_found:!!id,via}}}
    });
    const stageCounts={};
    for(const row of results){const stage=row?.diagnostic?.stage||"unknown";stageCounts[stage]=(stageCounts[stage]||0)+1}
    const allRuns=results.flatMap(x=>Array.isArray(x?.history)?x.history:[]);
    const validFieldSize=r=>Number.isInteger(Number(r?.field_size))&&Number(r.field_size)>=2&&Number(r.field_size)<=30;
    const cv=results.find(x=>normalizeName(x?.name)==="チェルヴィニア");
    const cvRows=Array.isArray(cv?.history)?cv.history.filter(r=>["マーカン","マーカンド"].includes(String(r.jockey||"").replace(/\\s+/g,""))):[];
    const missingByHorse=results.map(x=>({name:x?.name||"",rows:(Array.isArray(x?.history)?x.history:[]).filter(r=>!validFieldSize(r))})).filter(x=>x.rows.length);
    const fieldSizeMissingSamples=missingByHorse.slice(0,10).map(x=>({horse:x.name,missing:x.rows.length,examples:x.rows.slice(0,2).map(r=>({date:r.date,rank:r.rank,jockey:r.jockey,debug:r._field_debug||null}))}));
    const diagnostics={request_ms:Date.now()-requestStarted,race_id:rid||"未抽出",race_id_matches:raceIds.size,id_found:results.filter(x=>x?.diagnostic?.id_found).length,history_loaded:results.filter(x=>x?.available&&x?.history?.length).length,stage_counts:stageCounts,field_size_runs:allRuns.filter(validFieldSize).length,field_size_missing_runs:allRuns.filter(r=>!validFieldSize(r)).length,field_size_missing_horses:missingByHorse.length,field_size_missing_samples:fieldSizeMissingSamples,cherwinia_markand_rows:cvRows.map(r=>({date:r.date,rank:r.rank,field_size:r.field_size??null,race_name:r.race_name||""}))};
    console.log("jockey-history-diagnostic",JSON.stringify(diagnostics),JSON.stringify(results.map(x=>({name:x.name,diagnostic:x.diagnostic,error:x.error}))));
    return json({rows:results,results,total:names.length,available:results.filter(x=>x?.available).length,cutoff,race_id:rid,race_id_matches:raceIds.size,diagnostics,history_mode:"full-career-readonly",source_function:"keiba-netkeiba-fallback-v13"});
  }catch(e){return json({error:String(e?.message||e)},500)}
});
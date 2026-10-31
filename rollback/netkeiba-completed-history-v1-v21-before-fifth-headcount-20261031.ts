import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"*","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(d:any,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{...cors,"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
const clean=(s:any)=>String(s||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<br\s*\/?>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/\s+/g,' ').trim().normalize('NFKC');
const num=(x:any)=>{const m=String(x??'').normalize('NFKC').match(/[+-]?\d+(?:\.\d+)?/);const n=m?Number(m[0]):NaN;return Number.isFinite(n)?n:null};
const validLast3f=(x:any)=>{const n=num(x);return n!=null&&n>=20&&n<=60?n:null};
const nonFinish=(x:any)=>{const s=String(x||'').normalize('NFKC').replace(/\s+/g,'');if(s==='取')return'取消';if(s==='除')return'除外';if(s==='中')return'中止';if(s==='失')return'失格';const m=s.match(/出走取消|競走除外|競走中止|取消|除外|中止|失格/);return m?m[0]:''};
const going=(s:string)=>{const v=clean(s).replace(/\s+/g,'');if(v.includes('不良')||v==='不')return'不良';if(v.includes('稍重')||v==='稍'||v.startsWith('稍'))return'稍重';if(v==='重'||v.includes('重'))return'重';if(v==='良'||v.includes('良'))return'良';return''};
const VENUES=['札幌','函館','福島','新潟','東京','中山','中京','京都','阪神','小倉','門別','盛岡','水沢','浦和','船橋','大井','川崎','金沢','笠松','名古屋','園田','姫路','高知','佐賀','シャティン','香港','メイダン','ドバイ','ア首','デルマー','サンタアニタ','ロンシャン','アスコット'];
function venueOf(v:any,row=''){const s=clean(v);for(const x of VENUES)if(s===x||s.includes(x))return x;const t=clean(row);for(const x of VENUES)if(t.includes(x))return x;return s.replace(/^\d+回?/,'').replace(/\d+日$/,'').trim()}
function gradeOf(v:any){const s=String(v||'').normalize('NFKC').toUpperCase().replace(/\s+/g,'');if(/JPN3|JPNIII|G3|GIII/.test(s))return'G3';if(/JPN2|JPNII(?!I)|G2|GII(?!I)/.test(s))return'G2';if(/JPN1|JPNI(?!I)|G1|GI(?!I)/.test(s))return'G1';if(/リステッド/.test(s)||/(?:^|[^A-Z])L(?:$|[^A-Z])/.test(s))return'L';if(/オープン|OPEN|OP/.test(s))return'OP';if(/3勝/.test(s))return'3勝';if(/2勝/.test(s))return'2勝';if(/1勝/.test(s))return'1勝';if(/未勝利/.test(s))return'未勝利';if(/新馬/.test(s))return'新馬';return''}
function decode(b:ArrayBuffer){const variants:string[]=[];for(const enc of ['utf-8','shift_jis','euc-jp'])try{variants.push(new TextDecoder(enc).decode(b))}catch{}const score=(v:string)=>['日付','着順','距離','開催','レース名','馬場','騎手','馬体重','競走成績','netkeiba'].reduce((n,k)=>n+(v.includes(k)?k.length:0),0)-((v.match(/�/g)||[]).length*5);return variants.sort((a,b)=>score(b)-score(a))[0]||new TextDecoder('utf-8').decode(b)}
async function fetchText(url:string,ms=6500,referer='https://db.netkeiba.com/'){const ac=new AbortController(),timer=setTimeout(()=>ac.abort('timeout'),ms);try{const r=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1','Accept-Language':'ja-JP,ja;q=0.9','Referer':referer},redirect:'follow',signal:ac.signal});if(!r.ok)throw new Error('HTTP '+r.status);return decode(await r.arrayBuffer())}finally{clearTimeout(timer)}}
function idxOf(heads:string[],names:string[]){for(const n of names){const i=heads.findIndex(h=>h===n||h.includes(n));if(i>=0)return i}return-1}
function raceIdFromRow(tr:string){const s=String(tr||'');return (s.match(/race_id[=:_-]*(20\d{10})/i)||s.match(/\/race\/(?:result\/)?(20\d{10})\/?/i)||s.match(/\b(20\d{10})\b/)||[])[1]||''}
function raceNameFromRow(tr:string,c:string[],i:number){const direct=i>=0?clean(c[i]||''):'';if(direct)return direct;for(const m of tr.matchAll(/<a\b[^>]*href=["'][^"']*(?:race_id=|\/race\/)[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi)){const s=clean(m[1]);if(s&&s.length<=100)return s}return''}
function jockeyFromRow(tr:string,c:string[],i:number){const direct=i>=0?clean(c[i]||''):'';if(direct&&!/^(騎手|未定)$/.test(direct))return direct;const m=tr.match(/<a\b[^>]*href=["'][^"']*\/jockey\/[^"']*["'][^>]*>([\s\S]*?)<\/a>/i);return m?clean(m[1]):''}
function courseMeta(s:any){const v=clean(s);let turn='',layout='',letter='';const m=v.match(/[（(]\s*(左|右)\s*(?:(?:・|\s)+)?(内|外|A|B|C|D)?\s*[）)]/i);if(m){turn=m[1]||'';const x=(m[2]||'').toUpperCase();if(/^[ABCD]$/.test(x))letter=x;else if(x==='内'||x==='外')layout=x}if(!turn){const m2=v.match(/[（(]\s*(左|右)/);if(m2)turn=m2[1]}if(!layout){const m3=v.match(/[（(][^）)]*\b(内|外)\b[^）)]*[）)]/);if(m3)layout=m3[1]}if(!letter){const m4=v.match(/[（(][^）)]*\b([ABCD])\b[^）)]*[）)]/i);if(m4)letter=m4[1].toUpperCase()}return{turn,course_layout:layout,course_letter:letter}}
async function parseHorse(html:string){const tables=[...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)].map(m=>m[0]);const table=tables.find(t=>/日付/.test(clean(t).replace(/\s+/g,''))&&/着順/.test(clean(t).replace(/\s+/g,''))&&/(距離|芝|ダート)/.test(clean(t).replace(/\s+/g,'')))||'';if(!table)return{history:[],excluded_runs:[]};const trs=[...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(m=>m[1]);let hi=trs.findIndex(tr=>/日付/.test(clean(tr).replace(/\s+/g,''))&&/着順/.test(clean(tr).replace(/\s+/g,'')));if(hi<0)hi=0;const heads=[...trs[hi].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(m=>clean(m[1]).replace(/\s+/g,''));const I={date:idxOf(heads,['日付']),venue:idxOf(heads,['開催']),race:idxOf(heads,['レース名','レース']),rank:idxOf(heads,['着順']),jockey:idxOf(heads,['騎手']),distance:idxOf(heads,['距離']),going:idxOf(heads,['馬場']),passage:idxOf(heads,['通過']),last3f:idxOf(heads,['上り','上がり']),field:idxOf(heads,['頭数']),body:idxOf(heads,['馬体重'])};const history:any[]=[],excluded_runs:any[]=[],seen=new Set<string>();for(const tr of trs.slice(hi+1)){const c=[...tr.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(m=>clean(m[1]));if(!c.length)continue;const rowText=clean(tr);const ds=I.date>=0?c[I.date]||'':((rowText.match(/20\d{2}[\/.\-]\d{1,2}[\/.\-]\d{1,2}/)||[])[0]||'');if(!/20\d{2}[\/.\-]\d{1,2}[\/.\-]\d{1,2}/.test(ds))continue;const rr=I.rank>=0?c[I.rank]||'':'';const raceName=raceNameFromRow(tr,c,I.race),raceId=raceIdFromRow(tr);const venue=venueOf(I.venue>=0?c[I.venue]||'':'',`${raceName} ${rowText}`);const explicit=nonFinish(rr)||nonFinish(rowText);if(explicit){excluded_runs.push({date:ds.replace(/[.\-]/g,'/'),venue,race_name:raceName,race_id:raceId,status:explicit});continue}const rank=/^\d{1,2}$/.test(rr)?+rr:0;if(!rank)continue;const d=I.distance>=0?c[I.distance]||'':rowText;const dm=d.match(/(芝|ダート|ダ|障)\s*(\d{3,4})/)||d.match(/(\d{3,4})\s*(芝|ダート|ダ|障)/);let dist=0,surface='';if(dm){if(/^\d/.test(dm[1])){dist=+dm[1];surface=dm[2]==='ダ'?'ダート':dm[2]}else{surface=dm[1]==='ダ'?'ダート':dm[1];dist=+dm[2]}}if(!dist)continue;const p=I.passage>=0?(c[I.passage]||''):'';const passage=/^\d{1,2}(?:[-‐－]\d{1,2}){1,3}$/.test(p)?p.split(/[-‐－]/).map(Number):[];const last3f=I.last3f>=0?validLast3f(c[I.last3f]):null;let body_weight:null|number=null,body_weight_change:null|number=null;if(I.body>=0){const bm=(c[I.body]||'').match(/(\d{3})(?:\(([+\-]?\d+)\))?/);if(bm){const w=+bm[1];if(w>=300&&w<=700){body_weight=w;body_weight_change=bm[2]!=null?+bm[2]:null}}}const field_size=I.field>=0?num(c[I.field]):null;const cm=courseMeta(`${d} ${rowText} ${raceName}`);const key=[ds,venue,surface,dist,rank].join('|');if(seen.has(key))continue;seen.add(key);history.push({date:ds.replace(/[.\-]/g,'/'),venue,race_name:raceName,grade:gradeOf(raceName)||gradeOf(rowText),surface,distance:dist,going:I.going>=0?going(c[I.going]||''):going(rowText),rank,last3f,jockey:jockeyFromRow(tr,c,I.jockey),passage,field_size,body_weight,body_weight_change,turn:cm.turn,course_layout:cm.course_layout,course_letter:cm.course_letter,course_label:[cm.turn,cm.course_layout,cm.course_letter].filter(Boolean).join(' '),race_id:raceId,source:'netkeiba-completed-v5'});if(history.length>=5)break}return{history,excluded_runs}}
async function raceFieldSize(raceId){
  const rid=String(raceId||'').replace(/\D/g,'');
  if(!/^20\d{10}$/.test(rid))return {field_size:null,source:'no-race-id',race_id:rid};
  try{
    const html=await fetchText('https://db.netkeiba.com/race/'+rid+'/',6500);
    const rows=[...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
    const horseRows=rows.filter(m=>/\/horse\/\d{10}\//i.test(m[1]));
    if(horseRows.length>=2)return {field_size:horseRows.length,source:'horse-links',race_id:rid};
    const ids=new Set();
    for(const m of html.matchAll(/\/horse\/(\d{10})\/?/gi))ids.add(m[1]);
    if(ids.size>=2)return {field_size:ids.size,source:'horse-links-global',race_id:rid};
    return {field_size:null,source:'race-page-no-horses',race_id:rid};
  }catch(e){
    return {field_size:null,source:'race-page-error',race_id:rid,error:String((e as any)?.message||e)};
  }
}
async function raceFieldSizeFromResultPage(raceId){
  const rid=String(raceId||'').replace(/\D/g,'');
  if(!/^20\d{10}$/.test(rid))return null;
  try{
    const html=await fetchText('https://race.netkeiba.com/race/result.html?race_id='+rid,8000);
    const s=clean(html);
    const m=s.match(/(?:芝|ダート|ダ|障)\s*\d{3,4}m[^\n]{0,120}?(?:^|[^0-9])(\d{1,2})頭(?:[^0-9]|$)/i)||s.match(/(?:^|[^0-9])(\d{1,2})頭(?:[^0-9]|$)/);
    const labelCount=m?Number(m[1]):0;
    if(labelCount>=2&&labelCount<=18)return labelCount;
    // The result page often lists every finisher but does not expose a textual
    // "N頭" label. Count distinct horse IDs in result rows for this exact race.
    const rows=[...html.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)].map(x=>x[0]);
    const ids=new Set();
    for(const row of rows){
      if(!/着順|競走中止|失格|取消|除外/.test(clean(row)))continue;
      for(const m of row.matchAll(/\/horse\/(\d{10})\/?/gi))ids.add(m[1]);
    }
    if(ids.size>=2&&ids.size<=18)return ids.size;
    return null;
  }catch(_){return null}
}
async function raceFieldSizeFromHorseIds(raceId){
  const rid=String(raceId||'').replace(/\D/g,'');
  if(!/^20\d{10}$/.test(rid))return null;
  try{
    const u='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/netkeiba-race-horse-ids-v1?race_id='+rid;
    const resp=await fetch(u,{headers:{'Cache-Control':'no-cache'}});
    const j=await resp.json();
    const n=Number(j?.expected_count||j?.count||0);
    return n>=2&&n<=18?n:null;
  }catch(_){return null}
}
async function enrichFieldSizes(history){
  const targets=(history||[]).filter(r=>(!Number.isFinite(+r.field_size)||+r.field_size<2));
  const unique=[...new Set(targets.map(r=>String(r.race_id||'')))].filter(Boolean).slice(0,5);
  if(!unique.length)return history;
  const pairs=await mapLimited(unique,3,async rid=>{const n=await raceFieldSizeFromResultPage(rid)||await raceFieldSizeFromHorseIds(rid);return [rid,n?{field_size:n}:await raceFieldSize(rid)]});
  const fm=new Map(pairs.filter(x=>Number.isFinite(x[1]?.field_size)&&x[1].field_size>=2&&x[1].field_size<=30));
  for(const r of history){const x=fm.get(String(r.race_id||''));if(x)r.field_size=x.field_size}
  return history;
}
async function mapLimited(items:any[],limit:number,work:(x:any)=>Promise<any>){const out=new Array(items.length);let next=0;const workers=Array.from({length:Math.min(limit,items.length)},async()=>{while(true){const i=next++;if(i>=items.length)return;out[i]=await work(items[i])}});await Promise.all(workers);return out}
Deno.serve(async(req)=>{if(req.method==='OPTIONS')return new Response('ok',{headers:cors});try{const b=await req.json();const items=Array.isArray(b.items)?b.items.slice(0,18):[];const raceId=String(b.race_id||'').replace(/\D/g,'');const hasRaceId=/^20\d{10}$/.test(raceId);const results=await mapLimited(items,6,async(it:any)=>{const id=String(it.id||'').replace(/\D/g,'');if(!/^\d{10}$/.test(id))return{name:it.name,id,available:false,error:'馬ID不正'};try{let html='',parsed:any={history:[],excluded_runs:[]},retrieval_source='db-horse-result';if(hasRaceId){const modalUrl='https://race.sp.netkeiba.com/modal/horse.html?race_id='+raceId+'&horse_id='+id+'&rf=shutuba_modal';try{const modalHtml=await fetchText(modalUrl,8000,'https://race.sp.netkeiba.com/race/shutuba.html?race_id='+raceId);const modalParsed=await parseHorse(modalHtml);if(modalParsed.history.length){html=modalHtml;parsed=modalParsed;retrieval_source='netkeiba-modal'}}catch{}}if(!parsed.history.length){html=await fetchText('https://db.netkeiba.com/horse/result/'+id+'/',6500);parsed=await parseHorse(html)}const history=await enrichFieldSizes(parsed.history);for(const r of history)if(retrieval_source==='netkeiba-modal')r.source='netkeiba-modal-first-completed-history-v1';return{name:it.name,id,available:history.length>0,history,excluded_runs:parsed.excluded_runs,field_debug:history.map(r=>({date:r.date,race_id:r.race_id,field_size:r.field_size})),retrieval_source}}catch(e){return{name:it.name,id,available:false,error:String((e as any)?.message||e)}}});return json({results,ok:results.filter((x:any)=>x.available).length,total:items.length,race_id:hasRaceId?raceId:null,source:'netkeiba-modal-first-completed-history-v1'})}catch(e){return json({error:String((e as any)?.message||e)},500)}});
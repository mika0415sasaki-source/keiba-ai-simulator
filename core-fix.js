(()=>{
 const wait=()=>{
  if(!window.__independentPatchApplied||typeof jraImport!=='function'||typeof renderHorses!=='function'||!document.getElementById('raceUrl')){setTimeout(wait,60);return}
  if(window.__coreFixApplied)return;
  window.__coreFixApplied=true;
  const isNk=u=>/netkeiba\.com/i.test(String(u||''));
  const first=(...v)=>{for(const x of v){const s=String(x??'').trim();if(s&&s!=='-'&&s!=='—')return s}return ''};
  function pedigree(h){
   const p=h&&h.pedigree&&typeof h.pedigree==='object'?h.pedigree:{};
   const b=h&&h.blood&&typeof h.blood==='object'?h.blood:{};
   if(!h)return h;
   const sire=first(h.sire,h.father,h.sire_name,h.father_name,p.sire,p.father,b.sire,b.father);
   const dam=first(h.dam,h.mother,h.dam_name,h.mother_name,p.dam,p.mother,b.dam,b.mother);
   const damsire=first(h.damsire,h.dam_sire,h.broodmare_sire,h.maternal_grandsire,h.damsire_name,p.damsire,p.dam_sire,p.broodmare_sire,b.damsire,b.dam_sire);
   if(sire)h.sire=sire;if(dam)h.dam=dam;if(damsire)h.damsire=damsire;return h;
  }
  const baseImport=jraImport;
  jraImport=async function(url){const j=await baseImport(url);if(j&&Array.isArray(j.horses))j.horses=j.horses.map(pedigree);return j};
  function relabel(){
   if(!isNk(document.getElementById('raceUrl')?.value))return;
   try{if(typeof horses!=='undefined'&&Array.isArray(horses))horses.forEach(pedigree)}catch(e){}
   document.querySelectorAll('.card').forEach(el=>{let s=el.innerHTML;s=s.replace(/単勝\s*([0-9.]+)倍\s*\/\s*(\d+)番人気/g,'予想単勝 $1倍 / 予想$2番人気').replace(/単勝\s*([0-9.]+)倍\s*\/\s*人気未確定/g,'予想単勝 $1倍 / 予想人気未確定');if(s!==el.innerHTML)el.innerHTML=s});
  }
  let t=0;new MutationObserver(()=>{clearTimeout(t);t=setTimeout(relabel,60)}).observe(document.body,{subtree:true,childList:true});setTimeout(relabel,200);
 };
 wait();
})();
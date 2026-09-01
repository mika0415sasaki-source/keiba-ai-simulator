(()=>{
  const NETKEIBA_RACE_IMPORT='https://qhzccahbevnqaoxdfnbx.supabase.co/functions/v1/netkeiba-race-import';
  const apply=()=>{
    if(typeof window.jraImport!=='function'){setTimeout(apply,50);return;}
    if(window.__independentNetkeibaPatchApplied)return;
    window.__independentNetkeibaPatchApplied=true;
    const baseJraImport=window.jraImport;
    window.jraImport=async function(url){
      const s=String(url||'').trim();
      if(/netkeiba\.com/i.test(s)){
        const r=await fetch(NETKEIBA_RACE_IMPORT,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:s})});
        const j=await r.json().catch(()=>({error:'netkeiba出馬表の応答を読み込めません'}));
        if(!r.ok)throw new Error(j.error||'netkeiba出馬表取込エラー');
        j.horses=(j.horses||[]).map((h,i)=>({...h,no:i+1,odds:null,jra_history:[],provisional:true}));
        j.meta={...(j.meta||{}),source:'netkeiba',provisional:true};
        return j;
      }
      return baseJraImport(url);
    };
    const input=document.getElementById('raceUrl');
    if(input)input.placeholder='JRA または netkeiba のレースURL';
    const panel=input?.closest('.panel');
    const h2=panel?.querySelector('h2');
    if(h2)h2.textContent='出馬表・枠前分析';
    if(panel&&!panel.querySelector('[data-netkeiba-note]')){
      const p=document.createElement('div');
      p.dataset.netkeibaNote='1';
      p.className='small';
      p.style.marginTop='8px';
      p.textContent='JRA出馬表がまだ無い場合は、netkeibaの出馬表URLを貼って「出馬表取込」で枠前分析できます。枠確定後にJRA出馬表で上書きします。';
      panel.appendChild(p);
    }
  };
  apply();
})();

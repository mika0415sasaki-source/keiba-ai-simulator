(function(){
  'use strict';
  if(window.__keibaJockeyAliasFixV225)return;
  window.__keibaJockeyAliasFixV225=true;

  function norm(x){
    try{
      if(typeof window.normJockeyV113==='function')return window.normJockeyV113(x);
    }catch(e){}
    return String(x||'')
      .normalize('NFKC')
      .replace(/^[△▲☆★◇]\s*/,'')
      .replace(/\s+/g,'')
      .trim();
  }

  function validName(x){
    const s=norm(x);
    if(!s)return false;
    if(/^(?:初騎乗|乗替|乗り替わり|騎手|替|未定)$/.test(s))return false;
    return true;
  }

  function uniqueAliasForCurrent(h){
    const cur=norm(h&&h.jockey);
    if(!validName(cur))return '';
    const runs=(h&&Array.isArray(h.runs))?h.runs.slice(0,5):[];
    const names=[];
    runs.forEach(function(r){
      const j=norm(r&&r.jockey);
      if(validName(j)&&!names.includes(j))names.push(j);
    });

    // Exact name already exists: existing v115 logic is sufficient.
    if(names.includes(cur))return '';

    // Current newspaper often uses surname/short name while horse DB stores full name.
    // Only accept a prefix match when the recent-history candidate is unique.
    const candidates=names.filter(function(j){
      if(j===cur)return false;
      const shorter=cur.length<=j.length?cur:j;
      const longer=cur.length<=j.length?j:cur;
      if(shorter.length<2)return false;
      return longer.indexOf(shorter)===0;
    });
    return candidates.length===1?candidates[0]:'';
  }

  function patch(){
    const original=window.jockeyDetailV115;
    if(typeof original!=='function'){
      setTimeout(patch,120);
      return;
    }
    if(original.__aliasFixV225)return;

    const wrapped=function(h){
      try{
        const cur=norm(h&&h.jockey);
        const alias=uniqueAliasForCurrent(h);
        if(alias&&cur){
          const clone=Object.assign({},h);
          clone.runs=(Array.isArray(h.runs)?h.runs:[]).map(function(r){
            if(!r||typeof r!=='object')return r;
            const j=norm(r.jockey);
            if(j!==alias)return r;
            return Object.assign({},r,{jockey:cur});
          });
          return original(clone);
        }
      }catch(e){}
      return original(h);
    };
    wrapped.__aliasFixV225=true;
    wrapped.__originalV115=original;
    window.jockeyDetailV115=wrapped;

    // Keep the score path explicitly tied to the patched detail function.
    if(typeof window.jockeyFitV115==='function'){
      window.jockeyFitV115=function(h){return window.jockeyDetailV115(h).bonus;};
    }
  }

  patch();
})();

(()=>{
  if(window.__netkeibaV4RouteV371)return;
  window.__netkeibaV4RouteV371=true;
  const old='/functions/v1/netkeiba-newspaper-v2';
  const neu='/functions/v1/netkeiba-newspaper-v4';
  const base=window.fetch.bind(window);
  window.fetch=function(input,init){
    try{
      if(typeof input==='string'&&input.includes(old))input=input.replace(old,neu);
      else if(input instanceof URL&&String(input).includes(old))input=new URL(String(input).replace(old,neu));
    }catch(_){}
    return base(input,init);
  };
  document.documentElement.dataset.netkeibaCurrentParser='v4';
})();

(()=>{
  if(window.__iosRenderFixV375)return;
  window.__iosRenderFixV375=true;

  function install(){
    let s=document.getElementById('iosRenderFixV355Style');
    if(!s){
      s=document.createElement('style');
      s.id='iosRenderFixV355Style';
      (document.head||document.documentElement).appendChild(s);
    }
    s.textContent=`
      html,body{
        background:#09101d !important;
        min-height:100% !important;
      }
      header{
        background:#09101d !important;
        -webkit-backdrop-filter:none !important;
        backdrop-filter:none !important;
      }
      @media(max-width:700px){
        header{
          position:relative !important;
          top:auto !important;
          z-index:auto !important;
          transform:none !important;
          will-change:auto !important;
        }
        .wrap{
          position:relative !important;
          z-index:auto !important;
          background:#09101d !important;
        }
        #analysis,#tickets,#learn,#memory,#input{
          isolation:auto !important;
          contain:none !important;
          transform:none !important;
          background:#09101d !important;
        }
        #horses,#ranking,#rows{
          visibility:visible !important;
          opacity:1 !important;
        }

        /* iPhone Safari paint guard only. Do not replace/reflow the horse UI. */
        #horses{
          height:auto !important;
          max-height:none !important;
          overflow:visible !important;
          contain:none !important;
          content-visibility:visible !important;
          transform:none !important;
          -webkit-transform:none !important;
          filter:none !important;
          -webkit-filter:none !important;
          will-change:auto !important;
        }
        #horses > *{
          contain:none !important;
          content-visibility:visible !important;
          transform:none !important;
          -webkit-transform:none !important;
          filter:none !important;
          -webkit-filter:none !important;
          opacity:1 !important;
          visibility:visible !important;
          will-change:auto !important;
        }
      }
    `;
    document.documentElement.dataset.iosRenderFix='v375-display-only';
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
  addEventListener('pageshow',install);
})();

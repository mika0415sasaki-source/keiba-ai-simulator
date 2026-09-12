(()=>{
  if(window.__iosRenderFixV355)return;
  window.__iosRenderFixV355=true;

  function install(){
    if(document.getElementById('iosRenderFixV355Style'))return;
    const s=document.createElement('style');
    s.id='iosRenderFixV355Style';
    s.textContent=`
      /* iPhone Safari: large translucent sticky header caused content/tabs to show
         through the header and produced repaint/ghosting while scrolling. */
      header{
        background:#09101d !important;
        -webkit-backdrop-filter:none !important;
        backdrop-filter:none !important;
        isolation:isolate;
      }
      @media(max-width:700px){
        header{
          position:relative !important;
          top:auto !important;
          z-index:1 !important;
          transform:none !important;
          will-change:auto !important;
        }
        .wrap{
          position:relative;
          z-index:0;
        }
        #analysis,#tickets,#learn,#memory,#input{
          isolation:isolate;
        }
      }
    `;
    (document.head||document.documentElement).appendChild(s);
    document.documentElement.dataset.iosRenderFix='v355';
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
  addEventListener('pageshow',install);
})();

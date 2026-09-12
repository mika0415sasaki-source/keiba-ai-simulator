(()=>{
  if(window.__v345ObserverGuardV347)return;
  window.__v345ObserverGuardV347=true;

  const NativeMutationObserver=window.MutationObserver;
  if(typeof NativeMutationObserver!=='function')return;

  const IGNORE_SELECTOR='#ranking,#rows,#courseProfile,#evidence,#horses,#rankingModelNoteV337,#rankingModelNoteV345';

  function elementFor(node){
    if(!node)return null;
    if(node.nodeType===1)return node;
    return node.parentElement||null;
  }
  function isInternalRenderMutation(m){
    const el=elementFor(m?.target);
    return !!(el?.closest?.(IGNORE_SELECTOR));
  }

  function GuardedMutationObserver(callback){
    let bodyObserver=false;
    const wrapped=(mutations,observer)=>{
      if(!bodyObserver){callback(mutations,observer);return;}
      const meaningful=mutations.filter(m=>!isInternalRenderMutation(m));
      if(meaningful.length)callback(meaningful,observer);
    };
    const native=new NativeMutationObserver(wrapped);
    const nativeObserve=native.observe.bind(native);
    native.observe=(target,options)=>{
      bodyObserver=target===document.body&&!!options?.subtree&&!!options?.childList;
      return nativeObserve(target,options);
    };
    return native;
  }
  GuardedMutationObserver.prototype=NativeMutationObserver.prototype;
  window.MutationObserver=GuardedMutationObserver;

  // body全体を監視するv345だけ、描画結果そのものの変更を再監視しない。
  // #ranking等を直接監視する後続observerは通常どおり動作する。
  document.documentElement.dataset.v345ObserverGuard='v347';
})();

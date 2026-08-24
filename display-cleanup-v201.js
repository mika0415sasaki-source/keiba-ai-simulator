(function(){
  'use strict';
  if(window.__keibaDisplayCleanupV201)return;
  window.__keibaDisplayCleanupV201=true;

  function cleanText(text){
    let s=String(text||'');
    if(/出馬表読込時の自動計算/.test(s)){
      s=s.replace(/\s*\/\s*実行\s*#\d+\s*\/\s*出馬表読込時の自動計算/g,' / 出馬表読込時の自動計算');
      s=s.replace(/実行\s*#\d+\s*\/\s*出馬表読込時の自動計算/g,'出馬表読込時の自動計算');
    }
    return s;
  }

  function cleanNode(root){
    if(!root)return;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes=[];
    let n;
    while((n=walker.nextNode()))nodes.push(n);
    nodes.forEach(function(node){
      const before=String(node.nodeValue||'');
      const after=cleanText(before);
      if(after!==before)node.nodeValue=after;
    });
  }

  function run(){
    cleanNode(document.getElementById('aiSummary'));
  }

  function mount(){
    const ai=document.getElementById('aiSummary');
    if(!ai){setTimeout(mount,150);return;}
    run();
    new MutationObserver(function(){run();}).observe(ai,{childList:true,subtree:true,characterData:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
})();

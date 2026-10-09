'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { isTextKey, parseTextPreviewDraft } from '@/lib/text-preview-bridge';

// Only mounted by the authenticated preview layout. Never writes authority.
export function PreviewTextBridge() {
  const pathname=usePathname();
  useEffect(()=>{
    if(window.parent===window) return;
    let enabled=false;
    let generation=-1;
    const originals=new Map<HTMLElement,string>();
    const attributes=new Map<HTMLElement,{tabindex:string|null;label:string|null}>();
    function restoreText() {
      originals.forEach((text,node)=>{if(node.isConnected)node.textContent=text;});
      originals.clear();
    }
    function restoreControls() {
      attributes.forEach((saved,node)=>{
        node.removeAttribute('data-text-editable');
        saved.tabindex===null?node.removeAttribute('tabindex'):node.setAttribute('tabindex',saved.tabindex);
        saved.label===null?node.removeAttribute('aria-label'):node.setAttribute('aria-label',saved.label);
      });
      attributes.clear();
    }
    function controls() {
      document.querySelectorAll<HTMLElement>('[data-text-key]').forEach(node=>{
        if(!isTextKey(node.dataset.textKey))return;
        if(!attributes.has(node))attributes.set(node,{tabindex:node.getAttribute('tabindex'),label:node.getAttribute('aria-label')});
        node.setAttribute('data-text-editable','true');
        node.setAttribute('tabindex','0');
        node.setAttribute('aria-label','Edit '+node.textContent);
      });
    }
    const receive=(event:MessageEvent)=>{
      if(event.origin!==window.location.origin || event.source!==window.parent || event.data?.type!=='TEXT_TOOL_STATE' ||
        !Number.isSafeInteger(event.data.generation) || event.data.generation<0) return;
      generation=event.data.generation;
      enabled=event.data.enabled===true;
      restoreText();
      if(!enabled){restoreControls();return;}
      controls();
      const draft=parseTextPreviewDraft(event.data.draft);
      if(draft) {
        const node=document.querySelector<HTMLElement>(`[data-text-key="${draft.key}"]`);
        if(node){originals.set(node,node.textContent ?? '');node.textContent=draft.value;}
      }
    };
    const select=(event:MouseEvent|KeyboardEvent)=>{
      if(!enabled || generation<0 || event.defaultPrevented)return;
      if(event instanceof KeyboardEvent && !['Enter',' '].includes(event.key))return;
      if(event instanceof MouseEvent && (event.button!==0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey))return;
      const node=event.target instanceof Element?event.target.closest<HTMLElement>('[data-text-key]'):null;
      if(!node || !isTextKey(node.dataset.textKey))return;
      event.preventDefault();event.stopImmediatePropagation();
      window.parent.postMessage({type:'TEXT_SELECT',key:node.dataset.textKey,generation},window.location.origin);
    };
    window.addEventListener('message',receive);
    // Window capture precedes the preview's document navigation handler.
    window.addEventListener('click',select,true);
    window.addEventListener('keydown',select,true);
    window.parent.postMessage({type:'TEXT_READY'},window.location.origin);
    return ()=>{
      window.removeEventListener('message',receive);
      window.removeEventListener('click',select,true);
      window.removeEventListener('keydown',select,true);
      restoreText();restoreControls();
    };
  },[pathname]);
  return <style>{`[data-text-editable="true"] { cursor: text; outline: 1px dashed #d99a4e; outline-offset: 4px; } [data-text-editable="true"]:focus-visible { outline: 3px solid #d99a4e; }`}</style>;
}

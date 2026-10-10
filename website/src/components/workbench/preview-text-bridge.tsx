'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { TEXT_FIELDS } from '@/lib/text-contract';
import { isTextKey, parseTextPreviewDraft } from '@/lib/text-preview-bridge';
import { contentCopyLimit,parseContentCopyDraft } from '@/lib/content-contract';

// Authenticated preview only. The parent owns staging and publishing authority.
export function PreviewTextBridge() {
  const pathname = usePathname();
  useEffect(() => {
    if (window.parent === window) return;
    let enabled = false, selectable = false, generation = -1;
    let pendingFocus: HTMLElement | null = null, editable: HTMLElement | null = null;
    let editVersion=0,resetVersion=-1,selectedKey='';
    let composing=false;
    const originals = new Map<HTMLElement, string>();
    const inputValues = new Map<HTMLInputElement,string>();
    const attributes = new Map<HTMLElement, Record<string, string | null>>();
    const names = ['tabindex', 'aria-label', 'contenteditable', 'spellcheck'];
    const selector='[data-text-key], [data-content-collection][data-content-id][data-content-field]';
    const content=(node:HTMLElement)=>parseContentCopyDraft({collection:node.dataset.contentCollection,id:node.dataset.contentId,field:node.dataset.contentField,value:''});
    const identity=(draft:{key?:string;collection?:string;id?:string;field?:string}|null)=>draft?.key ?? (draft ? `${draft.collection}:${draft.id}:${draft.field}` : '');
    const binding=(node:HTMLElement)=>isTextKey(node.dataset.textKey) ? {key:node.dataset.textKey} : content(node);
    const placeholder=(node:HTMLElement):node is HTMLInputElement=>node.dataset.textAttribute==='placeholder' && (node.tagName==='INPUT' || node.tagName==='TEXTAREA');
    const read=(node:HTMLElement)=>placeholder(node) ? node.getAttribute('placeholder') ?? '' : node.textContent ?? '';
    const write=(node:HTMLElement,value:string)=>{if(placeholder(node))node.setAttribute('placeholder',value);else node.textContent=value;};
    function restoreText(except?: Set<HTMLElement>) {
      originals.forEach((text, node) => {
        if (except?.has(node)) return;
        if (node.isConnected) write(node,text);
        originals.delete(node);
      });
    }
    function restoreControls() {
      editable = null;
      attributes.forEach((saved, node) => {
        node.removeAttribute('data-text-editable');
        node.removeAttribute('data-text-selectable');
        names.forEach(name => saved[name] === null ? node.removeAttribute(name) : node.setAttribute(name, saved[name]));
      });
      attributes.clear();
      inputValues.forEach((value,node)=>{node.value=value;});inputValues.clear();
    }
    function focus(node: HTMLElement) {
      node.focus();
      if(placeholder(node)) {
        if(node.tagName==='TEXTAREA' || ['text','search','tel','url','password'].includes(node.type))node.setSelectionRange(node.value.length,node.value.length);
        return;
      }
      const selection = window.getSelection(), range = document.createRange();
      range.selectNodeContents(node); range.collapse(false);
      selection?.removeAllRanges(); selection?.addRange(range);
    }
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window.parent || event.data?.type !== 'TEXT_TOOL_STATE' ||
        !Number.isSafeInteger(event.data.generation) || event.data.generation < 0 || event.data.generation < generation) return;
      generation = event.data.generation; enabled = event.data.enabled === true;
      selectable = event.data.selectable === true || enabled;
      const textDraft=enabled ? parseTextPreviewDraft(event.data.draft) : null;
      const contentDraft=enabled ? parseContentCopyDraft(event.data.contentDraft) : null;
      const draft=textDraft ?? contentDraft;
      const rawDraft=textDraft ? event.data.draft : event.data.contentDraft;
      const matching = draft ? Array.from(document.querySelectorAll<HTMLElement>(selector)).filter(node=>identity(binding(node))===identity(draft)) : [];
      const selected = matching.find(node=>node===pendingFocus) ?? matching.find(node=>node===editable) ?? matching.find(node=>!node.closest('[aria-hidden="true"]')) ?? matching[0] ?? null;
      const reset=selectedKey!==identity(draft) || resetVersion!==rawDraft?.resetVersion;
      if(reset) {editVersion=0;selectedKey=identity(draft);resetVersion=rawDraft?.resetVersion;}
      const queuedNodes = textDraft?.queued?.flatMap(item =>
        Array.from(document.querySelectorAll<HTMLElement>(selector))
          .filter(node => node.dataset.textKey === item.key && item.key !== textDraft.key)
          .map(node => ({node,value:item.value}))) ?? [];
      restoreText(new Set([...matching,...queuedNodes.map(({node})=>node)]));
      queuedNodes.forEach(({node,value})=>{
        if(!originals.has(node))originals.set(node,read(node));
        if(read(node)!==value)write(node,value);
      });
      if (!enabled) restoreControls();
      if (!selectable) { pendingFocus = null; return; }
      editable = rawDraft?.editable === true ? selected : null;
      inputValues.forEach((value,node)=>{if(node!==editable){node.value=value;inputValues.delete(node);}});
      document.querySelectorAll<HTMLElement>(selector).forEach(node => {
        if (!binding(node) || node.tagName==='OPTION' || node.closest('[aria-hidden="true"]')) return;
        if (!attributes.has(node)) attributes.set(node, Object.fromEntries(names.map(name => [name, node.getAttribute(name)])));
        node.setAttribute('data-text-selectable', 'true');
        if(enabled)node.setAttribute('data-text-editable', 'true');
        node.setAttribute('tabindex', '0');
        node.setAttribute('aria-label', `Select ${isTextKey(node.dataset.textKey) ? TEXT_FIELDS[node.dataset.textKey].label : node.dataset.contentField}`);
        if(enabled && !placeholder(node))node.setAttribute('contenteditable', node === editable ? 'plaintext-only' : 'false');
        if(enabled)node.setAttribute('spellcheck', 'true');
      });
      if (draft && selected) {
        matching.forEach(node=>{if(!originals.has(node))originals.set(node,read(node));});
        // Equal echoes must preserve the text node and caret while typing.
        const acknowledged=rawDraft?.editVersion ?? 0;
        if (!composing && (reset || acknowledged>=editVersion)) matching.forEach(node=>{if(read(node)!==draft.value)write(node,draft.value);});
        if(placeholder(selected) && editable===selected) {
          if(!inputValues.has(selected))inputValues.set(selected,selected.value);
          if(!composing && (reset || acknowledged>=editVersion) && selected.value!==draft.value)selected.value=draft.value;
        }
        if (pendingFocus === selected && editable === selected) { pendingFocus = null; focus(selected); }
      }
    };
    // Selection opens the right editor even in Photos; mutation still requires enabled + editable.
    // Window capture precedes preview navigation and VisualSlot bubbling.
    const select = (event: MouseEvent | KeyboardEvent) => {
      if (!selectable || generation < 0 || event.defaultPrevented) return;
      if (event instanceof KeyboardEvent && !['Enter', ' '].includes(event.key)) return;
      if (event instanceof MouseEvent && (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) return;
      const node = event.target instanceof Element ? event.target.closest<HTMLElement>(selector) : null;
      if (!node || !binding(node) || node.tagName==='OPTION' || node.closest('[aria-hidden="true"]')) return;
      if (node === editable) {
        // Prevent link navigation while leaving the native caret position intact.
        if (event instanceof MouseEvent) {
          if (node.closest('a')) { event.preventDefault(); node.focus(); }
          event.stopImmediatePropagation();
        }
        return;
      }
      event.preventDefault(); event.stopImmediatePropagation(); pendingFocus = node;
      const target=binding(node)!;
      window.parent.postMessage('key' in target ? { type: 'TEXT_SELECT', key: target.key, generation } : {type:'CONTENT_SELECT',...target,route:node.dataset.contentRoute,generation}, window.location.origin);
    };
    const input = (event: Event) => {
      if (!enabled || event.target !== editable || !editable || (event as InputEvent).isComposing) return;
      const target=binding(editable);if(!target)return;
      const limit='key' in target ? TEXT_FIELDS[target.key].maxLength : contentCopyLimit(target.collection,target.field)!;
      const typed=placeholder(editable) ? editable.value : editable.textContent ?? '';
      const value = typed.replace(/[\x00-\x1f\x7f]/g, ' ').slice(0, limit);
      if (typed !== value) {if(placeholder(editable))editable.value=value;else editable.textContent = value;focus(editable);}
      event.stopImmediatePropagation?.();
      editVersion+=1;
      window.parent.postMessage({ type: 'key' in target ? 'TEXT_EDIT' : 'CONTENT_EDIT', draft: {...target, value,editVersion,resetVersion }, generation }, window.location.origin);
    };
    const keyboard = (event: KeyboardEvent) => {
      if (event.target !== editable || !editable) return;
      if (composing || event.isComposing) return;
      if (event.key === 'Enter' || event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); editable.blur(); }
    };
    const paste = (event: ClipboardEvent) => {
      if (event.target !== editable || !editable) return;
      if(placeholder(editable))return;
      event.preventDefault(); event.stopImmediatePropagation();
      const text = event.clipboardData?.getData('text/plain').replace(/[\x00-\x1f\x7f]/g, ' ') ?? '';
      const selection = window.getSelection();
      if (!selection?.rangeCount) return;
      const range = selection.getRangeAt(0);
      if (!editable.contains(range.commonAncestorContainer)) return;
      range.deleteContents(); const node = document.createTextNode(text); range.insertNode(node);
      range.setStartAfter(node); range.collapse(true); selection.removeAllRanges(); selection.addRange(range);
      input({ target: editable } as unknown as Event);
    };
    const drop = (event: DragEvent) => {
      if (event.target instanceof Element && event.target.closest('[contenteditable="plaintext-only"]')) event.preventDefault();
    };
    const compositionStart=()=>{composing=true;};
    const compositionEnd=(event:Event)=>{composing=false;input(event);};
    const submit=(event:Event)=>{if(enabled){event.preventDefault();event.stopImmediatePropagation();}};
    window.addEventListener('message', receive);
    window.addEventListener('keydown', keyboard, true);
    window.addEventListener('click', select, true); window.addEventListener('keydown', select, true);
    window.addEventListener('input', input, true); window.addEventListener('compositionstart', compositionStart, true);window.addEventListener('compositionend', compositionEnd, true);
    window.addEventListener('paste', paste, true); window.addEventListener('drop', drop, true);
    window.addEventListener('submit',submit,true);
    window.parent.postMessage({ type: 'TEXT_READY' }, window.location.origin);
    return () => {
      window.removeEventListener('message', receive); window.removeEventListener('keydown', keyboard, true);
      window.removeEventListener('click', select, true); window.removeEventListener('keydown', select, true);
      window.removeEventListener('input', input, true);window.removeEventListener('compositionstart', compositionStart, true); window.removeEventListener('compositionend', compositionEnd, true);
      window.removeEventListener('paste', paste, true); window.removeEventListener('drop', drop, true);
      window.removeEventListener('submit',submit,true);
      restoreText(); restoreControls();
    };
  }, [pathname]);
  return <style>{`[data-text-editable="true"] { cursor: text; outline: 1px dashed #d99a4e; outline-offset: 4px; } [data-text-selectable="true"]:focus-visible, [contenteditable="plaintext-only"]:focus { outline: 2px solid #d99a4e; outline-offset: 4px; }`}</style>;
}

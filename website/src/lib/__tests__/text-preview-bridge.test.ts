const mockEffects:Array<()=>void|(()=>void)>=[];
jest.mock('react',()=>({...jest.requireActual('react'),useEffect:(effect:()=>void|(()=>void))=>mockEffects.push(effect)}));
jest.mock('next/navigation',()=>({usePathname:()=>'/workbench/preview'}));
import {PreviewTextBridge} from '@/components/workbench/preview-text-bridge';
import {parseTextPreviewDraft,isTextKey} from '@/lib/text-preview-bridge';
import {TEXT_FIELDS} from '@/lib/text-contract';
class Node {
  textContent='Original headline';
  isConnected=true;
  dataset:Record<string,string>={textKey:'homepage.hero.title'};
  attrs=new Map<string,string>();
  getAttribute(key:string){return this.attrs.get(key)??null;}
  setAttribute(key:string,value:string){this.attrs.set(key,value);}
  removeAttribute(key:string){this.attrs.delete(key);}
  focus=jest.fn();blur=jest.fn();
  closest(selector:string){return selector==='[aria-hidden="true"]' || selector==='a' ? null:this;}
}
const real={window:global.window,document:global.document,Element:global.Element,MouseEvent:global.MouseEvent,KeyboardEvent:global.KeyboardEvent};
let listeners:Map<string,Function>,node:Node,parent:{postMessage:jest.Mock},cleanup:()=>void;
class Mouse {target:Node;button=0;defaultPrevented=false;metaKey=false;ctrlKey=false;shiftKey=false;altKey=false;
  preventDefault=jest.fn(()=>{this.defaultPrevented=true;});stopImmediatePropagation=jest.fn();
  constructor(target:Node){this.target=target;}
}
class Key extends Mouse {key='Enter';}
beforeEach(()=>{
  mockEffects.length=0;listeners=new Map();node=new Node();parent={postMessage:jest.fn()};
  global.Element=Node as never;global.MouseEvent=Mouse as never;global.KeyboardEvent=Key as never;
  global.window={location:{origin:'https://site.test'},parent,getSelection:()=>({removeAllRanges:jest.fn(),addRange:jest.fn()}),addEventListener:(name:string,fn:Function)=>listeners.set(name,fn),removeEventListener:(name:string)=>listeners.delete(name)} as never;
  global.document={querySelectorAll:()=>[node],querySelector:()=>node,createRange:()=>({selectNodeContents:jest.fn(),collapse:jest.fn()})} as never;
  PreviewTextBridge();cleanup=mockEffects.pop()!() as ()=>void;
});
afterEach(()=>{cleanup();Object.assign(global,real);});
function receive(data:unknown,origin='https://site.test',source:unknown=parent){listeners.get('message')!({data,origin,source});}
const state={type:'TEXT_TOOL_STATE',enabled:true,generation:4,draft:{key:'homepage.hero.title',value:'Draft headline'}};
it('accepts only allowlisted fields and bounded plain-string drafts',()=>{
  expect(isTextKey('__proto__')).toBe(false);
  expect(parseTextPreviewDraft({key:'homepage.hero.title',value:'x'.repeat(181)})).toBeNull();
  expect(parseTextPreviewDraft({key:'locked',value:'x'})).toBeNull();
  expect(parseTextPreviewDraft({key:'homepage.hero.title',value:''})).toEqual({key:'homepage.hero.title',value:''});
});
it('rejects a different origin, sibling frame and invalid generation without changing the preview',()=>{
  receive(state,'https://attacker.test');receive(state,undefined,{});receive({...state,generation:-1});
  expect(node.textContent).toBe('Original headline');expect(node.attrs.size).toBe(0);
});
it('updates only preview text and sends selected identity with the current generation',()=>{
  receive(state);expect(node.textContent).toBe('Draft headline');
  const click=new Mouse(node);listeners.get('click')!(click);
  expect(click.preventDefault).toHaveBeenCalled();
  expect(parent.postMessage).toHaveBeenLastCalledWith({type:'TEXT_SELECT',key:'homepage.hero.title',generation:4},'https://site.test');
});
it('restores original text and controls when switching back to photos',()=>{
  receive(state);receive({...state,enabled:false});
  expect(node.textContent).toBe('Original headline');expect(node.attrs.size).toBe(0);
  const click=new Mouse(node);listeners.get('click')!(click);expect(click.preventDefault).not.toHaveBeenCalled();
});
it('supports keyboard selection and preserves ordinary modified link navigation',()=>{
  receive(state);const key=new Key(node);listeners.get('keydown')!(key);expect(key.preventDefault).toHaveBeenCalled();
  const click=new Mouse(node);click.ctrlKey=true;listeners.get('click')!(click);expect(click.preventDefault).not.toHaveBeenCalled();
});
it('does not accumulate listeners or overwrite the original on repeated draft updates',()=>{
  receive(state);receive({...state,draft:{key:'homepage.hero.title',value:'Second draft'}});
  cleanup();expect(node.textContent).toBe('Original headline');expect(listeners.size).toBe(0);expect(node.attrs.size).toBe(0);
});
it('edits the original element and rejects delayed echoes that would destroy newer typing',()=>{
  const editable={...state,draft:{...state.draft,editable:true,editVersion:0,resetVersion:1}};
  receive(editable);expect(node.attrs.get('contenteditable')).toBe('plaintext-only');
  node.textContent='Draft headline A';listeners.get('input')!({target:node});
  node.textContent='Draft headline AB';listeners.get('input')!({target:node});
  receive({...editable,draft:{...editable.draft,value:'Draft headline A',editVersion:1}});
  expect(node.textContent).toBe('Draft headline AB');
  expect(parent.postMessage).toHaveBeenLastCalledWith({type:'TEXT_EDIT',draft:{key:'homepage.hero.title',value:'Draft headline AB',editVersion:2,resetVersion:1},generation:4},'https://site.test');
  receive({...editable,draft:{...editable.draft,value:'Original headline',resetVersion:2}});
  expect(node.textContent).toBe('Original headline');
});
it('does not overwrite an in-progress composition with a parent update',()=>{
  const editable={...state,draft:{...state.draft,editable:true,editVersion:0,resetVersion:1}};
  receive(editable);listeners.get('compositionstart')!({target:node});node.textContent='Composing';
  receive(editable);expect(node.textContent).toBe('Composing');
  listeners.get('compositionend')!({target:node});
  expect(parent.postMessage).toHaveBeenLastCalledWith({type:'TEXT_EDIT',draft:{key:'homepage.hero.title',value:'Composing',editVersion:1,resetVersion:1},generation:4},'https://site.test');
});

it('activates registered text from Photos without accepting edits until the parent enables the editor',()=>{
  receive({...state,enabled:false,selectable:true,draft:null});
  expect(node.attrs.get('tabindex')).toBe('0');
  expect(node.attrs.has('contenteditable')).toBe(false);
  const click=new Mouse(node);listeners.get('click')!(click);
  expect(click.stopImmediatePropagation).toHaveBeenCalled();
  expect(parent.postMessage).toHaveBeenLastCalledWith({type:'TEXT_SELECT',key:'homepage.hero.title',generation:4},'https://site.test');
  parent.postMessage.mockClear();listeners.get('input')!({target:node});
  expect(parent.postMessage).not.toHaveBeenCalled();
  receive({...state,selectable:true,draft:{...state.draft,editable:true,editVersion:0,resetVersion:1}});
  expect(node.attrs.get('contenteditable')).toBe('plaintext-only');
  expect(node.focus).toHaveBeenCalled();
});
it.each(['services','projects'])('activates a registered %s copy field from Photos',collection=>{
  const field=collection==='services'?'name':'title';
  node.dataset={contentCollection:collection,contentId:'decks',contentField:field,contentRoute:'/services'};
  receive({...state,enabled:false,selectable:true,draft:null});
  const key=new Key(node);listeners.get('keydown')!(key);
  expect(key.preventDefault).toHaveBeenCalled();
  expect(parent.postMessage).toHaveBeenLastCalledWith({type:'CONTENT_SELECT',collection,id:'decks',field,value:'',route:'/services',generation:4},'https://site.test');
  expect(node.attrs.has('contenteditable')).toBe(false);
});
it('does not consume visual media clicks, unregistered copy, or modified navigation in Photos',()=>{
  receive({...state,enabled:false,selectable:true,draft:null});
  const modified=new Mouse(node);modified.ctrlKey=true;listeners.get('click')!(modified);
  expect(modified.preventDefault).not.toHaveBeenCalled();
  for(const dataset of [{slotId:'homepage-hero'}, {textKey:'unknown'}, {contentCollection:'services',contentId:'decks',contentField:'mediaId'}]) {
    node.dataset=dataset;const click=new Mouse(node);listeners.get('click')!(click);
    expect(click.preventDefault).not.toHaveBeenCalled();expect(click.stopImmediatePropagation).not.toHaveBeenCalled();
  }
});
it('requires a valid parent handshake before selection and ignores stale or forged activation state',()=>{
  const click=new Mouse(node);listeners.get('click')!(click);expect(click.preventDefault).not.toHaveBeenCalled();
  receive({...state,enabled:false,selectable:true,draft:null},'https://attacker.test');
  listeners.get('click')!(click);expect(click.preventDefault).not.toHaveBeenCalled();
  receive({...state,enabled:false,selectable:true,draft:null});
  receive({...state,enabled:false,selectable:false,generation:3,draft:null});
  const accepted=new Mouse(node);listeners.get('click')!(accepted);
  expect(parent.postMessage).toHaveBeenLastCalledWith({type:'TEXT_SELECT',key:'homepage.hero.title',generation:4},'https://site.test');
  receive({...state,enabled:false,selectable:false,draft:null});
  expect(node.attrs.size).toBe(0);
  const disabled=new Mouse(node);listeners.get('click')!(disabled);expect(disabled.preventDefault).not.toHaveBeenCalled();
});

it('keeps staged text for two fields visible across selection and restores removed queued copy',()=>{
  const description=new Node();description.dataset={textKey:'homepage.hero.description'};description.textContent='Original introduction';
  global.document.querySelectorAll=(()=>[node,description]) as never;
  const queued=[{key:'homepage.hero.title',value:'Staged headline'},{key:'homepage.hero.description',value:'Staged introduction'}];
  receive({...state,draft:{...state.draft,value:'Staged headline',queued}});
  expect(node.textContent).toBe('Staged headline');expect(description.textContent).toBe('Staged introduction');
  receive({...state,draft:{key:'homepage.hero.description',value:'Staged introduction',queued}});
  expect(node.textContent).toBe('Staged headline');expect(description.textContent).toBe('Staged introduction');
  receive({...state,draft:{key:'homepage.hero.description',value:'Staged introduction',queued:[]}});
  expect(node.textContent).toBe('Original headline');expect(description.textContent).toBe('Staged introduction');
  receive({...state,enabled:false,selectable:true,draft:null});
  expect(node.textContent).toBe('Original headline');expect(description.textContent).toBe('Original introduction');
});
it('never uses a queued echo to overwrite active typing or focus another field',()=>{
  const description=new Node();description.dataset={textKey:'homepage.hero.description'};description.textContent='Original introduction';
  global.document.querySelectorAll=(()=>[node,description]) as never;
  const editable={...state,draft:{...state.draft,editable:true,editVersion:0,resetVersion:1,queued:[{key:'homepage.hero.title',value:'Older queued headline'},{key:'homepage.hero.description',value:'Staged introduction'}]}};
  receive(editable);node.textContent='Newest typing';listeners.get('input')!({target:node});
  receive(editable);
  expect(node.textContent).toBe('Newest typing');expect(description.textContent).toBe('Staged introduction');
  expect(description.focus).not.toHaveBeenCalled();
});
it('rejects nonregistered, duplicate, excessive and overlength queued draft entries',()=>{
  for(const queued of [null,{},[{key:'unknown',value:'x'}],[{key:'homepage.hero.title',value:'x'},{key:'homepage.hero.title',value:'y'}],[{key:'homepage.hero.title',value:'x'.repeat(181)}],Array(Object.keys(TEXT_FIELDS).length+1).fill({key:'homepage.hero.title',value:'x'})]) {
    expect(parseTextPreviewDraft({...state.draft,queued})).toBeNull();
  }
  expect(parseTextPreviewDraft({...state.draft,queued:[{key:'homepage.hero.description',value:'Safe copy',selector:'body'}]})).toEqual({...state.draft,queued:[{key:'homepage.hero.description',value:'Safe copy'}]});
});

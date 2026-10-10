const mockEffects:Array<()=>void|(()=>void)>=[];
jest.mock('react',()=>({...jest.requireActual('react'),useEffect:(effect:()=>void|(()=>void))=>mockEffects.push(effect)}));
jest.mock('next/navigation',()=>({usePathname:()=>'/workbench/preview'}));
import {PreviewTextBridge} from '@/components/workbench/preview-text-bridge';
import {parseTextPreviewDraft,isTextKey} from '@/lib/text-preview-bridge';
class Node {
  textContent='Original headline';
  isConnected=true;
  dataset={textKey:'homepage.hero.title'};
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

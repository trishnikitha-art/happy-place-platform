// Execute the provider's effect with controlled browser/Lenis boundaries. Real
// route scrolling is verified separately in the browser, not simulated here.
const mockEffects:Array<()=>void|(()=>void)>=[];
jest.mock('react',()=>({...jest.requireActual('react'),useState:(initial:unknown)=>[initial,jest.fn()],useEffect:(effect:()=>void|(()=>void))=>mockEffects.push(effect)}));
jest.mock('next/navigation',()=>({usePathname:()=>mockLocation.pathname,useSearchParams:()=>new URLSearchParams(mockLocation.search)}));
jest.mock('lenis',()=>({__esModule:true,default:jest.fn().mockImplementation(()=>({stop:jest.fn(),destroy:jest.fn(),raf:jest.fn()}))}));
import Lenis from 'lenis';
import {LenisProvider} from '@/components/lenis-provider';
const mockLocation={pathname:'/',search:''};
const originalWindow=global.window,originalRaf=global.requestAnimationFrame,originalCancel=global.cancelAnimationFrame;
let listeners:Map<string,Set<()=>void>>,motionListeners:Set<()=>void>,frames:Map<number,FrameRequestCallback>,frame:number;
const motion={matches:false,addEventListener:(_:string,callback:()=>void)=>motionListeners.add(callback),removeEventListener:(_:string,callback:()=>void)=>motionListeners.delete(callback)};
beforeEach(()=>{jest.clearAllMocks();mockEffects.length=0;mockLocation.pathname='/';mockLocation.search='';motion.matches=false;listeners=new Map();motionListeners=new Set();frames=new Map();frame=0;
  global.window={location:mockLocation,matchMedia:()=>motion,addEventListener:(name:string,callback:()=>void)=>{if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name)!.add(callback);},removeEventListener:(name:string,callback:()=>void)=>listeners.get(name)?.delete(callback)} as never;
  global.requestAnimationFrame=callback=>{frames.set(++frame,callback);return frame;};global.cancelAnimationFrame=id=>{frames.delete(id);};
});
afterAll(()=>{global.window=originalWindow;global.requestAnimationFrame=originalRaf;global.cancelAnimationFrame=originalCancel;});
function mount(){LenisProvider({children:null});return mockEffects.pop()!() as ()=>void;}
function navigate(path:string,search=''){mockLocation.pathname=path;mockLocation.search=search;for(const callback of listeners.get('popstate')??[])callback();}
it('keeps the provider as the single animation clock and touch scrolling native',()=>{const cleanup=mount();expect(Lenis).toHaveBeenCalledWith(expect.objectContaining({autoRaf:false,syncTouch:false}));expect(frames.size).toBe(1);cleanup();expect(frames.size).toBe(0);});
it('does not construct a smooth-scroll instance when reduced motion is already enabled',()=>{motion.matches=true;const cleanup=mount();expect(Lenis).not.toHaveBeenCalled();expect(frames.size).toBe(0);cleanup();expect(motionListeners.size).toBe(0);});
it('resets scroll state before destruction when a native route takes ownership',()=>{const cleanup=mount();const instance=jest.mocked(Lenis).mock.results[0].value;navigate('/our-work');expect(instance.stop).toHaveBeenCalledTimes(1);expect(instance.stop.mock.invocationCallOrder[0]).toBeLessThan(instance.destroy.mock.invocationCallOrder[0]);cleanup();expect(instance.stop).toHaveBeenCalledTimes(1);});
it('destroys the homepage instance and pending animation when entering service/project/native routes',()=>{const cleanup=mount();expect(frames.size).toBe(1);const instance=jest.mocked(Lenis).mock.results[0].value;navigate('/services/painting');expect(frames.size).toBe(0);expect(instance.destroy).toHaveBeenCalledTimes(1);navigate('/projects/project-1');expect(jest.mocked(Lenis)).toHaveBeenCalledTimes(1);cleanup();expect(motionListeners.size).toBe(0);expect([...listeners.values()].every(set=>set.size===0)).toBe(true);});
it('handles query-only mode changes and restores one smooth-scroll instance on exit',()=>{const cleanup=mount();navigate('/','?workbench=true');expect(frames.size).toBe(0);navigate('/');expect(frames.size).toBe(1);expect(jest.mocked(Lenis)).toHaveBeenCalledTimes(2);cleanup();expect(frames.size).toBe(0);});
it('does not accumulate animation frames or listeners through repeated mount/unmount',()=>{for(let i=0;i<8;i++){const cleanup=mount();expect(frames.size).toBe(1);expect(listeners.get('popstate')!.size).toBe(1);cleanup();expect(frames.size).toBe(0);expect(listeners.get('popstate')!.size).toBe(0);expect(motionListeners.size).toBe(0);}expect(jest.mocked(Lenis).mock.results.every(result=>result.value.destroy.mock.calls.length===1)).toBe(true);});
it('cancels the latest frame after animation has ticked and honors reduced motion',()=>{const cleanup=mount();const [id,callback]=[...frames][0];frames.delete(id);callback(16);expect(frames.size).toBe(1);motion.matches=true;for(const listener of motionListeners)listener();expect(frames.size).toBe(0);cleanup();});

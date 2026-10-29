const mockEffects: Array<() => void | (() => void)> = [];
const mockRefs: Array<{ current: unknown }> = [];
const mockListeners = new Map<object, (entry: IntersectionObserverEntry) => void>();
const mockStops: jest.Mock[] = [];
let mockEnabled = true;
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useEffect: (effect: () => void | (() => void)) => mockEffects.push(effect),
  useRef: (initial: unknown) => { const ref = { current: initial }; mockRefs.push(ref); return ref; },
}));
jest.mock('@/components/motion-provider', () => ({ useMotion: () => ({ prefersReducedMotion: !mockEnabled, isMotionEnabled: mockEnabled }) }));
jest.mock('@/lib/reveal-observer', () => ({ observeReveal: jest.fn((target, listener) => {
  mockListeners.set(target, listener); const stop = jest.fn(); mockStops.push(stop); return stop;
}) }));
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ScrollReveal } from '@/components/scroll-reveal';

const originalObserver = global.IntersectionObserver;
const target = () => ({ dataset: {} as Record<string, string>, children: [] as object[], firstElementChild: null as object | null, animate: jest.fn(() => ({ cancel: jest.fn(), onfinish: null as (() => void) | null })) });
beforeEach(() => {
  jest.clearAllMocks(); mockEffects.length = 0; mockRefs.length = 0; mockListeners.clear(); mockStops.length = 0; mockEnabled = true;
  global.IntersectionObserver = jest.fn() as never;
});
afterAll(() => { global.IntersectionObserver = originalObserver; });
function mount(options: { delay?: number; direction?: 'up' | 'left'; variant?: 'reveal' | 'sequence' | 'story' | 'accent' } = {}, node = target()) {
  ScrollReveal({ children: 'Craftsmanship', ...options }); mockRefs[0].current = node;
  return { node, cleanup: mockEffects.pop()!() as (() => void) | undefined };
}
function notify(node: object, visible: boolean) { mockListeners.get(node)!({ target: node, isIntersecting: visible } as IntersectionObserverEntry); }

it('server-renders readable content and forwards ordinary grid/ARIA markers without hidden styles', () => {
  const html = renderToStaticMarkup(createElement(ScrollReveal, { children: 'Craftsmanship', className: 'photo-story', variant: 'sequence', 'aria-label': 'Projects', 'data-service-grid': 'true' } as Parameters<typeof ScrollReveal>[0]));
  expect(html).toContain('Craftsmanship'); expect(html).toContain('data-service-grid="true"'); expect(html).toContain('aria-label="Projects"'); expect(html).toContain('data-reveal="sequence"');
  expect(html).not.toMatch(/opacity:0|visibility:hidden|translate|animation-delay/);
});
it('uses no observers or animations when policy is disabled or viewport observation is unavailable', () => {
  mockEnabled = false; const first = mount(); expect(mockListeners.size).toBe(0); expect(first.node.animate).not.toHaveBeenCalled();
  mockEnabled = true; mockRefs.length = 0; global.IntersectionObserver = undefined as never;
  mount(); expect(mockListeners.size).toBe(0);
});
it('leaves initially visible content still', () => {
  const { node } = mount(); notify(node, true); expect(node.animate).not.toHaveBeenCalled(); expect(node.dataset.revealState).toBe('skipped'); expect(mockStops[0]).toHaveBeenCalled();
});
it('enhances a below-fold element once, then cancels cleanly on policy change/unmount', () => {
  const { node, cleanup } = mount({ delay: 100, direction: 'left' }); notify(node, false); notify(node, true); notify(node, true);
  expect(node.animate).toHaveBeenCalledTimes(1);
  expect(node.animate).toHaveBeenCalledWith([{ opacity: 0.92, translate: '16px 0px' }, { opacity: 1, translate: 'none' }], expect.objectContaining({ duration: 480, delay: 100, fill: 'backwards' }));
  const animation = node.animate.mock.results[0].value; cleanup?.(); expect(animation.cancel).toHaveBeenCalledTimes(1); expect(node.dataset.revealState).toBe('complete');
});
it('observes sequence children separately so an initially visible row does not suppress later rows', () => {
  const children = [target(), target(), target()]; const parent = target(); parent.children = children;
  const { cleanup } = mount({ variant: 'sequence' }, parent);
  expect(mockListeners.size).toBe(3); expect(mockListeners.has(parent)).toBe(false);
  notify(children[0], true); notify(children[1], false); notify(children[2], false); notify(children[1], true); notify(children[2], true);
  expect(children[0].animate).not.toHaveBeenCalled();
  expect(children[1].animate).toHaveBeenCalledWith(expect.any(Array), expect.objectContaining({ delay: 55, duration: 440 }));
  expect(children[2].animate).toHaveBeenCalledWith(expect.any(Array), expect.objectContaining({ delay: 110 })); cleanup?.();
});
it.each([[1000, 180], [-10, 0], [Number.NaN, 0], [Number.POSITIVE_INFINITY, 0]])('bounds delay %s to %s ms', (input, expected) => {
  const { node } = mount({ delay: input }); notify(node, false); notify(node, true); expect(node.animate).toHaveBeenCalledWith(expect.any(Array), expect.objectContaining({ delay: expected }));
});
it('finishes by removing the animation rather than retaining a filled effect', () => {
  const { node } = mount(); notify(node, false); notify(node, true); const animation = node.animate.mock.results[0].value; animation.onfinish!();
  expect(node.dataset.revealState).toBe('complete'); expect(animation.cancel).toHaveBeenCalledTimes(1);
});
it('fails open when native animation cannot run', () => {
  const node = target(); node.animate.mockImplementation(() => { throw new Error('Unsupported'); }); mount({}, node); notify(node, false); expect(() => notify(node, true)).not.toThrow(); expect(node.dataset.revealState).toBe('complete');
});
it('draws the actual decorative line without translating the full-width section boundary',()=>{
  const line=target(),node=target();node.firstElementChild=line;mount({variant:'accent'},node);notify(node,false);notify(node,true);
  expect(node.animate).not.toHaveBeenCalled();expect(line.animate).toHaveBeenCalledWith([{opacity:0.55,transform:'scaleX(0.16)'},{opacity:1,transform:'none'}],expect.objectContaining({duration:480}));
});

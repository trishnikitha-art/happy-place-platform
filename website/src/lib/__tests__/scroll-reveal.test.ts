const mockEffects: Array<() => void | (() => void)> = [];
const mockRefs: Array<{ current: unknown }> = [];
let mockEnabled = true;
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useEffect: (effect: () => void | (() => void)) => mockEffects.push(effect),
  useRef: (initial: unknown) => { const ref = { current: initial }; mockRefs.push(ref); return ref; },
}));
jest.mock('@/components/motion-provider', () => ({ useMotion: () => ({ prefersReducedMotion: !mockEnabled, isMotionEnabled: mockEnabled }) }));

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ScrollReveal } from '@/components/scroll-reveal';

const originalObserver = global.IntersectionObserver;
let intersect: (entries: Array<{ isIntersecting: boolean }>) => void;
const observe = jest.fn(), disconnect = jest.fn(), cancel = jest.fn();
const animate = jest.fn(() => ({ cancel }));

beforeEach(() => {
  jest.clearAllMocks();
  mockEffects.length = 0;
  mockRefs.length = 0;
  mockEnabled = true;
  global.IntersectionObserver = jest.fn(callback => {
    intersect = callback as never;
    return { observe, disconnect };
  }) as never;
});
afterAll(() => { global.IntersectionObserver = originalObserver; });

function mount(delay = 0, direction: 'up' | 'down' | 'left' | 'right' = 'up') {
  ScrollReveal({ children: 'Craftsmanship', delay, direction });
  mockRefs[0].current = { animate };
  return mockEffects.pop()!() as (() => void) | undefined;
}

it('server-renders readable content in its ordinary position with no hidden style', () => {
  const html = renderToStaticMarkup(createElement(ScrollReveal, { children: 'Craftsmanship', className: 'photo-story' }));
  expect(html).toBe('<div class="photo-story">Craftsmanship</div>');
});

it('does not attach observers or animations when motion is disabled', () => {
  mockEnabled = false;
  mount();
  expect(IntersectionObserver).not.toHaveBeenCalled();
  expect(animate).not.toHaveBeenCalled();
});

it('keeps a static fallback without IntersectionObserver', () => {
  global.IntersectionObserver = undefined as never;
  mount();
  expect(animate).not.toHaveBeenCalled();
});

it('does not animate content already visible at enhancement time', () => {
  mount();
  intersect([{ isIntersecting: true }]);
  expect(animate).not.toHaveBeenCalled();
  expect(disconnect).toHaveBeenCalled();
});

it('disconnects after one below-fold entrance and cancels it when motion is disabled/unmounted', () => {
  const cleanup = mount(100, 'left');
  intersect([{ isIntersecting: false }]);
  expect(animate).not.toHaveBeenCalled();
  intersect([{ isIntersecting: true }]);
  expect(animate).toHaveBeenCalledWith(
    [{ opacity: 0.94, transform: 'translateX(10px)' }, { opacity: 1, transform: 'none' }],
    expect.objectContaining({ duration: 500, delay: 100, fill: 'backwards' }),
  );
  expect(disconnect).toHaveBeenCalledTimes(1);
  cleanup?.();
  expect(cancel).toHaveBeenCalledTimes(1);
});

it.each([[1000, 180], [-10, 0], [Number.NaN, 0], [Number.POSITIVE_INFINITY, 0]])('bounds delay %s to %s milliseconds', (input, expected) => {
  mount(input);
  intersect([{ isIntersecting: false }]);
  intersect([{ isIntersecting: true }]);
  expect(animate).toHaveBeenCalledWith(expect.any(Array), expect.objectContaining({ delay: expected }));
});

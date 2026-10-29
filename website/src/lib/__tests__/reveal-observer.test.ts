import { observeReveal } from '@/lib/reveal-observer';
const original = global.IntersectionObserver;
let emit: (entries: IntersectionObserverEntry[]) => void;
const observe = jest.fn(), unobserve = jest.fn(), disconnect = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  global.IntersectionObserver = jest.fn(callback => { emit = callback as never; return { observe, unobserve, disconnect }; }) as never;
});
afterAll(() => { global.IntersectionObserver = original; });
it('shares one observer, dispatches by target, and releases it after the last registration', () => {
  const a = {} as Element, b = {} as Element, first = jest.fn(), second = jest.fn();
  const offA = observeReveal(a, first), offB = observeReveal(b, second);
  expect(IntersectionObserver).toHaveBeenCalledTimes(1);
  expect(IntersectionObserver).toHaveBeenCalledWith(expect.any(Function), { rootMargin: '0px 0px -32px 0px', threshold: 0 });
  emit([{ target: b, isIntersecting: true }] as IntersectionObserverEntry[]); expect(second).toHaveBeenCalledTimes(1); expect(first).not.toHaveBeenCalled();
  offA(); offA(); expect(unobserve).toHaveBeenCalledTimes(1); expect(disconnect).not.toHaveBeenCalled(); offB(); expect(disconnect).toHaveBeenCalledTimes(1);
  const offNext = observeReveal(a, first); expect(IntersectionObserver).toHaveBeenCalledTimes(2); offNext();
});
it('uses a static fallback without browser observation', () => {
  global.IntersectionObserver = undefined as never;
  expect(() => observeReveal({} as Element, jest.fn())()).not.toThrow();
});

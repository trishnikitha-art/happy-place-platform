type RevealListener = (entry: IntersectionObserverEntry) => void;

const listeners = new Map<Element, RevealListener>();
let observer: IntersectionObserver | undefined;

/** One viewport observer for all reveal targets; released when the last target leaves. */
export function observeReveal(target: Element, listener: RevealListener): () => void {
  if (typeof IntersectionObserver === 'undefined') return () => {};
  if (!observer) {
    observer = new IntersectionObserver(entries => {
      for (const entry of entries) listeners.get(entry.target)?.(entry);
    }, { rootMargin: '0px 0px -32px 0px', threshold: 0 });
  }
  listeners.set(target, listener);
  observer.observe(target);
  return () => {
    if (listeners.get(target) !== listener) return;
    listeners.delete(target);
    observer?.unobserve(target);
    if (!listeners.size) {
      observer?.disconnect();
      observer = undefined;
    }
  };
}

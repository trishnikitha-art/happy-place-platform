const mockEffects: Array<() => void | (() => void)> = [];
let mockServerRender = false;
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useEffect: (effect: () => void | (() => void)) => mockEffects.push(effect),
  useSyncExternalStore: (_subscribe: unknown, snapshot: () => unknown, serverSnapshot: () => unknown) => mockServerRender ? serverSnapshot() : snapshot(),
}));

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MotionProvider, useMotion } from '@/components/motion-provider';

const originalWindow = global.window;
const originalDocument = global.document;
const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
const preference = { matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() };
const connection = { saveData: false, effectiveType: '4g' };
const classes = new Set<string>();
const root = { classList: { add: (name: string) => classes.add(name), remove: (name: string) => classes.delete(name) }, dataset: {} as Record<string, string> };

beforeEach(() => {
  mockEffects.length = 0;
  mockServerRender = false;
  preference.matches = false;
  connection.saveData = false;
  connection.effectiveType = '4g';
  classes.clear();
  root.dataset = {};
  global.window = { matchMedia: () => preference } as never;
  global.document = { documentElement: root } as never;
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { connection } });
});

afterAll(() => {
  global.window = originalWindow;
  global.document = originalDocument;
  if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
  else Reflect.deleteProperty(globalThis, 'navigator');
});

function State() {
  const state = useMotion();
  return createElement('span', null, JSON.stringify(state));
}
function render() { return renderToStaticMarkup(createElement(MotionProvider, { children: createElement(State) })); }

it('keeps the documented provider requirement', () => {
  expect(() => renderToStaticMarkup(createElement(State))).toThrow('useMotion must be used within MotionProvider');
});

it('leaves motion disabled for the server/hydration snapshot', () => {
  mockServerRender = true;
  expect(render()).toContain('&quot;isMotionEnabled&quot;:false');
});

it('enables motion after hydration on an unconstrained device', () => {
  expect(render()).toContain('&quot;isMotionEnabled&quot;:true');
  const cleanup = mockEffects.pop()!();
  expect(root.dataset.motion).toBe('enabled');
  if (cleanup) cleanup();
  expect(root.dataset.motion).toBeUndefined();
});

it('preserves the reduced-motion value and disables optional motion', () => {
  preference.matches = true;
  expect(render()).toContain('&quot;prefersReducedMotion&quot;:true,&quot;isMotionEnabled&quot;:false');
  mockEffects.pop()!();
  expect(classes.has('reduced-motion')).toBe(true);
  expect(root.dataset.motion).toBe('disabled');
});

it.each(['save-data', 'slow-network'])('disables optional motion for %s without misreporting a motion preference', kind => {
  if (kind === 'save-data') connection.saveData = true;
  else connection.effectiveType = '2g';
  expect(render()).toContain('&quot;prefersReducedMotion&quot;:false,&quot;isMotionEnabled&quot;:false');
});

it('disables optional motion for low memory even when connection is unsupported', () => {
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { deviceMemory: 1 } });
  expect(render()).toContain('&quot;isMotionEnabled&quot;:false');
});

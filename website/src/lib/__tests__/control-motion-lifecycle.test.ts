import type { ReactNode, RefObject } from 'react';

const mockEffects: Array<() => void | (() => void)> = [];
const mockRefs: Array<{ current: unknown }> = [];
const mockStates: unknown[] = [];
let mockRefIndex = 0;
let mockStateIndex = 0;
let mockEnabled = true;

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useEffect: (effect: () => void | (() => void)) => mockEffects.push(effect),
  useRef: (initial: unknown) => {
    const index = mockRefIndex++;
    mockRefs[index] ??= { current: initial };
    return mockRefs[index];
  },
  useState: (initial: unknown) => {
    const index = mockStateIndex++;
    if (!(index in mockStates)) mockStates[index] = initial;
    return [mockStates[index], (value: unknown) => { mockStates[index] = value; }];
  },
  useId: () => ':control-test:',
  useCallback: (callback: unknown) => callback,
}));
jest.mock('react-dom', () => ({ ...jest.requireActual('react-dom'), createPortal: (children: ReactNode) => children }));
jest.mock('@/components/motion-provider', () => ({ useMotion: () => ({ isMotionEnabled: mockEnabled, prefersReducedMotion: !mockEnabled }) }));
jest.mock('@/components/text-copy', () => ({ TextCopy: () => null, useTextCopy: (key: string) => key }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));

import { MobileSiteNavigation } from '@/components/mobile-site-navigation';
import { ProjectLightbox } from '@/components/project-lightbox';
import { NewsletterSignup } from '@/components/newsletter-signup';

interface ElementTree { type: unknown; props: Record<string, unknown> & { children?: unknown } }
function elements(node: unknown): ElementTree[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!node || typeof node !== 'object' || !('props' in node)) return [];
  const element = node as ElementTree;
  return [element, ...elements(element.props.children)];
}
function prepareRender() { mockEffects.length = 0; mockRefIndex = 0; mockStateIndex = 0; }
function makeAnimation() {
  let finish!: () => void;
  const finished = new Promise<void>(resolve => { finish = resolve; });
  return { finished, finish, cancel: jest.fn() };
}
const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
const desktop = { matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() };
const opener = { isConnected: true, getClientRects: () => [{}], focus: jest.fn() };
const closeButton = { focus: jest.fn() };
const onClose = jest.fn();
const menuProps = { open: true, navigation: [{ href: '/', label: 'Home' }, { href: '/services', label: 'Services' }], pathname: '/', openerRef: { current: opener } as unknown as RefObject<HTMLButtonElement>, onClose };
const animations: ReturnType<typeof makeAnimation>[] = [];
const animate = jest.fn((_keyframes: Keyframe[], _options: KeyframeAnimationOptions) => { const animation = makeAnimation(); animations.push(animation); return animation; });
const dialog = { open: false, showModal: jest.fn(() => { dialog.open = true; }), close: jest.fn(() => { dialog.open = false; }) };

beforeEach(() => {
  jest.clearAllMocks();
  mockRefs.length = 0; mockStates.length = 0; animations.length = 0;
  prepareRender(); mockEnabled = true; desktop.matches = false; dialog.open = false;
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { body: { style: { overflow: 'auto' } }, querySelector: jest.fn() } });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { matchMedia: jest.fn(() => desktop) } });
});
afterEach(() => {
  if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument); else Reflect.deleteProperty(globalThis, 'document');
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow); else Reflect.deleteProperty(globalThis, 'window');
});

function menu() {
  prepareRender();
  const tree = MobileSiteNavigation(menuProps);
  mockRefs[0].current = dialog; mockRefs[1].current = closeButton; mockRefs[2].current = { animate };
  return tree as unknown as ElementTree;
}

it('keeps native modal focus/scroll restoration and bounds an explicit Escape exit', async () => {
  const tree = menu();
  const cleanup = mockEffects[0]() as () => void;
  mockEffects[1]();
  expect(dialog.showModal).toHaveBeenCalledTimes(1);
  expect(closeButton.focus).toHaveBeenCalled();
  expect(document.body.style.overflow).toBe('hidden');
  const preventDefault = jest.fn();
  (tree.props.onCancel as (event: { preventDefault: () => void }) => void)({ preventDefault });
  expect(preventDefault).toHaveBeenCalled();
  expect(onClose).not.toHaveBeenCalled();
  expect(animate.mock.calls.at(-1)?.[1]).toEqual(expect.objectContaining({ duration: 100 }));
  animations.at(-1)!.finish(); await Promise.resolve();
  expect(onClose).toHaveBeenCalledTimes(1);
  cleanup();
  expect(dialog.close).toHaveBeenCalled();
  expect(document.body.style.overflow).toBe('auto');
  expect(opener.focus).toHaveBeenCalledWith({ preventScroll: true });
});

it('does not wait for an animation when a navigation destination is selected', () => {
  const tree = menu();
  const cleanup = mockEffects[0]() as () => void; mockEffects[1]();
  const link = elements(tree).find(element => element.props.href === '/services')!;
  (link.props.onClick as () => void)();
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(animate).toHaveBeenCalledTimes(1);
  cleanup();
  expect(animations[0].cancel).toHaveBeenCalled();
});

it('dismisses immediately with a static panel when motion is disabled', () => {
  mockEnabled = false;
  const tree = menu();
  const cleanup = mockEffects[0]() as () => void; mockEffects[1]();
  (tree.props.onCancel as (event: { preventDefault: () => void }) => void)({ preventDefault: jest.fn() });
  expect(animate).not.toHaveBeenCalled();
  expect(onClose).toHaveBeenCalledTimes(1);
  cleanup();
});

it('cancels a pending exit and closes once when the motion policy changes', async () => {
  const tree = menu();
  const cleanup = mockEffects[0]() as () => void; mockEffects[1]();
  (tree.props.onCancel as (event: { preventDefault: () => void }) => void)({ preventDefault: jest.fn() });
  const exit = animations.at(-1)!;
  mockEnabled = false; menu(); mockEffects[1]();
  expect(exit.cancel).toHaveBeenCalled(); expect(onClose).toHaveBeenCalledTimes(1);
  exit.finish(); await Promise.resolve();
  expect(onClose).toHaveBeenCalledTimes(1);
  cleanup();
});

it('updates a lightbox photograph immediately and cancels finite image feedback', () => {
  mockStates.push(true, 0, false);
  const images = [{ src: '/first.webp', alt: 'First project photograph' }, { src: '/second.webp', alt: 'Second project photograph' }];
  const props = { images, isOpen: true, onClose };
  ProjectLightbox(props);
  mockRefs[2].current = { animate };
  const cleanup = mockEffects[3]() as () => void;
  cleanup();
  mockStates[1] = 1; prepareRender();
  const tree = ProjectLightbox(props);
  expect(elements(tree).some(element => element.props.src === '/second.webp')).toBe(true);
  expect(elements(tree).find(element => String(element.props.className).includes('lightbox-image-stage'))?.props.style).toBeUndefined();
  const cleanupNext = mockEffects[3]() as () => void;
  expect(animate.mock.calls.at(-1)?.[1]).toEqual(expect.objectContaining({ duration: 200 }));
  cleanupNext();
  expect(animations.at(-1)!.cancel).toHaveBeenCalled();
  mockEnabled = false; prepareRender(); ProjectLightbox(props); mockEffects[3]();
  expect(animate).toHaveBeenCalledTimes(2);
});

it('retains the newsletter controls and reserved feedback region after success', () => {
  mockStates.push('owner@example.test', 'Owner', false, '', true);
  const tree = NewsletterSignup();
  const inputs = elements(tree).filter(element => element.type === 'input');
  expect(inputs).toHaveLength(2);
  expect(inputs.every(element => element.props.disabled === true)).toBe(true);
  expect(elements(tree).some(element => element.type === 'form')).toBe(true);
  const feedback = elements(tree).find(element => element.props.id === ':control-test:-error')!;
  expect(feedback.props.role).toBe('status');
  expect(feedback.props.className).toContain('min-h-18');
  mockRefs[0].current = { animate };
  const cleanup = mockEffects[1]() as () => void;
  expect(animate).toHaveBeenCalledTimes(1);
  cleanup(); expect(animations[0].cancel).toHaveBeenCalled();
});

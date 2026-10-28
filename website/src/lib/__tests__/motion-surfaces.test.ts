import { PencilLine } from '@/components/pencil-line';
import { BlueprintGrid } from '@/components/blueprint-grid';
import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { useMotion } from '@/components/motion-provider';
import { CardLightSweep } from '@/components/card-light-sweep';
import { CraftCard } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BeforeAfterSlider } from '@/components/before-after-slider';
import type { Project } from '@/types/projects';

jest.mock('@/components/motion-provider', () => ({ useMotion: jest.fn() }));
jest.mock('@/components/visual-slot', () => ({
  VisualSlot: ({ children }: { children: ReactNode }) => createElement('div', null, children),
}));
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ fill: _fill, ...props }: Record<string, unknown>) => createElement('img', props),
}));

const mockUseMotion = jest.mocked(useMotion);

beforeEach(() => {
  mockUseMotion.mockReturnValue({ prefersReducedMotion: true, isMotionEnabled: false });
});

describe('motion surface fallbacks', () => {
  it('keeps card content visible when motion is disabled', () => {
    const html = renderToStaticMarkup(createElement(CardLightSweep, { interactive: true, children: 'Craftsmanship' }));
    expect(html).toContain('data-motion="disabled"');
    expect(html).toContain('Craftsmanship');
    expect(html).not.toContain('opacity:0');
    expect(html).not.toContain('visibility:hidden');
  });

  it('only adds the decorative sheen to explicitly interactive cards', () => {
    const html = renderToStaticMarkup(createElement(CraftCard, { children: 'Project story' }));
    expect(html).toContain('Project story');
    expect(html).not.toContain('craft-card-sheen');
  });

  it('preserves content and a decorative-only sheen when enhancement is enabled', () => {
    mockUseMotion.mockReturnValue({ prefersReducedMotion: false, isMotionEnabled: true });
    const html = renderToStaticMarkup(createElement(CraftCard, { interactive: true, children: 'Explore decks' }));
    expect(html).toContain('data-motion="enabled"');
    expect(html).toContain('Explore decks');
    expect(html).toContain('class="craft-card-sheen" aria-hidden="true"');
  });
});

describe('native button interaction', () => {
  it('renders a native named control without waiting for client effects', () => {
    const html = renderToStaticMarkup(createElement(Button, { type: 'submit', children: 'Request estimate' }));
    expect(html).toContain('<button');
    expect(html).toContain('type="submit"');
    expect(html).toContain('Request estimate');
    expect(html).not.toContain('style="transform:');
  });

  it('preserves caller events, styles, and disabled semantics', () => {
    const onClick = jest.fn();
    const onMouseDown = jest.fn();
    const style = { marginTop: 4 };
    const element = Button({ children: 'Save', onClick, onMouseDown, style, disabled: true });
    expect(element.props.onClick).toBe(onClick);
    expect(element.props.onMouseDown).toBe(onMouseDown);
    expect(element.props.style).toBe(style);
    expect(element.props.disabled).toBe(true);
  });
});

describe('before/after static rendering', () => {
  const project = {
    id: 'deck', title: 'Deck restoration', location: { county: 'Lane County' },
    media: {
      beforeMedia: { alt: 'Before deck restoration', variants: { original: '/before.webp' } },
      afterMedia: { alt: 'After deck restoration', variants: { original: '/after.webp' } },
    },
  } as unknown as Project;

  it('keeps both photos and a named keyboard control in the server-rendered fallback', () => {
    const html = renderToStaticMarkup(createElement(BeforeAfterSlider, { project }));
    expect(html).toContain('src="/before.webp"');
    expect(html).toContain('src="/after.webp"');
    expect(html).toContain('role="slider"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('aria-valuenow="50"');
  });

  it('omits an incomplete pair instead of showing unvalidated media', () => {
    const incomplete = { ...project, media: { ...project.media, beforeMedia: undefined } } as Project;
    expect(renderToStaticMarkup(createElement(BeforeAfterSlider, { project: incomplete }))).toBe('');
  });
});


it('keeps decorative grid and both divider orientations present without browser capabilities',()=>{
  const grid=renderToStaticMarkup(createElement(BlueprintGrid,{gridSize:24}));
  expect(grid).toContain('24px 24px');
  expect(grid).not.toMatch(/opacity:0|transition|animation/);
  const horizontal=renderToStaticMarkup(createElement(PencilLine));
  const vertical=renderToStaticMarkup(createElement(PencilLine,{direction:"vertical"}));
  expect(horizontal).toContain('h-px w-full');
  expect(vertical).toContain('w-px h-full');
  expect(horizontal+vertical).not.toMatch(/width:0|height:0|transition/);
});

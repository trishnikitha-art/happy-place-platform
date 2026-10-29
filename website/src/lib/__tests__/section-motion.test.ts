import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {SectionHeading,CraftDivider} from '@/components/section';
import {MotionProvider} from '@/components/motion-provider';

it('keeps the page h1 outside reveal registration and immediately readable without a client provider',()=>{
  const html=renderToStaticMarkup(createElement(SectionHeading,{as:'h1',eyebrow:'Our work',title:'Craftsmanship in your home',description:'Actual project photography.'}));
  expect(html).toContain('<h1');expect(html).toContain('Craftsmanship in your home');
  expect(html).not.toMatch(/data-reveal|opacity:|transform:|animation/);
});
it('groups supporting headings without hiding their semantic text during SSR',()=>{
  const children=createElement(SectionHeading,{title:'Project story',eyebrow:'Completed work',description:'Materials and details.'});
  const html=renderToStaticMarkup(createElement(MotionProvider,{children}));
  expect(html).toContain('data-reveal="sequence"');expect(html).toContain('<h2');expect(html).toContain('Materials and details.');
  expect(html).not.toMatch(/opacity:0|visibility:hidden|aria-hidden/);
});
it('keeps the section accent decorative, present and static without browser effects',()=>{
  const html=renderToStaticMarkup(createElement(MotionProvider,{children:createElement(CraftDivider)}));
  expect(html).toContain('aria-hidden="true"');expect(html).toContain('craft-rule');expect(html).toContain('data-reveal="accent"');
  expect(html).not.toMatch(/opacity:0|transform:|animation:/);
});

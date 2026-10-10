import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {ContentCopy,ContentCopyPreviewProvider} from '@/components/content-copy';
import {ServiceCard} from '@/components/service-card';
import {ProjectSpotlight} from '@/components/project-spotlight';
import type {Service} from '@/types/registries';
import type {Project} from '@/types/projects';
const props={collection:'services' as const,id:'fences',field:'name',value:'Fences',route:'/services/fences'};
it('renders canonical copy exactly with stable identity and no typography override',()=>{
  const html=renderToStaticMarkup(React.createElement('h3',{className:'font-display text-xl'},React.createElement(ContentCopy,props)));
  expect(html).toContain('class="font-display text-xl"');expect(html).toContain('data-content-collection="services"');expect(html).toContain('data-content-field="name"');expect(html).toContain('>Fences</span>');expect(html).not.toContain('contenteditable');expect(html).not.toContain('style=');
});
it('previews only the matching immutable receipt and leaves other canonical fields untouched',()=>{
  const html=renderToStaticMarkup(React.createElement(ContentCopyPreviewProvider,{collection:'services',changes:[{id:'fences',field:'name',previousValue:'Fences',value:'Custom fences'}],children:React.createElement('div',null,React.createElement(ContentCopy,props),React.createElement(ContentCopy,{...props,field:'description',value:'Original description'}))}));
  expect(html).toContain('>Custom fences</span>');expect(html).toContain('>Original description</span>');
});
it('does not overlay another collection with the same item ID',()=>{
  const html=renderToStaticMarkup(React.createElement(ContentCopyPreviewProvider,{collection:'projects',changes:[{id:'fences',field:'name',previousValue:'Fences',value:'Wrong authority'}],children:React.createElement(ContentCopy,props)}));expect(html).toContain('>Fences</span>');expect(html).not.toContain('Wrong authority');
});
it('rejects locked authority fields rather than adding an inline promotion target',()=>expect(()=>renderToStaticMarkup(React.createElement(ContentCopy,{...props,field:'media.hero'}))).toThrow('Unsupported canonical copy field'));
it('keeps service card typography and navigation while exposing canonical name and description',()=>{
  const service={id:'fences',slug:'fences',name:'Fences',description:'Built to last.',icon:'fence'} as Service;
  const html=renderToStaticMarkup(React.createElement(ServiceCard,{service}));expect(html).toContain('href="/services/fences"');expect(html).toContain('font-display text-lg');expect(html).toContain('data-content-field="name"');expect(html).toContain('data-content-field="description"');expect(html).toContain('>Built to last.</span>');
});
it('exposes complete project title and story text without editing media or formatted labels',()=>{
  const project={id:'fence-1',slug:'fence-story',title:'Cedar fence',location:{},media:{},story:{challenge:'Old fence needed repair.',solution:'Built new cedar panels.',outcome:'A welcoming yard.'}} as Project;
  const html=renderToStaticMarkup(React.createElement(ProjectSpotlight,{project}));for(const field of ['title','story.challenge','story.solution','story.outcome'])expect(html).toContain(`data-content-field="${field}"`);expect(html).toContain('text-4xl font-bold sm:text-5xl');expect(html).toContain('The challenge');expect(html).toContain('data-content-route="/projects/fence-story"');
});

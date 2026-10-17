"use client";

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, Expand } from 'lucide-react';
import { ContentCopy } from '@/components/content-copy';
import { VisualSlot } from '@/components/visual-slot';
import { ProjectLightbox } from '@/components/project-lightbox';
import { getServiceBySlug } from '@/lib/registries';
import type { Project } from '@/types/projects';

/** Presentation consumes the resolved project only; source and media gates stay server-owned. */
export function ProjectSpotlight({ project, variant = 'full', tone = 'light' }: {
  project: Project;
  variant?: 'feature' | 'full';
  tone?: 'light' | 'dark';
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const route = `/projects/${project.slug || project.id}`;
  const copy = (field: string, value: string) => <ContentCopy collection="projects" id={project.id} field={field} value={value} route={route} />;
  const hero = project.media.heroMedia;
  const heroSource = hero?.variants.responsive?.at(-1)?.webp || hero?.variants.web || hero?.variants.original;
  const service = getServiceBySlug(project.service)?.name || project.service?.replaceAll('-', ' ');
  const lightboxImages = heroSource ? [{ src: heroSource, alt: hero?.alt || project.title, blurDataURL: hero?.variants.blur }] : [];

  const photograph = heroSource && <VisualSlot
    id={`project-hero-${project.id}`} route={route} page="ProjectDetail" section="Hero"
    slotName={`${project.title} Hero`} currentMediaId={hero?.id || null} component="ProjectSpotlight"
    className="h-full w-full"
  >
    <Image src={heroSource} alt={hero?.alt || project.title} width={hero?.dimensions.width || 1600} height={hero?.dimensions.height || 1000}
      sizes={variant === 'full' ? '(min-width: 1440px) 1320px, 100vw' : '(min-width: 1024px) 50vw, 100vw'}
      priority={variant === 'full'} placeholder={hero?.variants.blur ? 'blur' : 'empty'} blurDataURL={hero?.variants.blur}
      className="h-auto max-h-[82svh] w-full object-contain" />
  </VisualSlot>;

  if (variant === 'feature') {
    if (!heroSource) return null;
    return <section className={`craft-section ${tone === 'dark' ? 'bg-[#162B29] text-[#EDEAE0]' : 'bg-[#EDEAE0] text-[#1F3F3C]'}`}>
      <div className="craft-shell grid items-center gap-9 lg:grid-cols-[1.3fr_1fr] lg:gap-16">
        <Link href={route} className="block overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D99A4E]">{photograph}</Link>
        <div><p className="craft-eyebrow">Featured project / {project.location.city}</p><h2 className="mt-5 font-display text-3xl leading-tight sm:text-4xl">{copy('title', project.title)}</h2>{project.story?.outcome && <p className="mt-5 text-lg leading-relaxed opacity-80">{copy('story.outcome', project.story.outcome)}</p>}<Link href={route} className="craft-link mt-6 inline-flex min-h-11 items-center gap-3">Read the full story <ArrowUpRight size={17} aria-hidden="true" /></Link></div>
      </div>
    </section>;
  }

  return <article className="bg-[#EDEAE0] text-[#1F3F3C]">
    <header className="craft-shell pb-8 pt-9 sm:pb-12 sm:pt-14">
      <Link href="/our-work" className="craft-link inline-flex min-h-11 items-center gap-3 text-sm"><ArrowLeft size={16} aria-hidden="true" /> All our work</Link>
      <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2"><p className="craft-eyebrow">{service}</p>{project.location.city && <p className="craft-eyebrow text-[#1F3F3C]/65">{project.location.city}, {project.location.state || 'Oregon'}</p>}</div>
      <h1 className="mt-5 max-w-6xl font-display text-4xl font-bold sm:text-5xl lg:text-[4.5rem] lg:leading-[1.05] lg:tracking-[-0.035em]">{copy('title', project.title)}</h1>
    </header>

    {heroSource && <figure className="craft-shell">
      <div className="group relative bg-[#162B29]">
        {photograph}
        <button type="button" onClick={() => setLightboxOpen(true)} aria-label={`View the full photograph of ${project.title}`} className="absolute bottom-4 right-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#EDEAE0] px-4 text-sm text-[#1F3F3C] shadow-sm transition-colors hover:bg-[#D99A4E] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D99A4E]"><Expand size={15} aria-hidden="true" /><span>View full photograph</span></button>
      </div>
      <figcaption className="flex flex-wrap justify-between gap-2 border-b border-[#1F3F3C]/20 py-4 text-xs tracking-wide text-[#1F3F3C]/70"><span>{project.title}</span><span>{project.location.city}{project.location.county ? ` / ${project.location.county} County` : ''}</span></figcaption>
    </figure>}

    {project.story && <section aria-label="The project story" className="craft-section">
      <div className="craft-shell grid gap-10 lg:grid-cols-[0.45fr_1fr] lg:gap-20">
        <div><p className="craft-eyebrow">Behind the work</p><p className="mt-4 max-w-xs font-display text-3xl leading-tight sm:text-4xl">The details make<br className="hidden sm:block" /> the difference.</p></div>
        <div className="max-w-3xl space-y-10">
          {project.story.challenge && <StoryBlock number="01" title="The challenge" body={copy('story.challenge', project.story.challenge)} />}
          {project.story.solution && <StoryBlock number="02" title="The solution" body={copy('story.solution', project.story.solution)} />}
          {project.story.outcome && <StoryBlock number="03" title="The outcome" body={copy('story.outcome', project.story.outcome)} />}
          {!!project.story.specialFeatures?.length && <ul aria-label="Project details" className="flex flex-wrap gap-2 border-t border-[#1F3F3C]/20 pt-7">{project.story.specialFeatures.map((feature, index) => <li key={index} className="rounded-full border border-[#1F3F3C]/20 px-4 py-2 text-sm">{copy(`story.specialFeatures.${index}`, feature)}</li>)}</ul>}
        </div>
      </div>
    </section>}
    <ProjectLightbox images={lightboxImages} isOpen={lightboxOpen} onClose={() => setLightboxOpen(false)} />
  </article>;
}

function StoryBlock({ number, title, body }: { number: string; title: string; body: React.ReactNode }) {
  return <section className="grid grid-cols-[2rem_1fr] gap-3 sm:grid-cols-[3rem_1fr] sm:gap-5"><p aria-hidden="true" className="pt-1 text-xs tracking-widest text-[#1F3F3C]/50">{number}</p><div><h2 className="font-display text-2xl sm:text-3xl">{title}</h2><p className="mt-4 text-base leading-relaxed text-[#1F3F3C]/80 sm:text-lg">{body}</p></div></section>;
}
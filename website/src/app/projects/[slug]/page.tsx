import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowUpRight, ArrowRight } from 'lucide-react';
import { ProjectSpotlight } from '@/components/project-spotlight';
import { ProjectPhotos } from '@/components/project-photos';
import { BeforeAfterSlider } from '@/components/before-after-slider';
import { getAllProjects, getProjectBySlug, getProjectWithResolvedMedia, getProjectsWithResolvedMedia, getRelatedProjects } from '@/lib/projects';
import { getReviewById } from '@/lib/reviews';
import { getServiceBySlug } from '@/lib/registries';

export function generateStaticParams() {
  return getAllProjects().map(project => ({ slug: project.slug || project.id }));
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) return {};
  const resolved = await getProjectWithResolvedMedia(project);
  const image = resolved.media.heroMedia?.variants.web || resolved.media.heroMedia?.variants.original;
  return {
    title: project.title,
    description: project.story?.outcome || project.title,
    alternates: { canonical: `/projects/${project.slug || project.id}` },
    openGraph: { title: project.title, description: project.story?.outcome || project.title, images: image ? [{ url: image }] : [] },
  };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) notFound();

  // All presentation media, including related work, passes the existing canonical public gate.
  const [resolved, related, reviewCandidate] = await Promise.all([
    getProjectWithResolvedMedia(project),
    getProjectsWithResolvedMedia(getRelatedProjects(project.id, 3).filter(item => !item.archived)),
    project.reviews?.[0] ? getReviewById(project.reviews[0]) : Promise.resolve(null),
  ]);
  const review = reviewCandidate && ['published', 'featured'].includes(reviewCandidate.status) ? reviewCandidate : null;
  const service = getServiceBySlug(project.service);
  const photos = resolved.media.galleryMedia || [];
  const materials = [project.materials?.primary, ...(project.materials?.secondary || []), ...(project.materials?.customMaterials || [])].filter((value): value is string => !!value);
  const before = resolved.media.beforeMedia;
  const after = resolved.media.afterMedia;
  const hasComparison = before && after && before.id !== after.id && before.contentHash !== after.contentHash;
  const completion = project.completionDate ? new Date(project.completionDate) : null;
  const completedLabel = completion && !Number.isNaN(completion.getTime()) ? completion.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }) : null;
  const requestHref = `/estimate?project=${encodeURIComponent(project.slug || project.id)}`;

  return <div className="bg-[#EDEAE0] text-[#1F3F3C]">
    <ProjectSpotlight project={resolved} variant="full" />

    <section aria-label="Project facts" className="pb-14 sm:pb-20">
      <div className="craft-shell">
        <dl className="grid gap-x-10 gap-y-7 border-y border-[#1F3F3C]/20 py-8 sm:grid-cols-3">
          <div><dt className="craft-eyebrow text-[#1F3F3C]/60">The work</dt><dd className="mt-3 text-lg">{service ? <Link href={`/services/${service.slug}`} className="underline decoration-[#1F3F3C]/30 underline-offset-4 hover:decoration-current">{service.name}</Link> : project.service.replaceAll('-', ' ')}</dd></div>
          {project.location.city && <div><dt className="craft-eyebrow text-[#1F3F3C]/60">The place</dt><dd className="mt-3 text-lg">{project.location.city}{project.location.county && <span className="mt-1 block text-sm text-[#1F3F3C]/65">{project.location.county} County</span>}</dd></div>}
          {completedLabel && <div><dt className="craft-eyebrow text-[#1F3F3C]/60">Completed</dt><dd className="mt-3 text-lg">{completedLabel}</dd></div>}
        </dl>
        {materials.length > 0 && <div className="grid gap-5 border-b border-[#1F3F3C]/20 py-8 sm:grid-cols-[1fr_2fr]"><h2 className="craft-eyebrow">Materials in the work</h2><ul className="flex flex-wrap gap-x-6 gap-y-3 text-base">{materials.map((material, index) => <li key={index}>{material}</li>)}</ul></div>}
      </div>
    </section>

    {hasComparison && <section className="craft-section bg-[#E9DBC9]"><div className="craft-shell"><p className="craft-eyebrow">The transformation</p><h2 className="craft-title mt-4">Before & after</h2><div className="mt-8 max-w-4xl"><BeforeAfterSlider project={resolved} route={`/projects/${project.slug || project.id}`} /></div></div></section>}

    {photos.length > 0 && <section className="craft-section bg-[#162B29] text-[#EDEAE0]" aria-labelledby="project-gallery-title">
      <div className="craft-shell">
        <div className="mb-9 flex flex-wrap items-end justify-between gap-6 sm:mb-12"><div><p className="craft-eyebrow text-[#D99A4E]">Take a closer look</p><h2 id="project-gallery-title" className="craft-title mt-4">The project, in photographs.</h2></div><p className="max-w-xs text-sm leading-relaxed text-[#EDEAE0]/70">Open a photograph for the full view. Use the arrows or swipe to explore.</p></div>
        <ProjectPhotos photos={photos} project={{ id: project.id, title: project.title, slug: project.slug }} />
      </div>
    </section>}

    {review && <section className="craft-section bg-[#E9DBC9]" aria-label="Customer review"><div className="craft-shell grid gap-8 lg:grid-cols-[0.5fr_1fr]"><p className="craft-eyebrow">In the homeowner's words</p><figure className="max-w-3xl"><p className="text-sm tracking-wide">{review.rating} / 5</p>{review.title && <h2 className="mt-3 font-display text-2xl">{review.title}</h2>}<blockquote className="mt-5 font-display text-2xl leading-relaxed sm:text-3xl">&ldquo;{review.body}&rdquo;</blockquote><figcaption className="mt-6 text-sm">{review.reviewer.name}{review.location?.city ? ` / ${review.location.city}` : ''}</figcaption></figure></div></section>}

    {related.length > 0 && <section className="craft-section" aria-labelledby="related-work-title">
      <div className="craft-shell">
        <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="craft-eyebrow">Keep exploring</p><h2 id="related-work-title" className="craft-title mt-4">More from our work.</h2></div><Link href="/our-work" className="craft-link inline-flex min-h-11 items-center gap-3">All projects <ArrowRight size={16} aria-hidden="true" /></Link></div>
        <div className="mt-9 grid gap-x-7 gap-y-10 md:grid-cols-3">
          {related.map(item => {
            const hero = item.media.heroMedia;
            const src = hero?.variants.web || hero?.variants.original;
            return <article key={item.id}><Link href={`/projects/${item.slug || item.id}`} className="group block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1F3F3C]">
              {src && <div className="relative aspect-[4/3] overflow-hidden" data-media-id={hero?.id}><Image src={src} alt={hero?.alt || item.title} fill sizes="(min-width: 1440px) 420px, (min-width: 768px) 33vw, 100vw" className="object-cover transition-transform duration-300 motion-safe:group-hover:scale-[1.025] motion-reduce:transition-none" loading="lazy" /></div>}
              <p className="craft-eyebrow mt-5 text-[#1F3F3C]/60">{getServiceBySlug(item.service)?.name || item.service.replaceAll('-', ' ')} / {item.location.city}</p>
              <h3 className="mt-3 flex items-start justify-between gap-4 font-display text-2xl leading-tight"><span>{item.title}</span><ArrowUpRight size={20} className="mt-1 shrink-0" aria-hidden="true" /></h3>
            </Link></article>;
          })}
        </div>
      </div>
    </section>}

    <section className="craft-section bg-[#1F3F3C] text-[#EDEAE0]">
      <div className="craft-shell grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-end">
        <div><p className="craft-eyebrow text-[#D99A4E]">Your project starts with a conversation</p><h2 className="craft-title mt-4 max-w-3xl">Planning something similar?</h2><p className="mt-5 max-w-xl text-lg leading-relaxed text-[#EDEAE0]/80">Tell us what you have in mind. This project will come along as a reference.</p><Link href={requestHref} className="craft-button craft-button--gold mt-7 inline-flex items-center gap-3">Tell us about your project <ArrowUpRight size={18} aria-hidden="true" /></Link></div>
        <div className="border-t border-[#EDEAE0]/25 pt-6 lg:border-l lg:border-t-0 lg:pl-10"><Link href="/our-work" className="craft-link inline-flex min-h-11 items-center gap-3"><ArrowLeft size={16} aria-hidden="true" /> Back to our work</Link><p className="mt-5 font-display text-2xl">More ideas for home.</p><Link href="/newsletter" className="craft-link mt-2 inline-flex min-h-11 items-center gap-3">Explore the newsletter <ArrowUpRight size={16} aria-hidden="true" /></Link></div>
      </div>
    </section>
  </div>;
}

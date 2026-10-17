import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ContentCopy } from '@/components/content-copy';
import { TextCopy } from '@/components/text-copy';
import { BeforeAfterSlider } from '@/components/before-after-slider';
import { VisualSlot } from '@/components/visual-slot';
import { getServiceBySlug, getNonArchivedServices } from '@/lib/registries';
import { getServiceGallery } from '@/lib/galleries';
import { getAllProjects, getProjectsWithResolvedMedia } from '@/lib/projects';
import { resolvePublicMedia } from '@/lib/media';
import { getServiceCardAssignment } from '@/lib/assignment-store';
import type { Media } from '@/types/media';

interface ServicePageProps { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  return getNonArchivedServices().map(service => ({ slug: service.slug }));
}

export async function generateMetadata({ params }: ServicePageProps): Promise<Metadata> {
  const service = getServiceBySlug((await params).slug);
  return service ? { title: service.name, description: service.description, alternates: { canonical: `/services/${service.slug}` } } : { title: 'Service Not Found' };
}

export const dynamic = 'force-dynamic';

export default async function ServicePage({ params }: ServicePageProps) {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) notFound();
  const route = `/services/${service.slug}`;
  const requestHref = `/estimate?service=${encodeURIComponent(service.slug)}`;
  const gallery = getServiceGallery(service.id);
  const projects = await getProjectsWithResolvedMedia(gallery.projects);
  const publicProjects = getAllProjects();
  const hasServiceEvidence = (serviceSlug: string, media: Media | null | undefined) => Boolean(media && publicProjects.some(project => project.service === serviceSlug && [project.media.hero, project.media.before, project.media.after, ...project.media.gallery, ...(project.media.details || []), ...(project.media.progress || [])].includes(media.id)));
  const featured = projects[0];
  const related = getNonArchivedServices().filter(item => item.id !== service.id).slice(0, 3);
  const assignments = new Map<string, { mediaId: string; mediaObject: Media | null }>();
  for (const item of [service, ...related]) {
    try {
      const assignment = await getServiceCardAssignment(item.slug);
      if (assignment?.mediaId) assignments.set(item.slug, { mediaId: assignment.mediaId, mediaObject: await resolvePublicMedia(assignment.mediaId) });
    } catch (error) {
      console.error('[SERVICE_DETAIL] Failed to load service card assignment:', item.slug, error);
    }
  }
  const assignedHero = assignments.get(service.slug)?.mediaObject;
  const hero = featured?.media.heroMedia || (hasServiceEvidence(service.slug, assignedHero) ? assignedHero : null);
  const heroSrc = hero?.variants?.web || hero?.variants?.original;

  return (
    <div className="craft-page bg-[#EDEAE0] text-[#1F3F3C]">
      <section className="craft-shell pb-12 pt-10 sm:pb-20 sm:pt-14">
        <Link href="/services" className="inline-flex min-h-11 items-center gap-3 text-sm font-semibold"><span aria-hidden="true">←</span> All services</Link>
        <div className={`mt-8 grid items-center gap-10 lg:gap-16 ${heroSrc ? 'lg:grid-cols-[0.85fr_1.15fr]' : ''}`}>
          <div className="max-w-2xl">
            <p className="craft-eyebrow">Happy Place Carpentry <span className="mx-2" aria-hidden="true">/</span> Services</p>
            <h1 className="craft-display mt-6"><ContentCopy collection="services" id={service.id} field="name" value={service.name} route={route} /></h1>
            <p className="craft-copy mt-6"><ContentCopy collection="services" id={service.id} field="description" value={service.description} route={route} /></p>
            <Link href={requestHref} className="craft-button craft-button--gold mt-8">Talk about your project <span aria-hidden="true">↗</span></Link>
            <p className="mt-5 text-sm text-[#1F3F3C]/70">Mid-Willamette Valley, Oregon</p>
          </div>
          {hero && heroSrc ? <figure className="relative">
            <div className="bg-[#DCD7C9] p-2 sm:p-3">
              {featured && hero.id === featured.media.heroMedia?.id ? <VisualSlot id={`services-${slug}-project-card-${featured.id}`} route={route} page="ServiceDetail" section="Project Gallery" slotName={`${featured.title} Project Card`} currentMediaId={featured.media.hero || null} component="ProjectCard">
                <Image src={heroSrc} alt={hero.alt || service.name} width={hero.dimensions?.width || 1200} height={hero.dimensions?.height || 900} sizes="(min-width: 1024px) 55vw, 100vw" priority placeholder={hero.variants?.blur ? 'blur' : 'empty'} blurDataURL={hero.variants?.blur} className="max-h-[680px] w-full object-contain" />
              </VisualSlot> : <Image src={heroSrc} alt={hero.alt || service.name} width={hero.dimensions?.width || 1200} height={hero.dimensions?.height || 900} sizes="(min-width: 1024px) 55vw, 100vw" priority placeholder={hero.variants?.blur ? 'blur' : 'empty'} blurDataURL={hero.variants?.blur} className="max-h-[680px] w-full object-contain" />}
            </div>
            {featured ? <figcaption className="mt-3 flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs font-medium uppercase tracking-[0.12em] text-[#1F3F3C]/70"><span>{featured.title}</span><Link href={`/projects/${featured.slug || featured.id}`} className="inline-flex min-h-11 items-center underline underline-offset-4">See the project ↗</Link></figcaption> : null}
          </figure> : null}
        </div>
      </section>

      {projects.length ? <section className="craft-section bg-[#162B29] text-[#EDEAE0]">
        <div className="craft-shell">
          <div className="flex flex-wrap items-end justify-between gap-8">
            <div><p className="craft-eyebrow text-[#D99A4E]">The work, up close</p><h2 className="mt-5 max-w-3xl font-display text-4xl leading-tight sm:text-5xl">{service.name} projects</h2></div>
            <Link href={`/our-work?service=${encodeURIComponent(service.slug)}`} className="inline-flex min-h-11 items-center gap-3 text-sm font-semibold underline decoration-[#EDEAE0]/40 underline-offset-4">Explore our work <span aria-hidden="true">↗</span></Link>
          </div>
          <div className="mt-12 space-y-14">
            {projects.slice(0, 6).map(project => {
              const media = project.media.heroMedia;
              const src = media?.variants?.web || media?.variants?.original;
              const projectHref = `/projects/${project.slug || project.id}`;
              const repeatsHero = Boolean(media && hero && media.id === hero.id);
              return <article key={project.id} className="grid gap-7 lg:grid-cols-[1.3fr_0.7fr] lg:items-center lg:gap-14">
                {src && media && !repeatsHero ? <Link href={projectHref} className="block bg-[#24423D]">
                  <VisualSlot id={`services-${slug}-project-card-${project.id}`} route={route} page="ServiceDetail" section="Project Gallery" slotName={`${project.title} Project Card`} currentMediaId={project.media.hero || null} component="ProjectCard">
                    <Image src={src} alt={media.alt || `${project.title} - ${project.location.city}`} width={media.dimensions?.width || 1200} height={media.dimensions?.height || 900} sizes="(min-width: 1024px) 60vw, 100vw" className="max-h-[650px] w-full object-contain" />
                  </VisualSlot>
                </Link> : repeatsHero && project.story ? <div className="max-w-2xl space-y-8 border-l border-[#D99A4E]/50 pl-6 sm:pl-8">
                  {project.story.challenge ? <div><h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#D99A4E]">The challenge</h3><p className="mt-4 font-display text-2xl leading-relaxed sm:text-3xl"><ContentCopy collection="projects" id={project.id} field="story.challenge" value={project.story.challenge} route={projectHref} /></p></div> : null}
                  {project.story.solution ? <div><h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#D99A4E]">The approach</h3><p className="mt-4 text-lg leading-relaxed text-[#EDEAE0]/85"><ContentCopy collection="projects" id={project.id} field="story.solution" value={project.story.solution} route={projectHref} /></p></div> : null}
                </div> : null}
                <div className={!src || (repeatsHero && !project.story) ? 'lg:col-span-2' : ''}>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#D99A4E]">{project.location.city}{project.location.county ? ` · ${project.location.county}` : ''}</p>
                  <h3 className="mt-4 font-display text-3xl leading-tight sm:text-4xl"><Link href={projectHref}><ContentCopy collection="projects" id={project.id} field="title" value={project.title} route={projectHref} /></Link></h3>
                  {project.story?.outcome ? <p className="mt-5 leading-relaxed text-[#EDEAE0]/80"><ContentCopy collection="projects" id={project.id} field="story.outcome" value={project.story.outcome} route={projectHref} /></p> : null}
                  <Link href={projectHref} className="mt-6 inline-flex min-h-11 items-center gap-3 text-sm font-semibold underline decoration-[#EDEAE0]/40 underline-offset-4">View full project <span aria-hidden="true">↗</span></Link>
                </div>
              </article>;
            })}
          </div>
          {featured?.media.beforeMedia && featured.media.afterMedia ? <div className="mt-16 border-t border-white/15 pt-10"><p className="craft-eyebrow mb-6 text-[#D99A4E]">Before & after</p><BeforeAfterSlider project={featured} /></div> : null}
        </div>
      </section> : null}

      <section className="craft-section">
        <div className="craft-shell grid gap-12 lg:grid-cols-2 lg:gap-24">
          <div>
            <p className="craft-eyebrow">Your project starts here</p>
            <h2 className="craft-title mt-5">Tell us what you have in mind.</h2>
            <p className="craft-copy mt-5"><TextCopy textKey="contact.details.description" /></p>
            <Link href={requestHref} className="craft-button mt-8">Plan your {service.name.toLowerCase()} project <span aria-hidden="true">↗</span></Link>
            <Link href="/contact" className="mt-5 flex min-h-11 w-fit items-center text-sm underline underline-offset-4">Prefer to call or email?</Link>
          </div>
          <div className="border-t border-[#1F3F3C]/20 pt-8 lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0">
            {service.estimateQuestions?.length ? <><p className="craft-eyebrow">A few things to think about</p><ul className="mt-5 space-y-5">{service.estimateQuestions.slice(0, 3).map(question => <li key={question.id} className="flex gap-4 text-lg leading-relaxed"><span aria-hidden="true" className="text-[#9A6829]">↗</span>{question.label}</li>)}</ul></> : null}
            <div className="mt-8 flex flex-col items-start gap-2">
              <Link href="/resources" className="craft-link inline-flex min-h-11 items-center">Homeowner resources <span aria-hidden="true">↗</span></Link>
              <Link href={`/newsletter?source=service-${encodeURIComponent(service.slug)}`} className="craft-link inline-flex min-h-11 items-center">Homeowner notes by email <span aria-hidden="true">↗</span></Link>
            </div>
          </div>
        </div>
      </section>

      {related.length ? <section className="craft-shell border-t border-[#1F3F3C]/20 py-12 sm:py-16">
        <p className="craft-eyebrow">Other services</p>
        <div className="mt-6 grid gap-8 sm:grid-cols-3">{related.map(item => {
          const assignment = assignments.get(item.slug);
          const media = assignment?.mediaObject;
          const src = hasServiceEvidence(item.slug, media) ? media?.variants?.web || media?.variants?.original : undefined;
          return <Link key={item.id} href={`/services/${item.slug}`} className="group block">
            <VisualSlot id={`services-${slug}-related-service-card-${item.slug}`} route={route} page="ServiceDetail" section="Related Services" slotName={`${item.name} Service Card`} currentMediaId={assignment?.mediaId || null} component="ServiceCard">
              {src && media ? <Image src={src} alt={media.alt || item.name} width={media.dimensions?.width || 800} height={media.dimensions?.height || 600} sizes="(min-width: 640px) 33vw, 100vw" className="mb-5 h-auto max-h-64 w-full object-contain" /> : null}
            </VisualSlot>
            <h3 className="flex items-center justify-between gap-3 font-display text-2xl"><ContentCopy collection="services" id={item.id} field="name" value={item.name} route={`/services/${item.slug}`} /><span aria-hidden="true" className="text-lg">↗</span></h3>
            <p className="mt-3 text-sm leading-relaxed text-[#1F3F3C]/75"><ContentCopy collection="services" id={item.id} field="description" value={item.description} route={`/services/${item.slug}`} /></p>
          </Link>;
        })}</div>
      </section> : null}
    </div>
  );
}

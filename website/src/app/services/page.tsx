import { TextCopy } from '@/components/text-copy';
import { ContentCopy } from '@/components/content-copy';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { getNonArchivedServices } from '@/lib/registries';
import { getServiceCardAssignment } from '@/lib/assignment-store';
import { resolvePublicMedia } from '@/lib/media';
import { getAllProjects } from '@/lib/projects';
import type { Media } from '@/types/media';

export const metadata: Metadata = {
  title: 'Services',
  description: 'Painting, repairs, restoration, fences, and drywall by Happy Place Carpentry.',
  alternates: { canonical: '/services' },
};

export const dynamic = 'force-dynamic';

export default async function ServicesPage() {
  const services = getNonArchivedServices();
  const publicProjects = getAllProjects();
  const serviceCardMediaMap = new Map<string, Media>();

  // Preserve the existing assignment → public-media-gate path and gated fallback.
  for (const service of services) {
    try {
      const assignment = await getServiceCardAssignment(service.slug, 'services-page');
      if (assignment?.mediaId) {
        const media = await resolvePublicMedia(assignment.mediaId);
        if (media) serviceCardMediaMap.set(service.slug, media);
      }
      if (!serviceCardMediaMap.has(service.slug) && service.cardMediaId) {
        const media = await resolvePublicMedia(service.cardMediaId);
        if (media) serviceCardMediaMap.set(service.slug, media);
      }
    } catch (error) {
      console.error('[SERVICES_PAGE] Failed to resolve media for service:', service.slug, error);
    }
  }

  return (
    <div className="craft-page bg-[#EDEAE0] text-[#1F3F3C]">
      <section className="craft-shell pb-12 pt-12 sm:pb-16 sm:pt-20">
        <p className="craft-eyebrow"><TextCopy textKey="services.copy.1" /></p>
        <div className="mt-6 grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-end lg:gap-20">
          <h1 className="craft-display max-w-4xl"><TextCopy textKey="services.hero.title" /></h1>
          <div>
            <p className="craft-copy max-w-md"><TextCopy textKey="services.hero.description" /></p>
            <Link href="/estimate" className="craft-link mt-6 inline-flex min-h-11 items-center">Talk about your project <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
        <nav aria-label="Find a service" className="mt-10 flex flex-wrap gap-x-6 gap-y-2 border-y border-[#1F3F3C]/20 py-4 sm:mt-14">
          {services.map(service => <a key={service.id} href={`#${service.slug}`} className="inline-flex min-h-11 items-center text-sm font-semibold underline-offset-4 hover:underline">{service.name}<span className="ml-2 text-[#1F3F3C]/50" aria-hidden="true">↓</span></a>)}
        </nav>
      </section>

      <div className="craft-shell" data-service-grid>
        {services.map((service, index) => {
          const media = serviceCardMediaMap.get(service.slug);
          // Placement alone is not proof of the kind of work depicted.
          const evidence = media ? publicProjects.find(project => project.service === service.slug && [project.media.hero, project.media.before, project.media.after, ...project.media.gallery, ...(project.media.details || []), ...(project.media.progress || [])].includes(media.id)) : undefined;
          const src = evidence ? media?.variants?.web || media?.variants?.original : undefined;
          const route = `/services/${service.slug}`;
          return (
            <section id={service.slug} key={service.id} className="scroll-mt-28 border-b border-[#1F3F3C]/20 py-10 sm:py-16">
              <div className={`grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-16 ${index % 2 ? 'lg:[&>figure]:order-2' : ''}`}>
                {src && media ? (
                  <figure>
                    <Link href={route} className="group block overflow-hidden bg-[#E0DCCF]">
                      <Image src={src} alt={media.alt || service.name} width={media.dimensions?.width || 1200} height={media.dimensions?.height || 900} sizes="(min-width: 1024px) 50vw, 100vw" placeholder={media.variants?.blur ? 'blur' : 'empty'} blurDataURL={media.variants?.blur} className="h-auto max-h-[580px] w-full object-contain transition-transform duration-500 motion-safe:group-hover:scale-[1.015]" />
                    </Link>
                    {evidence ? <figcaption className="mt-3 text-sm leading-relaxed text-[#1F3F3C]/70"><Link href={`/projects/${evidence.slug || evidence.id}`} className="inline-flex min-h-11 items-center gap-2 underline decoration-[#1F3F3C]/30 underline-offset-4">{evidence.title} <span aria-hidden="true">↗</span></Link></figcaption> : null}
                  </figure>
                ) : null}
                <div className={`py-2 ${!src ? 'lg:col-span-2 lg:max-w-3xl' : ''}`}>
                  <p className="craft-eyebrow mb-5 text-[#1F3F3C]/60">{String(index + 1).padStart(2, '0')} <span className="mx-3" aria-hidden="true">/</span> Happy Place Carpentry</p>
                  <h2 className="craft-title"><Link href={route}><ContentCopy collection="services" id={service.id} field="name" value={service.name} route={route} /></Link></h2>
                  <p className="craft-copy mt-5 max-w-xl"><ContentCopy collection="services" id={service.id} field="description" value={service.description} route={route} /></p>
                  <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
                    <Link href={route} className="craft-link inline-flex min-h-11 items-center">Explore {service.name.toLowerCase()} <span aria-hidden="true">↗</span></Link>
                    <Link href={`/estimate?service=${encodeURIComponent(service.slug)}`} className="inline-flex min-h-11 items-center text-sm font-semibold underline decoration-[#1F3F3C]/30 underline-offset-4">Plan a project</Link>
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <section className="craft-section">
        <div className="craft-shell grid gap-10 lg:grid-cols-2 lg:gap-24">
          <div>
            <p className="craft-eyebrow">A place to start</p>
            <h2 className="craft-title mt-5"><TextCopy textKey="services.other.title" /></h2>
            <p className="craft-copy mt-5"><TextCopy textKey="services.other.description" /></p>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-3 text-sm text-[#1F3F3C]/80">
              {(['services.copy.2', 'services.copy.3', 'services.copy.4', 'services.copy.5', 'services.copy.6', 'services.copy.7', 'services.copy.8', 'services.copy.9'] as const).map(key => <span key={key}><TextCopy textKey={key} /></span>)}
            </div>
            <Link href="/estimate" className="craft-button mt-8">Talk about your project <span aria-hidden="true">↗</span></Link>
          </div>
          <div className="border-t border-[#1F3F3C]/20 pt-8 lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0">
            <p className="craft-eyebrow">Before you begin</p>
            <p className="mt-5 max-w-md font-display text-3xl leading-tight sm:text-4xl">See the work. Get a few ideas. Start a conversation.</p>
            <div className="mt-7 flex flex-col items-start gap-3">
              <Link href="/our-work" className="craft-link inline-flex min-h-11 items-center">Explore our work <span aria-hidden="true">↗</span></Link>
              <Link href="/resources" className="craft-link inline-flex min-h-11 items-center">Homeowner resources <span aria-hidden="true">↗</span></Link>
              <Link href="/newsletter?source=services" className="craft-link inline-flex min-h-11 items-center">Notes for your home <span aria-hidden="true">↗</span></Link>
            </div>
            <Link href="/contact" className="mt-6 inline-flex min-h-11 items-center text-sm underline underline-offset-4"><TextCopy textKey="services.copy.10" /></Link>
          </div>
        </div>
      </section>
    </div>
  );
}

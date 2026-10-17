import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowDown, ArrowUpRight } from 'lucide-react';
import { TextCopy } from '@/components/text-copy';
import { ContentCopy } from '@/components/content-copy';
import { ScrollReveal } from '@/components/scroll-reveal';
import { VisualSlot } from '@/components/visual-slot';
import { NewsletterSignup } from '@/components/newsletter-signup';
import { StarRating } from '@/components/star-rating';
import { getNonArchivedServices } from '@/lib/registries';
import { getHomepageServiceMedia } from '@/lib/homepage-service-media';
import { getFeaturedReviewsWithResolvedMedia } from '@/lib/reviews';
import { getCompany } from '@/lib/company';
import { getHomepageHero, getOwnerPortrait } from '@/lib/brand';
import { getFeaturedProjects, getProjectsWithResolvedMedia } from '@/lib/projects';

export const dynamic = 'force-dynamic';
export async function generateMetadata(): Promise<Metadata> {
  const hero = (await getHomepageHero())?.resolvedMedia;
  const image = hero?.variants?.web || 'https://happyplacecarpentry.com/brand/logo.png';
  return { openGraph: { images: [image] }, twitter: { images: [image] } };
}

export default async function HomePage() {
  const company = getCompany();
  const services = getNonArchivedServices().filter(service => service.homepageEligible);
  const [hero, owner, projects, serviceMedia, reviews] = await Promise.all([
    getHomepageHero(), getOwnerPortrait(), getProjectsWithResolvedMedia(getFeaturedProjects()),
    getHomepageServiceMedia(services), getFeaturedReviewsWithResolvedMedia(),
  ]);
  const heroMedia = hero?.resolvedMedia;
  const heroSrc = heroMedia?.variants.web || heroMedia?.variants.original;
  const ownerMedia = owner?.resolvedMedia;
  const ownerSrc = ownerMedia?.variants.web || ownerMedia?.variants.original;
  const stories = projects.filter(project => project.media.heroMedia).slice(0, 3);
  return <div className="craft-page">
    <section className="craft-home-hero bg-[#EDEAE0] text-[#1F3F3C]" aria-labelledby="home-title">
      <div className="craft-home-hero__copy">
        <span className="craft-eyebrow mb-7">Happy Place Carpentry · Oregon</span>
        <h1 id="home-title" className="craft-display max-w-[12ch]"><TextCopy textKey="homepage.hero.title" /></h1>
        <p className="mt-7 max-w-md text-sm leading-[1.85] text-[#344d47] sm:text-base"><TextCopy textKey="homepage.hero.description" /></p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link href="/estimate" className="craft-button"><TextCopy textKey="homepage.hero.primaryAction" /><ArrowUpRight size={17} aria-hidden="true" /></Link>
          <Link href="/our-work" className="craft-button craft-button--outline"><TextCopy textKey="homepage.hero.secondaryAction" /></Link>
        </div>
        <a href="#selected-work" className="craft-link mt-10 self-start text-xs"><ArrowDown size={14} aria-hidden="true" /> A closer look at the work</a>
      </div>
      <div className="craft-home-hero__image">
        <VisualSlot id="hero-background" route="/" page="Homepage" section="Hero" slotName="Hero Background" currentMediaId={hero?.mediaId || null} component="HomepageHero">
          {heroMedia && heroSrc && <Image src={heroSrc} alt={heroSrc === '/images/hero-background-enhanced.jpg' ? 'Measuring a timber board on work supports beside a fence' : heroMedia.alt || 'Happy Place Carpentry at work'} fill priority sizes="(min-width: 901px) 56vw, 100vw" className="object-cover object-center" placeholder={heroMedia.variants.blur ? 'blur' : 'empty'} blurDataURL={heroMedia.variants.blur} />}
        </VisualSlot>
        <span className="absolute bottom-5 left-5 right-5 flex justify-between border-t border-white/50 pt-3 text-[10px] font-semibold uppercase tracking-[.16em] text-white drop-shadow-md"><span>The work, up close</span><span>Happy Place Carpentry</span></span>
      </div>
    </section>

    <div className="border-b border-border-soft">
      <div className="craft-shell flex flex-wrap items-center justify-between gap-4 py-5 text-[10px] font-semibold uppercase tracking-[.14em] text-primary sm:text-xs">
        <span>Repair · Restore · Improve</span><span>{company.serviceArea}</span><Link href="/newsletter" className="inline-flex min-h-11 items-center gap-2">Ideas for your happy place <ArrowUpRight size={14} aria-hidden="true" /></Link>
      </div>
    </div>

    <section id="selected-work" className="craft-section scroll-mt-24">
      <div className="craft-shell">
        <ScrollReveal><div className="mb-10 flex flex-wrap items-end justify-between gap-6"><div><span className="craft-eyebrow text-primary"><TextCopy textKey="home.projects.eyebrow" /></span><h2 className="craft-title mt-4 text-primary"><TextCopy textKey="homepage.projects.title" /></h2></div><Link href="/our-work" className="craft-link">Explore the portfolio <ArrowUpRight size={16} aria-hidden="true" /></Link></div></ScrollReveal>
        <div className="grid gap-x-8 gap-y-12 lg:grid-cols-12">
          {stories.map((project, index) => {
            const media = project.media.heroMedia!;
            const src = media.variants.web || media.variants.original;
            if (!src) return null;
            const href = '/projects/' + (project.slug || project.id);
            return <ScrollReveal key={project.id} className={index === 0 ? 'lg:col-span-7' : index === 1 ? 'lg:col-span-5 lg:pt-24' : 'lg:col-span-7 lg:col-start-3'}>
              <Link href={href} className="group block">
                <div className={'craft-photo ' + (index === 1 ? 'aspect-[4/5]' : 'aspect-[4/3]')}>
                  <VisualSlot id={'homepage-featured-project-' + project.id} route="/" page="Homepage" section="Featured Projects" slotName={project.title + ' Featured Project'} currentMediaId={media.id} component="ProjectCard" className="absolute inset-0">
                    <Image src={src} alt={media.alt || project.title} fill sizes="(min-width: 1024px) 58vw, 100vw" className="object-cover" placeholder={media.variants.blur ? 'blur' : 'empty'} blurDataURL={media.variants.blur} />
                  </VisualSlot>
                </div>
                <div className="mt-5 flex items-start justify-between gap-5"><div><p className="craft-eyebrow text-text-subtle">{project.location.city || project.location.county}</p><h3 className="mt-2 font-display text-2xl leading-tight text-primary sm:text-3xl"><ContentCopy collection="projects" id={project.id} field="title" value={project.title} route={href} /></h3></div><ArrowUpRight size={24} className="mt-3 shrink-0 text-primary transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" aria-hidden="true" /></div>
                {project.story?.outcome && <p className="craft-copy mt-3 text-sm"><ContentCopy collection="projects" id={project.id} field="story.outcome" value={project.story.outcome} route={href} /></p>}
              </Link>
            </ScrollReveal>;
          })}
        </div>
      </div>
    </section>

    <section className="craft-section bg-[#EDEAE0] text-[#1F3F3C]">
      <div className="craft-shell grid gap-12 lg:grid-cols-[.85fr_1.15fr] lg:gap-20">
        <ScrollReveal><span className="craft-eyebrow"><TextCopy textKey="home.copy.3" /></span><h2 className="craft-title mt-5"><TextCopy textKey="homepage.services.title" /></h2><p className="mt-6 max-w-sm leading-relaxed"><TextCopy textKey="homepage.services.description" /></p><Link href="/services" className="craft-link mt-7">All services <ArrowUpRight size={16} aria-hidden="true" /></Link></ScrollReveal>
        <div data-service-grid>
          {services.map((service, index) => {
            const assignment = serviceMedia.get(service.slug);
            const media = assignment?.mediaObject;
            const src = media?.variants.web || media?.variants.original;
            return <div key={service.id} className="craft-service-row">
              <span className="self-start pt-2 font-mono text-[11px] opacity-60">{String(index + 1).padStart(2, '0')}</span>
              <div><Link href={'/services/' + service.slug} className="craft-service-name"><ContentCopy collection="services" id={service.id} field="name" value={service.name} route={'/services/' + service.slug} /></Link><div className="mt-2 max-w-sm text-sm leading-relaxed opacity-80"><ContentCopy collection="services" id={service.id} field="description" value={service.description} route={'/services/' + service.slug} /></div></div>
              <VisualSlot id={'homepage-service-card-slot-' + service.slug} route="/" page="Homepage" section="Services" slotName={service.name + ' Service Card'} currentMediaId={assignment?.mediaId || null} component="ServiceCard" className="relative hidden h-20 w-24 sm:block">
                {media && src && <Image src={src} alt={media.alt || service.name} fill sizes="96px" className="object-cover" />}
              </VisualSlot>
            </div>;
          })}
        </div>
      </div>
    </section>

    <section className="craft-section">
      <div className="craft-shell grid items-center gap-10 lg:grid-cols-2 lg:gap-24">
        <div className="craft-photo aspect-[4/5] max-h-[660px]">
          <VisualSlot id="homepage-owner-portrait-slot" route="/" page="Homepage" section="The Family" slotName="Owner Portrait" currentMediaId={owner?.mediaId || null} component="HeroSection" className="absolute inset-0">
            {ownerMedia && ownerSrc && <Image src={ownerSrc} alt={ownerMedia.alt || 'Taylor and Lanie of Happy Place Carpentry'} fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />}
          </VisualSlot>
        </div>
        <ScrollReveal><span className="craft-eyebrow text-primary">Meet Taylor &amp; Lanie</span><h2 className="craft-title mt-5 text-primary"><TextCopy textKey="homepage.family.title" /></h2><p className="craft-copy mt-7"><TextCopy textKey="homepage.family.introduction" /></p><p className="craft-copy mt-5">{company.owners[0]?.name}<TextCopy textKey="homepage.family.taylor" /></p><p className="craft-copy mt-5">{company.owners[1]?.name}<TextCopy textKey="homepage.family.lanie" /></p><Link href="/about" className="craft-link mt-7 text-primary">The people behind the work <ArrowUpRight size={16} aria-hidden="true" /></Link></ScrollReveal>
      </div>
    </section>

    {reviews.length > 0 && <section className="craft-section border-y border-border-soft"><div className="craft-shell"><span className="craft-eyebrow text-primary">From our customers</span><h2 className="craft-title mt-4 max-w-3xl text-primary"><TextCopy textKey="homepage.reviews.title" /></h2><div className="mt-12 grid gap-10 md:grid-cols-3">{reviews.slice(0, 3).map(review => <figure key={review.id}><StarRating rating={review.rating} /><blockquote className="mt-5 font-display text-2xl leading-relaxed">“{review.body}”</blockquote><figcaption className="mt-6 text-xs">{review.reviewer.name}{review.location?.city ? ' · ' + review.location.city : ''}</figcaption></figure>)}</div></div></section>}

    <section className="craft-section bg-[#1F3F3C] text-[#FFF8EC]">
      <div className="craft-shell grid gap-12 lg:grid-cols-2 lg:gap-24">
        <div><span className="craft-eyebrow text-[#E3B77C]">A project in mind?</span><h2 className="craft-title mt-5">Let’s make room for your next idea.</h2><p className="mt-6 max-w-md text-sm leading-relaxed text-[#FFF8EC]/80">Tell us what you have in mind. Prepare an email with your project details, or get in touch directly.</p><VisualSlot id="homepage-cta-slot" route="/" page="Homepage" section="CTA" slotName="CTA Section" currentMediaId={null} component="CTASection"><Link href="/estimate" className="craft-button craft-button--gold mt-8">Start your project <ArrowUpRight size={16} aria-hidden="true" /></Link></VisualSlot><Link href="/contact" className="craft-link ml-5 mt-4">Call or email</Link></div>
        <div className="border-t border-[#FFF8EC]/25 pt-10 lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0"><VisualSlot id="homepage-newsletter-slot" route="/" page="Homepage" section="Newsletter" slotName="Newsletter Section" currentMediaId={null} component="NewsletterSection"><NewsletterSignup source="homepage" variant="inline" /></VisualSlot></div>
      </div>
    </section>
  </div>;
}

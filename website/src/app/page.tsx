import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Container, Section, SectionHeading } from "@/components/section";
import { ServiceCard } from "@/components/service-card";
import { CTASection } from "@/components/cta-section";
import { StarRating } from "@/components/star-rating";
import { ScrollReveal } from "@/components/scroll-reveal";
import { CedarCorner } from "@/components/cedar-corner";
import { ToolMark } from "@/components/tool-mark";
import { HappyBrandSignature } from "@/components/happy-brand-signature";
import { Card } from "@/components/ui/card";
import { RouterLink } from "@/components/router-link";
import { PencilLine } from "@/components/pencil-line";
import { BlueprintGrid } from "@/components/blueprint-grid";
import { WorkshopAtmosphere } from "@/components/workshop-atmosphere";
import { getNonArchivedServices } from "@/lib/registries";
import { getFeaturedReviews, getFeaturedReviewsWithResolvedMedia, getReviewsWithResolvedMedia, getReviewStats } from "@/lib/reviews";
import { getCompany } from "@/lib/company";
import { getHomepageHero } from "@/lib/brand";
import { BeforeAfterSlider } from "@/components/before-after-slider";
import { NewsletterSignup } from "@/components/newsletter-signup";
import { getOwnerPortrait } from "@/lib/brand";
import { getMediaById, resolvePublicMedia } from "@/lib/media";
import { getFeaturedProjects } from "@/lib/projects";
import { getProjectWithResolvedMedia, getProjectsWithResolvedMedia } from "@/lib/projects";
import { VisualSlot } from "@/components/visual-slot";
import { getServiceCardAssignment } from "@/lib/assignment-store";
import type { Media } from "@/types/media";

// Mark homepage as dynamic to allow KV access during runtime assignments
export const dynamic = 'force-dynamic';

const siteUrl = "https://happyplacecarpentry.com";

export async function generateMetadata(): Promise<Metadata> {
  const heroBrand = await getHomepageHero();
  // P1 FIX: Use pre-validated resolvedMedia from brand function (passed public media gate)
  // This prevents bypassing the public media gate by calling getMediaById directly
  const heroMedia = heroBrand?.resolvedMedia || null;
  const ogImageUrl = heroMedia?.variants?.web || `${siteUrl}/brand/logo.png`;

  return {
    openGraph: {
      images: [{ url: ogImageUrl.startsWith("http") ? ogImageUrl : `${siteUrl}${ogImageUrl}` }],
    },
    twitter: {
      images: [ogImageUrl.startsWith("http") ? ogImageUrl : `${siteUrl}${ogImageUrl}`],
    },
  };
}

export default async function HomePage() {
  const company = getCompany();
  // P0 FIX: Resolve review media through public media gate to prevent bypass
  const topReviews = (await getFeaturedReviewsWithResolvedMedia()).slice(0, 3);
  const stats = await getReviewStats();
  const hasReviews = stats.count > 0;
  const [taylor, lanie] = company.owners;
  const ownerBrand = await getOwnerPortrait();    // owner portrait from Brand Authority (now async for runtime assignment)
  // P1 FIX: Use pre-validated resolvedMedia from brand function (passed public media gate)
  // This prevents bypassing the public media gate by calling getMediaById directly
  const ownerMedia = ownerBrand?.resolvedMedia || null;
  
  // Use responsive variants if available to select best quality
  const ownerResponsiveVariants = ownerMedia?.variants?.responsive;
  const hasOwnerResponsiveVariants = ownerResponsiveVariants && ownerResponsiveVariants.length > 0;
  const ownerSrc = ownerMedia 
    ? (hasOwnerResponsiveVariants 
        ? ownerResponsiveVariants[ownerResponsiveVariants.length - 1].webp 
        : (ownerMedia.variants?.web || ownerMedia.variants?.original || undefined))
    : undefined;
  const allServices = getNonArchivedServices();      // data-driven services from registry
  const featuredProjects = getFeaturedProjects(); // featured projects from Projects Authority
  // P0 FIX: Resolve project media through public media gate to prevent bypass
  const featuredProjectsWithMedia = await getProjectsWithResolvedMedia(featuredProjects);
  
  // Get hero from Brand Authority with runtime assignment
  const homepageHero = await getHomepageHero();
  // P1 FIX: Use pre-validated resolvedMedia from brand function (passed public media gate)
  // This prevents bypassing the public media gate by calling getMediaById directly
  const heroMedia = homepageHero?.resolvedMedia || null;
  
  // Use responsive variants if available to select best quality
  const heroResponsiveVariants = heroMedia?.variants?.responsive;
  const hasHeroResponsiveVariants = heroResponsiveVariants && heroResponsiveVariants.length > 0;
  const heroSrc = heroMedia 
    ? (hasHeroResponsiveVariants 
        ? heroResponsiveVariants[heroResponsiveVariants.length - 1].webp 
        : (heroMedia.variants?.web || heroMedia.variants?.original))
    : null; // P1 FIX: No legacy /images/ fallback - fail closed
  
  // Get exterior painting project for featured transformation (has before/after media)
  const paintingProject = featuredProjectsWithMedia.find(p => p.id === 'exterior-painting-001');
  
  // Group services for homepage display (show homepageEligible services first)
  const homepageServices = allServices.filter(s => s.homepageEligible);
  
  // Load runtime assignments for service cards on server side (avoids client-side Redis access)
  // During static build, KV may be unavailable - fall back to static configuration
  const serviceCardAssignments = new Map<string, { mediaId: string | null; mediaObject: Media | null }>();
  for (const service of homepageServices) {
    try {
      const assignment = await getServiceCardAssignment(service.slug);
      if (assignment?.mediaId) {
        // Resolve media object through public media gate (rejects Drive references, synthetic content, missing Blob metadata)
        const mediaObject = await resolvePublicMedia(assignment.mediaId);
        
        console.log('[PUBLIC_MEDIA_GATE] SERVICE_CARD_RESOLUTION', {
          serviceSlug: service.slug,
          runtimeCardMediaId: assignment.mediaId,
          resolved: Boolean(mediaObject),
          resolvedMediaId: mediaObject?.id ?? null,
        });
        
        // CRITICAL FIX: Runtime assignment is only authoritative if its media record passes resolvePublicMedia()
        // If the runtime assignment points to a rejected/missing media record, discard that runtime candidate
        // Fall back to the service's authoritative cardMediaId from static configuration
        if (mediaObject) {
          serviceCardAssignments.set(service.slug, {
            mediaId: assignment.mediaId,
            mediaObject,
          });
        } else {
          console.log('[PUBLIC_MEDIA_GATE] RUNTIME_ASSIGNMENT_REJECTED - FAILING_CLOSED', {
            serviceSlug: service.slug,
            rejectedRuntimeMediaId: assignment.mediaId,
          });
          
          // P0 FIX: No static fallback - fail closed to prevent authority bypass
          // Static configuration cannot resurrect rejected runtime assignments
          serviceCardAssignments.set(service.slug, {
            mediaId: null, // No image if runtime assignment rejected
            mediaObject: null,
          });
        }
      }
    } catch (error) {
      // P0 FIX: KV fetch failure - fail closed to prevent authority bypass
      // Do not fall back to static configuration during build failures
      console.error('[HOMEPAGE] RUNTIME_ASSIGNMENT_FETCH_FAILED - FAILING_CLOSED', {
        serviceSlug: service.slug,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      serviceCardAssignments.set(service.slug, {
        mediaId: null, // No image if KV unavailable
        mediaObject: null,
      });
    }
  }

  return (
    <>
      {/* HERO — full-width photograph with text overlay */}
      <section className="relative isolate overflow-hidden bg-deep text-text-on-dark">
        <WorkshopAtmosphere particleCount={20} />
        <VisualSlot
          id="hero-background"
          route="/"
          page="Homepage"
          section="Hero"
          slotName="Hero Background"
          currentMediaId={homepageHero?.mediaId || null}
          component="HomepageHero"
          className="absolute inset-0 z-0"
        >
          {heroMedia && heroSrc ? (
            <Image
              src={heroSrc}
              alt={heroMedia.alt || "Happy Place Carpentry - Professional carpentry services"}
              fill
              priority
              sizes="100vw"
              className="object-cover"
              style={{ filter: "brightness(0.7)" }}
            />
          ) : null}
        </VisualSlot>
        <div className="absolute inset-0 z-[1] bg-gradient-to-b from-black/40 via-black/20 to-black/60 pointer-events-none" aria-hidden="true" />

        <Container className="relative z-10 flex min-h-[75svh] sm:min-h-[82svh] lg:min-h-[88svh] flex-col justify-center py-12 sm:py-16 lg:py-20 pointer-events-none">
          <div className="max-w-3xl pointer-events-auto">
            <p className="font-signature text-xl sm:text-2xl text-text-on-dark tracking-wide">
              <HappyBrandSignature /> Place Carpentry
            </p>
            <h1 className="mt-4 sm:mt-5 font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-text-on-dark" style={{ lineHeight: 'var(--leading-display)', letterSpacing: 'var(--tracking-display)' }}>
              Your favorite part of coming home should be the home itself.
            </h1>
            <p className="measure mt-5 sm:mt-7 max-w-xl text-base sm:text-lg text-text-on-dark/90" style={{ lineHeight: 'var(--leading-body)', letterSpacing: 'var(--tracking-body)' }}>
              We repair, restore, and improve homes across the Mid-Willamette Valley. The work should look right the day we leave, and still look right years later.</p>
            <div className="mt-6 sm:mt-8 flex flex-wrap gap-3">
              <Link href="/estimate" className="cta-signature inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 sm:px-8 sm:py-4 text-sm sm:text-base font-semibold">
                Get a Free Estimate
              </Link>
              <Link
                href="/our-work"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-text-on-dark/20 bg-text-on-dark/6 px-6 py-3 sm:px-8 sm:py-4 text-sm sm:text-base font-semibold text-text-on-dark transition-all duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-text-on-dark/12 hover:border-text-on-dark/30"
              >
                See Our Work
              </Link>
            </div>
            <div className="mt-6 sm:mt-9 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm text-text-on-dark/90">
              {hasReviews && (
                <span className="inline-flex items-center gap-2">
                  <StarRating rating={5} />
                  {stats.average} / 5 · {company.proof.projectsCompleted} projects
                </span>
              )}
              {!hasReviews && (
                <span className="inline-flex items-center gap-2">
                  {company.proof.projectsCompleted} projects completed
                </span>
              )}
              <span className="text-text-on-dark/35">·</span>
              <span className="hidden sm:inline">{company.ccbNumber} · Licensed · Insured</span>
              <span className="sm:hidden">{company.ccbNumber}</span>
              <span className="text-text-on-dark/35">·</span>
              <span className="hidden sm:inline">{company.proof.serviceCounties.join(" · ")}</span>
              <span className="sm:hidden">{company.proof.serviceCounties[0]}</span>
            </div>
            <span className="mt-5 sm:mt-7 block font-signature text-2xl sm:text-3xl text-honey">Tell us what you&apos;re planning.</span>
          </div>
        </Container>
      </section>

      <div className="h-2 bg-gradient-to-r from-deep via-primary to-deep/60" aria-hidden="true" />

      {/* TRUST STRIP — quiet, confident proof (woven, not a banner) */}
      <ScrollReveal>
        <section className="relative border-y border-border-soft" style={{ backgroundColor: 'var(--color-happy-light)' }}>
          <Container className="relative z-10 grid grid-cols-2 gap-x-4 gap-y-5 py-8 sm:gap-x-6 sm:gap-y-6 sm:py-10 text-center sm:grid-cols-4">
            {[
              ["Oregon CCB #254240", "Licensed, Bonded & Insured", false],
              ["Family-Owned", "Local Craftsmanship", false],
              ["Mid-Willamette Valley", "Service Area", false],
              [company.proof.projectsCompleted, "Projects Completed", true],
            ].map(([stat, label, isNumber]) => (
              <div key={label as string} className="relative">
                <p className="font-display text-xl sm:text-2xl lg:text-3xl font-bold text-primary">
                  {isNumber ? `${stat}+` : stat}
                </p>
                <p className="mt-1 text-xs sm:text-sm font-medium uppercase tracking-wide text-primary">{label}</p>
              </div>
            ))}
          </Container>
        </section>
      </ScrollReveal>

      {/* SERVICES — image-dominant cards, less chrome (Directive 034) */}
      <ScrollReveal>
        <Section className="relative bg-[#F6F4F0] pt-8 sm:pt-10 pb-8 sm:pb-10 section-diagonal-top">
          <BlueprintGrid gridSize={20} lineColor="rgba(22, 43, 41, 0.04)" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#F6F4F0] via-[#F3F0E9] to-[#F0ECE4] opacity-100" aria-hidden="true" />
          <Container className="relative z-10">
            <SectionHeading
              eyebrow={<span className="eyebrow-mark"><ToolMark /> What we do</span>}
              title={<span className="text-primary">A few ways we can help</span>}
              description="Pick a service to start a free estimate — we'll guide you through the rest."
              descriptionColor="text-primary"
            />
            <div className="mt-8 sm:mt-10 grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-3">
              {homepageServices.map((s, i) => (
                <ScrollReveal key={s.id} delay={i * 100}>
                  <VisualSlot
                    id={`homepage-service-card-slot-${s.slug}`}
                    route="/"
                    page="Homepage"
                    section="Services"
                    slotName={`${s.name} Service Card`}
                    currentMediaId={serviceCardAssignments.get(s.slug)?.mediaId || null}
                    component="ServiceCard"
                  >
                    <ServiceCard service={s} runtimeCardMediaObject={serviceCardAssignments.get(s.slug)?.mediaObject || null} />
                  </VisualSlot>
                </ScrollReveal>
              ))}
            </div>
          </Container>
        </Section>
      </ScrollReveal>

      <PencilLine className="py-8" />

      {/* FEATURED PROJECTS — bento grid layout */}
      <ScrollReveal>
        <Section className="relative bg-[#F5F2ED] py-24 sm:py-32 section-curved-bottom">
          <BlueprintGrid gridSize={24} lineColor="rgba(217, 154, 78, 0.05)" />
          <div className="absolute inset-0 bg-gradient-to-br from-[#F5F2ED] via-[#F1EDE6] to-[#EDE9E0] opacity-100" aria-hidden="true" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(255,255,255,0.4),transparent_70%)]" aria-hidden="true" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_100%,rgba(217,154,78,0.06),transparent_60%)]" aria-hidden="true" />
          <Container className="relative z-10">
            <SectionHeading
              eyebrow="Featured projects"
              title={<span className="text-primary">Recent Work</span>}
              description="A selection of our latest work across the Mid-Willamette Valley."
              descriptionColor="text-primary"
            />
            <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 auto-rows-[200px]">
              {featuredProjectsWithMedia.slice(0, 4).map((project, i) => {
                // P0 FIX: Use pre-validated heroMedia from getProjectWithResolvedMedia (passed public media gate)
                const heroMedia = project.media.heroMedia;
                const heroSrc = heroMedia?.variants?.web || heroMedia?.variants?.original;
                if (!heroSrc) return null;
                
                // Bento grid spans: first item spans 2 cols, 2 rows on desktop
                const isFeatured = i === 0;
                
                return (
                  <Link 
                    key={project.id} 
                    href={`/projects/${project.slug || project.id}`}
                    className={`group relative overflow-hidden rounded-lg ${isFeatured ? 'sm:col-span-2 sm:row-span-2' : ''}`}
                  >
                    <VisualSlot
                      id={`homepage-featured-project-${project.id}`}
                      route="/"
                      page="Homepage"
                      section="Featured Projects"
                      slotName={`${project.title} Featured Project`}
                      currentMediaId={heroMedia?.id || null}
                      component="ProjectCard"
                    >
                      <img
                        src={heroSrc}
                        alt={heroMedia?.alt || project.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading={i === 0 ? "eager" : "lazy"}
                      />
                    </VisualSlot>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
                      <span className="inline-block px-2 py-1 mb-2 text-xs font-semibold bg-honey/90 text-white rounded">
                        {project.location.county || 'Willamette Valley'}
                      </span>
                      <h3 className="text-white font-bold text-lg sm:text-xl">{project.title}</h3>
                      <p className="text-white/80 text-sm mt-1 line-clamp-2">{project.story?.outcome || project.story?.solution}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
            <div className="mt-8">
              <RouterLink href="/our-work">See all projects</RouterLink>
            </div>
          </Container>
        </Section>
      </ScrollReveal>

      {/* THE FAMILY — philosophy first, then people, then portrait (Act II) */}
      <ScrollReveal>
        <Section className="relative bg-[#F3EFE8]">
          <div className="absolute inset-0 bg-gradient-to-br from-[#F3EFE8] via-[#F0ECE5] to-[#ECE8E0] opacity-100" aria-hidden="true" />
          <Container className="relative z-10 grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-accent">Built by one family. Trusted by many more.</p>
              <h2 className="mt-3 font-display text-4xl font-bold leading-tight text-primary sm:text-5xl">
                A family business built on doing things the right way.
              </h2>
              <div className="measure mt-7 space-y-5 text-primary">
                <p className="text-lg leading-relaxed">
                  Good projects don&apos;t start with lumber. They start with good communication and realistic expectations.</p>
                <p>
                  <span className="font-semibold text-primary">{taylor.name}</span> — Taylor cares about the work you&apos;ll notice five years from now, not just on the day it passes inspection.
                </p>
                <p>
                  <span className="font-semibold text-primary">{lanie.name}</span> — Lanie keeps every project organized so you always know what&apos;s happening, what&apos;s next, and who to call.
                </p>
              </div>
            </div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-card photo-mounted">
              {ownerSrc && (
                <VisualSlot
                  id="homepage-owner-portrait-slot"
                  route="/"
                  page="Homepage"
                  section="The Family"
                  slotName="Owner Portrait"
                  currentMediaId={ownerBrand?.mediaId || null}
                  component="HeroSection"
                >
                  <Image src={ownerSrc} alt="Portrait of Taylor and Lanie, the owners of Happy Place Carpentry, standing together in front of a completed carpentry project" fill sizes="(max-width: 1024px) 100vw, 50vw" className="h-full w-full object-cover photo-breathe" />
                </VisualSlot>
              )}
              <CedarCorner className="absolute -left-2 -top-2 h-8 w-8 text-honey" />
            </div>
          </Container>
        </Section>
      </ScrollReveal>

      <PencilLine className="py-8" />

      {/* CRAFT RULE separator before reviews */}
      <div className="py-4 sm:py-6">
        <div className="craft-rule"><span /></div>
      </div>

      {/* REVIEWS */}
      <ScrollReveal>
        <Section className="relative bg-[#F2EFE8]">
          <div className="absolute inset-0 bg-gradient-to-b from-[#F2EFE8] via-[#EFECE5] to-[#ECE9E2] opacity-100" aria-hidden="true" />
          <Container className="relative z-10">
            <SectionHeading eyebrow="Reviews" title={<span className="text-primary">What people say once the work&apos;s done</span>} align="center" description={hasReviews ? "Real experiences from families throughout the Mid-Willamette Valley." : "We&apos;re building our public review portfolio. In the meantime, we&apos;re happy to provide references from homeowners throughout the Mid-Willamette Valley."} descriptionColor="text-primary" />
            {hasReviews ? (
              <>
                <div className="mt-8 sm:mt-10 grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-3">
                  {topReviews.map((r, i) => (
                    <ScrollReveal key={r.id} delay={i * 100}>
                      <Card className="p-5 sm:p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl">
                        <StarRating rating={r.rating} />
                        {r.title && <h3 className="mt-2 sm:mt-3 font-bold text-text">{r.title}</h3>}
                        <blockquote className="mt-2 text-sm sm:text-base text-text-muted">&ldquo;{r.body}&rdquo;</blockquote>
                        <figcaption className="mt-3 sm:mt-4 text-xs sm:text-sm text-text-muted">{r.reviewer.name} · {r.location ? `${r.location.city}, ${r.location.county}` : 'Willamette Valley'}</figcaption>
                      </Card>
                    </ScrollReveal>
                  ))}
                </div>
                <div className="mt-6 sm:mt-8 text-center">
                  <RouterLink href="/reviews">Read all reviews</RouterLink>
                </div>
              </>
            ) : (
              <div className="mt-8 sm:mt-10 rounded-lg bg-surface-muted p-6 sm:p-8 text-center">
                <p className="text-sm sm:text-base text-text-muted">
                  We are building our review portfolio. In the meantime, ask us for references in your neighborhood.
                </p>
              </div>
            )}
          </Container>
        </Section>
      </ScrollReveal>

      {/* NEWSLETTER SIGNUP — positioned 2/3 down after visitors see who we are, projects, testimonials, services */}
      <ScrollReveal>
        <Section className="relative bg-[#F1EDE6]">
          <div className="absolute inset-0 bg-gradient-to-br from-[#F1EDE6] via-[#EDE9E0] to-[#E9E5DC] opacity-100" aria-hidden="true" />
          <Container className="relative z-10 max-w-2xl">
            <NewsletterSignup />
          </Container>
        </Section>
      </ScrollReveal>

      <ScrollReveal>
        <CTASection />
      </ScrollReveal>
    </>
  );
}

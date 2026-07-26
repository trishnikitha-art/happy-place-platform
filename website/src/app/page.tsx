import Image from "next/image";
import Link from "next/link";
import { Container, Section, SectionHeading } from "@/components/section";
import { ServiceCard } from "@/components/service-card";
import { CTASection } from "@/components/cta-section";
import { StarRating } from "@/components/star-rating";
import { ScrollReveal } from "@/components/scroll-reveal";
import { CedarCorner } from "@/components/cedar-corner";
import { ToolMark } from "@/components/tool-mark";
import { CraftCard } from "@/components/ui/card";
import { RouterLink } from "@/components/router-link";
import { PencilLine } from "@/components/pencil-line";
import { CountUp } from "@/components/count-up";
import { BlueprintGrid } from "@/components/blueprint-grid";
import { WorkshopAtmosphere } from "@/components/workshop-atmosphere";
import { getAllServices } from "@/lib/registries";
import { getFeaturedReviews, getReviewStats } from "@/lib/reviews";
import { getCompany } from "@/lib/company";
import { BeforeAfterSlider } from "@/components/before-after-slider";
import { getOwnerPortrait } from "@/lib/brand";
import { getMediaById } from "@/lib/media";
import { getFeaturedProjects } from "@/lib/projects";

export default async function HomePage() {
  const company = getCompany();
  const topReviews = (await getFeaturedReviews()).slice(0, 3);
  const stats = await getReviewStats();
  const hasReviews = stats.count > 0;
  const [taylor, lanie] = company.owners;
  const ownerBrand = getOwnerPortrait();    // owner portrait from Brand Authority
  const ownerMedia = ownerBrand?.mediaId ? getMediaById(ownerBrand.mediaId) : null;
  const ownerSrc = ownerMedia?.variants?.web || ownerMedia?.variants?.original;
  const allServices = getAllServices();      // data-driven services from registry
  const featuredProjects = getFeaturedProjects(); // featured projects from Projects Authority
  
  // Get exterior painting project for featured transformation (has before/after media)
  const paintingProject = featuredProjects.find(p => p.id === 'exterior-painting-001');
  
  // Group services for homepage display (show homepageEligible services first)
  const homepageServices = allServices.filter(s => s.homepageEligible);
  const otherServices = allServices.filter(s => !s.homepageEligible);

  return (
    <>
      {/* HERO — magazine composition: layered full-bleed background + golden
          light + floating cedar card. Content lowered (~100px) so nav and hero
          don't compete. Structurally non-overlapping (stacked < lg, layered
          absolute bg behind a relative content card at lg). */}
      <section className="relative isolate overflow-hidden bg-deep text-text-on-dark">
        {/* full-bleed background photo (parallax) */}
        <div className="absolute inset-0 -z-10">
          <Image
            src="/images/hero.svg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="hero-parallax object-cover opacity-60"
          />
          {/* golden-hour warm light wash */}
          <div className="absolute inset-0 bg-gradient-to-tr from-deep via-deep/70 to-honey/20" aria-hidden="true" />
          <div className="absolute inset-0 bg-gradient-to-b from-deep/40 via-transparent to-deep" aria-hidden="true" />
        </div>

        <Container className="relative grid min-h-[88svh] grid-cols-1 items-end pb-16 pt-36 lg:grid-cols-12 lg:items-center lg:pb-24 lg:pt-40">
          {/* floating cedar card (owner + headline + CTA) */}
          <div className="lg:col-span-7">
            <div className="relative float-card bg-deep/55 p-7 backdrop-blur-md ring-1 ring-honey/15 sm:p-10 lg:bg-deep/45">
              <CedarCorner className="absolute -left-2 -top-2 h-7 w-7 text-honey" />
              <p className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-honey">
                {company.ccbNumber} · {company.proof.serviceCounties.join(" · ")}
              </p>
              <h1 className="mt-4 font-display text-4xl font-bold leading-[1.04] text-text-on-dark sm:text-5xl lg:text-6xl">
                Building spaces you&rsquo;ll love coming home to.
              </h1>
              <p className="mt-5 max-w-xl text-lg text-text-on-dark/80">
                Custom decks, kitchens, fences, and outdoor living across the
                mid-Willamette Valley — crafted in cedar, finished by hand.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/estimate" className="cta-signature inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-base font-semibold">
                  Get a Free Estimate
                </Link>
                <Link
                  href="/our-work"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-text-on-dark/30 bg-text-on-dark/10 px-7 py-3.5 text-base font-semibold text-text-on-dark transition-colors hover:bg-text-on-dark/20"
                >
                  See Our Work
                </Link>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm text-text-on-dark/75">
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
                <span className="hidden sm:inline">Licensed · Insured</span>
                <span className="text-text-on-dark/35">·</span>
                <span className="hidden sm:inline">{company.proof.serviceCounties.join(" · ")}</span>
                <span className="sm:hidden">{company.proof.serviceCounties[0]}</span>
              </div>
              <span className="mt-5 block font-signature text-2xl text-honey">Tell us what you're planning.</span>
            </div>
          </div>
          <div className="relative mt-10 lg:col-span-5 lg:mt-0 lg:self-center">
            <div className="relative mx-auto aspect-[4/5] w-2/3 overflow-hidden rounded-card shadow-float ring-1 ring-text-on-dark/20 sm:w-1/2 lg:ml-auto lg:w-full lg:translate-y-6">
              {ownerSrc && (
                <Image
                  src={ownerSrc}
                  alt="Taylor & Lanie of Happy Place Carpentry"
                  fill
                  sizes="(max-width: 1024px) 60vw, 40vw"
                  className="object-cover"
                />
              )}
            </div>
          </div>
        </Container>
      </section>

      <div className="h-2 bg-gradient-to-r from-deep via-primary to-deep/60" aria-hidden="true" />

      {/* TRUST STRIP — quiet, confident proof (woven, not a banner) */}
      <ScrollReveal>
        <section className="relative border-y border-border-soft bg-[#F3EFE8]">
          <div className="absolute inset-0 bg-gradient-to-r from-[#F3EFE8] via-[#F0ECE4] to-[#F3EFE8] opacity-100" aria-hidden="true" />
          <Container className="relative z-10 grid grid-cols-2 gap-x-4 gap-y-5 py-8 sm:gap-x-6 sm:gap-y-6 sm:py-10 text-center sm:grid-cols-4">
            {[
              ["Oregon CCB #254240", "Licensed, Bonded & Insured", false],
              ["Family-Owned", "Local Craftsmanship", false],
              ["Mid-Willamette Valley", "Service Area", false],
              [company.proof.projectsCompleted, "Projects Completed", true],
            ].map(([stat, label, isNumber]) => (
              <div key={label as string} className="relative">
                <p className="font-display text-xl sm:text-2xl lg:text-3xl font-bold text-primary">
                  {isNumber ? <CountUp end={Number(stat)} suffix="+" /> : stat}
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
              title={<span className="text-primary">Ways to make coming home better</span>}
              description="Pick a service to start a free estimate — we'll guide you through the rest."
            />
            <div className="mt-8 sm:mt-10 grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-3">
              {homepageServices.map((s, i) => (
                <ScrollReveal key={s.id} delay={i * 100}>
                  <div className="relative">
                    <WorkshopAtmosphere particleCount={12} className="opacity-30" />
                    <div className="relative z-10">
                      <ServiceCard service={s} />
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
            {otherServices.length > 0 && (
              <div className="mt-8 sm:mt-10">
                <h3 className="font-display text-xl sm:text-2xl font-bold text-primary mb-4 sm:mb-6">Other ways we can help</h3>
                <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-3">
                  {otherServices.map((s, i) => (
                    <ScrollReveal key={s.id} delay={i * 100}>
                      <div className="relative">
                        <WorkshopAtmosphere particleCount={12} className="opacity-30" />
                        <div className="relative z-10">
                          <ServiceCard service={s} />
                        </div>
                      </div>
                    </ScrollReveal>
                  ))}
                </div>
              </div>
            )}
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
              title={<span className="text-primary">Recent transformations</span>}
              description="A selection of our latest work across the Mid-Willamette Valley."
            />
            <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 auto-rows-[200px]">
              {featuredProjects.slice(0, 4).map((project, i) => {
                const heroMediaId = project.media.hero;
                const heroMedia = heroMediaId ? getMediaById(heroMediaId) : null;
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
                    <img
                      src={heroSrc}
                      alt={heroMedia?.alt || project.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading={i === 0 ? "eager" : "lazy"}
                    />
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
                  Great work starts long before the first board is cut.</p>
                <p>
                  <span className="font-semibold text-primary">{taylor.name}</span> — Taylor approaches every project with one goal: build something he'll still be proud to drive past years from now.
                </p>
                <p>
                  <span className="font-semibold text-primary">{lanie.name}</span> — Lanie keeps every project moving—from your first estimate to the final walkthrough—so you always know what's happening next.
                </p>
              </div>
            </div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-card photo-mounted">
              {ownerSrc && (
                <Image src={ownerSrc} alt={ownerBrand?.alt || "Taylor & Lanie of Happy Place Carpentry"} fill sizes="(max-width: 1024px) 100vw, 50vw" className="h-full w-full object-cover photo-breathe" />
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
            <SectionHeading eyebrow="Reviews" title={<span className="text-primary">What Homeowners Say After the Project Is Finished</span>} align="center" description={hasReviews ? "Real experiences from families throughout the Mid-Willamette Valley." : "We're building our public review portfolio. In the meantime, we're happy to provide references from homeowners throughout the Mid-Willamette Valley."} />
            {hasReviews ? (
              <>
                <div className="mt-8 sm:mt-10 grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-3">
                  {topReviews.map((r, i) => (
                    <ScrollReveal key={r.id} delay={i * 100}>
                      <CraftCard className="p-5 sm:p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl relative overflow-hidden">
                        <WorkshopAtmosphere particleCount={15} className="opacity-40" />
                        <div className="relative z-10">
                          <StarRating rating={r.rating} />
                          {r.title && <h3 className="mt-2 sm:mt-3 font-bold text-text">{r.title}</h3>}
                          <blockquote className="mt-2 text-sm sm:text-base text-text-muted">&ldquo;{r.body}&rdquo;</blockquote>
                          <figcaption className="mt-3 sm:mt-4 text-xs sm:text-sm text-text-muted">{r.reviewer.name} · {r.location ? `${r.location.city}, ${r.location.county}` : 'Willamette Valley'}</figcaption>
                        </div>
                      </CraftCard>
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

      <div className="relative overflow-hidden">
        <WorkshopAtmosphere particleCount={25} className="opacity-50" />
        <ScrollReveal>
          <div className="relative z-10">
            <CTASection />
          </div>
        </ScrollReveal>
      </div>
    </>
  );
}

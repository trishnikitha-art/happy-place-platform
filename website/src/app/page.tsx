import Image from "next/image";
import Link from "next/link";
import { Container, Section, SectionHeading } from "@/components/section";
import { ServiceCard } from "@/components/service-card";
import { CTASection } from "@/components/cta-section";
import { StarRating } from "@/components/star-rating";
import { Reveal } from "@/components/reveal";
import { CedarCorner } from "@/components/cedar-corner";
import { ToolMark } from "@/components/tool-mark";
import { getAllServices } from "@/lib/registries";
import { getFeaturedReviews, getReviewStats } from "@/lib/reviews";
import { getCompany } from "@/lib/company";
import { BeforeAfterSlider } from "@/components/before-after-slider";
import { getOwnerPortrait, getHomepageHero } from "@/lib/brand";
import { getMediaById, getProjectBeforeAfter } from "@/lib/media";
import { getFeaturedProjects } from "@/lib/projects";

export default function HomePage() {
  const company = getCompany();
  const topReviews = getFeaturedReviews().slice(0, 3);
  const stats = getReviewStats();
  const hasReviews = stats.total > 0;
  const [taylor, lanie] = company.owners;
  const heroBrand = getHomepageHero();       // primary full-width hero photograph from Brand Authority
  const heroMedia = heroBrand?.mediaId ? getMediaById(heroBrand.mediaId) : null;
  const heroBg = heroMedia?.variants?.web || heroMedia?.variants?.original;
  const ownerBrand = getOwnerPortrait();    // owner portrait from Brand Authority
  const ownerMedia = ownerBrand?.mediaId ? getMediaById(ownerBrand.mediaId) : null;
  const ownerSrc = ownerMedia?.variants?.web || ownerMedia?.variants?.original;
  const allServices = getAllServices();      // data-driven services from registry
  const featuredProjects = getFeaturedProjects(); // featured projects from Projects Authority
  
  // Get fences project for featured transformation (has before/after media)
  const fencesProject = featuredProjects.find(p => p.id === 'fences-001');
  
  // Group services for homepage display (show homepageEligible services first)
  const homepageServices = allServices.filter(s => s.homepageEligible);
  const otherServices = allServices.filter(s => !s.homepageEligible);

  return (
    <>
      {/* HERO — full-width photograph with text overlay */}
      <section className="relative isolate overflow-hidden bg-deep text-text-on-dark">
        {heroBg && (
          <Image
            src={heroBg}
            alt={heroBrand?.alt || "Happy Place Carpentry"}
            fill
            priority
            sizes="100vw"
            className="object-cover"
            style={{ filter: "brightness(0.45)" }}
          />
        )}
        <div className="absolute inset-0 z-[1] bg-[radial-gradient(120%_120%_at_80%_-10%,rgba(217,154,78,0.22),transparent_55%),radial-gradient(90%_90%_at_10%_110%,rgba(22,43,41,0.7),transparent_60%)]" aria-hidden="true" />
        <div className="absolute inset-0 z-[1] bg-gradient-to-b from-deep/30 via-transparent to-deep" aria-hidden="true" />
        <div className="absolute inset-x-0 top-0 z-[1] h-px bg-gradient-to-r from-transparent via-honey/25 to-transparent" aria-hidden="true" />

        <div className="hero-craft" aria-hidden="true" />
        <div className="hero-square" aria-hidden="true" />
        <div className="hero-ticks" aria-hidden="true" />
        <div className="pnw-fog" aria-hidden="true" />

        <Container className="relative z-10 flex min-h-[75svh] sm:min-h-[82svh] lg:min-h-[88svh] flex-col justify-center py-16 sm:py-20 lg:py-28">
          <div className="max-w-3xl">
            <p className="font-signature text-xl sm:text-2xl text-honey/90">Happy Place Carpentry</p>
            <h1 className="mt-3 sm:mt-4 font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] sm:leading-[1.02] tracking-tight tracking-display text-text-on-dark">
              Your favorite part of coming home should be the home itself.
            </h1>
            <p className="measure mt-4 sm:mt-6 max-w-xl text-base sm:text-lg leading-relaxed text-text-on-dark/80">
              We build decks, fences, bathrooms, and custom carpentry that families enjoy for years—not just on move-in day.</p>
            <div className="mt-6 sm:mt-8 flex flex-wrap gap-3">
              <Link href="/estimate" className="cta-signature inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 sm:px-8 sm:py-4 text-sm sm:text-base font-semibold">
                Get a Free Estimate
              </Link>
              <Link
                href="/our-work"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-text-on-dark/30 bg-text-on-dark/10 px-6 py-3 sm:px-8 sm:py-4 text-sm sm:text-base font-semibold text-text-on-dark transition-colors hover:bg-text-on-dark/20"
              >
                See Our Work
              </Link>
            </div>
            <div className="mt-6 sm:mt-9 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm text-text-on-dark/65">
              {hasReviews && (
                <span className="inline-flex items-center gap-2">
                  <StarRating rating={5} />
                  {stats.averageRating} / 5 · {company.proof.projectsCompleted} projects
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
            <span className="mt-5 sm:mt-7 block font-signature text-2xl sm:text-3xl text-honey">Let&rsquo;s start building your happy place.</span>
          </div>
        </Container>
      </section>

      <div className="h-2 bg-gradient-to-r from-deep via-primary to-deep/60" aria-hidden="true" />

      {/* TRUST STRIP — quiet, confident proof (woven, not a banner) */}
      <section className="border-y border-border-soft bg-background">
        <Container className="grid grid-cols-2 gap-x-4 gap-y-5 py-8 sm:gap-x-6 sm:gap-y-6 sm:py-10 text-center sm:grid-cols-4">
          {[
            ["Oregon CCB #254240", "Licensed, Bonded & Insured"],
            ["Family-Owned", "Local Craftsmanship"],
            ["Mid-Willamette Valley", "Service Area"],
            [company.proof.projectsCompleted, "Projects Completed"],
          ].map(([stat, label]) => (
            <div key={label as string} className="relative">
              <p className="font-display text-xl sm:text-2xl lg:text-3xl font-bold text-primary">{stat}</p>
              <p className="mt-1 text-xs sm:text-sm font-medium uppercase tracking-wide text-text-muted">{label}</p>
            </div>
          ))}
        </Container>
      </section>

      {/* SERVICES — image-dominant cards, less chrome (Directive 034) */}
      <Section className="pt-6 sm:pt-8 pb-6 sm:pb-8">
        <Container>
          <SectionHeading
            eyebrow={<span className="eyebrow-mark"><ToolMark /> What we do</span>}
            title="Craftsmanship for every part of your home"
            description="Pick a service to start a free estimate — we'll guide the rest."
          />
          <div className="mt-6 sm:mt-8 grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
            {homepageServices.map((s) => (
              <ServiceCard key={s.id} service={s} />
            ))}
          </div>
          {otherServices.length > 0 && (
            <div className="mt-6 sm:mt-8">
              <h3 className="font-display text-xl sm:text-2xl font-bold text-text mb-4 sm:mb-6">More Services</h3>
              <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
                {otherServices.map((s) => (
                  <ServiceCard key={s.id} service={s} />
                ))}
              </div>
            </div>
          )}
        </Container>
      </Section>

      {/* TRANSFORMATIONS — honest before→after composites, distinct from archive */}
      <Section className="bg-background">
        <Container>
          <SectionHeading
            eyebrow="Real transformations"
            title="Start to finish"
            description="A look at the work — every project earns its finish."
          />
          {fencesProject && fencesProject.media.before && fencesProject.media.after && (
            <div className="mt-10">
              <Reveal>
                <BeforeAfterSlider project={fencesProject} />
              </Reveal>
            </div>
          )}
          <div className="mt-8">
            <Link href="/our-work" className="inline-flex items-center gap-1 font-semibold text-accent hover:underline">
              See the full portfolio →
            </Link>
          </div>
        </Container>
      </Section>

      {/* THE FAMILY — philosophy first, then people, then portrait (Act II) */}
      <Section className="bg-background">
        <Container className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-accent">Built by one family. Trusted by many more.</p>
            <h2 className="mt-3 font-display text-4xl font-bold leading-tight text-text sm:text-5xl">
              Happy Place isn&rsquo;t a slogan. It&rsquo;s why we exist.
            </h2>
            <div className="measure mt-7 space-y-5 text-text-muted">
              <p className="text-lg leading-relaxed">
                Great craftsmanship starts long before the first board is cut.</p>
              <p>
                <span className="font-semibold text-text">{taylor.name}</span> — Taylor believes craftsmanship should still look great twenty years from now. Every project is built with the expectation that he'll proudly drive past it for years to come.
              </p>
              <p>
                <span className="font-semibold text-text">{lanie.name}</span> — Lanie keeps every homeowner informed from the first conversation through the final walkthrough, making sure every project feels organized, transparent, and enjoyable.
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

      {/* CRAFT RULE separator before reviews */}
      <div className="py-4 sm:py-6">
        <div className="craft-rule"><span /></div>
      </div>

      {/* REVIEWS */}
      <Section>
        <Container>
          <SectionHeading eyebrow="Reviews" title="What neighbors say" align="center" description={hasReviews ? "Real feedback from homeowners across the Willamette Valley." : "We're building our public review portfolio. In the meantime, we're happy to provide references from homeowners throughout the Mid-Willamette Valley."} />
          {hasReviews ? (
            <>
              <div className="mt-8 sm:mt-10 grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-3">
                {topReviews.map((r) => (
                  <figure key={r.id} className="float-card bg-surface p-5 sm:p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-float">
                    <StarRating rating={r.rating} />
                    {r.title && <h3 className="mt-2 sm:mt-3 font-bold text-text">{r.title}</h3>}
                    <blockquote className="mt-2 text-sm sm:text-base text-text-muted">&ldquo;{r.body}&rdquo;</blockquote>
                    <figcaption className="mt-3 sm:mt-4 text-xs sm:text-sm text-text-subtle">{r.reviewer.name} · {r.location ? `${r.location.city}, ${r.location.county}` : 'Willamette Valley'}</figcaption>
                  </figure>
                ))}
              </div>
              <div className="mt-6 sm:mt-8 text-center">
                <Link href="/reviews" className="inline-flex items-center gap-1 font-semibold text-accent hover:underline">Read all reviews →</Link>
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

      <CTASection />
    </>
  );
}

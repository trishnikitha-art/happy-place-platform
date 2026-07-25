import Image from "next/image";
import Link from "next/link";
import { Container, Section, SectionHeading } from "@/components/section";
import { ServiceCard } from "@/components/service-card";
import { CTASection } from "@/components/cta-section";
import { StarRating } from "@/components/star-rating";
import { Reveal } from "@/components/reveal";
import { CedarCorner } from "@/components/cedar-corner";
import { ToolMark } from "@/components/tool-mark";
import { HappyBrandSignature } from "@/components/happy-brand-signature";
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
  
  // Get exterior painting project for featured transformation (has before/after media)
  const paintingProject = featuredProjects.find(p => p.id === 'exterior-painting-001');
  
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
            className="object-cover animate-breathe"
            style={{ filter: "brightness(0.45)" }}
          />
        )}
        <div className="absolute inset-0 z-[1] bg-[radial-gradient(120%_120%_at_80%_-10%,rgba(217,154,78,0.15),transparent_55%),radial-gradient(90%_90%_at_10%_110%,rgba(22,43,41,0.5),transparent_60%)]" aria-hidden="true" />
        <div className="absolute inset-0 z-[1] bg-gradient-to-b from-deep/30 via-transparent to-deep" aria-hidden="true" />
        <div className="absolute inset-x-0 top-0 z-[1] h-px bg-gradient-to-r from-transparent via-honey/20 to-transparent" aria-hidden="true" />

        <div className="hero-craft animate-drift" aria-hidden="true" />
        <div className="hero-square" aria-hidden="true" />
        <div className="hero-ticks" aria-hidden="true" />
        <div className="pnw-fog animate-drift" aria-hidden="true" />

        <Container className="relative z-10 flex min-h-[75svh] sm:min-h-[82svh] lg:min-h-[88svh] flex-col justify-center py-12 sm:py-16 lg:py-20">
          <div className="max-w-3xl">
            <p className="font-signature text-xl sm:text-2xl text-honey/85 tracking-wide">
              <HappyBrandSignature className="text-honey/85" /> Place Carpentry
            </p>
            <h1 className="mt-4 sm:mt-5 font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.08] sm:leading-[1.05] tracking-tight tracking-display text-text-on-dark">
              Your favorite part of coming home should be the home itself.
            </h1>
            <p className="measure mt-5 sm:mt-7 max-w-xl text-base sm:text-lg leading-[1.7] text-text-on-dark/90">
              We restore, repair, and paint homes throughout the Mid-Willamette Valley—protecting your investment and making coming home feel better every day.</p>
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
            <div className="mt-6 sm:mt-9 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm text-text-on-dark/75">
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
            <span className="mt-5 sm:mt-7 block font-signature text-2xl sm:text-3xl text-honey">Tell us what you're planning.</span>
          </div>
        </Container>
      </section>

      <div className="h-2 bg-gradient-to-r from-deep via-primary to-deep/60" aria-hidden="true" />

      {/* TRUST STRIP — quiet, confident proof (woven, not a banner) */}
      <section className="relative border-y border-border-soft bg-[#F3EFE8]">
        <div className="absolute inset-0 bg-gradient-to-r from-[#F3EFE8] via-[#F0ECE4] to-[#F3EFE8] opacity-100" aria-hidden="true" />
        <Container className="relative z-10 grid grid-cols-2 gap-x-4 gap-y-5 py-8 sm:gap-x-6 sm:gap-y-6 sm:py-10 text-center sm:grid-cols-4">
          {[
            ["Oregon CCB #254240", "Licensed, Bonded & Insured"],
            ["Family-Owned", "Local Craftsmanship"],
            ["Mid-Willamette Valley", "Service Area"],
            [company.proof.projectsCompleted, "Projects Completed"],
          ].map(([stat, label]) => (
            <div key={label as string} className="relative">
              <p className="font-display text-xl sm:text-2xl lg:text-3xl font-bold text-primary">{stat}</p>
              <p className="mt-1 text-xs sm:text-sm font-medium uppercase tracking-wide text-text-subtle">{label}</p>
            </div>
          ))}
        </Container>
      </section>

      {/* SERVICES — image-dominant cards, less chrome (Directive 034) */}
      <Section className="relative bg-[#F6F4F0] pt-8 sm:pt-10 pb-8 sm:pb-10">
        <div className="absolute inset-0 bg-gradient-to-b from-[#F6F4F0] via-[#F3F0E9] to-[#F0ECE4] opacity-100" aria-hidden="true" />
        <Container className="relative z-10">
          <SectionHeading
            eyebrow={<span className="eyebrow-mark"><ToolMark /> What we do</span>}
            title="Ways to make coming home better"
            description="Pick a service to start a free estimate — we'll guide you through the rest."
          />
          <div className="mt-8 sm:mt-10 grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-3">
            {homepageServices.map((s) => (
              <ServiceCard key={s.id} service={s} />
            ))}
          </div>
          {otherServices.length > 0 && (
            <div className="mt-8 sm:mt-10">
              <h3 className="font-display text-xl sm:text-2xl font-bold text-text mb-4 sm:mb-6">Other ways we can help</h3>
              <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-3">
                {otherServices.map((s) => (
                  <ServiceCard key={s.id} service={s} />
                ))}
              </div>
            </div>
          )}
        </Container>
      </Section>

      {/* TRANSFORMATIONS — honest before→after composites, distinct from archive */}
      <Section className="relative bg-[#F5F2ED] py-24 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-[#F5F2ED] via-[#F1EDE6] to-[#EDE9E0] opacity-100" aria-hidden="true" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(255,255,255,0.4),transparent_70%)]" aria-hidden="true" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_100%,rgba(217,154,78,0.06),transparent_60%)]" aria-hidden="true" />
        <Container className="relative z-10">
          <SectionHeading
            eyebrow="Real transformations"
            title="Protected and restored"
            description="Every home has a story. Here's one exterior restoration we're especially proud to have been part of."
          />
          {paintingProject && paintingProject.media.before && paintingProject.media.after && (
            <div className="mt-12">
              <Reveal>
                <div className="relative">
                  <div className="absolute -inset-4 bg-gradient-to-br from-honey/10 to-transparent rounded-2xl blur-xl opacity-50" aria-hidden="true" />
                  <BeforeAfterSlider project={paintingProject} />
                </div>
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
      <Section className="relative bg-[#F3EFE8]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#F3EFE8] via-[#F0ECE5] to-[#ECE8E0] opacity-100" aria-hidden="true" />
        <Container className="relative z-10 grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-accent">Built by one family. Trusted by many more.</p>
            <h2 className="mt-3 font-display text-4xl font-bold leading-tight text-text sm:text-5xl">
              A family business built on doing things the right way.
            </h2>
            <div className="measure mt-7 space-y-5 text-text-muted">
              <p className="text-lg leading-relaxed">
                Great work starts long before the first board is cut.</p>
              <p>
                <span className="font-semibold text-text">{taylor.name}</span> — Taylor approaches every project with one goal: build something he'll still be proud to drive past years from now.
              </p>
              <p>
                <span className="font-semibold text-text">{lanie.name}</span> — Lanie keeps every project moving—from your first estimate to the final walkthrough—so you always know what's happening next.
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
      <Section className="relative bg-[#F2EFE8]">
        <div className="absolute inset-0 bg-gradient-to-b from-[#F2EFE8] via-[#EFECE5] to-[#ECE9E2] opacity-100" aria-hidden="true" />
        <Container className="relative z-10">
          <SectionHeading eyebrow="Reviews" title="What Homeowners Say After the Project Is Finished" align="center" description={hasReviews ? "Real experiences from families throughout the Mid-Willamette Valley." : "We're building our public review portfolio. In the meantime, we're happy to provide references from homeowners throughout the Mid-Willamette Valley."} />
          {hasReviews ? (
            <>
              <div className="mt-8 sm:mt-10 grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-3">
                {topReviews.map((r) => (
                  <figure key={r.id} className="bg-white p-5 sm:p-6 transition-all duration-400 hover:-translate-y-0.5 shadow-[0_1px_4px_-1px_rgba(23,50,74,0.06),0_0.5px_2px_-0.5px_rgba(23,50,74,0.04)] hover:shadow-[0_3px_12px_-3px_rgba(23,50,74,0.1),0_1.5px_4px_-1.5px_rgba(23,50,74,0.07)] border border-border/40 rounded-xl">
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

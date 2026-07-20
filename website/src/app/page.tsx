import Image from "next/image";
import Link from "next/link";
import { Container, Section, SectionHeading } from "@/components/section";
import { ServiceCard } from "@/components/service-card";
import { GalleryLightbox } from "@/components/gallery-lightbox";
import { CTASection } from "@/components/cta-section";
import { ProjectSpotlight } from "@/components/project-spotlight";
import { StarRating } from "@/components/star-rating";
import { Reveal } from "@/components/reveal";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { serviceCategories } from "@/config/serviceCategories";
import { services } from "@/config/services";
import { featuredGallery } from "@/config/gallery";
import { reviews, averageRating } from "@/config/reviews";
import { featuredProject } from "@/config/projects";
import { beforeAfterPairs } from "@/config/beforeAfter";
import { company } from "@/config/company";
import { BeforeAfterSlider } from "@/components/before-after-slider";
import { CedarDivider } from "@/components/cedar-divider";

export default function HomePage() {
  const featured = featuredGallery(6);
  const topReviews = reviews.slice(0, 3);
  const spotlight = featuredProject();
  const [taylor, lanie] = company.owners;

  return (
    <>
      {/* HERO — owner photo + large type. Stacked on mobile, 2-col on desktop.
          Structurally non-overlapping: photo column is self-stretching with
          object-cover; text column is min-w-0 so it never bleeds into the photo. */}
      <section className="relative overflow-hidden bg-deep text-text-on-dark">
        <div className="absolute inset-0 bg-gradient-to-br from-deep via-deep to-primary/30" aria-hidden="true" />
        <Container className="relative grid min-h-[82svh] grid-cols-1 items-center gap-12 py-20 lg:grid-cols-2 lg:gap-16 lg:py-24">
          <div className="min-w-0">
            <p className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-honey">
              {company.ccbNumber} · {company.proof.serviceCounties.join(" · ")}
            </p>
            <h1 className="mt-4 font-display text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-6xl">
              Building spaces you&rsquo;ll love coming home to.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-text-on-dark/75">
              Custom decks, kitchens, fences, and outdoor living across the
              mid-Willamette Valley — crafted in cedar, finished by hand.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/estimate" className={cn(buttonVariants({ variant: "primary", size: "lg" }), "bg-honey text-honey-foreground hover:bg-honey-hover")}>
                Get a Free Estimate
              </Link>
              <Link
                href="/gallery"
                className={cn(buttonVariants({ variant: "outline", size: "lg" }), "border-text-on-dark/30 bg-text-on-dark/10 text-text-on-dark hover:bg-text-on-dark/20")}
              >
                See Our Work
              </Link>
            </div>
            <div className="mt-10 flex items-center gap-3 text-sm text-text-on-dark/70">
              <StarRating rating={5} />
              <span>{averageRating()} / 5 · {company.proof.projectsCompleted} projects completed</span>
            </div>
          </div>
          <div className="relative min-h-[360px] self-stretch lg:min-h-0">
            <div className="relative h-full min-h-[360px] overflow-hidden rounded-card border border-text-on-dark/20 shadow-2xl lg:min-h-full">
              <Image
                src="/images/hero.svg"
                alt="Taylor & Lanie of Happy Place Carpentry on a finished cedar deck at golden hour"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 45vw"
                className="object-cover"
              />
              <span className="absolute bottom-4 left-4 rounded-full bg-deep/80 px-4 py-2 font-signature text-2xl text-honey">
                {taylor.name} &amp; {lanie.name}
              </span>
            </div>
          </div>
        </Container>
      </section>

      {/* TRUST / MICRO-PROOF STRIP — woven, not isolated */}
      <section className="border-y border-border-soft bg-cream">
        <Container className="grid grid-cols-2 gap-6 py-10 text-center sm:grid-cols-4">
          {[
            [company.proof.projectsCompleted, "Projects completed"],
            [`${company.proof.yearsInBusiness} yrs`, "In business"],
            [company.ccbNumber, "Licensed · Insured"],
            ["1–2 days", "Estimate response"],
          ].map(([stat, label]) => (
            <div key={label as string}>
              <p className="font-display text-3xl font-bold text-primary">{stat}</p>
              <p className="mt-1 text-sm text-text-muted">{label}</p>
            </div>
          ))}
        </Container>
      </section>

      <CedarDivider />

      {/* SERVICES — each with iconic photo */}
      <Section>
        <Container>
          <SectionHeading
            eyebrow="What we do"
            title="Craftsmanship for every part of your home"
            description="Pick a service to start a free estimate — we'll guide the rest."
          />
          <div className="mt-10 space-y-12">
            {serviceCategories.map((cat) => (
              <div key={cat.slug} id={cat.slug}>
                <h3 className="font-display text-2xl font-bold text-text">{cat.title}</h3>
                <p className="mb-5 mt-1 text-text-muted">{cat.description}</p>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {services.filter((s) => s.category === cat.slug).map((s) => (
                    <ServiceCard key={s.slug} service={s} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* BEFORE / AFTER — major feature */}
      <Section className="bg-surface-muted">
        <Container>
          <SectionHeading
            eyebrow="Before & after"
            title="Drag to see the transformation"
            description="Every project starts somewhere. Scrub through a few of our favorites."
          />
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
            {beforeAfterPairs.slice(0, 4).map((pair, i) => (
              <Reveal key={pair.id} delay={i * 60}>
                <BeforeAfterSlider pair={pair} />
              </Reveal>
            ))}
          </div>
          <div className="mt-8">
            <Link href="/gallery" className="inline-flex items-center gap-1 font-semibold text-accent hover:underline">
              See more transformations →
            </Link>
          </div>
        </Container>
      </Section>

      {/* FEATURED PROJECT */}
      {spotlight && <ProjectSpotlight project={spotlight} variant="feature" />}

      {/* TAYLOR & LANIE — partnership */}
      <Section className="bg-cream">
        <Container className="grid items-center gap-10 lg:grid-cols-2">
          <div className="relative aspect-[4/3] overflow-hidden rounded-card border border-border">
            <Image src="/images/about.svg" alt="Taylor & Lanie working with a client" width={1200} height={900} className="h-full w-full object-cover" />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-accent">The people behind the work</p>
            <h2 className="mt-2 font-display text-3xl font-bold text-text sm:text-4xl">
              {taylor.name} builds it. {lanie.name} makes it easy.
            </h2>
            <div className="mt-6 space-y-4 text-text-muted">
              <p>
                <span className="font-semibold text-text">{taylor.name}</span> — {taylor.focus}
              </p>
              <p>
                <span className="font-semibold text-text">{lanie.name}</span> — {lanie.focus}
              </p>
              <p>
                Homeowners tell us the best part isn&rsquo;t just the finished cedar or the
                kitchen — it&rsquo;s knowing exactly who&rsquo;s showing up, and that the
                person who estimates the job is the one who builds it.
              </p>
            </div>
          </div>
        </Container>
      </Section>

      {/* REVIEWS */}
      <Section>
        <Container>
          <SectionHeading eyebrow="Reviews" title="What neighbors say" align="center" description="Real feedback from homeowners across the Willamette Valley." />
          <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
            {topReviews.map((r) => (
              <figure key={r.id} className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
                <StarRating rating={r.rating} />
                <h3 className="mt-3 font-bold text-text">{r.title}</h3>
                <blockquote className="mt-2 text-text-muted">&ldquo;{r.body}&rdquo;</blockquote>
                <figcaption className="mt-4 text-sm text-text-subtle">{r.author} · {r.location}</figcaption>
              </figure>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/reviews" className="inline-flex items-center gap-1 font-semibold text-accent hover:underline">Read all reviews →</Link>
          </div>
        </Container>
      </Section>

      <CTASection />
    </>
  );
}

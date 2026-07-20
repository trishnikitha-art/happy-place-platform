import Image from "next/image";
import Link from "next/link";
import { Container, Section, SectionHeading } from "@/components/section";
import { ServiceCard } from "@/components/service-card";
import { GalleryLightbox } from "@/components/gallery-lightbox";
import { CTASection } from "@/components/cta-section";
import { StarRating } from "@/components/star-rating";
import { Reveal } from "@/components/reveal";
import { buttonVariants } from "@/components/ui/button";
import { CedarDivider } from "@/components/cedar-divider";
import { CedarCorner } from "@/components/cedar-corner";
import { cn } from "@/lib/utils";
import { serviceCategories } from "@/config/serviceCategories";
import { services } from "@/config/services";
import { reviews, averageRating } from "@/config/reviews";
import { company } from "@/config/company";
import { BeforeAfterCard } from "@/components/before-after-card";
import { Transformation } from "@/config/transformations";
import { media, photoFor, homepageHighlights, ownerPortrait } from "@/lib/media";

export default function HomePage() {
  const topReviews = reviews.slice(0, 3);
  const [taylor, lanie] = company.owners;
  const featured = photoFor("FeaturedTransformation");
  const highlights = homepageHighlights();
  // Transformation cards: real composites (single before→after frames) shown
  // honestly as transformation stories, not fake draggable sliders.
  const transformations = Transformation;

  return (
    <>
      {/* HERO — abstract, confident composition (Directive 033). No background
          photo (none is premium-wide yet), just warm depth, beautiful type,
          one strong CTA, and subtle craftsmanship accents. */}
      <section className="relative isolate overflow-hidden bg-deep text-text-on-dark">
        {/* warm textured depth — not a photo */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(120%_120%_at_80%_-10%,rgba(217,154,78,0.20),transparent_55%),radial-gradient(90%_90%_at_10%_110%,rgba(31,63,60,0.65),transparent_60%)]" aria-hidden="true" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-deep/30 via-transparent to-deep" aria-hidden="true" />
        {/* subtle craftsmanship rule line */}
        <div className="absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-honey/25 to-transparent" aria-hidden="true" />

        <Container className="relative flex min-h-[86svh] flex-col justify-center py-32 lg:py-40">
          <div className="max-w-3xl">
            <p className="font-signature text-2xl text-honey/90">Happy Place Carpentry</p>
            <h1 className="mt-4 font-display text-5xl font-bold leading-[1.04] text-text-on-dark sm:text-6xl lg:text-7xl">
              Building spaces you&rsquo;ll love coming home to.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-text-on-dark/85">
              I&rsquo;m Taylor. I build decks, kitchens, fences, and the little
              details that make a house feel like yours — right here in the
              mid-Willamette Valley, in cedar, finished by hand.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/estimate" className="cta-signature inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-base font-semibold">
                Get a Free Estimate
              </Link>
              <Link
                href="/gallery"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-text-on-dark/30 bg-text-on-dark/10 px-7 py-3.5 text-base font-semibold text-text-on-dark transition-colors hover:bg-text-on-dark/20"
              >
                See Our Work
              </Link>
            </div>
            {/* TRUST — moved below the primary CTA (license arrived too early before) */}
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-text-on-dark/70">
              <span className="inline-flex items-center gap-2">
                <StarRating rating={5} />
                {averageRating()} / 5 · {company.proof.projectsCompleted} projects
              </span>
              <span className="text-text-on-dark/40">·</span>
              <span>{company.ccbNumber} · Licensed · Insured</span>
              <span className="text-text-on-dark/40">·</span>
              <span>{company.proof.serviceCounties.join(" · ")}</span>
            </div>
          </div>
        </Container>
      </section>

      <div className="h-2 bg-gradient-to-r from-deep via-primary to-deep/60" aria-hidden="true" />

      {/* FEATURED TRANSFORMATION — the photography explodes here, immediately
          under the hero. Editorial: large image + offset floating quote card. */}
      {featured && (
        <section className="bg-background">
          <Container className="py-16 sm:py-20">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">Featured transformation</p>
            <div className="mt-6 grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-0">
              <div className="relative lg:col-span-8 lg:z-10">
                <div className="relative aspect-[16/10] overflow-hidden rounded-card shadow-float ring-1 ring-border-soft">
                  <Image
                    src={featured.src}
                    alt="Bathroom remodel transformation by Happy Place Carpentry"
                    fill
                    sizes="(max-width: 1024px) 100vw, 66vw"
                    className="photo-breathe object-cover"
                  />
                </div>
              </div>
              <div className="relative lg:col-span-5 lg:-ml-16 lg:z-20">
                <div className="float-card bg-surface p-7 sm:p-9">
                  <p className="font-display text-2xl font-bold leading-snug text-text sm:text-3xl">
                    A bathroom, transformed.
                  </p>
                  <p className="mt-4 text-text-muted">
                    Tile, fixtures, and finish — built to feel calm and last
                    through Oregon&rsquo;s wet seasons.
                  </p>
                  <Link
                    href="/gallery"
                    className="mt-6 inline-flex items-center gap-1 font-semibold text-accent hover:underline"
                  >
                    See the full gallery →
                  </Link>
                </div>
              </div>
            </div>
          </Container>
        </section>
      )}

      <Section className="bg-background">
        <Container>
          <SectionHeading
            eyebrow="Why homeowners choose us"
            title="One call, from estimate to final detail"
            description="The person who estimates your job is the one who builds it."
          />
          <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8 text-center sm:grid-cols-4">
            {[
              [company.proof.projectsCompleted, "Projects completed"],
              [`${company.proof.yearsInBusiness} yrs`, "In business"],
              [company.ccbNumber, "Licensed · Insured"],
              ["1–2 days", "Estimate response"],
            ].map(([stat, label]) => (
              <div key={label as string} className="relative">
                <p className="font-display text-4xl font-bold text-primary sm:text-5xl">{stat}</p>
                <p className="mt-2 text-sm font-medium uppercase tracking-wide text-text-muted">{label}</p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      <CedarDivider />

      {/* SERVICES — each with its strongest real photo (ServicesFeature role) */}
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

      {/* TRANSFORMATIONS — honest cards (real before→after composites), not fake
          draggable sliders. Distinct from the comprehensive gallery below. */}
      <Section className="bg-background">
        <Container>
          <SectionHeading
            eyebrow="Before & after"
            title="Real transformations"
            description="A look at the work — start to finish. Every project earns its finish."
          />
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
            {transformations.slice(0, 4).map((t, i) => (
              <Reveal key={t.id} delay={i * 60}>
                <BeforeAfterCard t={t} />
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

      {/* TAYLOR & LANIE — Act II. Reserved single portrait, only here + About. */}
      <Section className="bg-background">
        <Container className="grid items-center gap-10 lg:grid-cols-2">
          <div className="relative aspect-[4/3] overflow-hidden rounded-card shadow-float ring-1 ring-border-soft">
            <Image src={ownerPortrait().src} alt="Taylor & Lanie of Happy Place Carpentry" fill sizes="(max-width: 1024px) 100vw, 50vw" className="h-full w-full object-cover photo-breathe" />
            <CedarCorner className="absolute -left-2 -top-2 h-8 w-8 text-honey" />
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
              <figure key={r.id} className="float-card bg-surface p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-float">
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


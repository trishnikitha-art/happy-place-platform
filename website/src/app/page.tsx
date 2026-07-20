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
import { reviews, averageRating } from "@/config/reviews";
import { featuredProject } from "@/config/projects";
import { beforeAfterPairs } from "@/config/beforeAfter";
import { company } from "@/config/company";
import { BeforeAfterSlider } from "@/components/before-after-slider";
import { CedarDivider } from "@/components/cedar-divider";
import { CedarCorner } from "@/components/cedar-corner";
import { media } from "@/lib/media";

export default function HomePage() {
  const spotlight = featuredProject();
  const topReviews = reviews.slice(0, 3);
  const [taylor, lanie] = company.owners;

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
            src={media("hero").src}
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
              <h1 className="mt-4 font-display text-5xl font-bold leading-[1.02] text-text-on-dark sm:text-6xl lg:text-7xl">
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
                  href="/gallery"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-text-on-dark/30 bg-text-on-dark/10 px-7 py-3.5 text-base font-semibold text-text-on-dark transition-colors hover:bg-text-on-dark/20"
                >
                  See Our Work
                </Link>
              </div>
              <div className="mt-7 flex items-center gap-3 text-sm text-text-on-dark/70">
                <StarRating rating={5} />
                <span>{averageRating()} / 5 · {company.proof.projectsCompleted} projects completed</span>
              </div>
              <span className="mt-6 block font-signature text-3xl text-honey">
                Happy Place Carpentry
              </span>
            </div>
          </div>

          {/* floating owner photo, offset on desktop */}
          <div className="relative mt-10 lg:col-span-5 lg:mt-0 lg:self-center">
            <div className="relative mx-auto aspect-[4/5] w-2/3 overflow-hidden rounded-card shadow-float ring-1 ring-text-on-dark/20 sm:w-1/2 lg:ml-auto lg:w-full lg:translate-y-6">
              <Image
                src={media("about").src}
                alt="Taylor & Lanie of Happy Place Carpentry"
                fill
                sizes="(max-width: 1024px) 60vw, 40vw"
                className="object-cover"
              />
            </div>
          </div>
        </Container>
      </section>

      {/* soft gradient seam — depth between hero and content (cedar principle) */}
      <div className="h-2 bg-gradient-to-r from-deep via-primary to-deep/60" aria-hidden="true" />

      {/* FEATURED TRANSFORMATION — people buy transformations, not services.
          Editorial: large image + offset floating quote card (cedar principle:
          images overlap panels, no identical boxes). */}
      {spotlight && (
        <section className="bg-background">
          <Container className="py-16 sm:py-20">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">Featured transformation</p>
            <div className="mt-6 grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-0">
              {/* large image, slightly overlapping the quote panel */}
              <div className="relative lg:col-span-8 lg:z-10">
                <div className="relative aspect-[16/10] overflow-hidden rounded-card shadow-float ring-1 ring-border-soft">
                  <Image
                    src={spotlight.photos[0].src}
                    alt={spotlight.title}
                    fill
                    sizes="(max-width: 1024px) 100vw, 66vw"
                    className="photo-breathe object-cover"
                  />
                </div>
              </div>
              {/* floating quote card, pulled left over the image */}
              <div className="relative lg:col-span-5 lg:-ml-16 lg:z-20">
                <div className="float-card bg-surface p-7 sm:p-9">
                  <CedarCorner className="absolute -right-2 -top-2 h-7 w-7 text-honey" />
                  <p className="font-display text-2xl font-bold leading-snug text-text sm:text-3xl">
                    {spotlight.title}
                  </p>
                  <p className="mt-4 text-text-muted">{spotlight.summary}</p>
                  <Link
                    href={`/projects/${spotlight.slug}`}
                    className="mt-6 inline-flex items-center gap-1 font-semibold text-accent hover:underline"
                  >
                    Read the full story →
                  </Link>
                </div>
              </div>
            </div>
          </Container>
        </section>
      )}

      {/* TRUST / MICRO-PROOF STRIP — woven, not isolated */}
      <section className="border-y border-border-soft bg-background">
        <Container className="grid grid-cols-2 gap-x-6 gap-y-8 py-12 text-center sm:grid-cols-4">
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
      <Section className="bg-background">
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

      {/* TAYLOR & LANIE — partnership */}
      <Section className="bg-background">
        <Container className="grid items-center gap-10 lg:grid-cols-2">
          <div className="relative aspect-[4/3] overflow-hidden rounded-card shadow-float ring-1 ring-border-soft">
            <Image src={media("about").src} alt="Taylor & Lanie working with a client" fill sizes="(max-width: 1024px) 100vw, 50vw" className="h-full w-full object-cover photo-breathe" />
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

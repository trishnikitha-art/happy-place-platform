import Image from "next/image";
import Link from "next/link";
import { Container, Section, SectionHeading } from "@/components/section";
import { ServiceCard } from "@/components/service-card";
import { CTASection } from "@/components/cta-section";
import { StarRating } from "@/components/star-rating";
import { Reveal } from "@/components/reveal";
import { CedarDivider } from "@/components/cedar-divider";
import { CedarCorner } from "@/components/cedar-corner";
import { ToolMark } from "@/components/tool-mark";
import { serviceCategories } from "@/config/serviceCategories";
import { services } from "@/config/services";
import { reviews, averageRating } from "@/config/reviews";
import { company } from "@/config/company";
import { BeforeAfterCard } from "@/components/before-after-card";
import { Transformation } from "@/config/transformations";
import { media, featuredTransformation, homepageSelection, ownerPortrait } from "@/lib/media";

export default function HomePage() {
  const topReviews = reviews.slice(0, 3);
  const [taylor, lanie] = company.owners;
  const featured = featuredTransformation(); // warm cedar fence — first emotional image
  const outdoor = homepageSelection();       // curated magazine set
  const transformations = Transformation;     // honest before→after composites

  return (
    <>
      {/* HERO — frozen, intentionally restrained (Directive 034). No photo, no
          owner, no fake luxury. Beautiful type, warm depth, one CTA. */}
      <section className="relative isolate overflow-hidden bg-deep text-text-on-dark">
        <div className="absolute inset-0 z-0 bg-[radial-gradient(120%_120%_at_80%_-10%,rgba(217,154,78,0.22),transparent_55%),radial-gradient(90%_90%_at_10%_110%,rgba(22,43,41,0.7),transparent_60%)]" aria-hidden="true" />
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-deep/30 via-transparent to-deep" aria-hidden="true" />
        <div className="absolute inset-x-0 top-0 z-0 h-px bg-gradient-to-r from-transparent via-honey/25 to-transparent" aria-hidden="true" />

        <div className="hero-craft" aria-hidden="true" />
        <div className="hero-square" aria-hidden="true" />
        <div className="hero-ticks" aria-hidden="true" />

        <Container className="relative z-10 flex min-h-[88svh] flex-col justify-center py-28 lg:py-36">
          <div className="max-w-3xl">
            <p className="font-signature text-2xl text-honey/90">Happy Place Carpentry</p>
            <h1 className="mt-5 font-display text-5xl font-bold leading-[1.03] tracking-tight text-text-on-dark sm:text-6xl lg:text-7xl">
              Building spaces you&rsquo;ll love coming home to.
            </h1>
            <p className="measure mt-6 max-w-xl text-lg leading-relaxed text-text-on-dark/80">
              Some homes have a space that quietly becomes the favorite.
              We build the decks, kitchens, baths, and fences worth coming home to.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/estimate" className="cta-signature inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 text-base font-semibold">
                Get a Free Estimate
              </Link>
              <Link
                href="/our-work"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-text-on-dark/30 bg-text-on-dark/10 px-8 py-4 text-base font-semibold text-text-on-dark transition-colors hover:bg-text-on-dark/20"
              >
                See Our Work
              </Link>
            </div>
            <div className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-text-on-dark/65">
              <span className="inline-flex items-center gap-2">
                <StarRating rating={5} />
                {averageRating()} / 5 · {company.proof.projectsCompleted} projects
              </span>
              <span className="text-text-on-dark/35">·</span>
              <span>{company.ccbNumber} · Licensed · Insured</span>
              <span className="text-text-on-dark/35">·</span>
              <span>{company.proof.serviceCounties.join(" · ")}</span>
            </div>
            <span className="mt-7 block font-signature text-3xl text-honey">Let&rsquo;s start building your happy place.</span>
          </div>
        </Container>
      </section>

      <div className="h-2 bg-gradient-to-r from-deep via-primary to-deep/60" aria-hidden="true" />

      {/* FEATURED TRANSFORMATION — the first photograph. Warm, aspirational
          cedar fence. Large editorial image + offset floating quote. */}
      {featured && (
        <section className="bg-background">
          <Container className="py-20 sm:py-28">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">Featured transformation</p>
            <div className="mt-7 grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-0">
              <div className="relative lg:col-span-8 lg:z-10">
                <div className="relative aspect-[16/10] overflow-hidden rounded-card photo-mounted">
                  <Image
                    src={featured.src}
                    alt="Cedar fence built by Happy Place Carpentry"
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 66vw"
                    className="photo-breathe object-cover"
                  />
                </div>
              </div>
              <div className="relative lg:col-span-5 lg:-ml-16 lg:z-20">
                <div className="float-card bg-surface p-8 sm:p-10">
                  <CedarCorner className="absolute -right-2 -top-2 h-8 w-8 text-honey" />
                  <p className="font-display text-3xl font-bold leading-snug text-text sm:text-4xl">
                    A fence that frames the whole yard.
                  </p>
                  <p className="mt-5 text-text-muted">
                    Straight lines, matched stain, posts that stay put. Craftsmanship
                    you feel every time you pull in the driveway.
                  </p>
                  <Link
                    href="/our-work"
                    className="mt-7 inline-flex items-center gap-1 font-semibold text-accent hover:underline"
                  >
                    See the full portfolio →
                  </Link>
                </div>
              </div>
            </div>
          </Container>
        </section>
      )}

      <CedarDivider />

      {/* OUTDOOR LIVING — the emotional glue. Aspirational life, not a catalog. */}
      {outdoor[1] && (
        <section className="bg-background">
          <Container className="py-16 sm:py-20">
            <SectionHeading
              eyebrow="Outdoor living"
              title="Picture your backyard."
              description="Decks, fences, and the spaces you actually live in."
            />
            <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="relative lg:col-span-7">
                <div className="relative aspect-[4/3] overflow-hidden rounded-card photo-mounted">
                  <Image src={outdoor[1].src} alt={outdoor[1].alt} fill sizes="(max-width: 1024px) 100vw, 58vw" className="object-cover photo-breathe" />
                </div>
              </div>
              <div className="flex flex-col justify-center gap-6 lg:col-span-5">
                {[outdoor[4], outdoor[5]].filter(Boolean).map((img, i) => (
                  <div key={i} className="relative aspect-[16/10] overflow-hidden rounded-card photo-mounted">
                    <Image src={img!.src} alt={img!.alt} fill sizes="(max-width: 768px) 100vw, 40vw" className="object-cover" />
                  </div>
                ))}
              </div>
            </div>
          </Container>
        </section>
      )}

      {/* TRUST STRIP — quiet, confident proof (woven, not a banner) */}
      <section className="border-y border-border-soft bg-background">
        <Container className="grid grid-cols-2 gap-x-6 gap-y-8 py-14 text-center sm:grid-cols-4">
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

      {/* SERVICES — image-dominant cards, less chrome (Directive 034) */}
      <Section>
        <Container>
          <SectionHeading
            eyebrow={<span className="eyebrow-mark"><ToolMark /> What we do</span>}
            title="Craftsmanship for every part of your home"
            description="Pick a service to start a free estimate — we'll guide the rest."
          />
          <div className="mt-12 space-y-14">
            {serviceCategories.map((cat) => (
              <div key={cat.slug} id={cat.slug}>
                <h3 className="font-display text-3xl font-bold text-text">{cat.title}</h3>
                <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {services.filter((s) => s.category === cat.slug).map((s) => (
                    <ServiceCard key={s.slug} service={s} />
                  ))}
                </div>
              </div>
            ))}
          </div>
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
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
            {transformations.slice(0, 4).map((t, i) => (
              <Reveal key={t.id} delay={i * 60}>
                <BeforeAfterCard t={t} />
              </Reveal>
            ))}
          </div>
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
                <span className="font-semibold text-text">{taylor.name}</span> — Taylor believes good craftsmanship should still look good twenty years from now. Every project is built expecting he&rsquo;ll proudly drive past it for years to come.
              </p>
              <p>
                <span className="font-semibold text-text">{lanie.name}</span> — Lanie makes sure every homeowner always knows what&rsquo;s happening next — from the first conversation to the final walkthrough.
              </p>
            </div>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-card photo-mounted">
            <Image src={ownerPortrait().src} alt="Taylor & Lanie of Happy Place Carpentry" fill sizes="(max-width: 1024px) 100vw, 50vw" className="h-full w-full object-cover photo-breathe" />
            <CedarCorner className="absolute -left-2 -top-2 h-8 w-8 text-honey" />
          </div>
        </Container>
      </Section>

      {/* CRAFT RULE separator before reviews */}
      <div className="py-6">
        <div className="craft-rule"><span /></div>
      </div>

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

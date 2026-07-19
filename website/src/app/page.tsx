import Image from "next/image";
import Link from "next/link";
import { Container, Section, SectionHeading } from "@/components/section";
import { ServiceCard } from "@/components/service-card";
import { GalleryGrid } from "@/components/gallery-grid";
import { CTASection } from "@/components/cta-section";
import { StarRating } from "@/components/star-rating";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { serviceCategories } from "@/config/serviceCategories";
import { services } from "@/config/services";
import { featuredGallery } from "@/config/gallery";
import { reviews, averageRating } from "@/config/reviews";
import { company } from "@/config/company";

export default function HomePage() {
  const featured = featuredGallery(6);
  const topReviews = reviews.slice(0, 3);

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-stone-900 text-white">
        <Image
          src="/images/hero.svg"
          alt=""
          width={1600}
          height={900}
          priority
          className="absolute inset-0 h-full w-full object-cover opacity-30"
        />
        <Container className="relative flex min-h-[70vh] flex-col justify-center py-20">
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-400">
            Licensed Oregon Contractor · {company.ccbNumber}
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-tight sm:text-6xl">
            {company.tagline}
          </h1>
          <p className="mt-5 max-w-xl text-lg text-stone-200">
            Decks, fences, pergolas, kitchens, baths, and custom carpentry across the
            mid-Willamette Valley — built with care, on time, and on budget.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/estimate" className={cn(buttonVariants({ variant: "primary", size: "lg" }))}>
              Get a Free Estimate
            </Link>
            <Link
              href="/services"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "border-white/30 bg-white/10 text-white hover:bg-white/20")}
            >
              Explore Services
            </Link>
          </div>
          <div className="mt-10 flex items-center gap-3 text-sm text-stone-200">
            <StarRating rating={5} />
            <span>
              {averageRating()} / 5 from {reviews.length}+ local reviews
            </span>
          </div>
        </Container>
      </section>

      {/* SERVICES */}
      <Section>
        <Container>
          <SectionHeading
            eyebrow="What we do"
            title="Carpentry for every part of your home"
            description="Pick a service to start a free estimate — we'll guide the rest."
          />
          <div className="mt-10 space-y-12">
            {serviceCategories.map((cat) => (
              <div key={cat.slug} id={cat.slug}>
                <h3 className="text-xl font-bold text-stone-900">{cat.title}</h3>
                <p className="mb-5 mt-1 text-stone-600">{cat.description}</p>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {services
                    .filter((s) => s.category === cat.slug)
                    .map((s) => (
                      <ServiceCard key={s.slug} service={s} />
                    ))}
                </div>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* GALLERY */}
      <Section className="bg-stone-50">
        <Container>
          <SectionHeading
            eyebrow="Our work"
            title="Happy places we've built"
            description="A look at recent projects across Benton, Linn, Marion, and Polk Counties."
          />
          <div className="mt-10">
            <GalleryGrid items={featured} />
          </div>
          <div className="mt-8">
            <Link href="/gallery" className="inline-flex items-center gap-1 font-semibold text-amber-700 hover:underline">
              View the full gallery →
            </Link>
          </div>
        </Container>
      </Section>

      {/* REVIEWS */}
      <Section>
        <Container>
          <SectionHeading
            eyebrow="Reviews"
            title="What neighbors say"
            align="center"
            description="Real feedback from homeowners across the Willamette Valley."
          />
          <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
            {topReviews.map((r) => (
              <figure key={r.id} className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
                <StarRating rating={r.rating} />
                <h3 className="mt-3 font-bold text-stone-900">{r.title}</h3>
                <blockquote className="mt-2 text-stone-600">“{r.body}”</blockquote>
                <figcaption className="mt-4 text-sm text-stone-500">
                  {r.author} · {r.location}
                </figcaption>
              </figure>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/reviews" className="inline-flex items-center gap-1 font-semibold text-amber-700 hover:underline">
              Read all reviews →
            </Link>
          </div>
        </Container>
      </Section>

      <CTASection />
    </>
  );
}

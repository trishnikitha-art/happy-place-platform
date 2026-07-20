import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Container, Section, SectionHeading } from "@/components/section";
import { GalleryLightbox } from "@/components/gallery-lightbox";
import { CTASection } from "@/components/cta-section";
import { Reveal } from "@/components/reveal";
import { BeforeAfterSlider } from "@/components/before-after-slider";
import { beforeAfterPairs } from "@/config/beforeAfter";
import { mockGalleryService } from "@/services/gallery";
import { getProjects } from "@/config/projects";
import { galleryData, hasRealPhotos, realGalleryItems } from "@/lib/media";
import { company } from "@/config/company";

export const metadata: Metadata = {
  title: "Our Work",
  description:
    "Decks, fences, pergolas, kitchens, baths, and custom carpentry across the Willamette Valley — real projects, real craftsmanship.",
  alternates: { canonical: "/gallery" },
};

export default function OurWorkPage() {
  // Real photos (from the pipeline) take over the gallery the moment they exist;
  // the curated placeholder set is the fallback until then. No hardcoded filenames.
  const items = hasRealPhotos() ? realGalleryItems() : mockGalleryService.all();
  const projects = getProjects();

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-deep text-secondary-foreground">
        <div className="absolute inset-0 bg-gradient-to-br from-deep via-deep to-deep-2" />
        <Container className="relative py-24">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            {company.proof.projectsCompleted} projects · {company.ccbNumber}
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-tight sm:text-6xl">
            Our Work
          </h1>
          <p className="mt-5 max-w-xl text-lg text-secondary-foreground/70">
            Every project is built to last in Oregon&rsquo;s climate — cedar that ages
            gracefully, trim that fits, details you can feel.
          </p>
        </Container>
      </section>

      {/* PROJECT STORIES (photo-led, dense) */}
      <Section>
        <Container>
          <SectionHeading
            eyebrow="Featured projects"
            title="The story behind the work"
            description="Real challenges, real solutions. Tap a project for the full story."
          />
          <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-2">
            {projects.map((p, i) => {
              const hero = p.photos[0];
              return (
                <Reveal key={p.slug} delay={i * 80}>
                  <Link
                    href={`/projects/${p.slug}`}
                    className="group block overflow-hidden rounded-card border border-border bg-surface shadow-sm transition-shadow hover:shadow-lg"
                  >
                    <div className="relative">
                      <Image
                        src={hero.src}
                        alt={hero.alt}
                        width={hero.width}
                        height={hero.height}
                        className="h-64 w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                      <span className="absolute left-4 top-4 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                        {p.county
                          ? `${p.county.charAt(0).toUpperCase()}${p.county.slice(1)} County`
                          : "Project"}
                      </span>
                    </div>
                    <div className="p-6">
                      <h2 className="text-xl font-bold text-text">{p.title}</h2>
                      <p className="mt-2 line-clamp-2 text-text-muted">{p.summary}</p>
                      <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent group-hover:underline">
                        Read the story →
                      </span>
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </Container>
      </Section>

      {/* FULL GALLERY GRID — driven by metadata (gallery.json via media.ts) */}
      <Section className="bg-surface-muted">
        <Container>
          <SectionHeading
            eyebrow="Gallery"
            title="More happy places"
            description="A look across Benton, Linn, Marion, and Polk Counties. Filter by service below."
          />
          <div className="mt-10">
            <GalleryLightbox items={items} />
          </div>
        </Container>
      </Section>

      {/* BEFORE / AFTER — grouped pairs */}
      <Section className="bg-cream">
        <Container>
          <SectionHeading
            eyebrow="Before & after"
            title="Scrub through the transformations"
            description="Drag any slider to see the work — from rough start to finished craft."
          />
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
            {beforeAfterPairs.map((pair, i) => (
              <Reveal key={pair.id} delay={i * 50}>
                <BeforeAfterSlider pair={pair} />
              </Reveal>
            ))}
          </div>
          <div className="mt-8">
            <Link href="/gallery" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
              Browse the full gallery →
            </Link>
          </div>
        </Container>
      </Section>

      <CTASection />
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Container, Section, SectionHeading } from "@/components/section";
import { GalleryLightbox } from "@/components/gallery-lightbox";
import { CTASection } from "@/components/cta-section";
import { Reveal } from "@/components/reveal";
import { BeforeAfterCard } from "@/components/before-after-card";
import { getProjects } from "@/config/projects";
import { galleryAll, hasRealPhotos, realGalleryItems } from "@/lib/media";
import { company } from "@/config/company";
import { Transformation } from "@/config/transformations";

export const metadata: Metadata = {
  title: "Our Work",
  description:
    "Featured transformations, recent projects, and the complete archive of Happy Place Carpentry — decks, fences, kitchens, baths, and custom carpentry across the Willamette Valley.",
  alternates: { canonical: "/our-work" },
};

export default function OurWorkPage() {
  // Real photos take over the moment they exist; nothing is ever orphaned.
  const items = hasRealPhotos() ? realGalleryItems() : [];
  const projects = getProjects();
  const museum = galleryAll(); // every cataloged photo, grouped by project — the archive

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-deep text-text-on-dark">
        <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_80%_-10%,rgba(217,154,78,0.18),transparent_55%),radial-gradient(90%_90%_at_10%_110%,rgba(31,63,60,0.6),transparent_60%)]" aria-hidden="true" />
        <Container className="relative py-24">
          <p className="text-sm font-semibold uppercase tracking-wide text-honey">
            {company.proof.projectsCompleted} projects · {company.ccbNumber}
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-tight text-text-on-dark sm:text-6xl">
            Our Work
          </h1>
          <p className="mt-5 max-w-xl text-lg text-text-on-dark/70">
            Every project is built to last in Oregon&rsquo;s climate — cedar that ages
            gracefully, trim that fits, details you can feel. This is the complete
            portfolio: featured transformations first, then the full archive.
          </p>
        </Container>
      </section>

      {/* FEATURED TRANSFORMATIONS — the emotional open */}
      <Section>
        <Container>
          <SectionHeading
            eyebrow="Featured transformations"
            title="Start to finish"
            description="Real projects, real craftsmanship — the moments that turn a house into a happy place."
          />
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
            {Transformation.slice(0, 4).map((t, i) => (
              <Reveal key={t.id} delay={i * 60}>
                <BeforeAfterCard t={t} />
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      {/* RECENT PROJECTS — photo-led project stories */}
      <Section className="bg-surface-muted">
        <Container>
          <SectionHeading
            eyebrow="Recent projects"
            title="The story behind the work"
            description="Real challenges, real solutions. Tap a project for the full story."
          />
          <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-2">
            {projects.map((p, i) => {
              const hero = p.photos[0];
              if (!hero) return null;
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

      {/* BROWSE ALL WORK — the museum / archive: every cataloged photo, grouped by
          project. Nothing is hidden; every one of the 18 images lives here. */}
      <Section className="bg-background">
        <Container>
          <SectionHeading
            eyebrow="Browse all work"
            title="The complete archive"
            description="Every project, every detail. Future projects simply append here."
          />
          <div className="mt-10 space-y-12">
            {museum.filter((group) => group.category !== "Uncategorized").map((group) => (
              <div key={group.project}>
                <h3 className="mb-4 font-display text-xl font-bold text-text">{group.category}</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {group.images.map((img, i) => (
                    <div key={i} className="relative aspect-[4/3] overflow-hidden rounded-card ring-1 ring-border-soft">
                      <Image
                        src={img.src}
                        alt={img.alt}
                        fill
                        sizes="(max-width: 640px) 50vw, 25vw"
                        className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.04]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {items.length > 0 && (
            <div className="mt-10">
              <GalleryLightbox items={items} />
            </div>
          )}
          <div className="mt-8 text-center">
            <Link href="/estimate" className="inline-flex items-center gap-1 font-semibold text-accent hover:underline">
              Start your project →
            </Link>
          </div>
        </Container>
      </Section>

      <CTASection
        title="Ready to love coming home again?"
        subtitle="Let's start building your happy place."
      />
    </>
  );
}

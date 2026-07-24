import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Container, Section, SectionHeading } from "@/components/section";
import { CTASection } from "@/components/cta-section";
import { Reveal } from "@/components/reveal";
import { BeforeAfterSlider } from "@/components/before-after-slider";
import { getAllProjects, getFeaturedProjects } from "@/lib/projects";
import { getCompany } from "@/lib/company";
import { PlaceholderSection } from "@/components/placeholder-section";
import { getMediaById } from "@/lib/media";

export const metadata: Metadata = {
  title: "Our Work",
  description:
    "Featured transformations, recent projects, and the complete archive of Happy Place Carpentry — decks, fences, kitchens, baths, and custom carpentry across the Willamette Valley.",
  alternates: { canonical: "/our-work" },
};

export default function OurWorkPage() {
  const company = getCompany();
  const allProjects = getAllProjects();
  const featuredProjects = getFeaturedProjects();

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
            Every project tells a story. Real homes. Real families. Real craftsmanship built for Oregon's climate. Explore featured transformations first, then browse the complete portfolio.
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
            {featuredProjects.slice(0, 4).map((project, i) => (
              <Reveal key={project.id} delay={i * 60}>
                <BeforeAfterSlider project={project} />
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
            {allProjects.map((project, i) => {
              const heroMediaId = project.media.hero;
              const heroMedia = heroMediaId ? getMediaById(heroMediaId) : null;
              const heroSrc = heroMedia?.variants?.web || heroMedia?.variants?.original;
              if (!heroSrc) return null;
              return (
                <Reveal key={project.id} delay={i * 80}>
                  <Link
                    href={`/projects/${project.slug || project.id}`}
                    className="group block overflow-hidden rounded-card border border-border bg-surface shadow-sm transition-shadow hover:shadow-lg"
                  >
                    <div className="relative aspect-[16/9]">
                      <Image
                        src={heroSrc}
                        alt={heroMedia?.alt || project.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                      <span className="absolute left-4 top-4 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                        {project.location.county
                          ? `${project.location.county.charAt(0).toUpperCase()}${project.location.county.slice(1)} County`
                          : "Project"}
                      </span>
                    </div>
                    <div className="p-6">
                      <h2 className="text-xl font-bold text-text">{project.title}</h2>
                      <p className="mt-2 line-clamp-2 text-text-muted">{project.story?.outcome || project.story?.solution}</p>
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

      {/* BROWSE ALL WORK — project gallery grid */}
      <Section className="bg-background">
        <Container>
          <SectionHeading
            eyebrow="Browse all work"
            title="The complete archive"
            description="Every project, every detail. Future projects simply append here."
          />
          <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {allProjects.map((project) => {
              const galleryMediaIds = project.media?.gallery || [];
              const galleryPhotos = galleryMediaIds
                .map(id => getMediaById(id))
                .filter(m => m !== null && (m.variants?.web || m.variants?.original));
              
              return galleryPhotos.map((photo, photoIndex) => {
                const src = photo!.variants.web || photo!.variants.original || photo!.variants.thumbnail;
                if (!src) return null;
                
                return (
                  <Link
                    key={`${project.id}-${photoIndex}`}
                    href={`/projects/${project.slug || project.id}`}
                    className="group relative block aspect-[4/3] overflow-hidden rounded-lg border border-border bg-surface-muted transition-all hover:shadow-lg"
                  >
                    <img
                      src={src}
                      alt={photo!.alt || `${project.title} photo ${photoIndex + 1}`}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                    <span className="absolute bottom-2 left-2 text-xs font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
                      {project.title}
                    </span>
                  </Link>
                );
              });
            })}
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

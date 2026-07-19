import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Container, Section, SectionHeading } from "@/components/section";
import { CTASection } from "@/components/cta-section";
import { galleryService } from "@/services/gallery";

export const metadata: Metadata = {
  title: "Project Spotlights",
  description: "In-depth stories of completed carpentry projects — the challenge, our solution, and the outcome.",
  alternates: { canonical: "/projects" },
};

export default function ProjectsPage() {
  const projects = galleryService.getProjects();
  return (
    <>
      <Section>
        <Container>
          <SectionHeading
            eyebrow="Project spotlights"
            title="The story behind the work"
            description="Every project starts with a problem to solve. Here's how a few of them came together."
          />
          <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-2">
            {projects.map((p) => {
              const hero = p.photos[0];
              return (
                <Link
                  key={p.slug}
                  href={`/projects/${p.slug}`}
                  className="group overflow-hidden rounded-card border border-border bg-surface shadow-sm transition-shadow hover:shadow-md"
                >
                  <Image
                    src={hero.src}
                    alt={hero.alt}
                    width={hero.width}
                    height={hero.height}
                    className="h-60 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                  <div className="p-6">
                    <h2 className="text-xl font-bold text-text">{p.title}</h2>
                    <p className="mt-2 text-text-muted">{p.summary}</p>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent">
                      Read the story →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </Container>
      </Section>
      <CTASection />
    </>
  );
}

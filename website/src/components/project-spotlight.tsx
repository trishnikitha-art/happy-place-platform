import Image from "next/image";
import Link from "next/link";
import { Wrench, Lightbulb, Package, CheckCircle2 } from "lucide-react";
import type { Project } from "@/types/projects";
import { getMediaById } from "@/lib/media";
import { Container, Section } from "@/components/section";
import { Badge, CraftCard } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * ProjectSpotlight — reusable completed-project story.
 * Works for ANY service business (carpenter, painter, electrician…) because it
 * renders a Project from config; no business logic lives here.
 *
 * `variant="feature"` = compact home-page teaser.
 * `variant="full"`    = full story page (challenge/solution/materials/outcome).
 * 
 * Surface-aware: accepts tone prop to adapt colors for light/dark backgrounds.
 */
export function ProjectSpotlight({
  project,
  variant = "full",
  tone = "light",
}: {
  project: Project;
  variant?: "feature" | "full";
  tone?: "light" | "dark";
}) {
  const heroMediaId = project.media?.hero;
  const heroMedia = heroMediaId ? getMediaById(heroMediaId) : null;
  const heroSrc = heroMedia?.variants?.web || heroMedia?.variants?.original;
  const heroAlt = heroMedia?.alt || project.title;

  // Get gallery media
  const galleryMediaIds = project.media?.gallery || [];
  const galleryMedia = galleryMediaIds
    .map(id => getMediaById(id))
    .filter(m => m !== null && (m.variants?.web || m.variants?.original));

  // Surface-aware text colors for non-card elements
  // Cards (CraftCard) always use light register regardless of page background
  const headingColor = tone === "dark" ? "text-text-on-dark" : "text-text";
  const bodyColor = tone === "dark" ? "text-text-on-dark/90" : "text-text-muted";
  const labelColor = tone === "dark" ? "text-text-on-dark/70" : "text-accent";
  const dtColor = tone === "dark" ? "text-text-on-dark" : "text-text";
  
  // Card text colors - always light register (cards are always light surfaces)
  const cardHeadingColor = "text-text";
  const cardBodyColor = "text-text-muted";

  if (variant === "feature") {
    if (!heroSrc) return null;
    return (
      <Section className="bg-surface-muted">
        <Container className="grid items-center gap-10 lg:grid-cols-2">
          <CraftCard className="group relative overflow-hidden">
            <Image
              src={heroSrc}
              alt={heroAlt}
              fill
              placeholder="blur"
              blurDataURL={heroMedia?.variants?.blur}
              className="h-full w-full object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
            <div className="absolute inset-0 pointer-events-none rounded-xl bg-gradient-to-tr from-black/3 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" aria-hidden="true" />
          </CraftCard>
          <div>
            <p className={`text-sm font-semibold uppercase tracking-wide ${labelColor}`}>Featured project</p>
            <h2 className={`mt-2 text-3xl font-bold tracking-tight sm:text-4xl ${headingColor}`}>{project.title}</h2>
            <p className={`mt-4 text-lg ${bodyColor}`}>{project.story?.outcome || project.title}</p>
            <dl className="mt-6 space-y-3 text-sm">
              <div className="flex gap-2">
                <dt className={`font-semibold ${dtColor}`}>Challenge:</dt>
                <dd className={bodyColor}>{project.story?.challenge?.split(". ")[0]}.</dd>
              </div>
              <div className="flex gap-2">
                <dt className={`font-semibold ${dtColor}`}>Outcome:</dt>
                <dd className={bodyColor}>{project.story?.outcome?.split(". ")[0]}.</dd>
              </div>
            </dl>
            <Link
              href={`/projects/${project.seo?.slug || project.id}`}
              className={cn(buttonVariants({ variant: "primary" }), "mt-8")}
            >
              Read the full story
            </Link>
          </div>
        </Container>
      </Section>
    );
  }

  if (!heroSrc) {
    return (
      <article>
        <div className="relative bg-secondary text-secondary-foreground">
          <Container className="relative py-20">
            <Badge>{project.location.county ? `${project.location.county} county` : "Project"}</Badge>
            <h1 className="mt-3 max-w-3xl text-4xl font-bold sm:text-5xl">{project.title}</h1>
            <p className="mt-4 max-w-2xl text-lg text-secondary-foreground">{project.story?.outcome || project.title}</p>
          </Container>
        </div>
        <Section>
          <Container className="grid gap-10 lg:grid-cols-3">
            <div className="space-y-8 lg:col-span-2">
              {project.story?.challenge && <StoryBlock icon={<Wrench className="h-5 w-5" />} title="The challenge" body={project.story.challenge} />}
              {project.story?.solution && <StoryBlock icon={<Lightbulb className="h-5 w-5" />} title="Our solution" body={project.story.solution} />}
              {project.story?.outcome && <StoryBlock icon={<CheckCircle2 className="h-5 w-5" />} title="The outcome" body={project.story.outcome} />}
            </div>
            <aside>
              <CraftCard className="p-6">
                <h3 className={`flex items-center gap-2 font-bold ${cardHeadingColor}`}>
                  <Package className="h-5 w-5 text-accent" /> Materials
                </h3>
                <ul className={`mt-3 space-y-2 text-sm ${cardBodyColor}`}>
                  {project.materials?.primary && (
                    <li className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      {project.materials.primary}
                    </li>
                  )}
                  {project.materials?.secondary?.map((m: string) => (
                    <li key={m} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      {m}
                    </li>
                  ))}
                </ul>
              </CraftCard>
            </aside>
          </Container>
        </Section>
      </article>
    );
  }

  return (
    <article>
      {/* Hero */}
      <div className="relative bg-secondary text-secondary-foreground">
        <Image
          src={heroSrc}
          alt={heroAlt}
          fill
          priority
          placeholder="blur"
          blurDataURL={heroMedia?.variants?.blur}
          className="absolute inset-0 h-full w-full object-cover opacity-30"
        />
        <Container className="relative py-20">
          <Badge>{project.location.county ? `${project.location.county} county` : "Project"}</Badge>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold sm:text-5xl">{project.title}</h1>
          <p className="mt-4 max-w-2xl text-lg text-secondary-foreground">{project.story?.outcome || project.title}</p>
        </Container>
      </div>

      <Section className="bg-deep">
        <Container className="grid gap-10 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            {project.story?.challenge && <StoryBlock icon={<Wrench className="h-5 w-5" />} title="The challenge" body={project.story.challenge} tone="dark" />}
            {project.story?.solution && <StoryBlock icon={<Lightbulb className="h-5 w-5" />} title="The plan" body={project.story.solution} tone="dark" />}
          </div>
          <aside>
            <CraftCard className="p-6">
              <h3 className={`flex items-center gap-2 font-bold ${cardHeadingColor}`}>
                <Package className="h-5 w-5 text-accent" /> Materials
              </h3>
              <ul className={`mt-3 space-y-2 text-sm ${cardBodyColor}`}>
                {project.materials?.primary && (
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {project.materials.primary}
                  </li>
                )}
                {project.materials?.secondary?.map((m: string) => (
                  <li key={m} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {m}
                  </li>
                ))}
              </ul>
            </CraftCard>
          </aside>
        </Container>
      </Section>

      {/* Photo story */}
      {galleryMedia.length > 0 && (
        <Section className="bg-deep pt-0">
          <Container>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {galleryMedia.map((media, i) => (
                <figure key={i} className="overflow-hidden rounded-card border border-border/40 bg-surface">
                  <div className="relative aspect-[4/3]">
                    <Image
                      src={media!.variants!.web || media!.variants!.original!}
                      alt={media!.alt}
                      fill
                      loading="lazy"
                      placeholder="blur"
                      blurDataURL={media!.variants?.blur}
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  </div>
                </figure>
              ))}
            </div>
          </Container>
        </Section>
      )}
    </article>
  );
}

function StoryBlock({ icon, title, body, tone = "light" }: { icon: React.ReactNode; title: string; body: string; tone?: "light" | "dark" }) {
  const headingColor = tone === "dark" ? "text-text-on-dark" : "text-text";
  const bodyColor = tone === "dark" ? "text-text-on-dark/90" : "text-text";
  
  return (
    <div>
      <h2 className={`flex items-center gap-2 text-2xl font-bold ${headingColor}`}>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-accent">{icon}</span>
        {title}
      </h2>
      <p className={`mt-3 text-lg leading-relaxed ${bodyColor}`}>{body}</p>
    </div>
  );
}

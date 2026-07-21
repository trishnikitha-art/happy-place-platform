import Image from "next/image";
import Link from "next/link";
import { Wrench, Lightbulb, Package, CheckCircle2 } from "lucide-react";
import type { Project } from "@/types";
import { Container, Section } from "@/components/section";
import { Badge } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * ProjectSpotlight — reusable completed-project story.
 * Works for ANY service business (carpenter, painter, electrician…) because it
 * renders a Project from config; no business logic lives here.
 *
 * `variant="feature"` = compact home-page teaser.
 * `variant="full"`    = full story page (challenge/solution/materials/outcome).
 */
export function ProjectSpotlight({
  project,
  variant = "full",
}: {
  project: Project;
  variant?: "feature" | "full";
}) {
  const hero = project.photos[0];

  if (variant === "feature") {
    if (!hero) return null;
    return (
      <Section className="bg-surface-muted">
        <Container className="grid items-center gap-10 lg:grid-cols-2">
          <div className="relative overflow-hidden rounded-card border border-border">
            <Image
              src={hero.src}
              alt={hero.alt}
              width={hero.width}
              height={hero.height}
              placeholder={hero.blurDataURL ? "blur" : undefined}
              blurDataURL={hero.blurDataURL}
              className="h-full w-full object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-accent">Featured project</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-text sm:text-4xl">{project.title}</h2>
            <p className="mt-4 text-lg text-text-muted">{project.summary}</p>
            <dl className="mt-6 space-y-3 text-sm">
              <div className="flex gap-2">
                <dt className="font-semibold text-text">Challenge:</dt>
                <dd className="text-text-muted">{project.challenge.split(". ")[0]}.</dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-semibold text-text">Outcome:</dt>
                <dd className="text-text-muted">{project.outcome.split(". ")[0]}.</dd>
              </div>
            </dl>
            <Link
              href={`/projects/${project.slug}`}
              className={cn(buttonVariants({ variant: "primary" }), "mt-8")}
            >
              Read the full story
            </Link>
          </div>
        </Container>
      </Section>
    );
  }

  if (!hero) {
    return (
      <article>
        <div className="relative bg-secondary text-secondary-foreground">
          <Container className="relative py-20">
            <Badge>{project.county ? `${project.county} county` : "Project"}</Badge>
            <h1 className="mt-3 max-w-3xl text-4xl font-bold sm:text-5xl">{project.title}</h1>
            <p className="mt-4 max-w-2xl text-lg text-secondary-foreground/80">{project.summary}</p>
          </Container>
        </div>
        <Section>
          <Container className="grid gap-10 lg:grid-cols-3">
            <div className="space-y-8 lg:col-span-2">
              <StoryBlock icon={<Wrench className="h-5 w-5" />} title="The challenge" body={project.challenge} />
              <StoryBlock icon={<Lightbulb className="h-5 w-5" />} title="Our solution" body={project.solution} />
              <StoryBlock icon={<CheckCircle2 className="h-5 w-5" />} title="The outcome" body={project.outcome} />
            </div>
            <aside>
              <div className="rounded-card border border-border bg-surface p-6">
                <h3 className="flex items-center gap-2 font-bold text-text">
                  <Package className="h-5 w-5 text-accent" /> Materials
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-text-muted">
                  {project.materials.map((m) => (
                    <li key={m} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
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
          src={hero.src}
          alt={hero.alt}
          width={hero.width}
          height={hero.height}
          priority
          placeholder={hero.blurDataURL ? "blur" : undefined}
          blurDataURL={hero.blurDataURL}
          className="absolute inset-0 h-full w-full object-cover opacity-30"
        />
        <Container className="relative py-20">
          <Badge>{project.county ? `${project.county} county` : "Project"}</Badge>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold sm:text-5xl">{project.title}</h1>
          <p className="mt-4 max-w-2xl text-lg text-secondary-foreground/80">{project.summary}</p>
        </Container>
      </div>

      <Section>
        <Container className="grid gap-10 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            <StoryBlock icon={<Wrench className="h-5 w-5" />} title="The challenge" body={project.challenge} />
            <StoryBlock icon={<Lightbulb className="h-5 w-5" />} title="Our solution" body={project.solution} />
            <StoryBlock icon={<CheckCircle2 className="h-5 w-5" />} title="The outcome" body={project.outcome} />
          </div>
          <aside>
            <div className="rounded-card border border-border bg-surface p-6">
              <h3 className="flex items-center gap-2 font-bold text-text">
                <Package className="h-5 w-5 text-accent" /> Materials
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-text-muted">
                {project.materials.map((m) => (
                  <li key={m} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {m}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </Container>
      </Section>

      {/* Photo story */}
      {project.photos.length > 1 && (
        <Section className="bg-surface-muted pt-0">
          <Container>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {project.photos.map((p, i) => (
                <figure key={i} className="overflow-hidden rounded-card border border-border bg-surface">
                  <Image
                    src={p.src}
                    alt={p.alt}
                    width={p.width}
                    height={p.height}
                    loading="lazy"
                    placeholder={p.blurDataURL ? "blur" : undefined}
                    blurDataURL={p.blurDataURL}
                    className="h-56 w-full object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  {p.caption && (
                    <figcaption className="px-4 py-3 text-sm text-text-muted">{p.caption}</figcaption>
                  )}
                </figure>
              ))}
            </div>
          </Container>
        </Section>
      )}
    </article>
  );
}

function StoryBlock({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div>
      <h2 className="flex items-center gap-2 text-2xl font-bold text-text">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-accent">{icon}</span>
        {title}
      </h2>
      <p className="mt-3 text-lg leading-relaxed text-text-muted">{body}</p>
    </div>
  );
}

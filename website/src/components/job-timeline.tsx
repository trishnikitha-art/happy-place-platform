import type { Project } from "@/types/projects";
import { Container, Section, SectionHeading } from "@/components/section";

/**
 * Job Timeline — the canonical view of a project.
 *
 * Promotes Project to the aggregate root: the timeline IS the project's
 * operational truth, derived from its canonical lifecycle fields
 * (createdAt, estimate dates, completion, reviews, media). Every milestone
 * is an anchor for the work that hangs off Project — not a menu item.
 *
 * This is the "observe → act" projection over the project's lifecycle:
 * the single source of truth homeowners, PMs, and office staff read.
 */

interface Milestone {
  id: string;
  label: string;
  date?: string;
  detail?: string;
  href?: string;
}

function toDate(value?: string): number {
  return value ? new Date(value).getTime() : Number.POSITIVE_INFINITY;
}

export function JobTimeline({ project }: { project: Project }) {
  const milestones: Milestone[] = [];

  if (project.createdAt) {
    milestones.push({ id: "lead", label: "Lead Created", date: project.createdAt });
  }
  if (project.estimate?.estimateDate) {
    milestones.push({
      id: "estimate-sent",
      label: "Estimate Sent",
      date: project.estimate.estimateDate,
    });
  }
  if (project.estimate?.acceptedDate) {
    milestones.push({
      id: "estimate-accepted",
      label: "Estimate Accepted",
      date: project.estimate.acceptedDate,
    });
  }
  if (project.startDate) {
    milestones.push({ id: "started", label: "Construction Started", date: project.startDate });
  }
  const progressCount = project.media?.progress?.length ?? 0;
  if (progressCount > 0) {
    milestones.push({
      id: "progress",
      label: "Progress Photos",
      detail: `${progressCount} construction photo${progressCount === 1 ? "" : "s"}`,
    });
  }
  if (project.completionDate) {
    milestones.push({ id: "completed", label: "Project Completed", date: project.completionDate });
  }
  const galleryCount = project.media?.gallery?.length ?? 0;
  if (galleryCount > 0) {
    milestones.push({
      id: "photos",
      label: "Photos Uploaded",
      detail: `${galleryCount} gallery photo${galleryCount === 1 ? "" : "s"}`,
      href: "#gallery",
    });
  }
  const reviewCount = project.reviews?.length ?? 0;
  if (reviewCount > 0) {
    milestones.push({
      id: "review",
      label: "Review Published",
      detail: `${reviewCount} review${reviewCount === 1 ? "" : "s"}`,
      href: "#review",
    });
  }

  // Chronological order where dates exist; undated milestones stay in flow.
  milestones.sort((a, b) => toDate(a.date) - toDate(b.date));

  return (
    <Section className="relative bg-linen">
      <Container>
        <SectionHeading
          eyebrow={<span className="text-honey">Job Timeline</span>}
          title={<span className="text-evergreen">The project, start to finish</span>}
          description={
            <span className="text-evergreen/80">
              Every milestone in one place — the single source of truth for this job.
            </span>
          }
        />

        <ol className="relative mt-10 space-y-0 border-l-2 border-evergreen/15 pl-8">
          {milestones.map((m) => (
            <li key={m.id} className="relative pb-10 last:pb-0">
              {/* Honey anchor dot on the cedar timeline line */}
              <span
                aria-hidden
                className="absolute -left-[2.65rem] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-honey shadow-[0_0_0_4px_rgba(237,234,224,1)]"
              />
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                {m.date && (
                  <time className="font-mono text-sm text-evergreen/60">
                    {new Date(m.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </time>
                )}
                {m.href ? (
                  <a
                    href={m.href}
                    className="text-lg font-semibold text-evergreen underline-offset-4 hover:underline"
                  >
                    {m.label}
                  </a>
                ) : (
                  <span className="text-lg font-semibold text-evergreen">{m.label}</span>
                )}
                {m.detail && <span className="text-sm text-evergreen/60">{m.detail}</span>}
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </Section>
  );
}

import type { Metadata } from "next";
import { Container, Section, SectionHeading } from "@/components/section";

export const metadata: Metadata = {
  title: "Newsletter Archive",
  description: "Archive of Happy Place Carpentry's homeowner tips, maintenance reminders, and project inspiration.",
  alternates: { canonical: "/newsletter" },
};

export const dynamic = 'force-dynamic';

// Placeholder newsletter data - will be replaced with actual content system
const newsletters = [
  {
    id: 1,
    title: "Spring Maintenance Checklist",
    date: "2024-03-15",
    excerpt: "Essential tasks to prepare your home for spring weather and prevent costly repairs.",
  },
  {
    id: 2,
    title: "Deck Maintenance Guide",
    date: "2024-02-20",
    excerpt: "Keep your deck safe and beautiful with our professional maintenance tips.",
  },
  {
    id: 3,
    title: "Kitchen Remodeling Trends",
    date: "2024-01-10",
    excerpt: "Popular design trends and practical considerations for your kitchen renovation.",
  },
];

export default function NewsletterArchivePage() {
  return (
    <>
      <Section className="bg-deep">
        <Container className="max-w-4xl">
          <SectionHeading
            eyebrow={<span className="text-honey">Newsletter</span>}
            title={<span className="text-text-on-dark">Homeowner Tips & Project Inspiration</span>}
            description={<span className="text-text-on-dark/90">Browse our archive of practical homeowner advice, maintenance reminders, and project showcases.</span>}
          />
        </Container>
      </Section>

      <Section>
        <Container className="max-w-4xl">
          <div className="space-y-6">
            {newsletters.map((newsletter) => (
              <article
                key={newsletter.id}
                className="rounded-lg border border-border-soft bg-surface p-6 transition-shadow hover:shadow-md"
              >
                <div className="mb-3 text-sm text-muted-foreground">
                  {new Date(newsletter.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
                <h3 className="mb-2 text-xl font-bold text-text">{newsletter.title}</h3>
                <p className="text-text-muted">{newsletter.excerpt}</p>
                <div className="mt-4">
                  <button className="text-honey hover:underline font-medium">
                    Read full newsletter →
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-12 rounded-lg bg-surface-muted p-8 text-center">
            <h3 className="text-xl font-bold text-text mb-2">Don't miss future newsletters</h3>
            <p className="text-text-muted mb-4">
              Subscribe to receive homeowner tips, maintenance reminders, and project inspiration directly in your inbox.
            </p>
            <a
              href="/#newsletter"
              className="inline-flex items-center justify-center rounded-lg bg-honey px-6 py-3 font-semibold text-deep transition-colors hover:bg-honey/90"
            >
              Subscribe to Newsletter
            </a>
          </div>
        </Container>
      </Section>
    </>
  );
}

import type { Metadata } from "next";
import { Container, Section, SectionHeading } from "@/components/section";
import { StarRating } from "@/components/star-rating";
import { CTASection } from "@/components/cta-section";
import { reviews, averageRating } from "@/config/reviews";
import { company } from "@/config/company";

export const metadata: Metadata = {
  title: "Reviews",
  description: `What homeowners say about ${company.name}. ${averageRating()} out of 5 from local reviews.`,
  alternates: { canonical: "/reviews" },
};

export default function ReviewsPage() {
  return (
    <>
      <Section className="bg-background">
        <Container>
          <SectionHeading
            eyebrow="Reviews"
            title="Helping neighbors find their happy place"
            align="center"
            description={`${averageRating()} / 5 across ${reviews.length} featured reviews from homeowners across the Willamette Valley.`}
          />

          {/* trust emphasis — license + rating, not just stars */}
          <div className="mx-auto mt-6 flex max-w-2xl flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm">
            <span className="flex items-center gap-2 font-semibold text-primary">
              <StarRating rating={5} /> {averageRating()} / 5 average
            </span>
            <span className="text-text-muted">{company.ccbNumber} · Licensed &amp; Insured</span>
            <span className="text-text-muted">12 years serving Benton, Linn, Marion &amp; Polk</span>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {reviews.map((r, i) => (
              <figure
                key={r.id}
                className="float-card flex flex-col bg-surface p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-float"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex items-center justify-between">
                  <StarRating rating={r.rating} />
                  {r.verified && (
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                      ✓ Verified
                    </span>
                  )}
                </div>
                <h3 className="mt-4 font-display text-xl font-bold text-text">{r.title}</h3>
                <blockquote className="mt-3 flex-1 text-text-muted leading-relaxed">
                  &ldquo;{r.body}&rdquo;
                </blockquote>
                <figcaption className="mt-5 border-t border-border-soft pt-4 text-sm">
                  <span className="font-semibold text-text">{r.author}</span>
                  <span className="text-text-subtle"> · {r.location}</span>
                  {r.source && <span className="mt-1 block text-xs text-text-subtle">via {r.source}</span>}
                </figcaption>
              </figure>
            ))}
          </div>

          <p className="mt-10 text-center text-sm text-text-subtle">
            Reviews shown are a sample of our recent work. Ask us for references in your neighborhood.
          </p>
        </Container>
      </Section>
      <CTASection />
    </>
  );
}

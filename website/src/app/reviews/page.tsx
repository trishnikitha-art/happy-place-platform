import type { Metadata } from "next";
import { Container, Section, SectionHeading } from "@/components/section";
import { StarRating } from "@/components/star-rating";
import { CTASection } from "@/components/cta-section";
import { getReviewStats, type ReviewService } from "@/lib/reviews";
import { getCompany } from "@/lib/company";
import { ReviewsFilterClient } from "@/components/reviews-filter-client";

export const metadata: Metadata = {
  title: "Reviews",
  description: `What homeowners say about Happy Place Carpentry.`,
  alternates: { canonical: "/reviews" },
};

export default function ReviewsPage() {
  const company = getCompany();
  const stats = getReviewStats();
  const hasReviews = stats.total > 0;

  return (
    <>
      <Section className="bg-background">
        <Container>
          <SectionHeading
            eyebrow="Reviews"
            title="Helping neighbors find their happy place"
            align="center"
            description={hasReviews ? `${stats.averageRating} / 5 across ${stats.total} featured reviews from homeowners across the Willamette Valley.` : "Google reviews coming soon. Ask us for references in your neighborhood."}
          />

          {/* trust emphasis — license + rating, not just stars */}
          <div className="mx-auto mt-6 flex max-w-2xl flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm">
            {hasReviews && (
              <span className="flex items-center gap-2 font-semibold text-primary">
                <StarRating rating={5} /> {stats.averageRating} / 5 average
              </span>
            )}
            <span className="text-text-muted">{company.ccbNumber} · Licensed &amp; Insured</span>
            <span className="text-text-muted">Serving Benton, Linn, Marion &amp; Polk since 2024</span>
          </div>

          {hasReviews && <ReviewsFilterClient />}

          {!hasReviews && (
            <div className="mt-10 rounded-lg bg-surface-muted p-8 text-center">
              <p className="text-text-muted">
                We are building our review portfolio. In the meantime, ask us for references in your neighborhood.
              </p>
            </div>
          )}

          <p className="mt-10 text-center text-sm text-text-subtle">
            {hasReviews ? "Reviews shown are a sample of our recent work. Ask us for references in your neighborhood." : "We take pride in our work and would be happy to connect you with past clients."}
          </p>
        </Container>
      </Section>
      <CTASection />
    </>
  );
}

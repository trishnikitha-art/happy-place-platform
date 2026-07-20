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
      <Section className="bg-surface-muted">
        <Container>
          <SectionHeading
            eyebrow="Reviews"
            title="What neighbors say"
            align="center"
            description={`${averageRating()} / 5 across ${reviews.length} featured reviews from homeowners across the Willamette Valley.`}
          />
          <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {reviews.map((r) => (
              <figure key={r.id} className="flex flex-col rounded-2xl border border-border bg-surface p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <StarRating rating={r.rating} />
                  {r.verified && (
                    <span className="text-xs font-semibold text-accent">Verified</span>
                  )}
                </div>
                <h3 className="mt-3 font-bold text-text">{r.title}</h3>
                <blockquote className="mt-2 flex-1 text-text-muted">“{r.body}”</blockquote>
                <figcaption className="mt-4 text-sm text-text-subtle">
                  {r.author} · {r.location}
                  {r.source && <span className="block text-text-subtle">via {r.source}</span>}
                </figcaption>
              </figure>
            ))}
          </div>
        </Container>
      </Section>
      <CTASection />
    </>
  );
}

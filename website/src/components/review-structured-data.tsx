/**
 * Review Structured Data Component
 * 
 * Adds JSON-LD structured data for reviews and aggregate ratings
 * to improve SEO and enable rich snippets in search results.
 * 
 * Schema.org types used:
 * - Review: Individual review
 * - AggregateRating: Overall rating summary
 * - LocalBusiness: Business entity with reviews
 */

import type { Review } from "@/types/reviews";

interface ReviewStructuredDataProps {
  reviews: Review[];
  businessName: string;
  businessUrl: string;
  businessAddress?: {
    streetAddress: string;
    addressLocality: string;
    addressRegion: string;
    postalCode: string;
    addressCountry: string;
  };
}

export function ReviewStructuredData({
  reviews,
  businessName,
  businessUrl,
  businessAddress,
}: ReviewStructuredDataProps) {
  // Filter published reviews only
  const publishedReviews = reviews.filter(r => r.status === "published" || r.status === "featured");
  
  // Calculate aggregate rating
  const totalReviews = publishedReviews.length;
  const averageRating = totalReviews > 0
    ? publishedReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
    : 0;

  // Build structured data
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: businessName,
    url: businessUrl,
    ...(businessAddress && {
      address: {
        "@type": "PostalAddress",
        ...businessAddress,
      },
    }),
    aggregateRating: totalReviews > 0 ? {
      "@type": "AggregateRating",
      ratingValue: averageRating.toFixed(1),
      reviewCount: totalReviews,
      bestRating: "5",
      worstRating: "1",
    } : undefined,
    review: publishedReviews.map(review => ({
      "@type": "Review",
      author: {
        "@type": "Person",
        name: review.reviewer.name,
      },
      reviewRating: {
        "@type": "Rating",
        ratingValue: review.rating,
        bestRating: "5",
        worstRating: "1",
      },
      reviewBody: review.body,
      datePublished: review.date,
      ...(review.title && { name: review.title }),
      ...(review.location?.city && {
        reviewLocation: {
          "@type": "City",
          name: review.location.city,
        },
      }),
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(structuredData, null, 2),
      }}
    />
  );
}

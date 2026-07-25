import { NextRequest, NextResponse } from "next/server";
import type { Review } from "@/types/reviews";
import { ReviewProvider, ReviewStatus } from "@/types/reviews";
import { validateReview } from "@/lib/reviews";
import { createGoogleSheetsReviewSource } from "@/lib/google-sheets";

/**
 * POST /api/reviews — Webhook endpoint for review submissions
 * 
 * Architecture: Google Form → Webhook → Canonical Review → Google Sheets → Website
 * 
 * This endpoint receives review submissions from Google Forms (or other sources),
 * validates them, converts them to the canonical Review type, applies auto-publish logic,
 * and persists them to the operational store (Google Sheets).
 * 
 * The website never knows Google exists - Google is just an adapter.
 */

interface ReviewSubmission {
  name: string;
  email?: string;
  city: string;
  county: string;
  service: string;
  rating: number; // 1-5
  title?: string;
  body: string;
  photoUrl?: string;
  provider?: ReviewProvider;
}

/**
 * Convert submission to canonical Review object with auto-publish logic
 */
function submissionToReview(submission: ReviewSubmission): Review {
  const now = new Date().toISOString();
  const id = `review-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Auto-publish logic: rating >= 4 and has review text
  const autoPublish = submission.rating >= 4 && submission.body.length > 0;
  
  return {
    id,
    provider: submission.provider || ReviewProvider.Form,
    status: autoPublish ? ReviewStatus.Published : ReviewStatus.Submitted,
    featured: false,
    verified: false,
    reviewer: {
      name: submission.name,
      initials: submission.name.split(' ').map(n => n[0]).join(''),
    },
    rating: submission.rating,
    date: now,
    service: submission.service,
    location: {
      city: submission.city,
      county: submission.county,
    },
    title: submission.title,
    body: submission.body,
    syncStatus: "manual",
    highlight: false,
    featuredWeight: 50,
    heroEligible: false,
    homepageEligible: autoPublish, // Auto-eligible for homepage if auto-published
  };
}

/**
 * Validate submission
 */
function validateSubmission(submission: unknown): submission is ReviewSubmission {
  if (!submission || typeof submission !== 'object') return false;
  
  const s = submission as Partial<ReviewSubmission>;
  
  return (
    typeof s.name === 'string' &&
    typeof s.city === 'string' &&
    typeof s.county === 'string' &&
    typeof s.service === 'string' &&
    typeof s.rating === 'number' &&
    s.rating >= 1 && s.rating <= 5 &&
    typeof s.body === 'string' &&
    s.body.length > 0
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate submission
    if (!validateSubmission(body)) {
      return NextResponse.json(
        { ok: false, error: "invalid_submission" },
        { status: 400 }
      );
    }
    
    // Convert to canonical Review with auto-publish logic
    const review = submissionToReview(body);
    
    // Validate canonical Review
    if (!validateReview(review)) {
      return NextResponse.json(
        { ok: false, error: "invalid_review" },
        { status: 400 }
      );
    }
    
    // Persist to Google Sheets operational store
    const sheetsSource = createGoogleSheetsReviewSource();
    await sheetsSource.addReview(review);
    
    return NextResponse.json({
      ok: true,
      review,
      message: "Review received and published successfully",
      autoPublished: review.status === ReviewStatus.Published,
    });
    
  } catch (error) {
    console.error("Review webhook failed", error);
    return NextResponse.json(
      { ok: false, error: "server_error", details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/reviews — Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    status: "operational",
    message: "Review webhook endpoint is ready"
  });
}

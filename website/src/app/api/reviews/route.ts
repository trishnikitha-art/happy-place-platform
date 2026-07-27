import { NextRequest, NextResponse } from "next/server";
import type { Review } from "@/types/reviews";
import { ReviewProvider, ReviewStatus } from "@/types/reviews";
import { validateReview } from "@/lib/reviews";
import { createGoogleSheetsReviewSource } from "@/lib/google-sheets";
import { classifyReviewWithMetadata } from "@/lib/sentiment/classifier";
import { normalizeText } from "@/lib/sentiment/normalizer";
import { extractMetadata } from "@/lib/sentiment/metadata-extractor";
import { calculateQualityScore } from "@/lib/sentiment/quality-scorer";
import { checkForDuplicates } from "@/lib/sentiment/duplicate-detector";
import { suggestTags } from "@/lib/sentiment/tag-suggester";
import { suggestService } from "@/lib/sentiment/service-suggester";
import { suggestProject } from "@/lib/sentiment/project-suggester";
import { suggestCounty } from "@/lib/sentiment/county-suggester";
import { createInitialAuditTrail } from "@/lib/sentiment/audit-trail";
import { getAllReviews } from "@/lib/reviews";

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
 * Convert submission to canonical Review object with full moderation pipeline
 * 
 * Pipeline stages:
 * 1. Normalize text
 * 2. Extract metadata
 * 3. Classify sentiment
 * 4. Calculate quality score
 * 5. Check for duplicates
 * 6. Suggest tags
 * 7. Suggest service
 * 8. Suggest project
 * 9. Suggest county
 * 10. Create audit trail
 */
async function submissionToReview(submission: ReviewSubmission): Promise<Review> {
  const now = new Date().toISOString();
  const id = `review-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Stage 1: Normalize text
  const normalization = normalizeText(submission.body);
  const normalizedText = normalization.normalized;

  // Stage 2: Extract metadata
  const metadata = extractMetadata(normalizedText);

  // Stage 3: Classify sentiment
  const classification = classifyReviewWithMetadata(normalizedText, submission.rating);

  // Stage 4: Calculate quality score
  const qualityScore = calculateQualityScore(normalizedText);

  // Stage 5: Check for duplicates
  const existingReviews = await getAllReviews();
  const duplicateCheck = checkForDuplicates(
    {
      email: submission.email,
      phone: undefined, // Not collected in current form
      text: normalizedText,
      ip: undefined, // Not collected in current form
      googleReviewId: undefined,
    },
    existingReviews
  );

  // Stage 6: Suggest tags
  const tagSuggestions = suggestTags(normalizedText);

  // Stage 7: Suggest service
  const serviceSuggestion = suggestService(normalizedText);

  // Stage 8: Suggest project
  const projectSuggestion = suggestProject(normalizedText, serviceSuggestion.suggestedService?.serviceSlug);

  // Stage 9: Suggest county
  const countySuggestion = suggestCounty(normalizedText);

  // Stage 10: Create audit trail
  const auditTrail = createInitialAuditTrail(
    id,
    submission.name,
    normalization,
    classification,
    qualityScore,
    duplicateCheck,
    tagSuggestions.suggestedTags,
    serviceSuggestion.suggestedService,
    projectSuggestion.suggestedProject,
    countySuggestion.suggestedCounty
  );

  // All reviews start as Pending for human review
  // The sentiment classifier only recommends the bucket, never auto-publishes
  const status = ReviewStatus.Pending;

  return {
    id,
    provider: submission.provider || ReviewProvider.Form,
    status,
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
    homepageEligible: false, // Not auto-eligible until human approval
    submittedAt: now,
    // Sentiment classification metadata
    sentiment: classification.sentiment,
    bucket: classification.bucket,
    confidence: classification.confidence,
    classifiers: classification.classifiers,
    // Additional moderation metadata
    normalizedBody: normalizedText,
    qualityScore: qualityScore.score,
    qualityFactors: qualityScore.factors,
    isDuplicate: duplicateCheck.isDuplicate,
    duplicateType: duplicateCheck.duplicateType,
    duplicateMatchId: duplicateCheck.matchedReviewId,
    suggestedTags: tagSuggestions.suggestedTags.map(t => t.tag),
    suggestedService: serviceSuggestion.suggestedService?.serviceSlug,
    suggestedProject: projectSuggestion.suggestedProject?.projectId,
    suggestedCounty: countySuggestion.suggestedCounty?.county,
    // Audit trail (stored as metadata for now, will be persisted separately in production)
    auditTrail: auditTrail.events,
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
  console.log("=== POST /api/reviews: ENTRY ===");
  
  try {
    console.log("=== STAGE: PARSING REQUEST BODY ===");
    const body = await request.json();
    console.log("Request body received:", JSON.stringify(body, null, 2));

    // Validate submission
    console.log("=== STAGE: VALIDATION ===");
    if (!validateSubmission(body)) {
      console.log("❌ VALIDATION FAILED");
      console.log("Validation errors:");
      console.log("  name present:", typeof body.name === 'string');
      console.log("  city present:", typeof body.city === 'string');
      console.log("  county present:", typeof body.county === 'string');
      console.log("  service present:", typeof body.service === 'string');
      console.log("  rating present:", typeof body.rating === 'number');
      console.log("  rating valid:", body.rating >= 1 && body.rating <= 5);
      console.log("  body present:", typeof body.body === 'string');
      console.log("  body length:", body.body?.length || 0);
      
      return NextResponse.json(
        { ok: false, error: "invalid_submission", details: "Validation failed. Required fields: name, city, county, service, rating (1-5), body" },
        { status: 400 }
      );
    }
    console.log("✅ VALIDATION PASSED");

    // Convert to canonical Review with full moderation pipeline
    console.log("=== STAGE: MODERATION PIPELINE ===");
    const review = await submissionToReview(body);
    console.log("✅ MODERATION PIPELINE COMPLETE");
    console.log("Review ID:", review.id);
    console.log("Review status:", review.status);

    // Validate canonical Review
    console.log("=== STAGE: REVIEW VALIDATION ===");
    if (!validateReview(review)) {
      console.log("❌ REVIEW VALIDATION FAILED");
      return NextResponse.json(
        { ok: false, error: "invalid_review" },
        { status: 400 }
      );
    }
    console.log("✅ REVIEW VALIDATION PASSED");

    // Persist to Google Sheets operational store
    console.log("=== STAGE: GOOGLE SHEETS PERSISTENCE ===");
    const sheetsSource = createGoogleSheetsReviewSource();
    console.log("Google Sheets adapter created");
    const sheetsResult = await sheetsSource.addReview(review);
    console.log("✅ GOOGLE SHEETS PERSISTENCE COMPLETE");
    console.log("Sheets result:", JSON.stringify(sheetsResult, null, 2));

    console.log("=== STAGE: RETURNING SUCCESS RESPONSE ===");
    const response = NextResponse.json({
      ok: true,
      review,
      message: "Review received and processed through moderation pipeline",
      bucket: review.bucket,
      confidence: review.confidence,
      qualityScore: review.qualityScore,
      isDuplicate: review.isDuplicate,
      suggestedTags: review.suggestedTags,
      suggestedService: review.suggestedService,
      suggestedProject: review.suggestedProject,
      suggestedCounty: review.suggestedCounty,
      sheetsPersisted: sheetsResult.success,
      sheetsError: sheetsResult.error,
      sheetsDetails: sheetsResult.details,
    });
    
    console.log("=== POST /api/reviews: SUCCESS ===");
    return response;

  } catch (error: any) {
    console.log("=== POST /api/reviews: ERROR ===");
    console.error("Review webhook failed", error);
    console.log("Error type:", error.constructor.name);
    console.log("Error message:", error.message);
    console.log("Error stack:", error.stack);
    
    return NextResponse.json(
      { ok: false, error: "server_error", details: String(error), stack: error.stack },
      { status: 500 }
    );
  }
}

/**
 * GET /api/reviews — Health check and configuration diagnostic endpoint
 */
export async function GET() {
  const config = {
    googleSheetsConfigured: !!process.env.GOOGLE_REVIEWS_SHEET_ID,
    googleSheetsId: process.env.GOOGLE_REVIEWS_SHEET_ID ? `${process.env.GOOGLE_REVIEWS_SHEET_ID.substring(0, 8)}...` : 'missing',
    googleClientId: !!process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    googleRefreshToken: !!process.env.GOOGLE_REFRESH_TOKEN,
    googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || 'default (localhost)',
    environment: process.env.NODE_ENV || 'unknown',
    vercelEnv: process.env.VERCEL_ENV || 'not on Vercel',
  };

  // Test Google Sheets adapter initialization
  let sheetsTest = { initialized: false, error: null };
  try {
    const source = createGoogleSheetsReviewSource();
    sheetsTest = { initialized: !!source, error: null };
  } catch (error: any) {
    sheetsTest = { initialized: false, error: error.message };
  }

  return NextResponse.json({
    ok: true,
    status: "operational",
    message: "Review webhook endpoint is ready",
    config,
    sheetsTest,
  });
}

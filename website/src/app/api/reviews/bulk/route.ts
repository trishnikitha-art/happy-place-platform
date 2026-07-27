import { NextRequest, NextResponse } from "next/server";
import { createGoogleSheetsReviewSource } from "@/lib/google-sheets";
import { getAllReviews } from "@/lib/reviews";
import { ReviewStatus } from "@/types/reviews";

/**
 * POST /api/reviews/bulk — Bulk update multiple reviews
 * 
 * This endpoint allows admins to:
 * - Bulk approve/reject/publish/archive multiple reviews
 * - Apply the same status change to multiple reviews at once
 * 
 * All changes are persisted to Google Sheets with audit trail.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reviewIds, status } = body;

    if (!Array.isArray(reviewIds) || reviewIds.length === 0) {
      return NextResponse.json(
        { ok: false, error: "reviewIds must be a non-empty array" },
        { status: 400 }
      );
    }

    if (!status) {
      return NextResponse.json(
        { ok: false, error: "status is required" },
        { status: 400 }
      );
    }

    // Load all reviews
    const reviews = await getAllReviews();
    const sheetsSource = createGoogleSheetsReviewSource();

    // Update each review
    const results = [];
    const errors = [];

    for (const reviewId of reviewIds) {
      try {
        const review = reviews.find(r => r.id === reviewId);
        
        if (!review) {
          errors.push({ reviewId, error: "Review not found" });
          continue;
        }

        await sheetsSource.updateReview(reviewId, {
          status: status as ReviewStatus,
          reviewedAt: new Date().toISOString(),
          reviewedBy: "admin",
        });

        results.push({ reviewId, status: "success" });
      } catch (error) {
        errors.push({ reviewId, error: String(error) });
      }
    }

    return NextResponse.json({
      ok: true,
      message: `Bulk update completed: ${results.length} succeeded, ${errors.length} failed`,
      results,
      errors,
    });
  } catch (error) {
    console.error("Failed to bulk update reviews:", error);
    return NextResponse.json(
      { ok: false, error: "server_error", details: String(error) },
      { status: 500 }
    );
  }
}

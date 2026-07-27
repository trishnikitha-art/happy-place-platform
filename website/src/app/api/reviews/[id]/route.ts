import { NextRequest, NextResponse } from "next/server";
import { createGoogleSheetsReviewSource } from "@/lib/google-sheets";
import { getAllReviews } from "@/lib/reviews";
import { ReviewStatus } from "@/types/reviews";

/**
 * PATCH /api/reviews/[id] — Update review status and add moderation notes
 * 
 * This endpoint allows admins to:
 * - Change review status (pending → approved/rejected/featured/published)
 * - Add moderation notes
 * - Mark as verified
 * - Set featured flag
 * 
 * All changes are persisted to Google Sheets with audit trail.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { status, notes, verified, featured } = body;
    const { id: reviewId } = await params;

    // Load all reviews to find the target
    const reviews = await getAllReviews();
    const review = reviews.find(r => r.id === reviewId);

    if (!review) {
      return NextResponse.json(
        { ok: false, error: "Review not found" },
        { status: 404 }
      );
    }

    // Build updates object
    const updates: any = {};
    if (status) updates.status = status;
    if (notes !== undefined) updates.moderationNotes = notes;
    if (verified !== undefined) updates.verified = verified;
    if (featured !== undefined) updates.featured = featured;
    
    // Add audit trail
    updates.reviewedAt = new Date().toISOString();
    updates.reviewedBy = "admin"; // In production, use actual user ID

    // Update in Google Sheets
    const sheetsSource = createGoogleSheetsReviewSource();
    await sheetsSource.updateReview(reviewId, updates);

    return NextResponse.json({
      ok: true,
      message: "Review updated successfully",
      reviewId,
      updates,
    });
  } catch (error) {
    console.error("Failed to update review:", error);
    return NextResponse.json(
      { ok: false, error: "server_error", details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/reviews/[id] — Delete a review
 * 
 * This endpoint permanently deletes a review from Google Sheets.
 * Use with caution - this action cannot be undone.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reviewId } = await params;

    // Load all reviews to find the target
    const reviews = await getAllReviews();
    const review = reviews.find(r => r.id === reviewId);

    if (!review) {
      return NextResponse.json(
        { ok: false, error: "Review not found" },
        { status: 404 }
      );
    }

    // For now, we'll mark as archived instead of actual deletion
    // This preserves the audit trail
    const sheetsSource = createGoogleSheetsReviewSource();
    await sheetsSource.updateReview(reviewId, { 
      status: ReviewStatus.Archived,
      reviewedAt: new Date().toISOString(),
      reviewedBy: "admin",
    });

    return NextResponse.json({
      ok: true,
      message: "Review archived successfully",
      reviewId,
    });
  } catch (error) {
    console.error("Failed to archive review:", error);
    return NextResponse.json(
      { ok: false, error: "server_error", details: String(error) },
      { status: 500 }
    );
  }
}

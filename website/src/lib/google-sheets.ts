/**
 * Google Sheets Provider - Operational Store Adapter
 * 
 * Architecture: Google Sheets → ReviewSource → ReviewAuthority → Website
 * 
 * This provider implements read/write operations for Google Sheets,
 * which serves as the operational store for reviews.
 * 
 * The website never knows Google exists - Google Sheets is just an adapter.
 */

import { google } from "googleapis";
import { getGoogleAuth } from "./google";
import type { Review } from "@/types/reviews";
import type { ReviewSource } from "../../internal/reviews/reviewAuthority";

const SHEET_ID = process.env.GOOGLE_REVIEWS_SHEET_ID;
const SHEET_NAME = "Reviews";

/**
 * Google Sheets Review Source Adapter
 */
export class GoogleSheetsReviewSource implements ReviewSource {
  private auth: any;
  private sheets: any;

  constructor() {
    if (!SHEET_ID) {
      console.warn("GOOGLE_REVIEWS_SHEET_ID not configured, Google Sheets provider will be disabled");
    }
    
    this.auth = getGoogleAuth();
    this.sheets = google.sheets({ version: "v4", auth: this.auth });
  }

  /**
   * Pull published reviews from Google Sheets
   */
  async listPublished(): Promise<Review[]> {
    if (!SHEET_ID) {
      console.warn("Google Sheets not configured, returning empty reviews");
      return [];
    }

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `${SHEET_NAME}!A:Z`,
      });

      const rows = response.data.values;
      if (!rows || rows.length <= 1) {
        return []; // No data or header only
      }

      // Skip header row, convert to Review objects
      const reviews: Review[] = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const review = this.rowToReview(row);
        if (review && (review.status === "published" || review.status === "featured")) {
          reviews.push(review);
        }
      }

      return reviews;
    } catch (error) {
      console.error("Failed to read reviews from Google Sheets:", error);
      return [];
    }
  }

  /**
   * Add a review to Google Sheets
   */
  async addReview(review: Review): Promise<void> {
    if (!SHEET_ID) {
      console.warn("Google Sheets not configured (GOOGLE_REVIEWS_SHEET_ID missing). Review will be accepted but not persisted to Google Sheets.");
      // Don't throw - allow submission to succeed even without Sheets
      return;
    }

    try {
      const row = this.reviewToRow(review);
      
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: `${SHEET_NAME}!A:Z`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [row],
        },
      });

      console.log("Review added to Google Sheets:", review.id);
    } catch (error) {
      console.error("Failed to add review to Google Sheets:", error);
      // Don't throw - allow submission to succeed even if Sheets fails
      console.warn("Review submission accepted but not persisted to Google Sheets due to error");
    }
  }

  /**
   * Update a review in Google Sheets
   */
  async updateReview(reviewId: string, updates: Partial<Review>): Promise<void> {
    if (!SHEET_ID) {
      console.warn("Google Sheets not configured, cannot update review");
      return;
    }

    try {
      // First, find the row with this review ID
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `${SHEET_NAME}!A:Z`,
      });

      const rows = response.data.values;
      if (!rows || rows.length <= 1) {
        throw new Error("No reviews found in sheet");
      }

      // Find row index (skip header)
      let rowIndex = -1;
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === reviewId) {
          rowIndex = i;
          break;
        }
      }

      if (rowIndex === -1) {
        throw new Error(`Review ${reviewId} not found`);
      }

      // Update the row
      const existingReview = this.rowToReview(rows[rowIndex]);
      if (!existingReview) {
        throw new Error(`Failed to parse review ${reviewId}`);
      }
      const updatedReview: Review = { ...existingReview, ...updates };
      const row = this.reviewToRow(updatedReview);

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `${SHEET_NAME}!A${rowIndex + 1}:Z${rowIndex + 1}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [row],
        },
      });

      console.log("Review updated in Google Sheets:", reviewId);
    } catch (error) {
      console.error("Failed to update review in Google Sheets:", error);
      throw error;
    }
  }

  /**
   * Convert a Google Sheets row to a Review object
   */
  private rowToReview(row: any[]): Review | null {
    try {
      // Expected column order (must match Google Sheet structure):
      // 0: id, 1: provider, 2: status, 3: featured, 4: verified,
      // 5: reviewerName, 6: reviewerInitials, 7: rating, 8: date,
      // 9: service, 10: projectId, 11: city, 12: county,
      // 13: title, 14: body, 15: ownerResponseAuthor, 16: ownerResponseBody,
      // 17: ownerResponseDate, 18: googleReviewId, 19: syncStatus,
      // 20: importedAt, 21: lastSynced, 22: originalUrl,
      // 23: highlight, 24: featuredWeight, 25: heroEligible, 26: homepageEligible

      return {
        id: row[0],
        provider: row[1],
        status: row[2],
        featured: row[3] === "TRUE",
        verified: row[4] === "TRUE",
        reviewer: {
          name: row[5],
          initials: row[6],
        },
        rating: Number(row[7]),
        date: row[8],
        service: row[9],
        projectId: row[10] || undefined,
        location: row[11] ? {
          city: row[11],
          county: row[12],
        } : undefined,
        title: row[13] || undefined,
        body: row[14],
        ownerResponse: row[15] ? {
          author: row[15],
          body: row[16],
          date: row[17] || undefined,
        } : undefined,
        googleReviewId: row[18] || undefined,
        syncStatus: row[19] || undefined,
        importedAt: row[20] || undefined,
        lastSynced: row[21] || undefined,
        originalUrl: row[22] || null,
        highlight: row[23] === "TRUE",
        featuredWeight: Number(row[24]) || 50,
        heroEligible: row[25] === "TRUE",
        homepageEligible: row[26] === "TRUE",
      };
    } catch (error) {
      console.error("Failed to convert row to Review:", error);
      return null;
    }
  }

  /**
   * Convert a Review object to a Google Sheets row
   */
  private reviewToRow(review: Review): any[] {
    return [
      review.id,
      review.provider,
      review.status,
      review.featured ? "TRUE" : "FALSE",
      review.verified ? "TRUE" : "FALSE",
      review.reviewer.name,
      review.reviewer.initials || "",
      review.rating,
      review.date,
      review.service,
      review.projectId || "",
      review.location?.city || "",
      review.location?.county || "",
      review.title || "",
      review.body,
      review.ownerResponse?.author || "",
      review.ownerResponse?.body || "",
      review.ownerResponse?.date || "",
      review.googleReviewId || "",
      review.syncStatus || "",
      review.importedAt || "",
      review.lastSynced || "",
      review.originalUrl || "",
      review.highlight ? "TRUE" : "FALSE",
      review.featuredWeight || 50,
      review.heroEligible ? "TRUE" : "FALSE",
      review.homepageEligible ? "TRUE" : "FALSE",
    ];
  }
}

/**
 * Create a Google Sheets review source instance
 */
export function createGoogleSheetsReviewSource(): GoogleSheetsReviewSource {
  return new GoogleSheetsReviewSource();
}

# Review Infrastructure Documentation

**Date:** 2026-07-26  
**Status:** Complete (pending Google Sheets configuration)  
**Version:** 1.0

---

## Architecture Overview

```
Customer submits review
  ↓
POST /api/reviews (native form)
  ↓
Validation (name, city, county, service, rating, body)
  ↓
10-Stage Moderation Pipeline:
  1. Normalize text
  2. Extract metadata
  3. Classify sentiment
  4. Calculate quality score
  5. Check for duplicates
  6. Suggest tags
  7. Suggest service
  8. Suggest project
  9. Suggest county
  10. Create audit trail
  ↓
Google Sheets (operational backend)
  ↓
Review marked as Pending
  ↓
Admin moderation (/admin/reviews)
  ↓
Approved/Published reviews appear on website
  ↓
Structured data (JSON-LD) for SEO
```

---

## Google Assets Used

### Google Cloud Project
- **Project ID:** `citric-trees-502922-r3`
- **Project Number:** `680489127233`
- **Account:** piging90 (primary)

### OAuth Credentials
- **Type:** OAuth 2.0 Authorization Code + Refresh Token
- **Required Environment Variables:**
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `GOOGLE_REFRESH_TOKEN`
  - `GOOGLE_REDIRECT_URI`
  - `GOOGLE_REVIEWS_SHEET_ID` (to be configured)

### Google Sheets
- **Status:** Not yet created (requires manual setup)
- **Setup Script:** `scripts/setup-reviews-sheet-apps-script.gs`
- **Sheet Name:** "Reviews"
- **Columns:** 27 (matching Review model)

### Google Drive
- **Mount Point:** `H:\My Drive\`
- **Status:** No Review spreadsheet found
- **Action Required:** Create new spreadsheet

---

## Environment Variables

### Required for Review System
```bash
# Google OAuth (existing)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REFRESH_TOKEN=your_refresh_token
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# Google Sheets (new - to be configured)
GOOGLE_REVIEWS_SHEET_ID=your_spreadsheet_id
```

### Scopes Required
```typescript
export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/contacts",
  "https://www.googleapis.com/auth/spreadsheets", // Added for reviews
];
```

---

## API Endpoints

### POST /api/reviews
**Purpose:** Submit a new review  
**Request:**
```json
{
  "name": "Jane Smith",
  "city": "Corvallis",
  "county": "Unknown",
  "service": "deck",
  "rating": 5,
  "body": "Great work on our deck!",
  "provider": "form"
}
```
**Response:**
```json
{
  "ok": true,
  "review": { ... },
  "bucket": "positive",
  "confidence": 0.95,
  "qualityScore": 85,
  "isDuplicate": false,
  "suggestedTags": ["professional", "quality"],
  "suggestedService": "deck",
  "suggestedProject": null,
  "suggestedCounty": "benton"
}
```

### GET /api/reviews
**Purpose:** Health check endpoint  
**Response:** `{ "ok": true, "status": "operational" }`

### PATCH /api/reviews/[id]
**Purpose:** Update review status and add moderation notes  
**Request:**
```json
{
  "status": "approved",
  "notes": "Great review, approved for publication",
  "verified": true,
  "featured": false
}
```

### DELETE /api/reviews/[id]
**Purpose:** Archive a review (soft delete)  
**Response:** `{ "ok": true, "message": "Review archived successfully" }`

### POST /api/reviews/bulk
**Purpose:** Bulk update multiple reviews  
**Request:**
```json
{
  "reviewIds": ["review-1", "review-2"],
  "status": "approved"
}
```

---

## Admin Dashboard

### Location
`/admin/reviews`

### Features
- **Filter by status:** All, Pending, Approved, Rejected, Published
- **Review details:** View full review with AI moderation analysis
- **Actions:** Approve, Reject, Feature, Publish
- **Moderation notes:** Add notes for each review
- **Bulk operations:** Approve/reject multiple reviews at once
- **AI insights:** View sentiment, quality score, duplicate detection, suggested tags

### Review Statuses
- `submitted`: Initial submission
- `pending`: Awaiting moderation
- `approved`: Approved but not yet published
- `rejected`: Rejected by moderator
- `published`: Visible on website
- `featured`: Highlighted on homepage
- `archived`: Soft-deleted (preserves audit trail)

---

## Moderation Pipeline

### Stage 1: Normalization
- Removes extra whitespace
- Normalizes punctuation
- Handles emoji and Unicode
- Standardizes capitalization

### Stage 2: Metadata Extraction
- Detects employee mentions
- Identifies services mentioned
- Extracts project references
- Detects contact requests
- Identifies profanity/spam patterns

### Stage 3: Sentiment Classification
- VADER lexicon-based classifier
- Categories: positive, neutral, negative
- Moderation bucket: positive, review
- Confidence score: 0.00-1.00

### Stage 4: Quality Scoring
- Score: 0-100
- Factors: length, specificity, project mentions, materials mentions, crew mentions, communication, timeline, craftsmanship

### Stage 5: Duplicate Detection
- Checks by email, phone, text similarity, IP, Google review ID
- Flags potential duplicates for manual review

### Stage 6: Tag Suggestions
- Suggests relevant tags based on content
- Examples: "professional", "quality", "timely"

### Stage 7: Service Suggestion
- Infers service type from review text
- Returns service slug (e.g., "deck", "pergola")

### Stage 8: Project Suggestion
- Suggests related project ID
- Based on service and content analysis

### Stage 9: County Suggestion
- Infers county from location mentions
- Returns county slug (e.g., "benton")

### Stage 10: Audit Trail
- Records all moderation decisions
- Timestamps each action
- Tracks moderator identity
- Preserves decision rationale

---

## Structured Data (SEO)

### Component
`<ReviewStructuredData />`

### Schema.org Types
- `LocalBusiness`: Business entity with reviews
- `Review`: Individual review
- `AggregateRating`: Overall rating summary

### Usage
```tsx
<ReviewStructuredData
  reviews={publishedReviews}
  businessName="Happy Place Carpentry"
  businessUrl="https://happyplacecarpentry.com"
  businessAddress={{
    streetAddress: "123 Main St",
    addressLocality: "Corvallis",
    addressRegion: "OR",
    postalCode: "97333",
    addressCountry: "US"
  }}
/>
```

### Benefits
- Rich snippets in search results
- Star ratings in Google search
- Improved local SEO
- Enhanced click-through rates

---

## Security Notes

### Credential Storage
- **Never commit** `.env.local` to git
- **Use Vercel environment variables** for production
- **Rotate credentials** if compromised
- **Use least privilege** OAuth scopes

### OAuth Flow
- Authorization Code flow with refresh token
- Refresh token stored server-side only
- Browser never sees tokens
- Tokens encrypted in production

### Google Sheets Access
- Service account or OAuth client must have edit access
- Sheet should be shared with the OAuth client email
- Protect header row to prevent accidental edits
- Use data validation for critical columns

---

## Recovery Procedure

### If Google Sheets is unavailable
- The system gracefully degrades
- Reviews are accepted but not persisted
- Warnings logged to console
- No user-facing errors

### If OAuth credentials expire
- Re-authorize via `/api/auth/google`
- Update `GOOGLE_REFRESH_TOKEN`
- Restart application

### If spreadsheet is deleted
- Create new spreadsheet using setup script
- Update `GOOGLE_REVIEWS_SHEET_ID`
- Existing reviews in database remain
- New reviews will flow to new sheet

### If moderation pipeline fails
- Reviews still accepted
- Stored with minimal processing
- Can be re-processed later
- No data loss

---

## Setup Instructions

### Step 1: Create Google Sheet
1. Go to https://sheets.google.com
2. Create new spreadsheet
3. Go to Extensions → Apps Script
4. Copy `scripts/setup-reviews-sheet-apps-script.gs`
5. Paste into Apps Script editor
6. Run `setupReviewsSheet`
7. Authorize when prompted
8. Copy spreadsheet ID from URL

### Step 2: Configure Environment Variables
Add to `.env.local`:
```bash
GOOGLE_REVIEWS_SHEET_ID=your_spreadsheet_id
```

Add to Vercel (production):
```bash
GOOGLE_REVIEWS_SHEET_ID=your_spreadsheet_id
```

### Step 3: Verify OAuth Scopes
Ensure your OAuth client has:
- `https://www.googleapis.com/auth/spreadsheets`

### Step 4: Test Submission
1. Navigate to `/review`
2. Submit a test review
3. Check Google Sheet for new row
4. Verify status is "pending"
5. Navigate to `/admin/reviews`
6. Approve the review
7. Verify it appears on website

---

## Troubleshooting

### "server_error" on submission
- Check `GOOGLE_REVIEWS_SHEET_ID` is configured
- Verify OAuth credentials are valid
- Ensure spreadsheet scope is enabled
- Check browser console for detailed error

### Reviews not appearing in Sheet
- Verify spreadsheet ID is correct
- Check OAuth client has edit access
- Ensure sheet is named "Reviews"
- Verify headers match expected structure

### Admin dashboard shows no reviews
- Check Google Sheets is configured
- Verify reviews exist in sheet
- Ensure status filtering is set to "all"
- Check browser console for errors

### Structured data not appearing
- Verify component is imported
- Check reviews are published status
- Use Google Rich Results Test to validate
- Check page source for JSON-LD

---

## Future Enhancements

### Phase 14: Service-Specific Reviews
- Filter reviews by service type
- Display on service landing pages
- Service-specific aggregate ratings

### Phase 15: County-Specific Reviews
- Filter reviews by county
- Display on county pages
- County-specific aggregate ratings

### Phase 16: Project-Linked Reviews
- Link reviews to specific projects
- Display on project pages
- Before/after photo integration

### Phase 17: Google Business Profile Sync
- Sync published reviews to Google
- Two-way sync with Google reviews
- Aggregate rating consistency

---

## Support

For issues or questions:
1. Check this documentation
2. Review API endpoint responses
3. Check browser console for errors
4. Verify environment variables
5. Check Google Sheets access

---

## Version History

- **v1.0** (2026-07-26): Initial review infrastructure
  - Native review form
  - 10-stage moderation pipeline
  - Admin dashboard
  - Google Sheets integration
  - Structured data support

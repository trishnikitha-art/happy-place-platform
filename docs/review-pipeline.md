# Review Pipeline Architecture

## Objective

Replace fake reviews with a real operational pipeline that automatically syncs customer reviews from Google Business Profile to the website. One source of truth, zero duplication.

## Architecture

```
Project Complete
    ↓
Wait 3-5 Days (Cool-off Period)
    ↓
Send Thank-You Email
    ↓
Internal Satisfaction Check
    ↓
If Positive
    ↓
Google Review Link
    ↓
Customer Submits Review
    ↓
Google Business Profile
    ↓
Sync (Webhook / Scheduled)
    ↓
Google Sheets (Reviews Sheet)
    ↓
Review Authority (Single Source of Truth)
    ↓
Homepage (Top 3)
    ↓
Reviews Page (All)
    ↓
Aggregate Rating
    ↓
Structured Data (SEO)
    ↓
Estimate Emails (Social Proof)
```

## Current State

- **Fake Reviews**: Static reviews in `src/config/reviews.ts`
- **Duplication Risk**: Manual copying between Google and website
- **No Automation**: Manual process required
- **No Learning**: No feedback loop for improvement

## Future State

- **Real Reviews**: Customer-submitted reviews from Google Business Profile
- **Single Source of Truth**: Review Authority manages all reviews
- **Automation**: Automatic sync from Google to website
- **Learning**: Feedback loop for operational improvement

## Pipeline Stages

### Stage 1: Project Complete
- **Trigger**: Project marked as complete in Google Sheets
- **Action**: Start review pipeline timer
- **Data**: Customer email, project type, completion date

### Stage 2: Wait 3-5 Days
- **Purpose**: Cool-off period for customer to experience work
- **Duration**: Configurable (default: 5 days)
- **Action**: Timer in Google Sheets or scheduled job

### Stage 3: Send Thank-You Email
- **Template**: Personalized thank-you message
- **Content**:
  - Project completion confirmation
  - Appreciation for business
  - Request for feedback
- **Channel**: Gmail via Google Workspace API
- **Automation**: Google Apps Script or external service

### Stage 4: Internal Satisfaction Check
- **Trigger**: Customer responds to thank-you email
- **Question**: "How did we do?" (1-5 scale)
- **Threshold**: 4+ stars = proceed to Google review request
- **Fallback**: If < 4 stars, internal follow-up instead of public review

### Stage 5: Google Review Link
- **Trigger**: Positive internal satisfaction check
- **Action**: Send Google Business Profile review link
- **Template**:
  ```
  Hi [Customer Name],
  
  We're so glad you had a positive experience! Would you mind sharing your feedback on Google? It helps other homeowners find us.
  
  [Google Review Link]
  
  Thanks again,
  Taylor & Lanie
  Happy Place Carpentry
  ```

### Stage 6: Customer Submits Review
- **Platform**: Google Business Profile
- **Action**: Customer writes review on Google
- **Data**: Rating, text, date, customer name (optional)

### Stage 7: Google Business Profile
- **Platform**: Google My Business API
- **Trigger**: New review submitted
- **Action**: Webhook or scheduled sync

### Stage 8: Sync to Google Sheets
- **Sheet**: "Reviews" sheet in operational database
- **Schema**:
  - `review_id`: Google review ID
  - `customer_name`: Customer name (if provided)
  - `rating`: 1-5 stars
  - `review_text`: Review content
  - `review_date`: ISO date string
  - `project_id`: Associated project (if known)
  - `service_type`: Service category
  - `county`: County
  - `status`: `published`, `flagged`, `archived`
  - `response`: Business response (if any)
  - `response_date`: Response date
  - `provenance`: `google-business-profile`
  - `last_sync`: Last sync timestamp
- **Automation**: Google Apps Script or external API sync

### Stage 9: Review Authority (Single Source of Truth)
- **Component**: `internal/reviews/reviewAuthority.ts`
- **Responsibility**:
  - Fetch reviews from Google Sheets
  - Filter by status (`published` only)
  - Aggregate ratings
  - Provide to frontend components
  - Eliminate duplication
- **Methods**:
  - `getForHomepage(limit)`: Top N reviews for homepage
  - `getAll()`: All published reviews
  - `getAggregate()`: Average rating, total count, distribution
  - `getByService(service)`: Reviews by service type
  - `getByCounty(county)`: Reviews by county

### Stage 10: Homepage (Top 3)
- **Component**: `src/app/page.tsx`
- **Display**: Top 3 reviews by rating + recency
- **Source**: Review Authority
- **Update**: Automatic on Google Sheets sync

### Stage 11: Reviews Page (All)
- **Component**: `src/app/reviews/page.tsx`
- **Display**: All published reviews
- **Filtering**: By service, county, rating
- **Sorting**: Rating, date, relevance
- **Source**: Review Authority
- **Update**: Automatic on Google Sheets sync

### Stage 12: Aggregate Rating
- **Component**: `src/lib/reviews.ts`
- **Calculation**: Average of all published reviews
- **Display**: Star rating + "X reviews"
- **Locations**: Homepage, estimate page, footer
- **Update**: Automatic on Google Sheets sync

### Stage 13: Structured Data (SEO)
- **Component**: `src/app/layout.tsx` (JSON-LD)
- **Schema**: `AggregateRating` schema
- **Data**: From Review Authority
- **Update**: Automatic on Google Sheets sync
- **SEO Benefit**: Rich snippets in Google search results

### Stage 14: Estimate Emails (Social Proof)
- **Component**: Estimate email templates
- **Content**: Include recent reviews in estimate confirmation emails
- **Source**: Review Authority
- **Update**: Automatic on Google Sheets sync
- **Purpose**: Build trust during estimate process

## Implementation Plan

### Phase 1: Google Sheets Integration (Week 1-2)
- [ ] Create "Reviews" sheet in operational database
- [ ] Define schema and validation rules
- [ ] Implement Google Apps Script sync from Google Business Profile
- [ ] Test sync with sample reviews

### Phase 2: Review Authority (Week 2-3)
- [ ] Implement Review Authority class
- [ ] Connect to Google Sheets as data source
- [ ] Implement filtering and aggregation
- [ ] Add error handling and fallbacks

### Phase 3: Frontend Integration (Week 3-4)
- [ ] Update homepage to use Review Authority
- [ ] Update reviews page to use Review Authority
- [ ] Update aggregate rating display
- [ ] Add structured data generation
- [ ] Update estimate email templates

### Phase 4: Email Automation (Week 4-5)
- [ ] Implement thank-you email automation
- [ ] Implement internal satisfaction check
- [ ] Implement Google review link email
- [ ] Test email flow with sample project

### Phase 5: Testing & Refinement (Week 5-6)
- [ ] End-to-end testing with real project
- [ ] Monitor sync performance
- [ ] Refine timing and templates
- [ ] Add monitoring and alerts

## Technology Stack

- **Google Business Profile API**: For review sync
- **Google Sheets API**: For operational database
- **Google Apps Script**: For automation
- **Google Workspace API**: For email automation
- **Review Authority**: TypeScript class for review management
- **JSON-LD**: For structured data
- **Email Templates**: Gmail API or SendGrid

## Error Handling

- **Sync Failure**: Retry 3x, then log to audit trail
- **Missing Review ID**: Log warning, skip review
- **Invalid Rating**: Log warning, skip review
- **Duplicate Review**: Skip duplicate, log to audit trail
- **Email Failure**: Retry 3x, then log to audit trail
- **Review Authority Failure**: Fallback to static reviews, log error

## Monitoring

- **Sync Success Rate**: Track Google Business Profile sync success
- **Review Volume**: Track number of new reviews per week
- **Average Rating**: Track average rating over time
- **Response Rate**: Track customer response rate to review requests
- **Email Delivery**: Track email delivery and open rates

## Rollback Plan

- **Static Reviews**: Fallback to static reviews in `src/config/reviews.ts`
- **Manual Sync**: Manual sync from Google Business Profile if automation fails
- **Email Override**: Manual email sending if automation fails
- **Audit Log**: Log all sync operations for troubleshooting

## Security

- **API Credentials**: Stored in environment variables
- **OAuth**: Google OAuth 2.0 with service account
- **Rate Limiting**: Respect Google API rate limits
- **Data Privacy**: Customer data handled per privacy policy
- **Access Control**: Limited access to review management

## Privacy Considerations

- **Customer Names**: Only display if customer opts in
- **Review Content**: Customer owns their review content
- **Data Retention**: Retain reviews per Google Business Profile policy
- **Right to Delete**: Support review deletion requests

## Future Enhancements

- **Review Response Automation**: Automatic response to reviews
- **Review Analysis**: Sentiment analysis for operational insights
- **Referral Tracking**: Track referrals from reviews
- **Review Incentives**: (Careful with Google policies) Non-monetary incentives
- **Review Highlighting**: Highlight reviews with photos or detailed feedback
- **Review Filtering**: Filter out inappropriate or spam reviews

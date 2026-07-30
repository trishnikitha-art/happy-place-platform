# HPP Event Schema for PING Consumption

**Purpose:** HPP generates business events that PING will eventually consume for intelligence analysis.

**Architecture:** HPP owns customer operations. PING observes. HPP operates independently of PING.

---

## Event Types

### Marketing Events

#### NewsletterSignup
Emitted when a user subscribes to the newsletter.

```typescript
{
  id: string;
  type: "NewsletterSignup";
  timestamp: string;
  data: {
    email: string;
    firstName?: string;
    subscriberId?: number;
    tags: string[];
  };
  metadata: {
    acquisitionSource: string;
    referrer?: string;
    deviceClass: "mobile" | "tablet" | "desktop";
  };
}
```

#### NewsletterConfirmed
Emitted when Kit confirms a subscriber (via webhook).

```typescript
{
  id: string;
  type: "NewsletterConfirmed";
  timestamp: string;
  data: {
    kitEventName: string;
    email: string;
    subscriberId: number;
    firstName?: string;
    state: string;
  };
  metadata: {
    acquisitionSource: "kit_webhook";
  };
}
```

#### EmailOpened
Emitted when Kit reports an email open (via webhook).

```typescript
{
  id: string;
  type: "EmailOpened";
  timestamp: string;
  data: {
    kitEventName: string;
    email: string;
    subscriberId: number;
  };
  metadata: {
    acquisitionSource: "kit_webhook";
  };
}
```

#### EmailClicked
Emitted when Kit reports an email click (via webhook).

```typescript
{
  id: string;
  type: "EmailClicked";
  timestamp: string;
  data: {
    kitEventName: string;
    email: string;
    subscriberId: number;
    url?: string;
  };
  metadata: {
    acquisitionSource: "kit_webhook";
  };
}
```

### Lead Events

#### EstimateRequested
Emitted when a user requests an estimate.

```typescript
{
  id: string;
  type: "EstimateRequested";
  timestamp: string;
  data: {
    email: string;
    name: string;
    phone?: string;
    services: string[];
    property: {
      address?: string;
      city?: string;
      county?: string;
    };
    photosCount: number;
  };
  metadata: {
    acquisitionSource: "estimate_wizard";
  };
}
```

#### GuideDownloaded
Emitted when a user downloads a resource/guide.

```typescript
{
  id: string;
  type: "GuideDownloaded";
  timestamp: string;
  data: {
    email: string;
    resourceTitle: string;
    resourceUrl: string;
  };
  metadata: {
    acquisitionSource: "resource_download";
  };
}
```

### Customer Events

#### CustomerCreated
Emitted when Kit reports a purchase (via webhook).

```typescript
{
  id: string;
  type: "CustomerCreated";
  timestamp: string;
  data: {
    kitEventName: string;
    email: string;
    subscriberId: number;
    purchaseAmount?: number;
  };
  metadata: {
    acquisitionSource: "kit_webhook";
  };
}
```

#### ReviewRequested
Emitted when a review request is sent to a customer.

```typescript
{
  id: string;
  type: "ReviewRequested";
  timestamp: string;
  data: {
    email: string;
    customerName: string;
    projectId?: string;
    serviceType?: string;
  };
  metadata: {
    acquisitionSource: "review_request";
  };
}
```

#### ReviewCompleted
Emitted when a customer submits a review.

```typescript
{
  id: string;
  type: "ReviewCompleted";
  timestamp: string;
  data: {
    email: string;
    customerName: string;
    rating: number;
    service: string;
    location: {
      city: string;
      county: string;
    };
    title?: string;
    body: string;
  };
  metadata: {
    acquisitionSource: "review_submission";
  };
}
```

### Content Events

#### BlogViewed
Emitted when a user views a blog post.

```typescript
{
  id: string;
  type: "BlogViewed";
  timestamp: string;
  data: {
    slug: string;
    title: string;
    category: string;
  };
  metadata: {
    acquisitionSource: "blog";
    referrer?: string;
    deviceClass: "mobile" | "tablet" | "desktop";
  };
}
```

#### ProjectViewed
Emitted when a user views a project page.

```typescript
{
  id: string;
  type: "ProjectViewed";
  timestamp: string;
  data: {
    projectId: string;
    title: string;
    service: string;
    location: {
      city: string;
      county: string;
    };
  };
  metadata: {
    acquisitionSource: "project_gallery";
    referrer?: string;
    deviceClass: "mobile" | "tablet" | "desktop";
  };
}
```

---

## Metadata Schema

### Acquisition Source
Values: `website`, `homepage`, `estimate_wizard`, `resource_download`, `kit_webhook`, `review_request`, `review_submission`, `blog`, `project_gallery`

### Landing Page
The URL where the event originated (when available)

### Referrer
The referring URL (when available)

### UTM Campaign
UTM campaign parameters (when available)

### Device Class
`mobile`, `tablet`, `desktop`

### Location
Approximate geographic location (city, state, region) - only when appropriate and consented

### Time
ISO 8601 timestamp

### Returning Visitor
Boolean flag for returning visitors

---

## PING Consumption Methods

### Option 1: Webhook Stream
HPP exposes a webhook endpoint that PING can subscribe to:
```
POST /api/events/stream
```

PING receives events in real-time as they occur.

### Option 2: Polling API
HPP exposes an API endpoint for event retrieval:
```
GET /api/events?since={timestamp}&type={event_type}
```

PING polls periodically for new events.

### Option 3: Database Sync
HPP persists events to a database that PING can query directly (requires shared database access).

**Recommended:** Option 1 (Webhook Stream) for real-time intelligence.

---

## Privacy & Consent

### Data Collection Principles

1. **Transparent:** All data collection is disclosed to users
2. **Consented:** Users opt-in to newsletter and communications
3. **Minimal:** Only collect data that serves a clear business purpose
4. **Ethical:** No surveillance, no fingerprinting, no dark patterns
5. **Compliant:** Follow applicable privacy laws (GDPR, CCPA, etc.)

### Consent States

- **Explicit Consent:** Newsletter subscription, resource download
- **Implicit Consent:** Website usage (standard analytics)
- **No Consent:** Never collected without user agreement

### Data Retention

- Newsletter subscribers: Retained until unsubscribe
- Estimate requests: Retained for business purposes (2 years recommended)
- Reviews: Retained indefinitely (public content)
- Analytics events: Retained for business intelligence (1 year recommended)

---

## Event Flow Example

```
User visits homepage
  ↓
BlogViewed event (metadata: referrer, device class)
  ↓
User subscribes to newsletter
  ↓
NewsletterSignup event (metadata: acquisition_source, device class)
  ↓
Kit creates subscriber
  ↓
NewsletterConfirmed event (via Kit webhook)
  ↓
User requests estimate
  ↓
EstimateRequested event (metadata: acquisition_source)
  ↓
Kit applies "Requested Estimate" tag
  ↓
User downloads guide
  ↓
GuideDownloaded event (metadata: acquisition_source)
  ↓
Kit applies "Downloaded Guide" tag
  ↓
Project completed
  ↓
ReviewRequested event
  ↓
User submits review
  ↓
ReviewCompleted event
  ↓
PING analyzes events for:
  - Conversion funnel
  - Customer lifetime value
  - Service popularity
  - Seasonal trends
  - Referral patterns
```

---

## Future Event Types (Not Yet Implemented)

### Social Pipeline
- `SubstackView`
- `SubstackSubscriber`
- `SocialClick` (Facebook, Instagram, LinkedIn, Pinterest, YouTube)
- `GoogleBusinessView`

### Customer Lifecycle
- `CustomerConverted`
- `RepeatCustomer`
- `InspectionReminder`
- `ReviewReceived`

### Advanced Intelligence
- `ServiceInterestScore`
- `PurchaseProbability`
- `ChurnRisk`

---

## Implementation Notes

1. **HPP is independent:** HPP runs without PING. Events are logged locally.
2. **PING is optional:** PING can consume events, but HPP doesn't depend on PING.
3. **No shared runtime:** HPP and PING have separate deployments.
4. **No shared libraries:** Code is duplicated, not imported.
5. **Event schema is stable:** PING can rely on this schema for analysis.

---

## Contact

For questions about the HPP event schema or PING integration, contact the HPP development team.

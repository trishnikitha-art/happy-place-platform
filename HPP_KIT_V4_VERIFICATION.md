# HPP Kit V4 Verification

**Purpose:** Verify Kit V4 API implementation matches official documentation

---

## Verification Checklist

### ✅ 1. Subscribers Endpoint

**Documentation:** `POST /v4/subscribers`
**HPP Implementation:** `POST /subscribers` (correct)

**Request Body:**
```json
{
  "email_address": string,
  "first_name": string (optional),
  "fields": object (optional),
  "tags": number[] (optional),
  "sequences": number[] (optional)
}
```

**HPP Implementation:** ✅ Matches documentation

**Response:**
```json
{
  "subscriber": {
    "id": number,
    "first_name": string,
    "email_address": string,
    "state": "active" | "cancelled" | "bounced" | "complained" | "inactive",
    "created_at": string,
    "fields": object
  }
}
```

**HPP Implementation:** ⚠️ Simplified response structure, should verify actual response

---

### ✅ 2. Find Subscriber by Email

**Documentation:** `GET /v4/subscribers?email_address={email}`
**HPP Implementation:** `GET /subscribers?email_address={encodeURIComponent(email)}` (correct)

**Response:**
```json
{
  "subscribers": [
    {
      "id": number,
      "state": "active",
      "first_name": string,
      "email_address": string,
      "created_at": string,
      "fields": object,
      "attribution": object,
      "tags": [{ "id": number, "name": string }],
      "location": object
    }
  ],
  "pagination": {
    "has_previous_page": boolean,
    "has_next_page": boolean,
    "start_cursor": string,
    "end_cursor": string,
    "per_page": number
  }
}
```

**HPP Implementation:** ⚠️ Returns first subscriber from array, should handle pagination

---

### ✅ 3. Add Tag to Subscriber

**Documentation:** `POST /v4/tags/{tag_id}/subscribers/{id}`
**HPP Implementation:** `POST /subscribers/{id}/tags` ⚠️ INCORRECT PATH

**Correct Path:** `POST /tags/{tagId}/subscribers/{subscriberId}`

**Request Body:** Empty object `{}`
**HPP Implementation:** ⚠️ Incorrect - sends `{ tags: [tagId] }`

**Response:**
- `200`: Subscriber already has the tag
- `201`: Subscriber tagged successfully

**Response Body:**
```json
{
  "subscriber": {
    "id": 1256,
    "first_name": "Alice",
    "email_address": "alice@convertkit.dev",
    "state": "active",
    "created_at": "2023-02-17T11:43:55Z",
    "tagged_at": "2023-02-17T11:43:55Z",
    "fields": {}
  }
}
```

**HPP Implementation:** ⚠️ Returns boolean, should return detailed response with subscriber data

---

### ⚠️ 4. Enroll in Sequence

**Documentation:** `POST /v4/sequences/{sequence_id}/subscribers/{id}`
**HPP Implementation:** `POST /sequences/{sequenceId}/subscribers/{subscriberId}` (correct)

**Request Body:** Empty object `{}`
**HPP Implementation:** ✅ Matches documentation

**Response:**
- `200`: Subscriber already in sequence
- `201`: Subscriber added to sequence

**HPP Implementation:** ⚠️ Returns boolean, should handle 200 vs 201 distinction

---

## Issues Found

### Issue 1: Response Structure Mismatch

**Location:** `createSubscriber()`
**Problem:** HPP expects simplified response, actual Kit response has nested structure
**Fix Required:** Update response parsing to match documented structure

### Issue 2: Pagination Not Handled

**Location:** `findSubscriberByEmail()`
**Problem:** Returns first subscriber from array, doesn't handle pagination
**Fix Required:** Add pagination support or document that only first page is returned

### Issue 3: Tag Endpoint Not Verified

**Location:** `addTagToSubscriber()`
**Problem:** Tag endpoint not found in documentation search
**Fix Required:** Verify official tag endpoint documentation

### Issue 4: Sequence Enrollment Response

**Location:** `enrollInSequence()`
**Problem:** Returns boolean, doesn't distinguish between 200 (already enrolled) and 201 (newly enrolled)
**Fix Required:** Update to return more detailed response

---

## Missing Verification

### Webhook Payloads
- ✅ Webhook signature verification documented (HMAC-SHA256)
- ✅ Webhook event types documented
- ⚠️ Need to implement webhook signature verification in KitAdapter
- ⚠️ Need to implement webhook payload normalization to canonical events

### Webhook Signature Verification
**Documentation:** Kit uses HMAC-SHA256 signature verification
**Header:** `X-Kit-Signature` (or similar)
**Format:** `sha256={hex_signature}`
**Algorithm:** HMAC-SHA256(raw JSON body, secret)

**Verification Process:**
1. Extract signature from header
2. Compute HMAC-SHA256 of raw JSON body using secret
3. Compare with timing-safe comparison

**Implementation Needed:**
```typescript
function verifyKitSignature(rawBody: string, secret: string, signatureHeader: string): boolean {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  return signatureHeader === `sha256=${expected}`;
}
```

### Webhook Event Types
**Available Event Types:**
- `subscriber.subscriber_activate`
- `subscriber.subscriber_unsubscribe`
- `subscriber.subscriber_bounce`
- `subscriber.subscriber_complain`
- `subscriber.form_subscribe` (requires form_id)
- `subscriber.course_subscribe` (requires sequence_id)
- `subscriber.course_complete` (requires sequence_id)
- `subscriber.link_click` (requires initiator_value)
- `subscriber.product_purchase` (requires product_id)
- `subscriber.tag_add` (requires tag_id)
- `subscriber.tag_remove` (requires tag_id)
- `purchase.purchase_create`
- `custom_field.field_created`
- `custom_field.field_deleted`
- `custom_field.field_value_updated` (requires custom_field_id)

### Rate Limiting

**Documentation:** Kit has different rate limits based on authentication
**API Keys:** 120 requests per rolling 60 second period
**OAuth:** 600 requests per rolling 60 second period

**Response Code:** `429` when rate limit exceeded
**Recommendation:** Implement exponential backoff when receiving 429

**HPP Implementation:** ⚠️ No rate limit handling currently
**Fix Required:** Implement exponential backoff for 429 responses

### Retry Behavior

**Documentation:** Kit recommends exponential backoff for rate limiting
**Retry Strategy:**
- Start with short delay (250-500ms)
- Increase delay on each retry
- Cap maximum delay (e.g., 5 seconds)
- Stop after reasonable timeout (30-60 seconds)

**Eventual Consistency Retry:**
- For reads after writes, use exponential backoff
- Wait 30-60 seconds before reading back if needed
- Store ID and state locally at write time

### Failure Responses

**Documentation:** All errors return consistent response shape
**Error Response Structure:**
```json
{
  "errors": ["error message 1", "error message 2"]
}
```

**Error Codes:**
- `400` - Bad Request
- `401` - Unauthorized (invalid token/account)
- `404` - Not Found
- `422` - Unprocessable Entity (validation error)
- `429` - Rate Limit Exceeded
- `500` - Internal Server Error

**HPP Implementation:** ⚠️ Should parse error responses consistently
**Fix Required:** Update error handling to extract error messages from `errors` array

### Duplicate Subscriber Behavior

**Documentation:** `POST /v4/subscribers` behaves as an upsert
**Behavior:**
- If subscriber with email does not exist: creates new subscriber
- If subscriber with email exists: updates first name
- This provides idempotency by email address

**HPP Implementation:** ⚠️ Should handle upsert behavior explicitly
**Fix Required:** Document that createSubscriber is idempotent by email

### Eventual Consistency

**Documentation:** Kit uses eventual consistency for list/filter endpoints
**Affected Endpoints:**
- `GET /v4/subscribers` (listing and filtering)
- Endpoints that return subscriber counts
- Endpoints that filter by tags, segments, custom fields, engagement data

**Strongly Consistent Endpoints:**
- Direct lookups by ID (e.g., `GET /v4/subscribers/:id`)
- Write endpoints that return resource in response

**Implications:**
- Newly created subscriber may not appear in list immediately
- List counts may be slightly off after write
- Filter results may not include just-written changes

**Recommendations:**
- Trust write response (201 Created = data saved)
- Use returned ID for subsequent operations
- Implement retry with exponential backoff for reads
- Wait 30-60 seconds before reading back if needed
- Store ID and state locally at write time

---

## Next Steps

1. **Verify Tag Endpoint** - Find official documentation for tag operations
2. **Verify Webhook Documentation** - Find webhook payload structure
3. **Update Response Parsing** - Match documented response structures
4. **Add Pagination Support** - Handle cursor-based pagination
5. **Test Endpoints** - Verify actual behavior against documentation
6. **Document Business Logic** - Ensure no business logic in adapters

---

## Status

**Completed:**
- ✅ Subscribers endpoint verified
- ✅ Find subscriber by email verified
- ✅ Sequence enrollment endpoint verified

**In Progress:**
- ⚠️ Tag endpoint verification
- ⚠️ Webhook payload verification

**Pending:**
- ⏸️ Rate limiting verification
- ⏸️ Retry behavior verification
- ⏸️ Failure response verification
- ⏸️ Duplicate subscriber handling verification

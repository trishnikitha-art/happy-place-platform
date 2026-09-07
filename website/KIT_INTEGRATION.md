# HPP + Kit Integration

## Ownership

HPP owns customer and lead identity, consent context, business events, and
tenant/environment scope. Kit is the marketing-audience system of record for
email subscribers and email delivery state. HPP does not mirror a subscriber
database.

## Canonical Boundary

Server-side callers use `syncNewsletterSubscriber()` or
`syncEstimateSubscriber()` from `src/lib/kit.ts`. The Kit V4 subscriber endpoint
is an email-keyed upsert. Tag and sequence membership endpoints are idempotent:
Kit returns success when the membership already exists.

The browser never receives the Kit API key.

## Controlled Operations

| HPP signal | Kit operations |
| --- | --- |
| Newsletter signup | Website Subscriber tag; Homepage Signup tag when source is `homepage`; Welcome sequence |
| Estimate request | Website Subscriber tag; Estimate Request tag |
| Review submission | Reviewer tag, through the same subscriber boundary when an email is supplied |

Tag IDs and the welcome sequence ID are explicit deployment configuration. HPP
does not create tags or sequences dynamically.

## Data Contract

Required for Kit: normalized `email`.

Optional for Kit: `firstName`, only when supplied by the user.

HPP-owned metadata: source, consent context, tenant/environment, request and
correlation identifiers, timestamps, and business-event provenance. These remain
in HPP events unless a verified Kit custom field is explicitly configured.

Prohibited by default: property addresses, estimate answers, uploaded photos,
review text, phone numbers, credentials, and internal HPP identifiers.

## Failure Semantics

The adapter classifies failures as validation, authentication, rate limit,
retryable server/network, permanent, or suppressed. Rate-limit and server/network
failures are retried with bounded exponential backoff. A suppressed Kit state
(`cancelled`, `bounced`, `complained`, `inactive`, or `unsubscribed`) is not
tagged or enrolled.

Newsletter signup returns an error when Kit synchronization fails. Estimate
intake still reports the lead as accepted when Gmail/Drive succeeds, but its
response exposes `kit.synchronized`, failure type, failed operation, and
suppression state so the boundary is not falsely reported as healthy.

## Idempotency

Repeated subscriber requests use Kit's email-keyed upsert. Repeated tag and
sequence calls use Kit's documented idempotent membership endpoints. HPP should
retain the returned subscriber ID and operation result in its durable event
store when that store is enabled; the current event repository remains an
in-memory development implementation.

## Required Kit Configuration

- `KIT_API_KEY`
- `KIT_WEBSITE_SUBSCRIBER_TAG_ID`
- `KIT_HOMEPAGE_SIGNUP_TAG_ID`
- `KIT_ESTIMATE_REQUEST_TAG_ID`
- `KIT_REVIEWER_TAG_ID`
- `KIT_WELCOME_SEQUENCE_ID`

The IDs must exist in the target Kit account. Use separate IDs/accounts or
explicit test tags for non-production environments.

## External Validation

The repository tests mock the HTTP boundary and verify upsert, repeated
membership, suppression, and missing configuration behavior. A real
environment validation still requires a Kit test account and credentials:

1. Submit a new test email.
2. Repeat the same email and verify one subscriber with unchanged membership.
3. Verify the expected tags and welcome sequence in Kit.
4. Exercise an invalid email, disabled credential, timeout, and rate limit.
5. Verify cancelled/bounced/complained subscribers are not re-enrolled.
6. Confirm no customer property, photo, or review content is sent to Kit.
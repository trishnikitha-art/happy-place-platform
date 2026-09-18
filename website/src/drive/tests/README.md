# HTTP Integration Tests (Phase B)

## Current Status

The adversarial HTTP integration tests in `multi-slot-adversarial.integration.test.ts` are currently placeholder tests that accept any HTTP status >= 400. These do not provide actual security proof.

## What These Tests Should Prove

### Idempotency
- Same asset + same slots + same revisions → same idempotency key → cached result
- Changed revision → different idempotency key → new transaction
- Reordered slots → same idempotency key (slot sorting)
- Partial success → retry with same key → cached partial result

### Partial Success
- Slot A succeeds, Slot B fails, Slot C succeeds → HTTP 207
- Retry only Slot B → A and C remain unchanged
- Stale slot mixed with current slot → stale rejected, current accepted

### Security Boundaries
- Drive-prefixed media IDs rejected at assignment write time
- Non-resolving media IDs rejected at assignment write time
- Revoked session rejected at Drive routes
- Principal binding enforced at Drive routes

### Independent Slot Identity
- Slot A assignment does not affect Slot B
- Partial success does not overwrite successful slots

## Infrastructure Requirements

To create real adversarial tests, we need:

1. **Real Drive File Access** - Actual Google Drive files for materialization
2. **Production Redis Access** - For state manipulation and CAS conflict injection
3. **Real Google OAuth** - For actual authorization flows
4. **Real Next.js Server** - Phase B server with all routes loaded
5. **Real Workbench Authentication** - For session cookie generation

## Current Blockers

Without production access, we cannot:
- Create real CAS conflicts
- Manipulate Redis state to test partial success
- Test real Drive file materialization
- Test real OAuth authorization flows
- Test real session revocation at HTTP boundary

## Temporary Placeholder Tests

The current tests are documented as placeholders and accept >=400 because:
- They cannot create real adversarial states without production infrastructure
- They cannot cross the actual HTTP boundary without production credentials
- They are designed to document intended behavior, not prove it

## Next Steps

1. Obtain production Drive access
2. Obtain production Redis access
3. Obtain production OAuth credentials
4. Create real adversarial test scenarios
5. Replace placeholder tests with real behavioral tests

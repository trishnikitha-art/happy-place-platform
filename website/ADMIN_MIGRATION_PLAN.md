# Admin Migration Plan - HPP to PING

**Based on:** Repository Boundary Rule  
**Status:** Planning Phase  
**Objective:** Migrate admin components from HPP to PING repository

---

## Constitutional Rule

**Admin belongs to PING, not HPP.**

The admin interface should never:
- Overwrite website files
- Redeploy the website
- Modify frontend assets
- Touch the public repository

Admin only manages business data through APIs and events.

---

## Current HPP Admin Components

### Dashboard
**Location:** `src/app/admin/dashboard/`

**Components:**
- `Dashboard.tsx` (4.1 KB) - Main dashboard component
- `page.tsx` (316 bytes) - Dashboard page wrapper
- `components/AuthorityCard.tsx` (4.8 KB) - Authority status card
- `components/FindingsTable.tsx` (4.1 KB) - Validation findings table
- `components/HealthCard.tsx` (4.8 KB) - System health card
- `components/RepositoryOverview.tsx` (2.5 KB) - Repository overview
- `components/SystemStatusCard.tsx` (5.5 KB) - System status card

### Reviews Admin
**Location:** `src/app/admin/reviews/`

**Components:**
- `page.tsx` - Reviews moderation page

### Admin API Routes
**Location:** `src/app/api/admin/`

**Routes:**
- `metrics/route.ts` - Admin metrics endpoint
- `system/route.ts` - System status endpoint

---

## Migration Strategy

### Phase 1: Document Admin Components
- ✅ Document all admin components in HPP
- ✅ Identify dependencies on HPP-specific code
- ✅ Identify shared contracts (schemas, projections)

### Phase 2: Extract Shared Contracts
- Extract projection interfaces to shareable package
- Extract event contracts to shareable package
- Extract API contracts to shareable package
- Ensure HPP can consume these contracts without PING code

### Phase 3: Migrate Admin to PING
- Move admin components to PING repository
- Move admin API routes to PING repository
- Wire admin to consume shared contracts
- Ensure admin communicates with HPP only through APIs/events

### Phase 4: Remove Admin from HPP
- Delete admin components from HPP
- Delete admin API routes from HPP
- Update HPP to consume PING admin APIs
- Update HPP to consume PING projections

---

## Shared Contracts

### Projection Interfaces
**Current Location:** `src/objects/*/projection/`

**Migration Target:** Shared package (e.g., `@ping/shared-contracts`)

**Contracts:**
- `ReviewProjection`
- `ProjectProjection`
- `CustomerProjection`
- `EstimateProjection`
- `MissionProjection`
- `ArtifactProjection`

### Event Contracts
**Current Location:** Not yet implemented

**Migration Target:** Shared package

**Contracts:**
- ReviewSubmittedEvent
- ReviewModeratedEvent
- ProjectCreatedEvent
- ProjectUpdatedEvent
- EstimateCreatedEvent
- EstimateUpdatedEvent

### API Contracts
**Current Location:** Not yet implemented

**Migration Target:** Shared package

**Contracts:**
- GET /api/reviews
- POST /api/reviews
- GET /api/projects
- GET /api/metrics
- GET /api/system

---

## HPP After Migration

**HPP will:**
- Consume shared contracts from package
- Consume projections from PING APIs
- Submit events to PING event bus
- Have NO admin components
- Have NO admin API routes

**HPP will NOT:**
- Have admin UI
- Have admin routes
- Have admin business logic
- Touch PING repository

---

## PING After Migration

**PING will:**
- Own all admin components
- Own all admin API routes
- Own all business logic
- Publish projections to HPP
- Consume events from HPP
- Own shared contracts package

**PING will NOT:**
- Touch HPP repository
- Modify HPP files
- Deploy HPP
- Access HPP filesystem

---

## Communication Pattern

```
HPP (Public Website)
   ↓
POST /events (ReviewSubmitted)
   ↓
PING (Business Operating System)
   ↓
Workers → Neo4j → Qdrant → Ollama
   ↓
Projections (ReviewProjection)
   ↓
GET /api/projections/reviews
   ↓
HPP (Public Website)
```

---

## Implementation Steps

1. **Create shared contracts package**
   - Extract projection interfaces
   - Define event contracts
   - Define API contracts
   - Publish to npm/private registry

2. **Update HPP to use shared contracts**
   - Install shared contracts package
   - Update imports to use package
   - Test HPP still works

3. **Migrate admin to PING**
   - Create admin structure in PING
   - Move admin components
   - Move admin API routes
   - Wire to shared contracts

4. **Remove admin from HPP**
   - Delete admin components
   - Delete admin API routes
   - Update HPP to consume PING APIs
   - Test HPP still works

5. **Test end-to-end**
   - HPP submits event to PING
   - PING processes event
   - PING publishes projection
   - HPP consumes projection

---

## Success Criteria

- ✅ HPP has no admin components
- ✅ HPP has no admin API routes
- ✅ PING owns all admin functionality
- ✅ Shared contracts package exists
- ✅ HPP and PING communicate only through APIs/events
- ✅ HPP deployment unchanged (Vercel)
- ✅ PING deployment independent (Docker)
- ✅ No cross-repository file access
- ✅ No cross-repository deployment access

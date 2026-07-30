# Workbench Platform Migration Plan

**Status:** READ ONLY - Inventory Complete
**Classification:** Platform vs Tenant Code
**Direction:** Move platform code to PING, keep tenant code in HPP

---

## Executive Summary

The Workbench is a universal operator interface for PING, not HPP-specific. It should become part of the PING platform repository, with HPP consuming it as a tenant.

---

## Component Classification

### PLATFORM CODE → Move to PING

#### API Contract
- **`src/lib/api/client.ts`** ✅ PLATFORM
  - Public runtime contract
  - Gateway adapters only
  - No business logic
  - Already frozen as platform contract

#### Workbench Shell
- **`src/components/workbench/WorkbenchShell.tsx`** ✅ PLATFORM
  - Universal workbench shell
  - Plugin-based navigation
  - No tenant-specific branding
  - Reusable for all tenants

#### Workbench Components
- **`src/components/workbench/explorer/ProjectionCard.tsx`** ✅ PLATFORM
  - Universal projection card
  - Renders any projection identically
  - No HPP-specific logic

- **`src/components/workbench/explorer/ProjectionFilter.tsx`** ✅ PLATFORM
  - Universal projection filter
  - Type-agnostic filtering
  - Reusable for all tenants

#### Workbench Pages
- **`src/app/workbench/layout.tsx`** ✅ PLATFORM
  - Workbench layout wrapper
  - Universal shell integration

- **`src/app/workbench/page.tsx`** ✅ PLATFORM
  - Workbench home redirect
  - Universal routing

- **`src/app/workbench/explorer/page.tsx`** ✅ PLATFORM
  - Universal projection viewer
  - Type-agnostic projection display

- **`src/app/workbench/timeline/page.tsx`** ✅ PLATFORM
  - Canonical events timeline
  - Universal business activity stream

- **`src/app/workbench/evidence/page.tsx`** ✅ PLATFORM
  - Evidence package viewer
  - Universal evidence inspection

- **`src/app/workbench/recommendations/page.tsx`** ✅ PLATFORM
  - Recommendation management
  - Universal approve/reject/modify

- **`src/app/workbench/execution/page.tsx`** ✅ PLATFORM
  - Execution plan viewer
  - Universal execution tracking

- **`src/app/workbench/projections/page.tsx`** ✅ PLATFORM
  - Projection type overview
  - Universal projection health

- **`src/app/workbench/replay/page.tsx`** ✅ PLATFORM
  - Replay studio
  - Universal event replay

- **`src/app/workbench/connectors/page.tsx`** ✅ PLATFORM
  - Connector studio
  - Universal connector management

- **`src/app/workbench/graph/page.tsx`** ✅ PLATFORM
  - Relationship graph viewer
  - Universal graph visualization

- **`src/app/workbench settings/page.tsx`** ✅ PLATFORM
  - Workbench settings
  - Universal configuration

#### Shared Types
- **`src/shared/connectors/ConnectorTypes.ts`** ✅ PLATFORM
  - Shared connector types
  - Universal connector interfaces
  - No HPP-specific types

- **`src/shared/connectors/ConnectorCapabilities.ts`** ✅ PLATFORM
  - Universal connector capabilities
  - Capability-based detection
  - No connector-specific logic

---

### TENANT CODE → Stay in HPP

#### Branding
- **Colors, logos, theme** ✅ TENANT
  - HPP-specific branding
  - Tenant-specific visual identity

#### Configuration
- **`.env.local`** ✅ TENANT
  - HPP-specific environment variables
  - Tenant configuration

- **`next.config.ts`** ✅ TENANT
  - HPP-specific deployment config
  - Tenant deployment settings

#### Custom Pages
- **`src/app/page.tsx`** ✅ TENANT
  - HPP landing page
  - Tenant marketing

- **`src/app/about/page.tsx`** ✅ TENANT
  - HPP about page
  - Tenant marketing

- **`src/app/contact/page.tsx`** ✅ TENANT
  - HPP contact page
  - Tenant marketing

- **`src/app/gallery/page.tsx`** ✅ TENANT
  - HPP portfolio gallery
  - Tenant marketing

- **`src/app/projects/[slug]/page.tsx`** ✅ TENANT
  - HPP project pages
  - Tenant marketing

- **`src/app/services/page.tsx`** ✅ TENANT
  - HPP services page
  - Tenant marketing

- **`src/app/review/page.tsx`** ✅ TENANT
  - HPP review submission
  - Tenant-specific workflow

- **`src/app/reviews/page.tsx`** ✅ TENANT
  - HPP reviews display
  - Tenant-specific display

#### Authority Editor (Tenant-Specific)
- **`src/app/authority-editor/**` ✅ TENANT
  - HPP authority management
  - Tenant-specific configuration

#### Admin Dashboard (Tenant-Specific)
- **`src/app/admin/dashboard/**` ✅ TENANT
  - HPP admin interface
  - Tenant-specific admin

---

## Migration Plan

### Phase 1: PING Repository Structure

Create the following structure in `constitutional-runtime`:

```
PING/
├── workbench/
│   ├── api/
│   │   └── client.ts              # API contract
│   ├── components/
│   │   ├── WorkbenchShell.tsx
│   │   └── explorer/
│   │       ├── ProjectionCard.tsx
│   │       └── ProjectionFilter.tsx
│   ├── pages/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── explorer/
│   │   ├── timeline/
│   │   ├── evidence/
│   │   ├── recommendations/
│   │   ├── execution/
│   │   ├── projections/
│   │   ├── replay/
│   │   ├── connectors/
│   │   ├── graph/
│   │   └── settings/
│   └── shared/
│       └── connectors/
│           ├── ConnectorTypes.ts
│           └── ConnectorCapabilities.ts
├── tenant-sdk/
│   └── types.ts                   # Tenant configuration types
└── gateway/
    └── routes/                    # Backend API routes
```

### Phase 2: Move Platform Code

**Step 1:** Move API contract
- Copy `src/lib/api/client.ts` → `PING/workbench/api/client.ts`
- Update imports in all workbench components

**Step 2:** Move shared types
- Copy `src/shared/connectors/ConnectorTypes.ts` → `PING/workbench/shared/connectors/ConnectorTypes.ts`
- Copy `src/shared/connectors/ConnectorCapabilities.ts` → `PING/workbench/shared/connectors/ConnectorCapabilities.ts`

**Step 3:** Move workbench components
- Copy `src/components/workbench/` → `PING/workbench/components/`
- Update all imports

**Step 4:** Move workbench pages
- Copy `src/app/workbench/` → `PING/workbench/pages/`
- Update routing structure

### Phase 3: HPP Tenant Configuration

**Step 1:** Remove platform code from HPP
- Delete `src/lib/api/client.ts`
- Delete `src/components/workbench/`
- Delete `src/app/workbench/`
- Delete `src/shared/connectors/`

**Step 2:** Install PING workbench as dependency
- Add PING workbench as npm package or git submodule
- Import workbench components from PING

**Step 3:** Configure tenant branding
- Keep HPP-specific colors, logos, theme
- Configure workbench theme via tenant config
- Add feature flags for HPP-specific features

### Phase 4: Tenant SDK

Create tenant SDK in PING:

```typescript
// PING/tenant-sdk/types.ts
export interface TenantConfig {
  branding: {
    name: string;
    colors: {
      primary: string;
      secondary: string;
      accent: string;
    };
    logo: string;
  };
  features: {
    workbench: boolean;
    authorityEditor: boolean;
    adminDashboard: boolean;
  };
  workflows: {
    reviewSubmission: string;
    projectCreation: string;
  };
}

export function useTenantConfig(): TenantConfig {
  // Load tenant config from environment or API
}
```

### Phase 5: HPP Integration

HPP imports workbench from PING:

```typescript
// HPP/src/app/layout.tsx
import { WorkbenchShell } from '@ping/workbench';
import { useTenantConfig } from '@ping/tenant-sdk';

export default function RootLayout() {
  const config = useTenantConfig();
  
  return (
    <WorkbenchShell
      branding={config.branding}
      features={config.features}
    >
      {children}
    </WorkbenchShell>
  );
}
```

---

## Migration Order

1. **Create PING workbench structure** (no code changes)
2. **Copy platform code to PING** (no HPP changes yet)
3. **Update imports in PING** (internal PING changes)
4. **Test PING workbench standalone** (verify platform code works)
5. **Create tenant SDK** (tenant abstraction layer)
6. **Remove platform code from HPP** (HPP cleanup)
7. **Install PING workbench in HPP** (HPP integration)
8. **Configure HPP tenant branding** (HPP customization)
9. **Test HPP with PING workbench** (end-to-end verification)

---

## Risk Mitigation

**No Code Deletion Until Verification**
- Archive HPP platform code before deletion
- Keep backup branches
- Test PING workbench thoroughly before HPP integration

**Gradual Migration**
- Move one component at a time
- Test each component independently
- Maintain HPP functionality during migration

**Backward Compatibility**
- Keep HPP workbench functional until PING integration verified
- Support both versions during transition period

---

## Success Criteria

**PING Workbench**
- ✅ All platform code moved to PING
- ✅ Workbench functions standalone in PING
- ✅ API contract frozen and documented
- ✅ Tenant SDK provides configuration layer

**HPP Tenant**
- ✅ Platform code removed from HPP
- ✅ HPP imports workbench from PING
- ✅ HPP branding and workflows preserved
- ✅ HPP functionality maintained

**Platform**
- ✅ Single source of truth for workbench
- ✅ Reusable for all future tenants
- ✅ No code duplication
- ✅ Clear platform/tenant boundary

---

## Next Steps

1. **Review this migration plan** with platform owner
2. **Create PING workbench structure** in constitutional-runtime
3. **Begin Phase 2 migration** (copy platform code)
4. **Test PING workbench standalone**
5. **Proceed to HPP integration**

---

**Document Status:** READ ONLY - Inventory Complete
**Next Action:** Awaiting approval to begin migration

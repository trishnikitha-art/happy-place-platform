# Estimate Architecture Cleanup

## Objective

Remove public-facing estimate cards and treat estimates as archived backend authority objects only.

## What to Remove (Public-Facing)

1. **Estimate Wizard Component** (`website/src/components/estimate-wizard.tsx`)
   - ✅ DISABLED - Shows contact redirect instead of wizard
   - Component logic preserved for potential future use

2. **Estimate Page** (`website/src/app/estimate/page.tsx`)
   - ✅ UPDATED - Shows contact information instead of wizard
   - Route reserved for authority editor

3. **Public Estimate CTAs**
   - ✅ REMOVED from homepage ("Get a Free Estimate" → "Contact Us")
   - ✅ REMOVED from service pages (both CTAs updated to "Contact Us")
   - ✅ Updated to link to /contact instead of /estimate

## What to Keep (Backend Infrastructure)

1. **Estimate Authority Editor** (`website/src/app/authority-editor/estimates/page.tsx`)
   - Keep for backend management of estimate records
   - Allow viewing/archiving existing estimates

2. **Estimate APIs** (`website/src/services/estimate.ts`)
   - Keep backend API service
   - Keep estimate submission endpoints (for internal use)

3. **Estimate Database/Types** (`website/src/types/index.ts`)
   - Keep EstimateRequest domain object type
   - Keep related types for backend authority

4. **Workbench Estimate Pages**
   - Keep workbench authority graph
   - Keep workbench estimate viewing/editing

5. **Intake Records**
   - Keep ProjectIntakeRecord domain object
   - Keep interview engine and related logic

## Implementation Status

### Phase 1: Disable Public Estimate Wizard ✅ COMPLETE
- Modified `estimate-wizard.tsx` to show contact redirect
- Component logic preserved for potential future use

### Phase 2: Redirect Estimate Page ✅ COMPLETE
- Modified `website/src/app/estimate/page.tsx` to show contact information
- Links to phone and email instead of wizard

### Phase 3: Remove Public CTAs ✅ COMPLETE
- Removed "Get a Free Estimate" from homepage
- Changed to "Contact Us" linking to /contact
- Removed estimate links from service pages
- Updated service page CTAs to "Contact Us"

### Phase 4: Verify Backend Infrastructure ⏳ PENDING
- Ensure authority editor still works
- Ensure workbench still works
- Ensure APIs still function

## Current State

- ✅ Estimate wizard disabled (shows contact redirect)
- ✅ Estimate page shows contact information
- ✅ Public CTAs removed and updated to "Contact Us"
- ⏳ Backend infrastructure verification pending

## Next Steps

1. Test that authority editor still works
2. Test that workbench still works
3. Verify all backend infrastructure remains intact
4. Deploy and verify live site

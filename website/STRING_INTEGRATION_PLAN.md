# HPP STRING INTEGRATION - FORENSIC ANALYSIS PLAN

## ARCHITECTURAL PRINCIPLES

1. **NO GLOBAL SEARCH-AND-REPLACE** - Every replacement must be scoped to a known semantic UI occurrence
2. **Stable semantic keys** - Use concept-based keys (e.g., `nav.about`, `media.filter.all`) not English text
3. **Context preservation** - Identical English text in different contexts may require different keys
4. **Future-proof localization** - Build canonical copy layer that can later feed next-intl/react-i18next
5. **Preserve behavior** - No changes to component behavior, state, event handlers, or APIs

## CLASSIFICATION SYSTEM

### LOCKED - NEVER SWAP
- API routes: `/api/drive/*`, `/api/workbench/*`
- Route parameters: `folderId`, `fileId`, `driveId`, `pageToken`
- Component names: `ServiceCard`, `ProjectSpotlight`, `VisualSlot`
- Variable names: `driveCurrentDriveId`, `driveBreadcrumb`, `driveFiles`
- Event handlers: `handleLogin`, `loadConnectors`, `loadDriveFiles`
- MIME types: `application/vnd.google-apps.folder`
- Google Drive terminology: "My Drive", "Shared Drives" (these are Google product terms)
- Protocol terms: "OAuth", "httpOnly", "sameSite"
- Database field names, schema identifiers
- CSS class names, Tailwind utilities

### CANONICAL - SWAP THROUGH EXPLICIT MAP
- Customer-facing copy (website)
- Workbench/admin labels
- Status labels (connector-specific, not generic)
- Error messages (resource-specific, not generic)
- Accessibility labels (aria-label, title)
- Placeholder text
- Button labels
- CTA text
- Headings
- Descriptions
- Empty states
- Loading states
- Toast/notification messages
- Confirmation dialogs
- Validation messages

### CONTEXTUAL - REQUIRE HUMAN REVIEW
Short ambiguous strings that could have different meanings:
- "About" (nav link vs page title vs section heading)
- "Drive" (Google Drive vs generic verb)
- "Open" (menu vs file vs action)
- "Use" (asset vs generic verb)
- "Clear" (form vs filter vs action)
- "Load" (data vs page vs action)
- "Active" (connector status vs generic state)
- "Error" (type vs message vs state)
- "All" (filter vs generic)
- "Files" (file list vs generic)
- "Home" (nav link vs concept)

### DYNAMIC - MESSAGE TEMPLATES
Strings with interpolation:
- `Success: {action} media record "{media.id}"`
- `Error: {error || 'Unknown error'}`
- `{stats.average} / 5 across {stats.count} featured reviews`
- `View {photo.alt} in full screen`
- `Rated {rating} out of 5`

These must be treated as message templates with variable interpolation, not literal strings.

### ACCESSIBILITY - SEPARATE CATEGORY
- aria-label
- aria-describedby
- title attributes
- alt text
- role descriptions
- Accessible names generated through props

These are critical for accessibility and must be preserved with semantic intent.

## FORENSIC HARVEST REQUIREMENTS

### Complete Repo Scan
1. All `.tsx` files in `src/app/` (customer website)
2. All `.tsx` files in `src/app/workbench/` (admin UI)
3. All `.tsx` files in `src/components/` (shared components)
4. All `.tsx` files in `src/shared/` (shared UI)
5. All API route files (for error messages)

### Extract Every User-Visible String
- JSX text content between tags
- String literals in attributes (alt, title, placeholder, aria-label)
- Button text
- Form labels
- Navigation labels
- Headings (h1-h6)
- Descriptions
- Empty state messages
- Loading state messages
- Error messages
- Success messages
- Toast notifications
- Modal/dialog copy
- Validation messages
- Status labels
- Table/grid labels
- Browser/document titles
- Confirmation dialogs

### For Each String, Capture
1. Exact text
2. File path
3. Line number
4. Component/context
5. Classification (LOCKED/CANONICAL/CONTEXTUAL/DYNAMIC/ACCESSIBILITY)
6. Interpolation variables (if any)
7. Duplicate analysis (is this string used elsewhere? are the contexts semantically equivalent?)

### Identify Interpolation Cases
Look for:
- Template literals with `${variable}`
- Conditional rendering with `||`
- String concatenation
- Dynamic values in JSX text

### Duplicate Analysis
For each duplicate string, determine:
- Are the contexts semantically equivalent?
- Should they share a canonical key?
- Or should they have separate keys despite identical English?

## PROPOSED CANONICAL KEY STRUCTURE

### Navigation
- `nav.home`
- `nav.services`
- `nav.ourWork`
- `nav.about`
- `nav.reviews`
- `nav.estimate`

### Customer Website
- `homepage.hero.title`
- `homepage.hero.description`
- `homepage.services.title`
- `homepage.services.description`
- `homepage.projects.title`
- `homepage.projects.description`

### Workbench
- `workbench.media.title`
- `workbench.media.description`
- `workbench.media.filter.all`
- `workbench.media.filter.used`
- `workbench.media.filter.unused`
- `workbench.media.source.drive`
- `workbench.drive.browseToggle`
- `workbench.drive.loadStructure`
- `workbench.drive.myDrive`

### Connectors
- `connectors.title`
- `connectors.googleDrive.name`
- `connectors.googleDrive.connect`
- `connectors.googleDrive.connectedAs`
- `connectors.googleDrive.notConnected`
- `connectors.status.active`
- `connectors.status.inactive`
- `connectors.status.error`

### Error Messages (Resource-Specific)
- `error.drive.discoveryFailed`
- `error.drive.loadFilesFailed`
- `error.gallery.deleteFailed`
- `error.media.loadCanonicalFailed`

### Accessibility
- `a11y.logo.alt`
- `a11y.menu.open`
- `a11y.menu.close`
- `a11y.theme.toggle`
- `a11y.lightbox.close`
- `a11y.lightbox.previous`
- `a11y.lightbox.next`

### Placeholders
- `placeholder.workbench.password`
- `placeholder.media.search`
- `placeholder.drive.search`
- `placeholder.email`
- `placeholder.firstName`

## VALIDATION GATES

After any changes:
1. TypeScript compilation passes
2. Production build succeeds
3. Grep for remaining hardcoded UI strings in customer-facing components
4. Grep to confirm LOCKED identifiers unchanged
5. Visual/browser verification of customer routes
6. Visual/browser verification of workbench routes
7. Media/Drive/Workbench behavior unchanged
8. No API contracts broken

## OUTPUT FORMAT

Produce a comprehensive JSON/Markdown inventory with:

```json
{
  "strings": [
    {
      "id": "nav.home",
      "currentText": "Home",
      "canonicalText": "Home",
      "classification": "CANONICAL",
      "locations": [
        {
          "file": "src/components/site-header.tsx",
          "line": 104,
          "component": "SiteHeader",
          "context": "primary navigation"
        },
        {
          "file": "src/components/site-footer.tsx",
          "line": 40,
          "component": "SiteFooter",
          "context": "footer navigation"
        }
      ],
      "hasInterpolation": false,
      "duplicates": true,
      "semanticEquivalence": true
    }
  ],
  "lockedIdentifiers": [
    "driveCurrentDriveId",
    "driveBreadcrumb",
    "/api/drive/discovery",
    "application/vnd.google-apps.folder"
  ],
  "interpolationCases": [
    {
      "template": "Success: {action} media record \"{media.id}\"",
      "variables": ["action", "media.id"],
      "file": "src/app/workbench/media/page.tsx",
      "line": 123
    }
  ]
}
```

## EXECUTION ORDER

1. READ-ONLY forensic harvest (this phase)
2. Build canonical key map
3. Create DO-NOT-TOUCH identifier list
4. Surgical patch plan (file-by-file)
5. Review and approve plan
6. Execute surgical swaps
7. Validation gates
8. Final verification

**NO EDITS UNTIL ENTIRE PLAN IS INTERNALLY CONSISTENT AND APPROVED**

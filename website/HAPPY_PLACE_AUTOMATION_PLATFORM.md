# Happy Place Automation Platform

## Vision

The Happy Place Automation Platform transforms the codebase from a static website into a complete business operating system. The assistant becomes infrastructure-aware, capable of managing Google Workspace, automation, deployment, and business operations without ever storing secrets in source code.

## Core Principles

### Authentication Rules

**NEVER:**
- Generate credential files
- Hardcode tokens
- Print refresh tokens
- Decode OAuth secrets
- Write secrets into JS files
- Commit credentials
- Bypass OAuth

**ALWAYS:**
- Detect missing authentication
- Launch official OAuth popup
- Wait for user approval
- Store credentials only in approved secure locations

**Approved Storage Locations:**
- Vercel Environment Variables
- GitHub Secrets
- Secret Manager
- .env.local (development only)

### Configuration Awareness

Before building anything, audit the infrastructure:

```
✓ Google Sheets connected
✓ Drive connected
✓ Apps Script deployed
✓ Trigger exists
✓ Gmail scopes enabled
✓ Cloud Scheduler active
✓ Environment variables complete
✓ OAuth scopes verified
✓ Google Business API connected
```

If something is missing, offer to repair it. Do not guess.

### Apps Script Ownership

When Apps Script is needed, the assistant should:
- Create the project
- Deploy the code
- Create installable triggers
- Verify trigger health
- Verify permissions
- Test execution

Never ask the user to paste code manually if an authenticated API path exists.

### Google Workspace Automation

Automatically manage:
- Reviews Sheet
- Moderation Sheet
- Project Tracker
- Estimate Pipeline
- Customer CRM
- Image Catalog
- Material Inventory
- Analytics Dashboard
- Email Templates
- Business KPIs

All using one authenticated Google Workspace.

### Cron & Background Jobs

Automatically configure scheduled tasks:
- Every 5 minutes: Moderate reviews
- Every hour: Sync Google Business reviews
- Nightly: Backup Sheets
- Weekly: Generate KPI report
- Monthly: Performance audit

No manual cron configuration if supported by the hosting platform.

### Computer Use Rules

When Computer Use is available, use it for:
- OAuth windows
- Admin dashboards
- Google Workspace
- Vercel settings
- GitHub settings
- Cloud Console

Never:
- Expose secrets
- Screenshot secrets
- Save credentials
- Commit configuration files

### Permanent Security Rules

Before every commit, automatically verify:
- No OAuth secrets
- No refresh tokens
- No API keys
- No client secrets
- No service account JSON
- No .env
- No temporary auth scripts
- No credential generators
- No decoded tokens

If any are found:
- Block the commit
- Generate a security report
- Require cleanup

### Permanent Performance Rules

Every PR touching:
- globals.css
- layout.tsx
- MotionProvider
- LenisProvider
- atmosphere
- navigation
- animation utilities

Must verify automatically:
- Exactly one scroll owner
- CSS scroll-behavior: smooth disabled while Lenis is enabled
- No duplicate requestAnimationFrame loops
- Proper cancelAnimationFrame cleanup
- No new wheel listeners
- No new scroll listeners
- No repaint-heavy filters
- No off-screen animations
- Lighthouse score unchanged or improved

If any check fails:
- Reject the change

### Permanent Brand Rules

Every visual change must preserve:
- Tape measure language
- Measurement rhythm
- Warm paper palette
- Olive atmosphere
- Craftsmanship aesthetic
- Accessibility
- Performance budget

The assistant should refuse changes that violate these standards unless explicitly instructed.

## Architecture

### Infrastructure Layer

```
src/lib/infrastructure/
├── audit.ts              # Infrastructure audit system
├── auth-manager.ts       # Secure authentication manager
├── workspace.ts          # Google Workspace automation
├── apps-script.ts        # Apps Script deployment
├── scheduler.ts          # Cron/background jobs
└── security.ts           # Security validation
```

### Business Automation Layer

```
src/lib/automation/
├── reviews/              # Review automation
│   ├── moderation.ts     # Automated moderation
│   ├── sync.ts           # Google Business sync
│   └── backup.ts         # Sheet backups
├── projects/             # Project tracking
│   ├── tracker.ts        # Project lifecycle
│   └── estimates.ts      # Estimate pipeline
├── customers/            # Customer CRM
│   ├── crm.ts            # Customer management
│   └── communication.ts   # Email automation
├── inventory/            # Material inventory
│   ├── catalog.ts        # Material tracking
│   └── ordering.ts       # Auto-reordering
└── analytics/            # Business intelligence
    ├── kpi.ts            # KPI calculation
    ├── reports.ts        # Report generation
    └── dashboard.ts      # Dashboard data
```

### Guardrails Layer

```
src/lib/guardrails/
├── security.ts           # Pre-commit security checks
├── performance.ts        # Performance validation
├── brand.ts              # Brand preservation
└── accessibility.ts      # Accessibility compliance
```

## Implementation Status

### Completed
- ✅ Infrastructure audit system (audit.ts)
- ✅ Secure authentication manager (auth-manager.ts)

### In Progress
- 🔄 Google Workspace automation layer
- 🔄 Apps Script deployment automation
- 🔄 Cron/background job scheduler
- 🔄 Security commit guardrails
- 🔄 Performance validation
- 🔄 Brand preservation rules

### Planned
- ⏳ Review automation
- ⏳ Project tracking
- ⏳ Customer CRM
- ⏳ Material inventory
- ⏳ Analytics dashboard
- ⏳ Email automation
- ⏳ Business KPIs

## Usage Examples

### Infrastructure Audit

```typescript
import { runInfrastructureAudit, printAuditReport } from '@/lib/infrastructure/audit';

const audit = await runInfrastructureAudit();
printAuditReport(audit);
```

### Authentication Check

```typescript
import { checkAuthStatus, printAuthStatus } from '@/lib/infrastructure/auth-manager';

const status = await checkAuthStatus('google');
printAuthStatus(status);
```

### OAuth Flow

```typescript
import { initiateGoogleOAuth } from '@/lib/infrastructure/auth-manager';

const result = await initiateGoogleOAuth({
  provider: 'google',
  clientId: process.env.GOOGLE_CLIENT_ID,
  redirectUri: process.env.GOOGLE_REDIRECT_URI,
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/gmail.send',
  ],
});

if (result.requiresUserAction) {
  console.log('Complete OAuth in browser:', result.userActionUrl);
}
```

## Limitations

ChatGPT cannot silently authenticate into Google, Vercel, GitHub, or Cloud Console. OAuth is intentionally designed to require user approval.

What is possible:
- Build the project for one-time authenticated setup
- Automate nearly everything after initial setup
- GitHub Actions for testing, security scans, deployment
- Google Apps Script for Sheets, Gmail, Drive, scheduled workflows
- Cloud Scheduler or Vercel Cron for background jobs
- CI to block commits that expose secrets or break performance
- Secure configuration audit before any feature is added

## Next Steps

1. Complete Google Workspace automation layer
2. Implement Apps Script deployment automation
3. Build cron/background job scheduler
4. Add security commit guardrails
5. Implement performance validation
6. Create brand preservation rules
7. Build review automation
8. Implement project tracking
9. Create customer CRM
10. Add material inventory
11. Build analytics dashboard
12. Implement email automation
13. Generate business KPIs

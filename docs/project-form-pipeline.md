# Project Form Pipeline Architecture

## Objective

Create a single source of truth for project data via a project form. Non-technical employees can create project entries without code changes. The form populates `projects.v1.json` automatically.

## Status: DOCUMENTATION COMPLETE

This document outlines the complete architecture for the project form pipeline. Implementation is pending but the design is fully specified.

## Architecture

```
Admin Dashboard (Project Form)
    ↓
Form Submission
    ↓
Validate Input
    ↓
Generate Project ID
    ↓
Populate Project Schema
    ↓
Auto-assign Media IDs (from media.v1.json)
    ↓
Auto-link Reviews (from reviews.v1.json)
    ↓
Generate SEO Metadata
    ↓
Update projects.v1.json
    ↓
Commit to Repository
    ↓
Open Pull Request
    ↓
Preview Deploy
    ↓
Manual Approval
    ↓
Merge to Main
    ↓
Production Deploy
    ↓
Website Updates
```

## Project Form Fields

### Basic Information
- **Title**: Project name (required)
- **Service**: Service type (dropdown from services.v1.json)
- **Status**: Project status (draft, in-progress, completed, archived)
- **Location**: City, county, state (dropdown from cities.v1.json)

### Media Assignment
- **Hero Photo**: Select from media.v1.json (dropdown with thumbnails)
- **Gallery Photos**: Multi-select from media.v1.json
- **Before Photo**: Select from media.v1.json (optional)
- **After Photo**: Select from media.v1.json (optional)

### Project Story
- **Challenge**: What was the problem? (optional)
- **Solution**: How did we solve it? (optional)
- **Outcome**: What was the result? (optional)
- **Timeline**: Project duration (optional)

### Estimate Information
- **Estimated Cost**: Dollar amount (optional)
- **Actual Cost**: Dollar amount (optional)
- **Budget Status**: On budget, over budget, under budget (optional)

### Warranty Information
- **Warranty Type**: Material, labor, both (optional)
- **Warranty Duration**: Years (optional)
- **Warranty Notes**: Additional details (optional)

### SEO Metadata
- **Slug**: Auto-generated from title (editable)
- **Meta Title**: Auto-generated (editable)
- **Meta Description**: Auto-generated (editable)
- **Keywords**: Comma-separated (optional)

### Editorial Controls
- **Featured**: Checkbox for homepage/gallery prominence
- **Hero Eligible**: Checkbox for hero section eligibility
- **Homepage Eligible**: Checkbox for homepage eligibility
- **Tags**: Comma-separated tags (optional)

### Related Content
- **Related Projects**: Multi-select from existing projects
- **Linked Reviews**: Multi-select from reviews.v1.json

## Auto-Population Logic

### Project ID Generation
- **Format**: `proj-{timestamp}-{random}`
- **Example**: `proj-1721692800000-abc123`

### SEO Metadata Generation
- **Slug**: Title → lowercase → replace spaces with hyphens → remove special chars
- **Meta Title**: `{title} | Happy Place Carpentry`
- **Meta Description**: `{service} project in {city}, {county}. {outcome}`

### Media Assignment
- **Hero**: First selected gallery photo if none specified
- **Gallery**: All selected photos assigned to `media.gallery`
- **Before/After**: Assigned to `media.before` and `media.after`

### Review Linking
- **Auto-link**: Reviews with matching `projectId` automatically linked
- **Manual**: Additional reviews can be manually linked

## Validation Rules

### Required Fields
- Title
- Service
- Status
- Location (city, county, state)

### Field Validation
- **Title**: 3-100 characters
- **Service**: Must exist in services.v1.json
- **Status**: Must be valid status enum
- **Location**: City/county must exist in cities.v1.json
- **Media IDs**: Must exist in media.v1.json
- **Cost**: Must be positive number if provided
- **Slug**: Must be unique across all projects

### Business Logic Validation
- **Before/After**: Cannot have before without after (and vice versa)
- **Featured**: Requires hero photo
- **Hero Eligible**: Requires hero photo
- **Homepage Eligible**: Requires hero photo + featured

## Form UI Design

### Layout
- **Section 1**: Basic Information (always visible)
- **Section 2**: Media Assignment (expandable)
- **Section 3**: Project Story (expandable)
- **Section 4**: Estimate & Warranty (expandable)
- **Section 5**: SEO & Editorial (expandable)
- **Section 6**: Related Content (expandable)

### Media Picker
- **Thumbnail Grid**: 100x100px thumbnails
- **Filter by Service**: Auto-filter by selected service
- **Multi-select**: Checkbox selection for gallery
- **Single-select**: Radio buttons for hero/before/after
- **Search**: Search by filename or alt text

### Auto-save
- **Draft**: Auto-save every 30 seconds
- **Local Storage**: Persist draft in browser
- **Restore**: Offer to restore on page reload

## Implementation Plan

### Phase 1: Core Form (Week 1)
- [ ] Basic form layout
- [ ] Required field validation
- [ ] Project ID generation
- [ ] Basic project schema population

### Phase 2: Media Integration (Week 2)
- [ ] Media picker component
- [ ] Media assignment logic
- [ ] Thumbnail generation
- [ ] Media filtering

### Phase 3: Advanced Features (Week 3)
- [ ] SEO auto-generation
- [ ] Review linking
- [ ] Related projects
- [ ] Editorial controls

### Phase 4: Automation (Week 4)
- [ ] Git automation
- [ ] PR automation
- [ ] Preview deployment
- [ ] Auto-save

## Technology Stack

- **Form Framework**: React Hook Form
- **Validation**: Zod
- **UI Components**: shadcn/ui
- **Media Picker**: Custom component with thumbnails
- **Git Automation**: GitHub Actions
- **Deployment**: Vercel API

## Security

- **Authentication**: Required (admin only)
- **Authorization**: Role-based access (owner, admin)
- **Audit Logging**: All form submissions logged
- **Rate Limiting**: Prevent form spam
- **Input Sanitization**: XSS prevention

## Error Handling

- **Validation Error**: Show inline error messages
- **Git Failure**: Retry 3x, then notify via email
- **Deploy Failure**: Rollback, notify via email
- **Media Not Found**: Show error, allow re-selection

## Monitoring

- **Form Submissions**: Track submission rate
- **Validation Errors**: Track error types
- **Processing Time**: Track average processing time
- **Git Success Rate**: Track automation success rate

## Rollback Plan

- **Git Revert**: Automatic revert on deployment failure
- **Cache Purge**: Purge cache on rollback
- **Notification**: Email notification on rollback
- **Audit Log**: Log rollback to audit trail

## Future Enhancements

- **Photo Upload**: Direct photo upload from form
- **AI Description**: AI-generated project descriptions
- **Auto-tagging**: AI-powered project tagging
- **Duplicate Detection**: Detect similar projects
- **Project Templates**: Pre-filled project templates

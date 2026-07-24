# Google Workspace Architecture Specification

## Overview

This specification defines the Google Workspace integration architecture for the Happy Place Estimate Intelligence Platform. The system transforms the estimate wizard into a canonical record that drives all downstream operations.

**Core Philosophy:** The estimate becomes a single source of truth that all Google Workspace services reference and extend.

---

## 1. Google Workspace Architecture

### System Overview

```
Estimate Wizard
        │
        ▼
    /api/estimate
        │
        ▼
Estimate Intake Service
        │
 ┌──────┼────────┬──────────┬──────────┬──────────┐
 ▼      ▼        ▼          ▼          ▼          ▼
Drive  Gmail   Sheets    Calendar   Contacts    AI
        │
        ▼
Canonical Estimate Record
        │
 ┌──────┼────────┬────────┬────────┬────────┐
 ▼      ▼        ▼        ▼        ▼        ▼
Scheduling  Job  Invoice  History  CRM  Analytics
```

### Estimate Lifecycle

Every estimate produces a complete artifact:

1. **Estimate ID** - Unique identifier (EST-YYYY-NNNNN)
2. **Drive Folder** - Organized storage for all assets
3. **Google Sheet Row** - Operational database record
4. **Gmail Notification** - Professional estimate packet
5. **Calendar Event** - Optional appointment scheduling
6. **Contact Record** - Customer relationship management
7. **AI Summary** - Intelligent analysis and recommendations
8. **CRM Record** - Future integration point

### Data Flow

```
User Submission
  ↓
Estimate Intake Service
  ↓
Validation & Normalization
  ↓
┌─────────────────────────┐
│  Parallel Processing   │
├─────────────────────────┤
│ Drive: Create folder    │
│ Sheets: Create row      │
│ Gmail: Send packet     │
│ Contacts: Update       │
│ Calendar: Create event│
│ AI: Analyze photos     │
└─────────────────────────┘
  ↓
Canonical Estimate Record
  ↓
Downstream Operations
```

---

## 2. Google Drive Organization

### Folder Structure

```
Happy Place Estimates
└── 2026
    ├── EST-2026-00418
    │   ├── metadata.json
    │   ├── estimate.pdf
    │   ├── customer.json
    │   ├── photos/
    │   │   ├── overview.jpg
    │   │   ├── damage.jpg
    │   │   └── trim.jpg
    │   └── ai/
    │       ├── summary.md
    │       └── vision.json
    ├── EST-2026-00419
    │   └── ...
    └── 2026-Archive
        └── Completed estimates
```

### Folder Naming Convention

**Format:** `EST-YYYY-NNNNN`

- **EST**: Estimate prefix
- **YYYY**: 4-digit year
- **NNNNN**: Sequential 5-digit number (resets annually)

**Example:** `EST-2026-00418`

### File Specifications

#### metadata.json
```json
{
  "estimateId": "EST-2026-00418",
  "createdAt": "2026-01-15T10:30:00Z",
  "status": "pending",
  "customer": {
    "name": "John Smith",
    "email": "john@example.com",
    "phone": "541-555-0123"
  },
  "property": {
    "address": "123 Main St",
    "city": "Corvallis",
    "county": "Benton",
    "coordinates": {
      "lat": 44.5646,
      "lng": -123.2620
    }
  },
  "services": ["decks", "fences"],
  "photos": ["overview.jpg", "damage.jpg"],
  "driveFolder": "https://drive.google.com/drive/folders/...",
  "sheetRow": 418,
  "calendarEvent": "https://calendar.google.com/event/...",
  "contactId": "contact-12345"
}
```

#### estimate.pdf
- Generated professional estimate document
- Includes customer info, services, AI summary, photos
- Branded with Happy Place Carpentry header/footer
- PDF format for universal compatibility

#### customer.json
```json
{
  "customerId": "CUST-00123",
  "name": "John Smith",
  "email": "john@example.com",
  "phone": "541-555-0123",
  "addresses": [
    {
      "type": "property",
      "street": "123 Main St",
      "city": "Corvallis",
      "county": "Benton",
      "zip": "97333"
    }
  ],
  "history": [
    {
      "estimateId": "EST-2026-00418",
      "date": "2026-01-15",
      "services": ["decks", "fences"]
    }
  ],
  "tags": ["repeat-customer", "high-value"],
  "leadSource": "website"
}
```

#### photos/ Directory
- Contains all uploaded photos
- Naming convention: `{description}-{timestamp}.{ext}`
- Original resolution preserved
- Thumbnails generated for preview

#### ai/ Directory
- AI-generated analysis results
- Text summaries in Markdown
- Vision analysis in JSON
- Confidence scores and recommendations

### Drive Service API

```typescript
interface DriveService {
  createEstimateFolder(estimateId: string): Promise<string>;
  uploadPhoto(estimateId: string, file: File): Promise<string>;
  uploadMetadata(estimateId: string, metadata: object): Promise<string>;
  generatePDF(estimateId: string, content: string): Promise<string>;
  getFolderUrl(estimateId: string): string;
  shareFolder(estimateId: string, email: string): Promise<void>;
}
```

---

## 3. Google Sheets as Operational Database

### Sheet Structure

**Sheet Name:** "Happy Place Estimates"
**Tab:** "Estimates"

### Column Schema

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| Estimate ID | Text | Unique identifier | EST-2026-00418 |
| Created | Date | Submission timestamp | 2026-01-15 10:30 |
| Customer | Text | Customer name | John Smith |
| Phone | Text | Contact phone | 541-555-0123 |
| Email | Text | Contact email | john@example.com |
| Address | Text | Property address | 123 Main St |
| City | Text | Property city | Corvallis |
| County | Text | Property county | Benton |
| Services | Text | Comma-separated services | decks, fences |
| Status | Dropdown | Current status | pending, contacted, scheduled, quoted, won, lost |
| Priority | Dropdown | Priority level | low, medium, high, urgent |
| AI Confidence | Number | AI confidence score (0-100) | 85 |
| Estimator | Text | Assigned estimator | Taylor |
| Appointment | Date | Scheduled appointment | 2026-01-20 14:00 |
| Quoted | Currency | Quote amount | $15,000 |
| Won | Checkbox | Job won | TRUE |
| Lost | Checkbox | Job lost | FALSE |
| Revenue | Currency | Actual revenue | $14,500 |
| Drive Folder | Link | Drive folder URL | [Link] |
| Calendar Event | Link | Calendar event URL | [Link] |
| Photos | Number | Photo count | 3 |
| Notes | Text | Internal notes | Customer prefers morning |
| AI Summary | Text | AI-generated summary | Deck needs replacement... |
| Risk Factors | Text | Identified risks | Weather exposure... |

### Additional Tabs

#### "Customers"
- Customer master list
- One row per customer
- Historical estimates
- Repeat customer tracking

#### "Services"
- Service catalog
- Pricing ranges
- Common questions
- AI prompts

#### "Estimators"
- Estimator assignments
- Workload tracking
- Performance metrics

### Sheets Service API

```typescript
interface SheetsService {
  createEstimateRow(estimate: EstimateData): Promise<number>;
  updateEstimateRow(estimateId: string, updates: object): Promise<void>;
  getEstimateRow(estimateId: string): Promise<object>;
  queryEstimates(filter: QueryFilter): Promise<object[]>;
  createCustomerRow(customer: CustomerData): Promise<number>;
  updateCustomerRow(customerId: string, updates: object): Promise<void>;
}
```

### Query Examples

```typescript
// Get pending estimates
const pending = await sheetsService.queryEstimates({
  status: "pending",
  priority: ["high", "urgent"]
});

// Get repeat customers
const repeatCustomers = await sheetsService.queryEstimates({
  customer: { $in: customerHistory }
});

// Get estimates by county
const bentonEstimates = await sheetsService.queryEstimates({
  county: "Benton"
});
```

---

## 4. Gmail Improvements

### Professional Estimate Packet

Instead of plain text, generate a structured HTML email with:

#### Email Structure

```
Subject: Estimate Request: Decks, Fences - John Smith (EST-2026-00418)

[Header: Happy Place Carpentry Logo]

CUSTOMER INFORMATION
────────────────────
Name: John Smith
Email: john@example.com
Phone: 541-555-0123

PROPERTY INFORMATION
────────────────────
Address: 123 Main St, Corvallis, OR 97333
County: Benton
Coordinates: 44.5646, -123.2620

REQUESTED SERVICES
─────────────────
• Deck replacement
• Fence repair

AI SUMMARY
──────────
[AI-generated summary of project scope, materials needed, 
 complexity assessment, and confidence score]

OBSERVATIONS
───────────
[AI-detected observations from photos:
 - Deck shows significant weather damage
 - Fence posts are rotted at ground level
 - Trim needs replacement]

PHOTOS (3)
───────────
[Thumbnail gallery with links to Drive]

MISSING INFORMATION
────────────────────
• Deck dimensions
• Material preferences
• Timeline requirements

RISK FACTORS
────────────
• Weather exposure: High
• Structural concerns: Medium
• Permit requirements: Possible

INTERNAL NOTES
──────────────
[Estimator notes and recommendations]

LINKS
─────
📁 Drive Folder: [Link]
📊 Sheet Record: [Link]
📅 Calendar Event: [Link]
👤 Contact Record: [Link]

Estimate ID: EST-2026-00418
Created: January 15, 2026 at 10:30 AM
```

### Email Service API

```typescript
interface EmailService {
  sendEstimatePacket(estimateId: string, recipient: string): Promise<void>;
  sendCustomerConfirmation(estimateId: string): Promise<void>;
  sendAppointmentReminder(estimateId: string): Promise<void>;
  sendQuote(estimateId: string, quote: QuoteData): Promise<void>;
}
```

### Email Templates

#### Template System
- HTML templates for professional formatting
- Dynamic content insertion
- Branding consistency
- Mobile-responsive design

#### Template Variables
```typescript
interface EmailTemplate {
  estimateId: string;
  customer: CustomerData;
  property: PropertyData;
  services: ServiceData[];
  aiSummary: string;
  observations: string[];
  photos: PhotoData[];
  missingInfo: string[];
  riskFactors: string[];
  internalNotes: string;
  links: {
    drive: string;
    sheet: string;
    calendar: string;
    contact: string;
  };
}
```

---

## 5. Google Calendar Integration

### Event Structure

#### Estimate Requested Event
```json
{
  "title": "New Estimate: EST-2026-00418 - John Smith",
  "description": "Services: Decks, Fences\nAddress: 123 Main St, Corvallis\nPhone: 541-555-0123\n\nDrive: [Link]\nSheet: [Link]",
  "start": "2026-01-15T10:30:00",
  "end": "2026-01-15T11:00:00",
  "location": "123 Main St, Corvallis, OR 97333",
  "attendees": ["taylor@happyplacecarpentry.com"],
  "colorId": "1" // Blue for new estimates
}
```

#### Site Visit Event
```json
{
  "title": "Site Visit: EST-2026-00418 - John Smith",
  "description": "Customer: John Smith\nPhone: 541-555-0123\nServices: Decks, Fences\n\nNotes: Customer prefers morning\n\nDrive: [Link]",
  "start": "2026-01-20T09:00:00",
  "end": "2026-01-20T10:30:00",
  "location": "123 Main St, Corvallis, OR 97333",
  "attendees": ["taylor@happyplacecarpentry.com"],
  "colorId": "5" // Yellow for site visits
}
```

### Calendar Service API

```typescript
interface CalendarService {
  createEstimateEvent(estimateId: string): Promise<string>;
  createSiteVisitEvent(estimateId: string, date: Date): Promise<string>;
  updateEvent(eventId: string, updates: object): Promise<void>;
  deleteEvent(eventId: string): Promise<void>;
  getEventsInRange(start: Date, end: Date): Promise<object[]>;
}
```

### Event Lifecycle

```
Estimate Requested
  ↓
Create "New Estimate" event (draft)
  ↓
Customer Contacted
  ↓
Schedule Site Visit
  ↓
Create "Site Visit" event (confirmed)
  ↓
Estimate Sent
  ↓
Create "Follow-up" event (reminder)
  ↓
Job Scheduled
  ↓
Create "Job Start" event
```

---

## 6. Google Contacts

### Contact Structure

```json
{
  "customerId": "CUST-00123",
  "name": {
    "givenName": "John",
    "familyName": "Smith"
  },
  "emailAddresses": [
    {
      "value": "john@example.com",
      "type": "home",
      "primary": true
    }
  ],
  "phoneNumbers": [
    {
      "value": "541-555-0123",
      "type": "mobile",
      "primary": true
    }
  ],
  "addresses": [
    {
      "streetAddress": "123 Main St",
      "city": "Corvallis",
      "region": "OR",
      "postalCode": "97333",
      "type": "home"
    }
  ],
  "organizations": [
    {
      "name": "Happy Place Carpentry",
      "title": "Customer"
    }
  ],
  "notes": "Customer since 2026. Prefers morning appointments. High-value repeat customer.",
  "userDefinedFields": {
    "customerId": "CUST-00123",
    "leadSource": "website",
    "firstEstimate": "EST-2026-00418",
    "lastEstimate": "EST-2026-00418",
    "totalEstimates": 1,
    "tags": "repeat-customer,high-value"
  }
}
```

### Contact Service API

```typescript
interface ContactsService {
  createOrUpdateCustomer(customer: CustomerData): Promise<string>;
  getCustomerByEmail(email: string): Promise<object>;
  getCustomerById(customerId: string): Promise<object>;
  addEstimateToCustomer(customerId: string, estimateId: string): Promise<void>;
  tagCustomer(customerId: string, tags: string[]): Promise<void>;
  searchCustomers(query: string): Promise<object[]>;
}
```

### Contact Lifecycle

```
Estimate Submitted
  ↓
Search for existing contact (by email)
  ↓
IF contact exists:
  ↓
  Update contact info
  ↓
  Add estimate to history
  ↓
  Update tags
ELSE:
  ↓
  Create new contact
  ↓
  Set lead source
  ↓
  Add estimate to history
```

### Customer Tags

- **repeat-customer**: More than one estimate
- **high-value**: Large project or multiple projects
- **priority-customer**: VIP treatment
- **quick-response**: Responds quickly to outreach
- **needs-follow-up**: Requires additional attention
- **warm-lead**: High conversion probability
- **cold-lead**: Low conversion probability

---

## 7. Estimate Categories

### Service-Specific Categories

Instead of one generic questionnaire, each service category owns:

- **Questions**: Service-specific questionnaire
- **Required Photos**: Mandatory photo types
- **AI Prompts**: Custom analysis instructions
- **Validation**: Category-specific validation rules
- **Estimate Heuristics**: Pricing and scope logic

### Category Definitions

#### Painting
```typescript
const paintingCategory = {
  id: "painting",
  subcategories: ["exterior", "interior", "cabinets", "fence-staining"],
  questions: [
    {
      id: "painting_surface",
      label: "What surfaces need painting?",
      type: "select",
      options: ["Exterior walls", "Interior walls", "Cabinets", "Fence", "Deck", "Trim"],
      required: true
    },
    {
      id: "painting_condition",
      label: "What is the current condition?",
      type: "select",
      options: ["New construction", "Repaint over existing", "Peeling/flaking", "Water damage", "Mold/mildew"],
      required: true
    },
    {
      id: "painting_preparation",
      label: "How much preparation is needed?",
      type: "select",
      options: ["Minimal", "Standard", "Extensive", "Unknown"],
      required: true
    }
  ],
  requiredPhotos: ["overall-view", "close-up-condition", "problem-areas"],
  aiPrompts: {
    analysis: "Analyze paint condition, surface area, preparation needs, and material requirements.",
    risk: "Identify water damage, mold, structural issues, or other risks.",
    materials: "Estimate paint quantity, primer needs, and specialty materials."
  },
  validation: {
    minPhotos: 3,
    maxPhotos: 10,
    allowedFormats: ["jpg", "png", "webp"]
  }
};
```

#### Decks
```typescript
const decksCategory = {
  id: "decks",
  subcategories: ["new-construction", "replacement", "repair", "refinishing"],
  questions: [
    {
      id: "deck_scope",
      label: "What type of deck work do you need?",
      type: "select",
      options: ["Build new deck", "Replace existing deck", "Repair deck", "Refinish deck"],
      required: true
    },
    {
      id: "deck_material",
      label: "Preferred material?",
      type: "select",
      options: ["Composite", "Pressure-treated wood", "Cedar", "Redwood", "Not sure"],
      required: true
    },
    {
      id: "deck_size",
      label: "Approximate deck size?",
      type: "select",
      options: ["Small (under 200 sq ft)", "Medium (200-400 sq ft)", "Large (400-600 sq ft)", "Extra large (600+ sq ft)"],
      required: true
    }
  ],
  requiredPhotos: ["overall-view", "condition-close-up", "structure-details"],
  aiPrompts: {
    analysis: "Analyze deck structure, material condition, size estimation, and safety concerns.",
    risk: "Identify structural issues, rot, water damage, or safety hazards.",
    materials: "Estimate lumber quantity, fasteners, and specialty materials."
  }
};
```

#### Fences
```typescript
const fencesCategory = {
  id: "fences",
  subcategories: ["new-construction", "replacement", "repair", "staining"],
  questions: [
    {
      id: "fence_scope",
      label: "What type of fence work do you need?",
      type: "select",
      options: ["Build new fence", "Replace existing fence", "Repair fence", "Stain/refinish fence"],
      required: true
    },
    {
      id: "fence_material",
      label: "Preferred material?",
      type: "select",
      options: ["Cedar", "Pressure-treated", "Vinyl", "Composite", "Not sure"],
      required: true
    },
    {
      id: "fence_height",
      label: "Desired fence height?",
      type: "select",
      options: ["4 feet", "5 feet", "6 feet", "8 feet", "Not sure"],
      required: true
    }
  ],
  requiredPhotos: ["overall-view", "condition-close-up", "property-boundary"],
  aiPrompts: {
    analysis: "Analyze fence condition, length estimation, material needs, and property boundaries.",
    risk: "Identify property line issues, structural problems, or permit requirements.",
    materials: "Estimate post count, panel quantity, and hardware needs."
  }
};
```

### Category Service API

```typescript
interface CategoryService {
  getCategory(serviceId: string): Category;
  getCategoryQuestions(serviceId: string): Question[];
  getCategoryRequiredPhotos(serviceId: string): string[];
  getCategoryAIPrompts(serviceId: string): AIPrompts;
  validateCategorySubmission(serviceId: string, data: SubmissionData): ValidationResult;
}
```

---

## 8. Backend Service Separation

### Service Architecture

```
EstimateController
        │
        ▼
EstimateService
        │
┌───────┼────────┬──────────┬──────────┬──────────┐
▼       ▼        ▼          ▼          ▼          ▼
ValidationService  StorageService  NotificationService  PhotoService  AISummaryService
        │
        ▼
GoogleWorkspaceService
        │
┌───────┼────────┬──────────┬──────────┐
▼       ▼        ▼          ▼          ▼
DriveService  SheetsService  GmailService  CalendarService  ContactsService
```

### Service Definitions

#### EstimateController
```typescript
interface EstimateController {
  handleSubmission(request: EstimateRequest): Promise<EstimateResponse>;
  handleUpdate(estimateId: string, updates: object): Promise<void>;
  handleQuery(filter: QueryFilter): Promise<Estimate[]>;
}
```

#### EstimateService
```typescript
interface EstimateService {
  createEstimate(request: EstimateRequest): Promise<Estimate>;
  updateEstimate(estimateId: string, updates: object): Promise<Estimate>;
  getEstimate(estimateId: string): Promise<Estimate>;
  listEstimates(filter: QueryFilter): Promise<Estimate[]>;
  deleteEstimate(estimateId: string): Promise<void>;
}
```

#### ValidationService
```typescript
interface ValidationService {
  validateRequest(request: EstimateRequest): ValidationResult;
  validatePhotos(photos: Photo[]): ValidationResult;
  validateCategory(serviceId: string, data: object): ValidationResult;
  sanitizeInput(input: any): any;
}
```

#### StorageService
```typescript
interface StorageService {
  storeEstimate(estimate: Estimate): Promise<void>;
  retrieveEstimate(estimateId: string): Promise<Estimate>;
  updateEstimate(estimateId: string, updates: object): Promise<void>;
  deleteEstimate(estimateId: string): Promise<void>;
}
```

#### NotificationService
```typescript
interface NotificationService {
  sendEstimatePacket(estimateId: string): Promise<void>;
  sendCustomerConfirmation(estimateId: string): Promise<void>;
  sendAppointmentReminder(estimateId: string): Promise<void>;
  sendQuote(estimateId: string, quote: QuoteData): Promise<void>;
}
```

#### PhotoService
```typescript
interface PhotoService {
  uploadPhoto(estimateId: string, file: File): Promise<string>;
  deletePhoto(estimateId: string, photoId: string): Promise<void>;
  getPhotoUrl(estimateId: string, photoId: string): string;
  generateThumbnail(photoId: string): Promise<string>;
}
```

#### AISummaryService
```typescript
interface AISummaryService {
  analyzeEstimate(estimateId: string): Promise<AISummary>;
  analyzePhotos(estimateId: string): Promise<PhotoAnalysis>;
  generateSummary(estimateId: string): Promise<string>;
  detectRisks(estimateId: string): Promise<Risk[]>;
  estimateMaterials(estimateId: string): Promise<MaterialEstimate>;
}
```

#### GoogleWorkspaceService
```typescript
interface GoogleWorkspaceService {
  createEstimateArtifact(estimate: Estimate): Promise<EstimateArtifact>;
  updateEstimateArtifact(estimateId: string, updates: object): Promise<void>;
  syncEstimate(estimateId: string): Promise<void>;
}
```

### Service Dependencies

```
EstimateController
  └─ EstimateService
      ├─ ValidationService
      ├─ StorageService
      ├─ NotificationService
      ├─ PhotoService
      ├─ AISummaryService
      └─ GoogleWorkspaceService
          ├─ DriveService
          ├─ SheetsService
          ├─ GmailService
          ├─ CalendarService
          └─ ContactsService
```

### Service Implementation Pattern

Each service follows this pattern:

```typescript
class ExampleService implements ExampleServiceInterface {
  constructor(
    private dependencies: Dependencies
  ) {}

  async method(input: Input): Promise<Output> {
    try {
      // 1. Validate input
      this.validate(input);

      // 2. Process
      const result = await this.process(input);

      // 3. Return result
      return result;
    } catch (error) {
      // 4. Handle error
      this.handleError(error);
      throw error;
    }
  }

  private validate(input: Input): void {
    // Validation logic
  }

  private async process(input: Input): Promise<Output> {
    // Processing logic
  }

  private handleError(error: Error): void {
    // Error handling logic
  }
}
```

---

## 9. AI Pipeline

### Pipeline Architecture

```
Estimate Submission
        ↓
Normalization
        ↓
┌─────────────────────┐
│  Parallel Analysis │
├─────────────────────┤
│ Vision Analysis    │
│ Scope Detection    │
│ Material Estimation│
│ Risk Detection     │
└─────────────────────┘
        ↓
Missing Information Detection
        ↓
Confidence Scoring
        ↓
Estimator Summary Generation
        ↓
Email Integration
```

### AI Services

#### Vision Analysis
```typescript
interface VisionAnalysis {
  analyzePhotos(estimateId: string): Promise<PhotoAnalysis>;
  detectSurfaces(photos: Photo[]): Promise<Surface[]>;
  detectDamage(photos: Photo[]): Promise<Damage[]>;
  estimateDimensions(photos: Photo[]): Promise<Dimensions>;
}

interface PhotoAnalysis {
  photoId: string;
  surfaces: Surface[];
  damage: Damage[];
  dimensions: Dimensions;
  quality: number;
  confidence: number;
}
```

#### Scope Detection
```typescript
interface ScopeDetection {
  detectScope(estimateId: string): Promise<Scope>;
  estimateComplexity(scope: Scope): number;
  estimateDuration(scope: Scope): Duration;
  estimateLabor(scope: Scope): LaborEstimate;
}

interface Scope {
  services: Service[];
  areas: Area[];
  materials: Material[];
  complexity: number;
  estimatedDuration: Duration;
}
```

#### Material Estimation
```typescript
interface MaterialEstimation {
  estimateMaterials(estimateId: string): Promise<MaterialList>;
  calculateQuantities(scope: Scope): MaterialQuantities;
  estimateCost(materials: MaterialList): CostEstimate;
}

interface MaterialList {
  materials: Material[];
  quantities: MaterialQuantities;
  estimatedCost: CostEstimate;
  confidence: number;
}
```

#### Risk Detection
```typescript
interface RiskDetection {
  detectRisks(estimateId: string): Promise<Risk[]>;
  assessSeverity(risks: Risk[]): RiskAssessment;
  recommendMitigation(risks: Risk[]): Mitigation[];

interface Risk {
  type: string;
  severity: "low" | "medium" | "high";
  description: string;
  location: string;
  mitigation: string;
}
```

#### Summary Generation
```typescript
interface SummaryGeneration {
  generateSummary(estimateId: string): Promise<string>;
  generateObservations(analysis: Analysis): string[];
  generateRecommendations(risks: Risk[]): string[];
  formatSummary(summary: string): string;
}
```

### AI Pipeline API

```typescript
interface AIPipelineService {
  processEstimate(estimateId: string): Promise<AIResult>;
  analyzePhotos(estimateId: string): Promise<PhotoAnalysis>;
  detectScope(estimateId: string): Promise<Scope>;
  estimateMaterials(estimateId: string): Promise<MaterialList>;
  detectRisks(estimateId: string): Promise<Risk[]>;
  generateSummary(estimateId: string): Promise<string>;
  calculateConfidence(estimateId: string): number;
}
```

### AI-Augmented Estimate

The AI augments but never replaces customer responses:

- **Customer answers** are always the primary source of truth
- **AI analysis** provides additional insights and validation
- **Confidence scores** indicate reliability of AI estimates
- **Missing information** is flagged for human review
- **Risk factors** are identified but require human confirmation

---

## 10. Future Integrations

### Tier 1 (High Value - Immediate Priority)

#### Google Drive
- **Status:** Core infrastructure
- **Priority:** Critical
- **Timeline:** Phase 1
- **Value:** Centralized storage, organization, sharing

#### Gmail
- **Status:** Partially implemented
- **Priority:** Critical
- **Timeline:** Phase 1
- **Value:** Professional communication, estimate packets

#### Google Sheets
- **Status:** Not implemented
- **Priority:** High
- **Timeline:** Phase 2
- **Value:** Operational database, searchability, reporting

#### Google Calendar
- **Status:** Not implemented
- **Priority:** High
- **Timeline:** Phase 2
- **Value:** Scheduling, appointment management

#### Google Contacts
- **Status:** Not implemented
- **Priority:** High
- **Timeline:** Phase 2
- **Value:** Customer relationship management, history

### Tier 2 (Enhancement - Medium Priority)

#### Google Maps Geocoding
- **Purpose:** Verify addresses, calculate travel time
- **Integration:** Address validation in estimate wizard
- **Value:** Accurate location data, route planning

#### Google Places
- **Purpose:** Property context, neighborhood analysis
- **Integration:** Property information enrichment
- **Value:** Better understanding of project context

#### Google Vision AI
- **Purpose:** Photo analysis, damage detection
- **Integration:** AI pipeline for photo processing
- **Value:** Automated analysis, risk detection

#### Gemini
- **Purpose:** Estimate summaries, follow-up questions
- **Integration:** AI summary generation
- **Value:** Intelligent analysis, recommendations

### Tier 3 (Business Operations - Lower Priority)

#### QuickBooks
- **Purpose:** Customer and invoice sync
- **Integration:** Post-estimate workflow
- **Value:** Financial management, invoicing

#### Stripe
- **Purpose:** Deposit payments
- **Integration:** Payment processing
- **Value:** Cash flow management, deposits

#### Twilio
- **Purpose:** SMS appointment reminders
- **Integration:** Calendar integration
- **Value:** Communication automation

#### DocuSign
- **Purpose:** Contract signing
- **Integration:** Post-quote workflow
- **Value:** Contract management, signatures

### Tier 4 (Advanced Features - Future)

#### CRM Integration
- **Purpose:** Advanced customer management
- **Integration:** Replace or augment Sheets
- **Value:** Scalable customer management

#### Job Scheduling Software
- **Purpose:** Advanced scheduling
- **Integration:** Calendar enhancement
- **Value:** Resource optimization

#### Material Pricing APIs
- **Purpose:** Real-time pricing
- **Integration:** Estimate accuracy
- **Value:** Competitive pricing

#### Weather API
- **Purpose:** Exterior work planning
- **Integration:** Scheduling optimization
- **Value:** Work planning, timeline accuracy

#### County Permit Lookup
- **Purpose:** Permit requirements
- **Integration:** Regulatory compliance
- **Value:** Compliance, project planning

---

## 11. Long-Term Direction

### Canonical Estimate Record Concept

Rather than thinking of this as a "Google integration," think of it as an **Estimate Intelligence Platform**.

The estimate becomes a canonical record that everything else references:

```
Estimate Wizard
        │
        ▼
Canonical Estimate Record
        │
 ┌──────┼────────┬────────┬────────┬────────┐
 ▼      ▼        ▼        ▼        ▼        ▼
Drive  Gmail   Sheets  Calendar  AI      Contacts
        │
        ▼
Scheduling
        │
        ▼
Job Execution
        │
        ▼
Invoice
        │
        ▼
Customer History
```

### Data Flow

```
1. Estimate Creation
   ↓
2. Canonical Record
   ↓
3. Google Workspace Sync
   ↓
4. AI Analysis
   ↓
5. Human Review
   ↓
6. Quote Generation
   ↓
7. Scheduling
   ↓
8. Job Execution
   ↓
9. Invoice
   ↓
10. Customer History Update
```

### Extensibility

The canonical record enables:

- **Multiple integrations** without data duplication
- **Consistent data** across all systems
- **Audit trail** of all changes
- **Scalability** to new services
- **Data portability** for future systems

### Architecture Principles

1. **Single Source of Truth:** The canonical estimate record is authoritative
2. **Service Independence:** Each Google Workspace service is independent
3. **Async Processing:** Heavy operations (AI, uploads) are async
4. **Error Resilience:** Failures don't block the estimate creation
5. **Data Consistency:** Sync mechanisms ensure consistency
6. **Extensibility:** Easy to add new services and integrations

---

## Implementation Roadmap

### Phase 1: Core Infrastructure (Weeks 1-4)

**Objective:** Establish Google Workspace foundation

**Tasks:**
1. Set up Google Cloud project and credentials
2. Implement Drive service (folder creation, file upload)
3. Implement Gmail service (basic email sending)
4. Implement EstimateController and EstimateService
5. Implement ValidationService
6. Implement basic PhotoService
7. Update /api/estimate to use new services
8. Deploy and test

**Deliverables:**
- Drive folder creation per estimate
- Basic email notification
- Photo upload to Drive
- Service separation architecture

### Phase 2: Operational Database (Weeks 5-8)

**Objective:** Implement Sheets and Calendar integration

**Tasks:**
1. Implement Sheets service (row creation, updates)
2. Design and create Sheets schema
3. Implement Calendar service (event creation)
4. Implement Contacts service (contact creation/update)
5. Implement GoogleWorkspaceService orchestration
6. Add estimate ID generation
7. Implement professional email templates
8. Deploy and test

**Deliverables:**
- Sheets operational database
- Calendar event creation
- Contacts integration
- Professional estimate packets
- Estimate ID system

### Phase 3: AI Integration (Weeks 9-12)

**Objective:** Implement AI pipeline

**Tasks:**
1. Set up Vision AI integration
2. Implement photo analysis
3. Implement scope detection
4. Implement material estimation
5. Implement risk detection
6. Implement summary generation
7. Integrate AI into email templates
8. Deploy and test

**Deliverables:**
- Photo analysis
- AI-generated summaries
- Risk detection
- Material estimation
- Confidence scoring

### Phase 4: Service Categories (Weeks 13-16)

**Objective:** Implement service-specific categories

**Tasks:**
1. Define category structure
2. Implement painting category
3. Implement decks category
4. Implement fences category
5. Implement pergolas category
6. Implement repairs category
7. Update wizard to use categories
8. Deploy and test

**Deliverables:**
- Service-specific questionnaires
- Category-specific AI prompts
- Category-specific validation
- Required photo enforcement

### Phase 5: Advanced Features (Weeks 17-20)

**Objective:** Implement advanced integrations

**Tasks:**
1. Implement Google Maps geocoding
2. Implement Google Places integration
3. Implement advanced email templates
4. Implement appointment reminders
5. Implement quote generation
6. Implement customer history tracking
7. Deploy and test

**Deliverables:**
- Address validation
- Property context
- Advanced email features
- Appointment automation
- Quote generation

### Phase 6: Business Operations (Weeks 21-24)

**Objective:** Implement business operations integrations

**Tasks:**
1. Implement QuickBooks integration (optional)
2. Implement Stripe integration (optional)
3. Implement Twilio integration (optional)
4. Implement DocuSign integration (optional)
5. Implement reporting dashboards
6. Implement analytics
7. Deploy and test

**Deliverables:**
- Financial integration (optional)
- Communication automation (optional)
- Contract management (optional)
- Reporting and analytics

---

## Technical Specifications

### Authentication

**Google OAuth 2.0 Flow:**
1. User authenticates with Google
2. Refresh token stored securely
3. Service account for server operations
4. Token refresh mechanism

**Security:**
- Refresh tokens stored in environment variables
- Service account for Drive/Sheets/Calendar access
- API key for Vision AI
- Rate limiting and quota management

### Error Handling

**Service-Level Error Handling:**
```typescript
try {
  await driveService.createFolder(estimateId);
} catch (error) {
  if (error instanceof QuotaExceededError) {
    // Handle quota exceeded
  } else if (error instanceof AuthenticationError) {
    // Handle auth failure
  } else {
    // Handle generic error
  }
}
```

**Fallback Mechanisms:**
- Drive failure: Continue without folder creation
- Sheets failure: Continue without row creation
- Gmail failure: Fallback to mailto
- AI failure: Continue without AI analysis

### Monitoring

**Metrics to Track:**
- Estimate submission rate
- Service success rates
- API response times
- Error rates by service
- AI confidence scores
- Photo upload success rates

**Logging:**
- Structured logging
- Error tracking
- Performance monitoring
- Audit trail

### Testing

**Unit Tests:**
- Service layer tests
- Validation tests
- AI pipeline tests

**Integration Tests:**
- Google Workspace service tests
- End-to-end estimate flow tests
- Error handling tests

**Manual Testing:**
- User acceptance testing
- Performance testing
- Security testing

---

## Conclusion

This architecture transforms the Happy Place estimate system from a simple form submission into a comprehensive Estimate Intelligence Platform. The canonical estimate record serves as the foundation for all operations, enabling scalability, extensibility, and data consistency across all integrations.

The phased implementation approach ensures incremental value delivery while building toward the complete vision. Each phase delivers functional improvements that can be used immediately while laying groundwork for future enhancements.

**Key Benefits:**
- Centralized estimate management
- Professional customer communication
- Operational visibility through Sheets
- Automated scheduling through Calendar
- Customer relationship management through Contacts
- AI-powered insights and analysis
- Extensible architecture for future integrations
- Data consistency across all systems

**Next Steps:**
1. Review and approve this specification
2. Set up Google Cloud project
3. Begin Phase 1 implementation
4. Establish development and testing environments
5. Create detailed task breakdown for Phase 1

---

## 12. Canonical Estimate Domain Model

### Current State vs. Target State

**Current State:** Estimate is primarily a request object with transient data.

**Target State:** Estimate becomes a long-lived business object that persists through the entire customer lifecycle.

### Domain Model Structure

```typescript
interface Estimate {
  // Identity
  estimateId: string; // EST-YYYY-NNNNN
  version: number;
  createdAt: Date;
  updatedAt: Date;
  
  // Customer
  customer: Customer;
  
  // Property
  property: Property;
  
  // Services
  services: Service[];
  
  // Scope
  scope: Scope;
  
  // Observations
  observations: Observation[];
  
  // Measurements
  measurements: Measurement[];
  
  // Photos
  photos: Photo[];
  
  // AI Analysis
  aiAnalysis: AIAnalysis;
  
  // Scheduling
  scheduling: Scheduling;
  
  // Pricing
  pricing: Pricing;
  
  // Communications
  communications: Communication[];
  
  // Documents
  documents: Document[];
  
  // Status History
  statusHistory: StatusTransition[];
  
  // Audit Trail
  auditTrail: AuditEvent[];
}
```

### Reference Principle

**Critical Rule:** Everything references the Estimate ID.

- ✅ `estimateId: "EST-2026-00418"`
- ❌ `email: "john@example.com"`
- ❌ `filename: "overview.jpg"`
- ❌ `driveId: "1AbCdEfGhIjKlMnOpQrStUvWxYz"`

### Sub-Domain Models

#### Customer
```typescript
interface Customer {
  customerId: string; // CUST-NNNNN
  name: string;
  email: string;
  phone: string;
  addresses: Address[];
  preferences: CustomerPreferences;
  history: EstimateReference[];
  tags: string[];
  leadSource: string;
  firstContactDate: Date;
  lastContactDate: Date;
}
```

#### Property
```typescript
interface Property {
  propertyId: string; // PROP-NNNNN
  address: string;
  city: string;
  county: string;
  state: string;
  zip: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  propertyType: string;
  yearBuilt?: number;
  accessNotes: string;
  photos: string[]; // Photo IDs, not filenames
}
```

#### Service
```typescript
interface Service {
  serviceId: string;
  category: string;
  subcategory: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  questions: QuestionAnswer[];
  requiredPhotos: string[];
  status: "pending" | "in-progress" | "completed";
}
```

#### Scope
```typescript
interface Scope {
  areas: Area[];
  materials: Material[];
  complexity: number;
  estimatedDuration: Duration;
  estimatedLabor: LaborEstimate;
  completeness: number;
}
```

#### Observation
```typescript
interface Observation {
  observationId: string;
  source: "customer" | "ai" | "estimator";
  statement: string;
  fact?: Fact;
  interpretation?: Interpretation;
  estimatorReview?: EstimatorReview;
  status: "pending" | "accepted" | "rejected";
  confidence: number;
  createdAt: Date;
}
```

#### Measurement
```typescript
interface Measurement {
  measurementId: string;
  type: string;
  value: number;
  unit: string;
  source: "customer" | "ai" | "estimator";
  accuracy: number;
  location: string;
}
```

#### Photo
```typescript
interface Photo {
  photoId: string; // PHOTO-NNNNN
  estimateId: string;
  uploadDate: Date;
  category: string;
  description: string;
  exif: EXIFData;
  analysis: PhotoAnalysis;
  thumbnails: Thumbnail[];
  quality: number;
}
```

#### AI Analysis
```typescript
interface AIAnalysis {
  analysisId: string;
  estimateId: string;
  summary: string;
  confidence: number;
  risks: Risk[];
  recommendations: Recommendation[];
  materialEstimates: MaterialEstimate[];
  scopeDetection: ScopeDetection;
  photoAnalysis: PhotoAnalysis[];
  generatedAt: Date;
}
```

#### Scheduling
```typescript
interface Scheduling {
  appointmentId?: string;
  scheduledDate?: Date;
  duration?: Duration;
  status: "none" | "requested" | "scheduled" | "completed" | "cancelled";
  calendarEventId?: string;
  reminders: Reminder[];
}
```

#### Pricing
```typescript
interface Pricing {
  estimateId: string;
  preliminaryRange: PriceRange;
  detailedQuote?: DetailedQuote;
  actualCost?: ActualCost;
  currency: string;
  lastUpdated: Date;
}
```

#### Communication
```typescript
interface Communication {
  communicationId: string;
  type: "email" | "phone" | "sms" | "in-person";
  direction: "inbound" | "outbound";
  participants: string[];
  subject: string;
  content: string;
  timestamp: Date;
  relatedDocuments: string[];
}
```

#### Document
```typescript
interface Document {
  documentId: string;
  type: "estimate" | "quote" | "contract" | "invoice" | "warranty" | "change-order";
  title: string;
  url: string;
  generatedAt: Date;
  version: number;
  status: "draft" | "sent" | "signed" | "expired";
}
```

#### Status Transition
```typescript
interface StatusTransition {
  from: EstimateStatus;
  to: EstimateStatus;
  timestamp: Date;
  reason: string;
  actor: string;
}
```

#### Audit Event
```typescript
interface AuditEvent {
  eventId: string;
  eventType: string;
  estimateId: string;
  timestamp: Date;
  actor: string;
  changes: Record<string, any>;
  metadata: Record<string, any>;
}
```

### Reference Implementation

```typescript
// BAD: Direct references
const estimate = {
  customerEmail: "john@example.com",
  photoFilename: "overview.jpg",
  driveFolderId: "1AbCdEfGhIjKlMnOpQrStUvWxYz"
};

// GOOD: ID-based references
const estimate = {
  customer: {
    customerId: "CUST-00123"
  },
  photos: [
    {
      photoId: "PHOTO-00456"
    }
  ],
  documents: {
    driveFolder: {
      folderId: "FOLDER-00789"
    }
  }
};
```

---

## 13. Lifecycle State Machine

### Complete Lifecycle

```
Draft
  ↓ (user submits)
Submitted
  ↓ (validation passes)
Needs Information
  ↓ (information complete)
AI Reviewed
  ↓ (AI analysis complete)
Human Reviewed
  ↓ (estimator review complete)
Site Visit Scheduled
  ↓ (visit completed)
Site Visit Complete
  ↓ (quote drafted)
Quote Drafted
  ↓ (quote sent)
Quote Sent
  ↓ (customer responds)
Negotiation
  ↓ (customer accepts)
Accepted
  ↓ (job scheduled)
Scheduled
  ↓ (work begins)
In Progress
  ↓ (work complete)
Completed
  ↓ (warranty period)
Warranty
  ↓ (archived)
Archived
```

### State Definitions

#### Draft
- **Description:** Estimate is being created by user
- **Triggers:** User starts wizard, draft recovered
- **Valid Transitions:** Submitted, Archived (abandoned)
- **Duration:** Unlimited (7-day auto-expiry)

#### Submitted
- **Description:** Estimate submitted for processing
- **Triggers:** User clicks submit
- **Valid Transitions:** Needs Information, AI Reviewed
- **Duration:** < 1 hour

#### Needs Information
- **Description:** Missing required information
- **Triggers:** Validation fails, AI detects gaps
- **Valid Transitions:** Submitted (re-submit), AI Reviewed (complete)
- **Duration:** Until complete

#### AI Reviewed
- **Description:** AI analysis completed
- **Triggers:** Information complete, AI pipeline finished
- **Valid Transitions:** Human Reviewed
- **Duration:** < 5 minutes

#### Human Reviewed
- **Description:** Estimator reviewed estimate
- **Triggers:** Estimator review complete
- **Valid Transitions:** Site Visit Scheduled, Quote Drafted
- **Duration:** < 24 hours

#### Site Visit Scheduled
- **Description:** Appointment scheduled
- **Triggers:** Estimator schedules visit
- **Valid Transitions:** Site Visit Complete, Cancelled
- **Duration:** Until visit date

#### Site Visit Complete
- **Description:** On-site visit completed
- **Triggers:** Visit finished
- **Valid Transitions:** Quote Drafted
- **Duration:** < 1 hour

#### Quote Drafted
- **Description:** Quote prepared
- **Triggers:** Estimator drafts quote
- **Valid Transitions:** Quote Sent
- **Duration:** < 4 hours

#### Quote Sent
- **Description:** Quote sent to customer
- **Triggers:** Quote delivered
- **Valid Transitions:** Negotiation, Accepted, Lost
- **Duration:** Until response

#### Negotiation
- **Description:** Customer negotiating terms
- **Triggers:** Customer responds with questions/changes
- **Valid Transitions:** Quote Drafted (revision), Quote Sent (new version), Accepted, Lost
- **Duration:** Until agreement

#### Accepted
- **Description:** Customer accepted quote
- **Triggers:** Customer signs/agrees
- **Valid Transitions:** Scheduled
- **Duration:** < 48 hours

#### Scheduled
- **Description:** Job scheduled
- **Triggers:** Work scheduled
- **Valid Transitions:** In Progress, Cancelled
- **Duration:** Until start date

#### In Progress
- **Description:** Work in progress
- **Triggers:** Work begins
- **Valid Transitions:** Completed, Paused
- **Duration:** Until completion

#### Completed
- **Description:** Work completed
- **Triggers:** Work finished
- **Valid Transitions:** Warranty
- **Duration:** Until warranty period

#### Warranty
- **Description:** Warranty period active
- **Triggers:** Completion + warranty period
- **Valid Transitions:** Archived
- **Duration:** Warranty period (typically 1-5 years)

#### Archived
- **Description:** Estimate archived
- **Triggers:** Warranty expired, customer lost, abandoned
- **Valid Transitions:** None (terminal state)
- **Duration:** Permanent

### State Transition Rules

```typescript
interface StateTransition {
  from: EstimateStatus;
  to: EstimateStatus;
  trigger: string;
  validation: (estimate: Estimate) => boolean;
  sideEffects: (estimate: Estimate) => Promise<void>;
}

const transitions: StateTransition[] = [
  {
    from: "draft",
    to: "submitted",
    trigger: "user_submit",
    validation: (e) => e.customer.email && e.property.city,
    sideEffects: async (e) => {
      await sendNotification(e);
      await createCalendarEvent(e);
    }
  },
  // ... additional transitions
];
```

### State Machine Implementation

```typescript
class EstimateStateMachine {
  private currentState: EstimateStatus;
  private transitions: Map<string, StateTransition[]>;

  constructor(initialState: EstimateStatus) {
    this.currentState = initialState;
    this.transitions = new Map();
  }

  canTransition(to: EstimateStatus): boolean {
    const validTransitions = this.transitions.get(this.currentState) || [];
    return validTransitions.some(t => t.to === to);
  }

  async transition(to: EstimateStatus, trigger: string, estimate: Estimate): Promise<void> {
    if (!this.canTransition(to)) {
      throw new Error(`Invalid transition from ${this.currentState} to ${to}`);
    }

    const transition = this.findTransition(to, trigger);
    if (!transition.validation(estimate)) {
      throw new Error("Validation failed");
    }

    await transition.sideEffects(estimate);
    
    this.recordTransition(this.currentState, to, trigger);
    this.currentState = to;
  }

  private findTransition(to: EstimateStatus, trigger: string): StateTransition {
    const validTransitions = this.transitions.get(this.currentState) || [];
    return validTransitions.find(t => t.to === to && t.trigger === trigger)!;
  }

  private recordTransition(from: EstimateStatus, to: EstimateStatus, trigger: string): void {
    // Record in status history
  }
}
```

### Timestamp Requirements

Every transition must be explicitly timestamped:

```typescript
interface StatusTransition {
  from: EstimateStatus;
  to: EstimateStatus;
  timestamp: Date;
  reason: string;
  actor: string;
  metadata?: Record<string, any>;
}
```

---

## 14. Event Log (Event Sourcing)

### Event Log Concept

Instead of mutating records silently, every change is an event. This provides:

- **Replayability:** Reconstruct state from events
- **Auditability:** Complete change history
- **Debugging:** Trace exact sequence of changes
- **Rollback:** Revert to previous state

### Event Types

#### Estimate Events
```typescript
interface EstimateCreated {
  eventType: "EstimateCreated";
  estimateId: string;
  customerId: string;
  propertyId: string;
  timestamp: Date;
}

interface QuestionAnswered {
  eventType: "QuestionAnswered";
  estimateId: string;
  questionId: string;
  answer: string | boolean | number;
  timestamp: Date;
}

interface PhotoUploaded {
  eventType: "PhotoUploaded";
  estimateId: string;
  photoId: string;
  category: string;
  timestamp: Date;
}

interface DraftRecovered {
  eventType: "DraftRecovered";
  estimateId: string;
  recoveredAt: Date;
  timestamp: Date;
}

interface SubmissionValidated {
  eventType: "SubmissionValidated";
  estimateId: string;
  validation: ValidationResult;
  timestamp: Date;
}

interface AISummaryGenerated {
  eventType: "AISummaryGenerated";
  estimateId: string;
  summary: string;
  confidence: number;
  timestamp: Date;
}

interface AppointmentScheduled {
  eventType: "AppointmentScheduled";
  estimateId: string;
  appointmentId: string;
  scheduledDate: Date;
  timestamp: Date;
}

interface QuoteSent {
  eventType: "QuoteSent";
  estimateId: string;
  quoteId: string;
  amount: number;
  timestamp: Date;
}

interface CustomerAccepted {
  eventType: "CustomerAccepted";
  estimateId: string;
  quoteId: string;
  acceptedAt: Date;
  timestamp: Date;
}

interface StatusChanged {
  eventType: "StatusChanged";
  estimateId: string;
  from: EstimateStatus;
  to: EstimateStatus;
  reason: string;
  actor: string;
  timestamp: Date;
}
```

### Event Log Structure

```typescript
interface EventStore {
  append(event: DomainEvent): Promise<void>;
  getEvents(estimateId: string): Promise<DomainEvent[]>;
  getEventsSince(estimateId: string, version: number): Promise<DomainEvent[]>;
  replay(estimateId: string, toVersion?: number): Estimate;
}
```

### Event Implementation

```typescript
class EventLog {
  private events: Map<string, DomainEvent[]> = new Map();

  async append(event: DomainEvent): Promise<void> {
    const estimateEvents = this.events.get(event.estimateId) || [];
    estimateEvents.push(event);
    this.events.set(event.estimateId, estimateEvents);
    
    // Persist to storage
    await this.persistEvent(event);
  }

  async getEvents(estimateId: string): Promise<DomainEvent[]> {
    return this.events.get(estimateId) || [];
  }

  replay(estimateId: string): Estimate {
    const events = this.events.get(estimateId) || [];
    let estimate = new Estimate();

    for (const event of events) {
      estimate = this.applyEvent(estimate, event);
    }

    return estimate;
  }

  private applyEvent(estimate: Estimate, event: DomainEvent): Estimate {
    switch (event.eventType) {
      case "EstimateCreated":
        return this.handleEstimateCreated(estimate, event);
      case "QuestionAnswered":
        return this.handleQuestionAnswered(estimate, event);
      case "PhotoUploaded":
        return this.handlePhotoUploaded(estimate, event);
      // ... other event handlers
      default:
        return estimate;
    }
  }

  private handleEstimateCreated(estimate: Estimate, event: EstimateCreated): Estimate {
    estimate.estimateId = event.estimateId;
    estimate.customer = { customerId: event.customerId };
    estimate.property = { propertyId: event.propertyId };
    estimate.createdAt = event.timestamp;
    return estimate;
  }

  private handleQuestionAnswered(estimate: Estimate, event: QuestionAnswered): Estimate {
    estimate.services[0].questions.push({
      questionId: event.questionId,
      answer: event.answer
    });
    return estimate;
  }

  private handlePhotoUploaded(estimate: Estimate, event: PhotoUploaded): Estimate {
    estimate.photos.push({
      photoId: event.photoId,
      category: event.category,
      uploadDate: event.timestamp
    });
    return estimate;
  }

  private async persistEvent(event: DomainEvent): Promise<void> {
    // Persist to storage (Sheets, database, etc.)
  }
}
```

### Event Sourcing Benefits

#### Replayability
```typescript
// Reconstruct estimate at any point in time
const estimateAtVersion = eventLog.replayToVersion("EST-2026-00418", 15);
```

#### Auditability
```typescript
// Get complete change history
const events = await eventLog.getEvents("EST-2026-00418");
events.forEach(e => console.log(`${e.timestamp}: ${e.eventType}`));
```

#### Debugging
```typescript
// Trace exact sequence of changes
const events = await eventLog.getEvents("EST-2026-00418");
const photoUploadEvents = events.filter(e => e.eventType === "PhotoUploaded");
```

#### Rollback
```typescript
// Revert to previous state
const previousVersion = estimate.version - 1;
const previousState = eventLog.replayToVersion("EST-2026-00418", previousVersion);
```

---

## 15. Plugin-Based Question Categories

### Plugin Architecture

Instead of hardcoding questions into the wizard, each service is a plugin that owns:

- **Questions:** Service-specific questionnaire
- **Validation:** Category-specific validation rules
- **Photo Requirements:** Mandatory photo types
- **AI Prompts:** Custom analysis instructions
- **Completeness Rules:** When the category is complete

### Plugin Interface

```typescript
interface ServicePlugin {
  id: string;
  name: string;
  category: string;
  
  // Questions
  getQuestions(): Question[];
  validateAnswers(answers: Record<string, any>): ValidationResult;
  
  // Photos
  getRequiredPhotoCategories(): string[];
  validatePhotos(photos: Photo[]): ValidationResult;
  
  // AI
  getAIPrompts(): AIPrompts;
  processAIAnalysis(analysis: AIAnalysis): ProcessedAnalysis;
  
  // Completeness
  calculateReadiness(answers: Record<string, any>, photos: Photo[]): ReadinessScore;
  getMissingInformation(answers: Record<string, any>, photos: Photo[]): MissingInfo[];
}
```

### Plugin Implementations

#### PaintingPlugin
```typescript
class PaintingPlugin implements ServicePlugin {
  id = "painting";
  name = "Painting";
  category = "painting";

  getQuestions(): Question[] {
    return [
      {
        id: "painting_surface",
        label: "What surfaces need painting?",
        type: "select",
        options: ["Exterior walls", "Interior walls", "Cabinets", "Fence", "Deck", "Trim"],
        required: true
      },
      {
        id: "painting_condition",
        label: "What is the current condition?",
        type: "select",
        options: ["New construction", "Repaint over existing", "Peeling/flaking", "Water damage", "Mold/mildew"],
        required: true
      },
      {
        id: "painting_preparation",
        label: "How much preparation is needed?",
        type: "select",
        options: ["Minimal", "Standard", "Extensive", "Unknown"],
        required: true
      },
      {
        id: "painting_square_footage",
        label: "Approximate square footage?",
        type: "number",
        required: false,
        help: "Optional - helps with accuracy"
      }
    ];
  }

  validateAnswers(answers: Record<string, any>): ValidationResult {
    const issues: string[] = [];
    
    if (!answers.painting_surface) {
      issues.push("Surface type is required");
    }
    
    if (!answers.painting_condition) {
      issues.push("Condition is required");
    }
    
    if (answers.painting_condition === "Water damage" && !answers.painting_square_footage) {
      issues.push("Square footage required for water damage projects");
    }
    
    return {
      valid: issues.length === 0,
      issues
    };
  }

  getRequiredPhotoCategories(): string[] {
    return ["overall-view", "condition-close-up", "problem-areas"];
  }

  validatePhotos(photos: Photo[]): ValidationResult {
    const categories = new Set(photos.map(p => p.category));
    const required = this.getRequiredPhotoCategories();
    const missing = required.filter(r => !categories.has(r));
    
    return {
      valid: missing.length === 0,
      issues: missing.map(m => `Missing photo category: ${m}`)
    };
  }

  getAIPrompts(): AIPrompts {
    return {
      analysis: "Analyze paint condition, surface area, preparation needs, and material requirements.",
      risk: "Identify water damage, mold, structural issues, or other risks.",
      materials: "Estimate paint quantity, primer needs, and specialty materials.",
      scope: "Determine if power washing, scraping, or sanding is needed."
    };
  }

  processAIAnalysis(analysis: AIAnalysis): ProcessedAnalysis {
    // Process AI analysis for painting-specific insights
    return {
      ...analysis,
      paintingSpecific: {
        surfaceCondition: analysis.risks.filter(r => r.type === "surface"),
        prepWork: analysis.recommendations.filter(r => r.category === "preparation")
      }
    };
  }

  calculateReadiness(answers: Record<string, any>, photos: Photo[]): ReadinessScore {
    let score = 0;
    const weights = {
      answers: 0.4,
      photos: 0.6
    };

    // Answer readiness
    const requiredQuestions = this.getQuestions().filter(q => q.required);
    const answeredRequired = requiredQuestions.filter(q => answers[q.id]);
    score += (answeredRequired.length / requiredQuestions.length) * weights.answers * 100;

    // Photo readiness
    const photoValidation = this.validatePhotos(photos);
    if (photoValidation.valid) {
      score += weights.photos * 100;
    } else {
      const required = this.getRequiredPhotoCategories();
      const present = new Set(photos.map(p => p.category));
      const presentCount = required.filter(r => present.has(r)).length;
      score += (presentCount / required.length) * weights.photos * 100;
    }

    return {
      overall: Math.round(score),
      answers: Math.round((answeredRequired.length / requiredQuestions.length) * 100),
      photos: Math.round((present.size / required.length) * 100)
    };
  }

  getMissingInformation(answers: Record<string, any>, photos: Photo[]): MissingInfo[] {
    const missing: MissingInfo[] = [];
    
    const requiredQuestions = this.getQuestions().filter(q => q.required);
    requiredQuestions.forEach(q => {
      if (!answers[q.id]) {
        missing.push({
          type: "answer",
          field: q.id,
          label: q.label,
          priority: "high"
        });
      }
    });

    const photoValidation = this.validatePhotos(photos);
    photoValidation.issues.forEach(issue => {
      missing.push({
        type: "photo",
        field: issue,
        label: issue,
        priority: "high"
      });
    });

    return missing;
  }
}
```

#### RepairsPlugin
```typescript
class RepairsPlugin implements ServicePlugin {
  id = "repairs";
  name = "Repairs";
  category = "repairs";

  getQuestions(): Question[] {
    return [
      {
        id: "repair_type",
        label: "What type of repair do you need?",
        type: "select",
        options: ["Drywall repair", "Trim repair", "Door repair", "Window repair", "Flooring repair", "Other"],
        required: true
      },
      {
        id: "repair_urgency",
        label: "How urgent is this repair?",
        type: "select",
        options: ["Emergency", "This week", "This month", "Flexible"],
        required: true
      },
      {
        id: "repair_description",
        label: "Please describe the issue",
        type: "textarea",
        required: true
      }
    ];
  }

  // ... similar implementation for other methods
}
```

### Plugin Registry

```typescript
class PluginRegistry {
  private plugins: Map<string, ServicePlugin> = new Map();

  register(plugin: ServicePlugin): void {
    this.plugins.set(plugin.id, plugin);
  }

  get(id: string): ServicePlugin | undefined {
    return this.plugins.get(id);
  }

  getByCategory(category: string): ServicePlugin[] {
    return Array.from(this.plugins.values()).filter(p => p.category === category);
  }

  getAll(): ServicePlugin[] {
    return Array.from(this.plugins.values());
  }
}

// Register plugins
const registry = new PluginRegistry();
registry.register(new PaintingPlugin());
registry.register(new RepairsPlugin());
registry.register(new FlooringPlugin());
registry.register(new DeckPlugin());
registry.register(new FencePlugin());
registry.register(new BathroomPlugin());
registry.register(new PergolaPlugin());
registry.register(new OutdoorStructuresPlugin());
```

### Plugin Usage in Wizard

```typescript
// Get plugin for selected service
const plugin = registry.get(selectedService);
const questions = plugin.getQuestions();
const requiredPhotos = plugin.getRequiredPhotoCategories();

// Validate answers
const validation = plugin.validateAnswers(answers);

// Calculate readiness
const readiness = plugin.calculateReadiness(answers, photos);

// Get missing information
const missing = plugin.getMissingInformation(answers, photos);
```

### Benefits of Plugin Architecture

1. **Easy to Add Services:** New service = new plugin
2. **Service-Specific Logic:** Each service owns its rules
3. **Testability:** Each plugin can be tested independently
4. **Maintainability:** Changes isolated to specific plugins
5. **Extensibility:** Easy to add new plugin features

---

## 16. AI Readiness Score

### Concept

Instead of just "confidence," calculate how complete the intake is for each service category.

### Readiness Calculation

```typescript
interface ReadinessScore {
  overall: number;
  breakdown: {
    customer: number;
    property: number;
    services: number;
    photos: number;
    measurements: number;
    description: number;
  };
  missing: MissingInfo[];
}

interface MissingInfo {
  type: "answer" | "photo" | "measurement";
  field: string;
  label: string;
  priority: "high" | "medium" | "low";
}
```

### Calculation Logic

```typescript
class ReadinessCalculator {
  calculate(estimate: Estimate, plugin: ServicePlugin): ReadinessScore {
    const breakdown = {
      customer: this.calculateCustomerReadiness(estimate),
      property: this.calculatePropertyReadiness(estimate),
      services: this.calculateServicesReadiness(estimate, plugin),
      photos: this.calculatePhotosReadiness(estimate, plugin),
      measurements: this.calculateMeasurementsReadiness(estimate),
      description: this.calculateDescriptionReadiness(estimate)
    };

    const weights = {
      customer: 0.15,
      property: 0.15,
      services: 0.25,
      photos: 0.25,
      measurements: 0.10,
      description: 0.10
    };

    const overall = Object.entries(breakdown).reduce((sum, [key, value]) => {
      return sum + (value * weights[key as keyof typeof weights]);
    }, 0);

    const missing = this.aggregateMissingInfo(estimate, plugin);

    return {
      overall: Math.round(overall),
      breakdown,
      missing
    };
  }

  private calculateCustomerReadiness(estimate: Estimate): number {
    const required = ["name", "email", "phone"];
    const present = required.filter(field => estimate.customer[field]);
    return (present.length / required.length) * 100;
  }

  private calculatePropertyReadiness(estimate: Estimate): number {
    const required = ["city", "county"];
    const present = required.filter(field => estimate.property[field]);
    let score = (present.length / required.length) * 100;
    
    if (estimate.property.address) score += 10;
    if (estimate.property.coordinates) score += 10;
    
    return Math.min(score, 100);
  }

  private calculateServicesReadiness(estimate: Estimate, plugin: ServicePlugin): number {
    const validation = plugin.validateAnswers(
      estimate.services[0].questions.reduce((acc, q) => {
        acc[q.questionId] = q.answer;
        return acc;
      }, {} as Record<string, any>)
    );
    return validation.valid ? 100 : 50;
  }

  private calculatePhotosReadiness(estimate: Estimate, plugin: ServicePlugin): number {
    const validation = plugin.validatePhotos(estimate.photos);
    if (validation.valid) return 100;
    
    const required = plugin.getRequiredPhotoCategories();
    const present = new Set(estimate.photos.map(p => p.category));
    return (present.size / required.length) * 100;
  }

  private calculateMeasurementsReadiness(estimate: Estimate): number {
    if (estimate.measurements.length > 0) return 100;
    return 0;
  }

  private calculateDescriptionReadiness(estimate: Estimate): number {
    const hasDescription = estimate.services.some(s => 
      s.questions.some(q => q.questionId === "repair_description" && q.answer)
    );
    return hasDescription ? 100 : 0;
  }

  private aggregateMissingInfo(estimate: Estimate, plugin: ServicePlugin): MissingInfo[] {
    const missing: MissingInfo[] = [];
    
    // Customer missing
    if (!estimate.customer.name) {
      missing.push({ type: "answer", field: "name", label: "Customer name", priority: "high" });
    }
    if (!estimate.customer.email) {
      missing.push({ type: "answer", field: "email", label: "Email address", priority: "high" });
    }
    
    // Property missing
    if (!estimate.property.city) {
      missing.push({ type: "answer", field: "city", label: "City", priority: "high" });
    }
    
    // Service missing
    const serviceValidation = plugin.validateAnswers(
      estimate.services[0].questions.reduce((acc, q) => {
        acc[q.questionId] = q.answer;
        return acc;
      }, {} as Record<string, any>)
    );
    serviceValidation.issues.forEach(issue => {
      missing.push({ type: "answer", field: issue, label: issue, priority: "high" });
    });
    
    // Photos missing
    const photoValidation = plugin.validatePhotos(estimate.photos);
    photoValidation.issues.forEach(issue => {
      missing.push({ type: "photo", field: issue, label: issue, priority: "medium" });
    });
    
    return missing;
  }
}
```

### Readiness Display

```
Overall Readiness: 82%

Breakdown:
├─ Customer Information: 100%
├─ Property: 95%
├─ Services: 90%
├─ Photos: 80%
├─ Measurements: 45%
└─ Damage Description: 90%

Missing Information:
├─ [HIGH] Deck dimensions
├─ [MEDIUM] Close-up of damaged area
└─ [LOW] Material preference
```

### Readiness-Based Actions

```typescript
function getReadinessActions(readiness: ReadinessScore): Action[] {
  if (readiness.overall >= 90) {
    return [
      { action: "proceed", message: "Ready for AI review" }
    ];
  } else if (readiness.overall >= 70) {
    return [
      { action: "request_info", message: "Request missing information", fields: readiness.missing }
    ];
  } else {
    return [
      { action: "block", message: "Insufficient information", fields: readiness.missing }
    ];
  }
}
```

---

## 17. Observation Model

### Concept

Separate what the customer says from what the system infers. This prevents AI assumptions from being treated as customer facts.

### Observation Pipeline

```
Customer Statement
  ↓
Observed Fact
  ↓
Possible Interpretation
  ↓
Estimator Review
  ↓
Accepted Observation
```

### Observation Structure

```typescript
interface Observation {
  observationId: string;
  estimateId: string;
  
  // Source
  source: "customer" | "ai" | "estimator";
  sourceId?: string; // Question ID or Photo ID
  
  // Content
  statement: string;
  fact?: Fact;
  interpretation?: Interpretation;
  estimatorReview?: EstimatorReview;
  
  // Status
  status: "pending" | "accepted" | "rejected";
  confidence: number;
  
  // Metadata
  category: string;
  priority: "low" | "medium" | "high";
  createdAt: Date;
  reviewedAt?: Date;
}

interface Fact {
  factId: string;
  type: string;
  value: any;
  evidence: string[];
  confidence: number;
}

interface Interpretation {
  interpretationId: string;
  hypothesis: string;
  reasoning: string;
  alternatives: string[];
  confidence: number;
}

interface EstimatorReview {
  reviewerId: string;
  decision: "accept" | "reject" | "modify";
  notes: string;
  modifiedValue?: any;
  reviewedAt: Date;
}
```

### Observation Examples

#### Customer Statement
```typescript
{
  observationId: "OBS-001",
  estimateId: "EST-2026-00418",
  source: "customer",
  sourceId: "repair_description",
  statement: "The deck boards are rotting and need to be replaced",
  status: "pending",
  confidence: 100,
  category: "deck-condition",
  priority: "high",
  createdAt: new Date("2026-01-15T10:30:00Z")
}
```

#### AI Inference
```typescript
{
  observationId: "OBS-002",
  estimateId: "EST-2026-00418",
  source: "ai",
  sourceId: "PHOTO-001",
  statement: "Photo shows significant rot on deck boards",
  fact: {
    factId: "FACT-001",
    type: "damage-detection",
    value: "rot",
    evidence: ["PHOTO-001"],
    confidence: 85
  },
  interpretation: {
    interpretationId: "INT-001",
    hypothesis: "Deck boards need replacement",
    reasoning: "Visible rot on multiple boards, structural compromise likely",
    alternatives: ["Partial replacement possible", "Surface treatment may suffice"],
    confidence: 75
  },
  status: "pending",
  confidence: 80,
  category: "deck-condition",
  priority: "high",
  createdAt: new Date("2026-01-15T10:35:00Z")
}
```

#### Estimator Review
```typescript
{
  observationId: "OBS-002",
  estimateId: "EST-2026-00418",
  source: "ai",
  sourceId: "PHOTO-001",
  statement: "Photo shows significant rot on deck boards",
  fact: {
    factId: "FACT-001",
    type: "damage-detection",
    value: "rot",
    evidence: ["PHOTO-001"],
    confidence: 85
  },
  interpretation: {
    interpretationId: "INT-001",
    hypothesis: "Deck boards need replacement",
    reasoning: "Visible rot on multiple boards, structural compromise likely",
    alternatives: ["Partial replacement possible", "Surface treatment may suffice"],
    confidence: 75
  },
  estimatorReview: {
    reviewerId: "EST-001",
    decision: "accept",
    notes: "Confirmed rot on site visit. Full replacement recommended.",
    reviewedAt: new Date("2026-01-20T14:00:00Z")
  },
  status: "accepted",
  confidence: 95,
  category: "deck-condition",
  priority: "high",
  createdAt: new Date("2026-01-15T10:35:00Z"),
  reviewedAt: new Date("2026-01-20T14:00:00Z")
}
```

### Observation Service

```typescript
interface ObservationService {
  createObservation(observation: Omit<Observation, "observationId">): Promise<string>;
  addFact(observationId: string, fact: Fact): Promise<void>;
  addInterpretation(observationId: string, interpretation: Interpretation): Promise<void>;
  reviewObservation(observationId: string, review: EstimatorReview): Promise<void>;
  getObservations(estimateId: string): Promise<Observation[]>;
  getAcceptedObservations(estimateId: string): Promise<Observation[]>;
  getPendingObservations(estimateId: string): Promise<Observation[]>;
}
```

### Benefits

1. **Traceability:** Know exactly where each observation came from
2. **Confidence Tracking:** Separate customer certainty from AI confidence
3. **Human Review:** Estimator must approve AI inferences
4. **Audit Trail:** Complete history of observations and reviews
5. **Flexibility:** Easy to add new observation sources

---

## 18. Google Workspace Expansion

### Google Docs

#### Document Generation

Generate professional documents using templates:

**Document Types:**
- Estimate reports
- Inspection reports
- Change orders
- Warranty documents
- Contracts

**Template System:**
```typescript
interface DocTemplate {
  templateId: string;
  type: "estimate" | "inspection" | "change-order" | "warranty" | "contract";
  content: string; // Template with placeholders
  placeholders: string[];
}

interface DocService {
  generateDocument(templateId: string, data: Record<string, any>): Promise<string>;
  updateDocument(docId: string, data: Record<string, any>): Promise<void>;
  shareDocument(docId: string, email: string): Promise<void>;
  getDocumentUrl(docId: string): string;
}
```

**Example Template:**
```markdown
# Estimate Report

**Estimate ID:** {{estimateId}}
**Date:** {{date}}
**Customer:** {{customer.name}}
**Property:** {{property.address}}

## Services
{{#each services}}
- {{name}}: {{description}}
{{/each}}

## AI Summary
{{aiSummary}}

## Observations
{{#each observations}}
- {{statement}} ({{source}})
{{/each}}

## Pricing
{{pricing.total}}

## Terms
{{terms}}
```

### Google Tasks

#### Task Automation

Automatically create internal follow-up tasks:

**Task Types:**
- Call customer
- Schedule visit
- Send quote
- Order materials
- Follow up

**Task Structure:**
```typescript
interface Task {
  taskId: string;
  estimateId: string;
  title: string;
  description: string;
  dueDate: Date;
  status: "todo" | "in-progress" | "completed";
  assignee: string;
  priority: "low" | "medium" | "high";
  relatedDocuments: string[];
}

interface TaskService {
  createTask(task: Omit<Task, "taskId">): Promise<string>;
  updateTask(taskId: string, updates: Partial<Task>): Promise<void>;
  completeTask(taskId: string): Promise<void>;
  getTasksForEstimate(estimateId: string): Promise<Task[]>;
  getTasksForAssignee(assignee: string): Promise<Task[]>;
}
```

**Automatic Task Creation:**
```typescript
// On estimate submission
await taskService.createTask({
  estimateId: "EST-2026-00418",
  title: "Review new estimate",
  description: "Review estimate EST-2026-00418 from John Smith",
  dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
  status: "todo",
  assignee: "taylor@happyplacecarpentry.com",
  priority: "high",
  relatedDocuments: ["EST-2026-00418"]
});
```

### Google Chat

#### Team Notifications

Optional notifications for team collaboration:

**Notification Types:**
- New estimate
- High-priority estimate
- AI confidence alert
- Appointment scheduled
- Quote accepted

**Notification Structure:**
```typescript
interface ChatNotification {
  notificationId: string;
  type: "new-estimate" | "high-priority" | "ai-alert" | "appointment" | "quote-accepted";
  message: string;
  estimateId: string;
  priority: "low" | "medium" | "high";
  recipients: string[];
  metadata: Record<string, any>;
}

interface ChatService {
  sendNotification(notification: ChatNotification): Promise<void>;
  sendToSpace(spaceId: string, message: string): Promise<void>;
  sendDirectMessage(userId: string, message: string): Promise<void>;
}
```

**Example Notification:**
```
🔔 New Estimate

Painting
Albany
AI Confidence 91%
Needs Site Visit

Estimate ID: EST-2026-00418
Customer: John Smith
Link: [View Estimate]
```

### Google Meet

#### Virtual Consultations

Generate virtual consultation links when appropriate:

**Use Cases:**
- Initial consultation
- Quote review
- Change order discussion
- Warranty issue

**Meet Service:**
```typescript
interface MeetService {
  createMeeting(estimateId: string, scheduledDate: Date): Promise<Meeting>;
  updateMeeting(meetingId: string, updates: Partial<Meeting>): Promise<void>;
  cancelMeeting(meetingId: string): Promise<void>;
  getMeetingLink(meetingId: string): string;
}

interface Meeting {
  meetingId: string;
  estimateId: string;
  title: string;
  description: string;
  scheduledDate: Date;
  duration: number;
  link: string;
  participants: string[];
}
```

**Automatic Meeting Creation:**
```typescript
// When customer requests virtual consultation
const meeting = await meetService.createMeeting("EST-2026-00418", new Date("2026-01-20T14:00:00Z"));
```

---

## 19. AI Vision Pipeline

### Processing Pipeline

```
Upload
  ↓
Virus Scan
  ↓
EXIF Extraction
  ↓
Compression
  ↓
Vision Analysis
  ↓
Object Detection
  ↓
Damage Detection
  ↓
Quality Check
  ↓
Thumbnail Generation
  ↓
Drive Storage
  ↓
Manifest Update
```

### Pipeline Stages

#### 1. Upload
```typescript
interface UploadStage {
  upload(file: File): Promise<UploadResult>;
  validate(file: File): ValidationResult;
}

interface UploadResult {
  fileId: string;
  originalName: string;
  size: number;
  mimeType: string;
  uploadedAt: Date;
}
```

#### 2. Virus Scan
```typescript
interface VirusScanStage {
  scan(fileId: string): Promise<ScanResult>;
}

interface ScanResult {
  fileId: string;
  clean: boolean;
  threats: string[];
  scannedAt: Date;
}
```

#### 3. EXIF Extraction
```typescript
interface EXIFExtractionStage {
  extract(fileId: string): Promise<EXIFData>;
}

interface EXIFData {
  camera: string;
  dateTaken: Date;
  location?: {
    lat: number;
    lng: number;
  };
  orientation: string;
  resolution: {
    width: number;
    height: number;
  };
}
```

#### 4. Compression
```typescript
interface CompressionStage {
  compress(fileId: string, options: CompressionOptions): Promise<CompressionResult>;
}

interface CompressionOptions {
  quality: number;
  maxWidth?: number;
  maxHeight?: number;
  format?: "jpeg" | "webp";
}

interface CompressionResult {
  fileId: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}
```

#### 5. Vision Analysis
```typescript
interface VisionAnalysisStage {
  analyze(fileId: string): Promise<VisionAnalysis>;
}

interface VisionAnalysis {
  fileId: string;
  labels: Label[];
  objects: Object[];
  text: Text[];
  colors: Color[];
  properties: ImageProperties;
}

interface Label {
  description: string;
  confidence: number;
}

interface Object {
  name: string;
  confidence: number;
  boundingBox: BoundingBox;
}
```

#### 6. Object Detection
```typescript
interface ObjectDetectionStage {
  detectObjects(fileId: string): Promise<ObjectDetection>;
}

interface ObjectDetection {
  fileId: string;
  objects: DetectedObject[];
  confidence: number;
}

interface DetectedObject {
  type: "deck" | "fence" | "wall" | "door" | "window" | "roof";
  confidence: number;
  boundingBox: BoundingBox;
  attributes: Record<string, any>;
}
```

#### 7. Damage Detection
```typescript
interface DamageDetectionStage {
  detectDamage(fileId: string): Promise<DamageDetection>;
}

interface DamageDetection {
  fileId: string;
  damage: Damage[];
  severity: "low" | "medium" | "high";
  confidence: number;
}

interface Damage {
  type: "rot" | "crack" | "peel" | "stain" | "mold";
  location: string;
  severity: "low" | "medium" | "high";
  confidence: number;
  boundingBox?: BoundingBox;
}
```

#### 8. Quality Check
```typescript
interface QualityCheckStage {
  checkQuality(fileId: string): Promise<QualityResult>;
}

interface QualityResult {
  fileId: string;
  quality: number;
  issues: QualityIssue[];
  pass: boolean;
}

interface QualityIssue {
  type: "blur" | "dark" | "bright" | "low-resolution";
  severity: "low" | "medium" "high";
  description: string;
}
```

#### 9. Thumbnail Generation
```typescript
interface ThumbnailGenerationStage {
  generateThumbnails(fileId: string): Promise<Thumbnails>;
}

interface Thumbnails {
  fileId: string;
  small: string; // 150x150
  medium: string; // 300x300
  large: string; // 600x600
}
```

#### 10. Drive Storage
```typescript
interface DriveStorageStage {
  store(fileId: string, estimateId: string): Promise<DriveResult>;
}

interface DriveResult {
  fileId: string;
  driveId: string;
  url: string;
  storedAt: Date;
}
```

#### 11. Manifest Update
```typescript
interface ManifestUpdateStage {
  updateManifest(estimateId: string, photoData: PhotoData): Promise<void>;
}

interface PhotoData {
  photoId: string;
  fileId: string;
  driveId: string;
  url: string;
  exif: EXIFData;
  analysis: VisionAnalysis;
  damage: DamageDetection;
  quality: QualityResult;
  thumbnails: Thumbnails;
}
```

### Pipeline Orchestration

```typescript
class VisionPipeline {
  private stages: PipelineStage[];

  constructor() {
    this.stages = [
      new UploadStage(),
      new VirusScanStage(),
      new EXIFExtractionStage(),
      new CompressionStage(),
      new VisionAnalysisStage(),
      new ObjectDetectionStage(),
      new DamageDetectionStage(),
      new QualityCheckStage(),
      new ThumbnailGenerationStage(),
      new DriveStorageStage(),
      new ManifestUpdateStage()
    ];
  }

  async process(file: File, estimateId: string): Promise<PipelineResult> {
    let context: PipelineContext = {
      file,
      estimateId,
      metadata: {}
    };

    for (const stage of this.stages) {
      try {
        context = await stage.execute(context);
      } catch (error) {
        // Handle stage failure
        if (stage.isCritical()) {
          throw error;
        } else {
          // Continue with warning
          context.warnings.push(error.message);
        }
      }
    }

    return {
      success: true,
      photoId: context.metadata.photoId,
      warnings: context.warnings
    };
  }
}
```

### Pipeline Benefits

1. **Quality Control:** Automatic quality checks
2. **Security:** Virus scanning
3. **Efficiency:** Compression reduces storage costs
4. **Insights:** AI analysis provides valuable data
5. **Consistency:** Standardized processing for all photos

---

## 20. Operational Dashboards

### Dashboard Metrics

Once Sheets is in place, expose dashboards for:

#### Open Estimates
- Total open estimates
- By status
- By priority
- By service
- By county
- Aging analysis

#### Conversion Rate
- Submission to quote
- Quote to accepted
- Accepted to completed
- By service
- By county
- Time trends

#### Average Response Time
- First response
- Quote delivery
- Site visit scheduling
- By service
- By estimator

#### Jobs by Service
- Volume by service
- Revenue by service
- Margin by service
- Time trends

#### Revenue by County
- Total revenue
- By service
- By month
- Year-over-year

#### Referral Sources
- Lead source breakdown
- Conversion by source
- Revenue by source
- Cost per lead

#### AI Confidence Trends
- Average confidence score
- Confidence vs. accuracy
- By service
- Time trends

#### Photo Completeness
- Average photos per estimate
- Completeness by service
- Quality scores
- Missing photo types

#### Outstanding Follow-ups
- Overdue tasks
- Pending reviews
- Unsent quotes
- Scheduled visits

### Dashboard Implementation

```typescript
interface DashboardService {
  getOpenEstimates(filter: DashboardFilter): Promise<EstimateSummary[]>;
  getConversionRate(period: DateRange): Promise<ConversionMetrics>;
  getResponseTimeMetrics(period: DateRange): Promise<ResponseTimeMetrics>;
  getJobsByService(period: DateRange): Promise<ServiceMetrics>;
  getRevenueByCounty(period: DateRange): Promise<RevenueMetrics>;
  getReferralSources(period: DateRange): Promise<ReferralMetrics>;
  getAIConfidenceTrends(period: DateRange): Promise<ConfidenceMetrics>;
  getPhotoCompleteness(period: DateRange): Promise<PhotoMetrics>;
  getOutstandingFollowUps(): Promise<Task[]>;
}

interface DashboardFilter {
  status?: EstimateStatus[];
  service?: string[];
  county?: string[];
  priority?: string[];
  dateRange?: DateRange;
}
```

### Dashboard Visualization

**Example Dashboard Layout:**

```
┌─────────────────────────────────────────────────────────┐
│                    OPERATIONAL DASHBOARD                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Open Estimates: 47  │  Conversion Rate: 68%          │
│  High Priority: 12   │  Avg Response: 4.2 hours       │
│  This Week: 23       │  Revenue: $45,000             │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  JOBS BY SERVICE          │  REVENUE BY COUNTY          │
│  ┌──────────────────┐    │  ┌──────────────────┐       │
│  │ Decks: 45%       │    │  │ Benton: 35%      │       │
│  │ Fences: 25%      │    │  │ Linn: 28%        │       │
│  │ Painting: 20%    │    │  │ Marion: 22%      │       │
│  │ Repairs: 10%     │    │  │ Polk: 15%        │       │
│  └──────────────────┘    │  └──────────────────┘       │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  AI CONFIDENCE TRENDS    │  OUTSTANDING FOLLOW-UPS     │
│  ┌──────────────────┐    │  ┌──────────────────┐       │
│  │ 95% ████████     │    │  │ Call customer    │       │
│  │ 85% ██████       │    │  │ Schedule visit   │       │
│  │ 75% ████         │    │  │ Send quote       │       │
│  └──────────────────┘    │  └──────────────────┘       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 21. Updated Implementation Priorities

### Revised Priority Order

Based on the expanded requirements, the suggested implementation order is:

#### Phase 1: Estimate Wizard Architecture (Weeks 1-6)

**Objective:** Complete the estimate wizard with plugins, categories, validation, and readiness scoring

**Tasks:**
1. Implement Canonical Estimate Domain Model
2. Implement Lifecycle State Machine
3. Implement Event Log (event sourcing)
4. Implement Plugin-Based Question Categories
5. Implement AI Readiness Score
6. Implement Observation Model
7. Update wizard to use new architecture
8. Deploy and test

**Deliverables:**
- Domain model complete
- State machine operational
- Event logging functional
- Plugin system working
- Readiness scoring active
- Observation model implemented

#### Phase 2: Google Workspace Backend (Weeks 7-12)

**Objective:** Implement Drive, Sheets, Calendar, Contacts, Docs

**Tasks:**
1. Implement Drive service (folder creation, file upload)
2. Implement Sheets service (row creation, updates)
3. Implement Calendar service (event creation)
4. Implement Contacts service (contact creation/update)
5. Implement Docs service (document generation)
6. Implement GoogleWorkspaceService orchestration
7. Implement Google Tasks service
8. Implement Google Chat notifications
9. Implement Google Meet integration
10. Update /api/estimate to use new services
11. Deploy and test

**Deliverables:**
- Drive integration complete
- Sheets operational database
- Calendar event creation
- Contacts integration
- Docs document generation
- Tasks automation
- Chat notifications
- Meet virtual consultations

#### Phase 3: AI Vision and Analysis (Weeks 13-18)

**Objective:** Implement AI vision pipeline and structured analysis

**Tasks:**
1. Implement AI Vision Pipeline (all stages)
2. Implement Vision Analysis
3. Implement Object Detection
4. Implement Damage Detection
5. Implement Quality Check
6. Implement AI Summary Generation
7. Implement Material Estimation
8. Implement Risk Detection
9. Integrate AI into estimate flow
10. Deploy and test

**Deliverables:**
- Complete vision pipeline
- Photo analysis
- Damage detection
- AI summaries
- Material estimation
- Risk detection
- Quality scoring

#### Phase 4: Operational Dashboards (Weeks 19-22)

**Objective:** Build operational dashboards and reporting

**Tasks:**
1. Implement Dashboard Service
2. Create Open Estimates dashboard
3. Create Conversion Rate dashboard
4. Create Response Time dashboard
5. Create Jobs by Service dashboard
6. Create Revenue by County dashboard
7. Create Referral Sources dashboard
8. Create AI Confidence Trends dashboard
9. Create Photo Completeness dashboard
10. Create Outstanding Follow-ups dashboard
11. Deploy and test

**Deliverables:**
- Complete dashboard suite
- Real-time metrics
- Historical reporting
- Drill-down capabilities

#### Phase 5: Business Integrations (Weeks 23-28)

**Objective:** Add external business integrations

**Tasks:**
1. Implement Google Maps Geocoding
2. Implement Google Places integration
3. Implement QuickBooks integration (optional)
4. Implement Stripe integration (optional)
5. Implement Twilio integration (optional)
6. Implement DocuSign integration (optional)
7. Implement Weather API integration
8. Implement Material Pricing APIs (optional)
9. Deploy and test

**Deliverables:**
- Address validation
- Property context
- Financial integration (optional)
- Communication automation (optional)
- Contract management (optional)
- Weather-aware scheduling
- Real-time pricing

#### Phase 6: Advanced Features (Weeks 29-32)

**Objective:** Implement advanced features and optimizations

**Tasks:**
1. Implement Google Vertex AI / Gemini
2. Implement advanced analytics
3. Implement funnel analysis
4. Implement estimate abandonment tracking
5. Implement performance optimizations
6. Implement advanced security
7. Implement monitoring and alerting
8. Deploy and test

**Deliverables:**
- Multimodal AI analysis
- Advanced analytics
- Funnel insights
- Performance improvements
- Enhanced security
- Comprehensive monitoring

---

## 22. Tenant Boundary and Data Ownership

### Architecture Principle

**Customer owns Google Workspace and all business data.**
**PING owns automation, orchestration, execution, and learned platform improvements.**
**Knowledge Constitution owns patterns and platform intelligence, never customer records.**

### Tenant Boundary

```
Google Workspace
        ▲
        │ owns
        │
Customer Data
        │
────────┼────────────────────
        │ observations only
        ▼

PING Runtime

────────┼────────────────────

Knowledge Constitution

learns patterns

NOT customer information
```

### Data Ownership Rules

#### Customer Owns
- Gmail (all emails)
- Drive (all files)
- Contacts (all contacts)
- Calendar (all events)
- Sheets (all data)
- Google Business Profile (all business data)

#### PING Owns
- Scheduling decisions
- Automation logic
- Orchestration workflows
- Execution runtime
- Platform improvements

#### Knowledge Constitution Owns
- Patterns (e.g., "Contractors usually accept Tuesday mornings")
- Heuristics (e.g., "Review requests work better within 24 hours")
- Platform intelligence (e.g., "Roofing estimates convert better with before/after photos")
- Learned improvements (e.g., "This planner heuristic reduced travel by 18%")

#### Knowledge Constitution NEVER Stores
- Gmail bodies
- Drive file contents
- Contact details
- Calendar event details
- Sheets data rows
- Customer-specific information

### Integration Principles

**Every integration should be:**
- **Read where possible** - Observe without modifying
- **Write only through explicit actions** - All writes attributable
- **Attributable** - Every write logged with actor, reason, timestamp

### Read vs. Write Examples

#### Read-Only (Observation)
```typescript
// GOOD: Observe Gmail for business events
interface GmailObserver {
  observeBusinessEvents(): Promise<BusinessEvent[]>;
  // Extracts: "Estimate accepted", "Customer asking for quote", "Complaint detected"
  // NEVER stores: Email body, sender, recipient
}

// GOOD: Observe Drive for document intelligence
interface DriveObserver {
  observeDocuments(): Promise<DocumentInsight[]>;
  // Extracts: "This estimate is missing photos", "This logo is outdated"
  // NEVER stores: File contents, file URLs
}

// GOOD: Observe Sheets for patterns
interface SheetsObserver {
  observePatterns(): Promise<Pattern[]>;
  // Extracts: "Revenue trending down", "Conversion rate improved"
  // NEVER stores: Row data, cell values
}
```

#### Write-Through (Explicit Action)
```typescript
// GOOD: Write through explicit action with attribution
interface CalendarWriter {
  scheduleEvent(event: CalendarEvent, actor: string, reason: string): Promise<void>;
  // Attribution: "PING scheduled site visit for EST-2026-00418"
}

// GOOD: Write through explicit action with attribution
interface DriveWriter {
  createFolder(folder: Folder, actor: string, reason: string): Promise<string>;
  // Attribution: "PING created folder for EST-2026-00418"
}

// GOOD: Write through explicit action with attribution
interface SheetsWriter {
  updateRow(rowId: string, updates: object, actor: string, reason: string): Promise<void>;
  // Attribution: "PING updated status to 'scheduled' for EST-2026-00418"
}
```

### Knowledge Constitution Examples

#### Platform Intelligence (GOOD)
```typescript
// GOOD: Learn scheduling patterns
interface SchedulingPattern {
  pattern: "Contractors prefer Tuesday mornings";
  confidence: 0.85;
  evidence: 42;
  learnedAt: Date;
}

// GOOD: Learn conversion heuristics
interface ConversionHeuristic {
  heuristic: "Roofing estimates convert better with before/after photos";
  improvement: 0.23;
  confidence: 0.91;
  learnedAt: Date;
}

// GOOD: Learn optimization insights
interface OptimizationInsight {
  insight: "This planner heuristic reduced travel by 18%";
  baseline: number;
  improved: number;
  learnedAt: Date;
}
```

#### Customer Data (BAD)
```typescript
// BAD: Storing customer-specific data
interface CustomerRecord {
  customerId: string;
  name: string;
  email: string;
  phone: string;
  // NEVER in Knowledge Constitution
}

// BAD: Storing email content
interface EmailRecord {
  emailId: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  // NEVER in Knowledge Constitution
}

// BAD: Storing Drive file contents
interface FileRecord {
  fileId: string;
  name: string;
  content: string;
  // NEVER in Knowledge Constitution
}
```

### Implementation Requirements

#### All Writes Must Be Attributable
```typescript
interface AttributedWrite {
  actor: string; // "PING" or user ID
  reason: string; // "Scheduled site visit for EST-2026-00418"
  timestamp: Date;
  estimateId?: string; // Reference to customer data
}

function writeWithAttribution(write: () => void, attribution: AttributedWrite): void {
  // Log attribution
  auditLog.append({
    action: write.name,
    ...attribution
  });
  
  // Execute write
  write();
}
```

#### All Observations Must Be Abstracted
```typescript
interface BusinessEvent {
  eventType: "estimate_accepted" | "quote_requested" | "complaint_detected";
  confidence: number;
  source: "gmail" | "drive" | "sheets";
  // NO customer data
}

interface DocumentInsight {
  insightType: "missing_photos" | "outdated_logo" | "warranty_referenced";
  confidence: number;
  source: "drive";
  // NO file contents
}

interface Pattern {
  patternType: "revenue_trend" | "conversion_rate" | "scheduling_preference";
  direction: "up" | "down" | "stable";
  confidence: number;
  source: "sheets";
  // NO row data
}
```

---

## 23. Revised Implementation Roadmap

### Phase 1: Google Workspace Foundation (Weeks 1-8)

**Objective:** Deliver immediate visible value with high ROI integrations. Focus on integrations that require almost no custom UI.

**Principle:** Customer stays in Google Workspace. PING observes and assists.

#### Integrations

##### 1. Google Calendar (Weeks 1-2)
**PING becomes an executive assistant.**

**Visible Features:**
- Auto schedule jobs
- Find open windows
- Detect conflicts
- Travel time suggestions
- Customer appointment optimization
- Automatic follow-up reminders

**Customer owns:** Calendar
**PING owns:** Scheduling decisions
**Knowledge learns:** Preferred scheduling patterns

**Implementation:**
```typescript
interface CalendarAssistant {
  findOpenWindow(requirements: SchedulingRequirements): Promise<TimeSlot[]>;
  detectConflicts(proposedEvent: CalendarEvent): Promise<Conflict[]>;
  suggestTravelTime(locations: Location[]): Promise<Duration>;
  optimizeSchedule(currentSchedule: CalendarEvent[]): Promise<CalendarEvent[]>;
  scheduleReminder(eventId: string, reminder: Reminder): Promise<void>;
}
```

##### 2. Google Drive (Weeks 3-4)
**Massive ROI through document intelligence.**

**Visible Features:**
- Automatically understand estimates
- Photo organization and tagging
- Marketing asset detection
- SOP identification
- Warranty PDF recognition
- Logo and brand asset tracking
- Document quality checks

**Customer owns:** Drive (all files)
**PING owns:** Document intelligence
**Knowledge learns:** Document patterns, quality heuristics

**Implementation:**
```typescript
interface DriveIntelligence {
  analyzeEstimate(folderId: string): Promise<EstimateInsight>;
  organizePhotos(folderId: string): Promise<PhotoOrganization>;
  detectMarketingAssets(folderId: string): Promise<MarketingAsset[]>;
  identifySOPs(folderId: string): Promise<SOP[]>;
  recognizeWarranties(folderId: string): Promise<Warranty[]>;
  trackBrandAssets(folderId: string): Promise<BrandAsset[]>;
  checkDocumentQuality(fileId: string): Promise<QualityReport>;
}
```

**Insight Examples:**
- "This estimate is missing photos"
- "This logo is outdated"
- "Warranty document referenced here"
- "This photo is website-ready"
- "This estimate is marketing-ready"

##### 3. Gmail (Weeks 5-6)
**Observe business conversations, not read everyone's email.**

**Visible Features:**
- Business event extraction
- Estimate acceptance detection
- Quote request detection
- Complaint detection
- Warranty question detection
- Review request opportunity detection

**Customer owns:** Gmail (all emails)
**PING owns:** Event extraction
**Knowledge learns:** Communication patterns, response heuristics

**Implementation:**
```typescript
interface GmailObserver {
  observeBusinessEvents(): Promise<BusinessEvent[]>;
  detectEstimateAccepted(): Promise<EstimateAcceptedEvent[]>;
  detectQuoteRequested(): Promise<QuoteRequestedEvent[]>;
  detectComplaints(): Promise<ComplaintEvent[]>;
  detectWarrantyQuestions(): Promise<WarrantyQuestionEvent[]>;
  detectReviewOpportunities(): Promise<ReviewOpportunityEvent[]>;
}

// NEVER stores email body
interface BusinessEvent {
  eventType: string;
  confidence: number;
  extractedAt: Date;
  // NO email content
}
```

##### 4. Google Sheets (Weeks 7)
**Small businesses already live in Sheets.**

**Visible Features:**
- Observe operational data
- Analyze trends
- Suggest improvements
- Populate data (through explicit actions)
- Never replace Sheets

**Customer owns:** Sheets (all data)
**PING owns:** Analysis and suggestions
**Knowledge learns:** Business patterns, optimization heuristics

**Implementation:**
```typescript
interface SheetsAssistant {
  observeData(sheetId: string): Promise<DataObservation[]>;
  analyzeTrends(sheetId: string): Promise<TrendAnalysis[]>;
  suggestImprovements(sheetId: string): Promise<ImprovementSuggestion[]>;
  populateRow(sheetId: string, row: object, attribution: AttributedWrite): Promise<void>;
}

// NEVER stores row data
interface DataObservation {
  observationType: string;
  confidence: number;
  insight: string;
  // NO cell values
}
```

##### 5. Google Business Profile (Weeks 8)
**Local SEO and customer engagement.**

**Visible Features:**
- Review monitoring
- Post suggestions
- Business insights
- Local SEO opportunities
- Review response suggestions

**Customer owns:** Google Business Profile
**PING owns:** Insights and suggestions
**Knowledge learns:** Review patterns, SEO heuristics

**Implementation:**
```typescript
interface BusinessProfileAssistant {
  monitorReviews(): Promise<ReviewInsight[]>;
  suggestPosts(): Promise<PostSuggestion[]>;
  analyzeBusinessInsights(): Promise<BusinessInsight[]>;
  identifyLocalSEOOpportunities(): Promise<SEOOpportunity[]>;
  suggestReviewResponses(): Promise<ResponseSuggestion[]>;
}
```

**Phase 1 Deliverables:**
- Calendar scheduling assistant
- Drive document intelligence
- Gmail business event extraction
- Sheets analysis assistant
- Google Business Profile insights

**Phase 1 Success Metrics:**
- Time saved on scheduling
- Documents organized automatically
- Business events detected accurately
- Insights provided without data storage
- Customer stays in Google Workspace

---

### Phase 2: Business Intelligence (Weeks 9-16)

**Objective:** Show "AI magic" through intelligent insights and recommendations.

**Principle:** Knowledge learns patterns, never customer data.

#### Features

##### 1. Weekly Business Brief
**Every Monday morning:**

- 4 estimates outstanding
- Revenue down 8%
- Two customers likely need follow-up
- Five photos missing project tags

**Implementation:**
```typescript
interface WeeklyBrief {
  generate(): Promise<WeeklyBriefReport>;
}

interface WeeklyBriefReport {
  outstandingEstimates: number;
  revenueTrend: number;
  followUpOpportunities: Customer[];
  missingTags: Photo[];
  recommendations: Recommendation[];
}
```

##### 2. Customer Health
**Automatically detect:**

- Customers going cold
- Customers growing
- Review opportunities
- Repeat business probability

**Implementation:**
```typescript
interface CustomerHealth {
  analyzeCustomer(customerId: string): Promise<CustomerHealthReport>;
}

interface CustomerHealthReport {
  status: "cold" | "warm" | "hot" | "growing";
  reviewOpportunity: boolean;
  repeatBusinessProbability: number;
  recommendedActions: Action[];
}
```

##### 3. Photo Intelligence
**Drive folder analysis:**

- Automatically identify before/after
- Logo visibility detection
- Resolution validation
- Website-ready detection
- Estimate-ready detection
- Marketing-ready detection

**Implementation:**
```typescript
interface PhotoIntelligence {
  analyzePhoto(photoId: string): Promise<PhotoInsight>;
  classifyPhoto(photoId: string): Promise<PhotoClassification>;
  detectBeforeAfter(photoIds: string[]): Promise<BeforeAfterPair[]>;
  checkResolution(photoId: string): Promise<ResolutionCheck>;
}

interface PhotoClassification {
  category: "before" | "after" | "logo" | "website-ready" | "estimate-ready" | "marketing-ready";
  confidence: number;
}
```

##### 4. SEO Assistant
**Website and local SEO:**

- Website change recommendations
- Blog topic suggestions
- Missing service page detection
- Local SEO opportunities
- Review trend analysis
- Google Business Profile improvements

**Implementation:**
```typescript
interface SEOAssistant {
  analyzeWebsite(): Promise<WebsiteAnalysis>;
  suggestBlogTopics(): Promise<BlogTopic[]>;
  detectMissingServicePages(): Promise<ServicePageGap[]>;
  identifyLocalSEOOpportunities(): Promise<SEOOpportunity[]>;
  analyzeReviewTrends(): Promise<ReviewTrendAnalysis>;
  suggestBusinessProfileImprovements(): Promise<ProfileImprovement[]>;
}
```

**Phase 2 Deliverables:**
- Weekly business brief automation
- Customer health monitoring
- Photo intelligence system
- SEO assistant

**Phase 2 Success Metrics:**
- Actionable insights generated
- Customer health accuracy
- Photo classification accuracy
- SEO recommendations implemented

---

### Phase 3: Automation (Weeks 17-24)

**Objective:** PING starts acting on behalf of the customer through orchestrated workflows.

**Principle:** Customer never leaves Google Workspace. PING orchestrates.

#### Workflows

##### 1. Estimate Accepted Workflow
```
Estimate accepted (Gmail observation)
  ↓
Schedule project (Calendar)
  ↓
Create Drive folder (Drive)
  ↓
Invite crew (Gmail)
  ↓
Calendar booking (Calendar)
  ↓
Reminder (Calendar)
  ↓
Request review (Gmail)
  ↓
Archive project (Drive)
```

**Implementation:**
```typescript
interface EstimateAcceptedWorkflow {
  execute(event: EstimateAcceptedEvent): Promise<WorkflowResult>;
}

interface WorkflowResult {
  steps: WorkflowStep[];
  status: "completed" | "partial" | "failed";
  attribution: AttributedWrite[];
}
```

##### 2. New Estimate Workflow
```
New estimate (Drive observation)
  ↓
Extract customer info (Drive intelligence)
  ↓
Check for existing customer (Contacts observation)
  ↓
Schedule site visit (Calendar)
  ↓
Send confirmation (Gmail)
  ↓
Create reminder (Calendar)
```

##### 3. Review Request Workflow
```
Job completed (Calendar observation)
  ↓
Wait 24 hours (timing)
  ↓
Send review request (Gmail)
  ↓
Monitor response (Gmail observation)
  ↓
Thank customer (Gmail)
  ↓
Post review (Google Business Profile)
```

##### 4. Warranty Claim Workflow
```
Warranty question (Gmail observation)
  ↓
Locate warranty document (Drive intelligence)
  ↓
Schedule inspection (Calendar)
  ↓
Notify crew (Gmail)
  ↓
Track resolution (Sheets)
  ↓
Archive claim (Drive)
```

**Phase 3 Deliverables:**
- Estimate accepted workflow
- New estimate workflow
- Review request workflow
- Warranty claim workflow
- Workflow orchestration engine

**Phase 3 Success Metrics:**
- Workflow automation rate
- Time saved per workflow
- Error rate
- Customer satisfaction

---

## Conclusion

This revised architecture establishes a clear tenant boundary:

**Customer owns:** Google Workspace and all business data
**PING owns:** Automation, orchestration, execution, and platform improvements
**Knowledge Constitution owns:** Patterns and platform intelligence, never customer records

The phased implementation prioritizes:

**Phase 1 (Weeks 1-8):** Google Workspace Foundation
- Calendar scheduling assistant
- Drive document intelligence
- Gmail business event extraction
- Sheets analysis assistant
- Google Business Profile insights

**Phase 2 (Weeks 9-16):** Business Intelligence
- Weekly business brief
- Customer health monitoring
- Photo intelligence
- SEO assistant

**Phase 3 (Weeks 17-24):** Automation
- Estimate accepted workflow
- New estimate workflow
- Review request workflow
- Warranty claim workflow

This approach delivers immediate visible value while respecting the tenant boundary: customers stay in Google Workspace, PING automates work, and Knowledge Constitution continuously improves the platform without accumulating customer-sensitive information.

---

## 24. Capability Broker and Event Bus Architecture

### Problem: Google as Runtime Dependency

**Current Issue:** Almost every automation begins with "Gmail observes...", "Calendar observes...", "Drive observes..."

This creates an accidental dependency. If Google API quotas disappear tomorrow, PING stops functioning.

**Solution:** Google should be treated as one capability provider, not the operating system.

### Architecture

```
Customer Event
  ↓
PING Event Bus
  ↓
Capability Broker
  ↓
Capability Providers
  ├─ Google Calendar
  ├─ Jobber
  ├─ Stripe
  ├─ QuickBooks
  ├─ Email
  └─ Microsoft 365 (future)
```

**Critical Rule:** The trigger should never be Google. Google is simply where execution happens.

### Event Bus

```typescript
interface Event {
  eventId: string;
  eventType: string;
  tenantId: string;
  missionId?: string;
  payload: unknown;
  timestamp: Date;
  source: string;
}

interface EventBus {
  publish(event: Event): Promise<void>;
  subscribe(eventType: string, handler: EventHandler): void;
  unsubscribe(eventType: string, handler: EventHandler): void;
}

interface EventHandler {
  handle(event: Event): Promise<void>;
}
```

### Capability Broker

```typescript
interface CapabilityRequest {
  tenantId: string;
  missionId?: string;
  actor: string;
  authority: string;
  action: string;
  capability: string;
  provider: string;
  payload: unknown;
}

interface CapabilityBroker {
  execute(request: CapabilityRequest): Promise<CapabilityResult>;
  registerProvider(provider: CapabilityProvider): void;
  getProvider(capability: string, provider: string): CapabilityProvider;
}

interface CapabilityResult {
  success: boolean;
  data?: unknown;
  error?: string;
  attribution: AttributedWrite;
}
```

### Capability Provider Interface

```typescript
interface CapabilityProvider {
  providerId: string;
  capabilities: string[];
  
  execute(request: CapabilityRequest): Promise<CapabilityResult>;
  validate(request: CapabilityRequest): ValidationResult;
  authorize(request: CapabilityRequest): AuthorizationResult;
}
```

### Example: Calendar Capability

```typescript
class GoogleCalendarProvider implements CapabilityProvider {
  providerId = "google-calendar";
  capabilities = ["schedule", "find-window", "detect-conflict"];

  async execute(request: CapabilityRequest): Promise<CapabilityResult> {
    // Validate tenant safety
    if (!this.authorize(request)) {
      return { success: false, error: "Unauthorized" };
    }

    // Execute calendar operation
    switch (request.action) {
      case "schedule":
        return await this.schedule(request);
      case "find-window":
        return await this.findWindow(request);
      case "detect-conflict":
        return await this.detectConflict(request);
    }
  }

  authorize(request: CapabilityRequest): boolean {
    // Multi-tenant safety check
    return request.tenantId && request.actor && request.authority;
  }
}

class JobberCalendarProvider implements CapabilityProvider {
  providerId = "jobber-calendar";
  capabilities = ["schedule", "find-window"];

  // Same interface, different implementation
}
```

### Example: Event Flow

```typescript
// Customer event (source-agnostic)
const event: Event = {
  eventId: "EVT-001",
  eventType: "estimate_accepted",
  tenantId: "TENANT-123",
  missionId: "MISSION-456",
  payload: { estimateId: "EST-2026-00418" },
  timestamp: new Date(),
  source: "web"
};

// Publish to event bus
await eventBus.publish(event);

// Event handler triggers capability request
const handler: EventHandler = {
  handle: async (event: Event) => {
    const request: CapabilityRequest = {
      tenantId: event.tenantId,
      missionId: event.missionId,
      actor: "PING",
      authority: "automation",
      action: "schedule",
      capability: "calendar",
      provider: "google-calendar", // Could be "jobber-calendar"
      payload: event.payload
    };

    const result = await capabilityBroker.execute(request);
  }
};
```

### Benefits

1. **Provider Independence:** Google is one of many providers
2. **Easy Migration:** Swap providers without changing domain logic
3. **Multi-Tenant Safety:** Broker enforces tenant isolation
4. **Event-Driven:** Source-agnostic event processing
5. **Attribution:** Every capability execution is logged

---

## 25. Canonical Customer Object

### Problem: Multiple Customer Representations

**Current Issue:** Customer, Contacts, Google Contacts, CRM, Estimate Customer - four customers.

**Solution:** There must only ever be one canonical customer object.

### Canonical Customer Structure

```typescript
interface Customer {
  // Identity
  canonicalId: string; // CUST-NNNNN
  tenantId: string;
  
  // Core Data
  name: string;
  email: string;
  phone: string;
  
  // Relationships
  owns: {
    properties: Property[];
    estimates: Estimate[];
    jobs: Job[];
    invoices: Invoice[];
    reviews: Review[];
  };
  
  // Provider Adapters
  providers: {
    googleContacts?: GoogleContactAdapter;
    jobber?: JobberCustomerAdapter;
    hubspot?: HubSpotCustomerAdapter;
    salesforce?: SalesforceCustomerAdapter;
  };
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  source: string;
  tags: string[];
}
```

### Provider Adapter Interface

```typescript
interface CustomerAdapter {
  providerId: string;
  
  sync(customer: Customer): Promise<void>;
  fetch(providerCustomerId: string): Promise<Customer>;
  create(customer: Customer): Promise<string>;
  update(customer: Customer): Promise<void>;
  delete(customerId: string): Promise<void>;
}
```

### Example: Google Contacts Adapter

```typescript
class GoogleContactAdapter implements CustomerAdapter {
  providerId = "google-contacts";

  async sync(customer: Customer): Promise<void> {
    const googleContact = await this.fetchFromGoogle(customer.canonicalId);
    
    if (googleContact) {
      await this.updateInGoogle(customer);
    } else {
      await this.createInGoogle(customer);
    }
  }

  async fetch(providerCustomerId: string): Promise<Customer> {
    const googleContact = await this.fetchFromGoogle(providerCustomerId);
    return this.mapToCanonical(googleContact);
  }

  async create(customer: Customer): Promise<string> {
    const googleContact = this.mapFromCanonical(customer);
    const created = await this.createInGoogle(googleContact);
    return created.resourceName;
  }

  async update(customer: Customer): Promise<void> {
    const googleContact = this.mapFromCanonical(customer);
    await this.updateInGoogle(customer.canonicalId, googleContact);
  }

  async delete(customerId: string): Promise<void> {
    await this.deleteInGoogle(customerId);
  }

  private mapToCanonical(googleContact: GoogleContact): Customer {
    return {
      canonicalId: googleContact.resourceName,
      tenantId: this.tenantId,
      name: googleContact.names[0].displayName,
      email: googleContact.emailAddresses[0].value,
      phone: googleContact.phoneNumbers[0].value,
      // ... map other fields
    };
  }

  private mapFromCanonical(customer: Customer): GoogleContact {
    return {
      names: [{ displayName: customer.name }],
      emailAddresses: [{ value: customer.email, type: "home" }],
      phoneNumbers: [{ value: customer.phone, type: "mobile" }],
      // ... map other fields
    };
  }
}
```

### Example: Jobber Adapter

```typescript
class JobberCustomerAdapter implements CustomerAdapter {
  providerId = "jobber";

  // Same interface, different implementation
  // Maps between Jobber customer format and canonical customer
}
```

### Customer Service

```typescript
interface CustomerService {
  create(customer: Customer, providers: string[]): Promise<Customer>;
  update(customer: Customer): Promise<Customer>;
  get(canonicalId: string): Promise<Customer>;
  syncToProviders(canonicalId: string, providers: string[]): Promise<void>;
  changeProvider(canonicalId: string, from: string, to: string): Promise<void>;
}
```

### Provider Change Workflow

```
Customer changes from Google Contacts to Jobber

Customer Service
  ↓
Fetch from Google Contacts
  ↓
Create in Jobber
  ↓
Verify sync
  ↓
Delete from Google Contacts
  ↓
Update customer.providers
```

### Benefits

1. **Single Source of Truth:** One canonical customer object
2. **Provider Independence:** Easy to swap providers
3. **Sync Management:** Automatic synchronization across providers
4. **Domain Purity:** Domain logic never depends on provider specifics

---

## 26. Canonical Mission Object

### Problem: Missing Central Concept

**Current Issue:** Estimates, jobs, projects are scattered without a unifying concept.

**Solution:** Every estimate evolves into a Mission that owns everything.

### Canonical Mission Structure

```typescript
interface Mission {
  // Identity
  canonicalId: string; // MISSION-NNNNN
  tenantId: string;
  
  // Core Data
  type: "estimate" | "job" | "project";
  status: MissionStatus;
  priority: "low" | "medium" | "high" | "urgent";
  
  // Relationships
  customer: Customer;
  property: Property;
  
  // Owned Objects
  tasks: Task[];
  appointments: Appointment[];
  documents: Document[];
  communications: Communication[];
  invoices: Invoice[];
  reviews: Review[];
  evidence: Evidence[];
  crew: Crew[];
  
  // Timeline
  timeline: MissionTimeline;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  source: string;
}
```

### Mission Lifecycle

```
Estimate
  ↓
Mission Created
  ↓
Mission Advances
  ↓
Planner Recomputes
  ↓
Execution Plan Changes
  ↓
Capability Broker Executes
```

### Mission Service

```typescript
interface MissionService {
  createFromEstimate(estimateId: string): Promise<Mission>;
  advance(missionId: string, action: MissionAction): Promise<Mission>;
  recomputePlan (missionId: string): Promise<ExecutionPlan>;
  get(missionId: string): Promise<Mission>;
  list(filter: MissionFilter): Promise<Mission[]>;
}
```

### Planner

```typescript
interface Planner {
  plan(mission: Mission): ExecutionPlan;
  recompute(mission: Mission, changes: MissionChange[]): ExecutionPlan;
}

interface ExecutionPlan {
  missionId: string;
  steps: ExecutionStep[];
  timeline: Timeline;
  resources: Resource[];
  dependencies: Dependency[];
}

interface ExecutionStep {
  stepId: string;
  action: string;
  capability: string;
  provider: string;
  scheduledAt: Date;
  dependencies: string[];
}
```

### Example: Mission Advancement

```typescript
// Estimate accepted event
const mission = await missionService.createFromEstimate("EST-2026-00418");

// Mission advances
const advanced = await missionService.advance(mission.canonicalId, {
  action: "accept",
  actor: "customer",
  timestamp: new Date()
});

// Planner recomputes
const plan = await planner.recompute(advanced, [{
  type: "status_change",
  from: "estimate",
  to: "job"
}]);

// Capability broker executes
for (const step of plan.steps) {
  await capabilityBroker.execute({
    tenantId: mission.tenantId,
    missionId: mission.canonicalId,
    actor: "PING",
    authority: "automation",
    action: step.action,
    capability: step.capability,
    provider: step.provider,
    payload: step.payload
  });
}
```

### Benefits

1. **Central Coordination:** Mission owns all related objects
2. **Automatic Planning:** Planner recomputes on changes
3. **Provider Independence:** Execution plan uses capability broker
4. **Clear Lifecycle:** Mission status drives all automation

---

## 27. Evidence Pipeline

### Problem: Photo Intelligence Too Narrow

**Current Issue:** "Photo Intelligence" assumes photos are the only evidence type.

**Solution:** Generalize to Evidence pipeline that handles all evidence types.

### Evidence Types

```typescript
type EvidenceType = 
  | "photo"
  | "pdf"
  | "voice"
  | "video"
  | "measurement"
  | "drone-scan"
  | "lidar"
  | "blueprint"
  | "inspection-report";
```

### Canonical Evidence Structure

```typescript
interface Evidence {
  canonicalId: string; // EVID-NNNNN
  tenantId: string;
  missionId: string;
  
  // Type
  type: EvidenceType;
  
  // Content
  content: EvidenceContent;
  
  // Processing
  processed: boolean;
  analysis?: EvidenceAnalysis;
  
  // Storage
  storage: {
    provider: string; // "google-drive", "dropbox", "s3", "onedrive"
    location: string;
    url?: string;
  };
  
  // Metadata
  capturedAt: Date;
  capturedBy: string;
  tags: string[];
}
```

### Evidence Pipeline

```
Evidence Captured
  ↓
Storage Provider (Drive/Dropbox/S3)
  ↓
Vision Processing
  ↓
Observation Extraction
  ↓
Claim Generation
  ↓
Fact Verification
  ↓
Verified Fact
```

### Evidence Service

```typescript
interface EvidenceService {
  capture(evidence: Omit<Evidence, "canonicalId">): Promise<string>;
  process(evidenceId: string): Promise<EvidenceAnalysis>;
  analyze(evidenceId: string): Promise<Observation[]>;
  verify(evidenceId: string): Promise<VerifiedFact>;
  getByMission(missionId: string): Promise<Evidence[]>;
}

interface EvidenceAnalysis {
  evidenceId: string;
  type: EvidenceType;
  quality: number;
  features: Feature[];
  objects: DetectedObject[];
  text: string[];
  metadata: Record<string, any>;
}

interface Observation {
  observationId: string;
  evidenceId: string;
  type: string;
  confidence: number;
  claim: string;
}

interface VerifiedFact {
  factId: string;
  evidenceId: string;
  claim: string;
  confidence: number;
  verified: boolean;
  verifiedBy: string;
  verifiedAt: Date;
}
```

### Storage Provider Interface

```typescript
interface StorageProvider {
  providerId: string;
  types: EvidenceType[];
  
  store(evidence: Evidence): Promise<StorageResult>;
  retrieve(evidenceId: string): Promise<Evidence>;
  delete(evidenceId: string): Promise<void>;
}

class GoogleDriveStorage implements StorageProvider {
  providerId = "google-drive";
  types: ["photo", "pdf", "video"];
  
  async store(evidence: Evidence): Promise<StorageResult> {
    // Store in Google Drive
  }
}

class DropboxStorage implements StorageProvider {
  providerId = "dropbox";
  types: ["photo", "pdf", "video"];
  
  // Same interface, different implementation
}
```

### Benefits

1. **Generalized:** Handles all evidence types, not just photos
2. **Storage Independence:** Swap storage providers easily
3. **Standardized Processing:** Same pipeline for all evidence
4. **Verification:** Fact verification applies to all evidence types

---

## 28. Five Canonical Concepts

### Architectural Simplification

Reduce everything to five canonical concepts:

1. **Identity** (Customer, Crew, Vendor)
2. **Mission** (Estimate, Job, Project)
3. **Evidence** (Photo, Email, PDF, Voice)
4. **Capability** (Google, Stripe, Jobber, Twilio)
5. **Knowledge** (Platform intelligence only)

Everything else becomes relationships between those five.

### Identity

```typescript
interface Identity {
  canonicalId: string;
  tenantId: string;
  type: "customer" | "crew" | "vendor";
  
  // Core Data
  name: string;
  contact: ContactInfo;
  
  // Relationships
  relatedMissions: Mission[];
  
  // Provider Adapters
  providers: Record<string, Adapter>;
}
```

### Mission

```typescript
interface Mission {
  canonicalId: string;
  tenantId: string;
  type: "estimate" | "job" | "project";
  
  // Relationships
  customer: Identity;
  property: Property;
  evidence: Evidence[];
  
  // Owned Objects
  tasks: Task[];
  appointments: Appointment[];
  documents: Document[];
  communications: Communication[];
  invoices: Invoice[];
  reviews: Review[];
  crew: Identity[];
}
```

### Evidence

```typescript
interface Evidence {
  canonicalId: string;
  tenantId: string;
  missionId: string;
  type: EvidenceType;
  
  content: EvidenceContent;
  storage: StorageLocation;
  analysis?: EvidenceAnalysis;
}
```

### Capability

```typescript
interface Capability {
  capabilityId: string;
  type: string;
  
  providers: CapabilityProvider[];
}

interface CapabilityProvider {
  providerId: string;
  execute(request: CapabilityRequest): Promise<CapabilityResult>;
}
```

### Knowledge

```typescript
interface Knowledge {
  knowledgeId: string;
  type: "pattern" | "heuristic" | "insight";
  
  // Platform intelligence only
  content: KnowledgeContent;
  confidence: number;
  evidence: number;
  learnedAt: Date;
  
  // NO customer data
}
```

### Relationship Graph

```
Identity
  ├─ owns → Mission
  ├─ provides → Mission (crew)
  └─ related to → Mission

Mission
  ├─ has → Evidence
  ├─ requires → Capability
  ├─ generates → Knowledge
  └─ relates to → Identity

Evidence
  ├─ belongs to → Mission
  ├─ stored in → Capability (storage)
  └─ generates → Knowledge

Capability
  ├─ provides → Mission
  └─ generates → Knowledge

Knowledge
  ├─ learned from → Mission
  ├─ learned from → Evidence
  └─ improves → Capability
```

### Benefits

1. **Simplicity:** Five concepts cover everything
2. **Clarity:** Clear separation of concerns
3. **Extensibility:** New capabilities plug into same model
4. **Relationships:** Everything is a relationship between canonical concepts

---

## 29. Multi-Tenant Safety

### Mathematical Impossibility of Cross-Tenant Data Leakage

**Principle:** Every single object must carry tenantId, owner, authority, classification, canonicalId. No exceptions.

### Object Structure

```typescript
interface TenantAware {
  tenantId: string;      // REQUIRED
  owner: string;         // REQUIRED
  authority: string;    // REQUIRED
  classification: string; // REQUIRED
  canonicalId: string;   // REQUIRED
}
```

### Capability Request Structure

```typescript
interface CapabilityRequest {
  tenantId: string;      // REQUIRED
  missionId?: string;    // OPTIONAL
  actor: string;         // REQUIRED
  authority: string;    // REQUIRED
  action: string;        // REQUIRED
  capability: string;   // REQUIRED
  provider: string;      // REQUIRED
  payload: unknown;
}
```

### Capability Broker Enforcement

```typescript
class CapabilityBroker {
  async execute(request: CapabilityRequest): Promise<CapabilityResult> {
    // Validate tenant safety BEFORE invoking provider
    if (!this.validateTenantSafety(request)) {
      return {
        success: false,
        error: "Tenant safety validation failed"
      };
    }

    // Validate authority
    if (!this.validateAuthority(request)) {
      return {
        success: false,
        error: "Insufficient authority"
      };
    }

    // Only then invoke provider
    const provider = this.getProvider(request.capability, request.provider);
    return await provider.execute(request);
  }

  private validateTenantSafety(request: CapabilityRequest): boolean {
    // Ensure tenantId is present
    if (!request.tenantId) return false;
    
    // Ensure actor is authorized for tenant
    if (!this.isActorAuthorized(request.tenantId, request.actor)) return false;
    
    // Ensure authority is sufficient for action
    if (!this.isAuthoritySufficient(request.authority, request.action)) return false;
    
    return true;
  }

  private validateAuthority(request: CapabilityRequest): boolean {
    // Authority matrix validation
    const authorityMatrix = {
      "automation": ["schedule", "send", "read"],
      "user": ["schedule", "send", "read"],
      "read-only": ["read"]
    };
    
    const allowedActions = authorityMatrix[request.authority] || [];
    return allowedActions.includes(request.action);
  }
}
```

### Provider Adapter Enforcement

```typescript
class GoogleCalendarProvider implements CapabilityProvider {
  async execute(request: CapabilityRequest): Promise<CapabilityResult> {
    // Double-check tenant safety at provider level
    if (request.tenantId !== this.currentTenantId) {
      throw new Error("Cross-tenant request rejected");
    }

    // Execute with tenant-scoped credentials
    const credentials = this.getTenantCredentials(request.tenantId);
    return await this.executeWithCredentials(request, credentials);
  }

  private getTenantCredentials(tenantId: string): GoogleCredentials {
    // Return tenant-specific credentials
    // Never use global credentials
  }
}
```

### Benefits

1. **Mathematical Safety:** Cross-tenant leakage is impossible by design
2. **Audit Trail:** Every action is attributable to tenant, actor, authority
3. **Credential Isolation:** Tenant-specific credentials prevent cross-tenant access
4. **Authority Control:** Fine-grained authority matrix

---

## 30. Revised Implementation Roadmap

### Phase 0: Foundational Concepts (Weeks 1-4)

**Objective:** Establish the five canonical concepts and multi-tenant safety before adding any integrations.

**Tasks:**
1. Implement Canonical Customer object with provider adapters
2. Implement Canonical Mission object
3. Implement Evidence pipeline
4. Implement Capability Broker and Event Bus
5. Implement multi-tenant safety enforcement
6. Implement Knowledge Constitution (patterns only)
7. Define relationship graph between five concepts
8. Deploy and test

**Deliverables:**
- Canonical Customer with Google Contacts adapter
- Canonical Mission with Planner
- Evidence pipeline with Google Drive storage
- Capability Broker with Google Calendar provider
- Multi-tenant safety enforcement
- Knowledge Constitution foundation

**Success Metrics:**
- Provider swap works without domain changes
- Multi-tenant isolation enforced
- Event-driven architecture operational
- Five canonical concepts implemented

### Phase 1: Google Workspace Providers (Weeks 5-8)

**Objective:** Add Google Workspace as capability providers using the foundational architecture.

**Tasks:**
1. Implement Google Calendar provider
2. Implement Google Drive storage provider
3. Implement Gmail communication provider
4. Implement Google Sheets reporting provider
5. Implement Google Business Profile marketing provider
6. Test provider swap capability
7. Deploy and test

**Deliverables:**
- Google Calendar provider
- Google Drive storage provider
- Gmail communication provider
- Google Sheets reporting provider
- Google Business Profile marketing provider

**Success Metrics:**
- All providers use Capability Broker
- Provider swap works without domain changes
- Multi-tenant safety maintained

### Phase 2: Additional Providers (Weeks 9-12)

**Objective:** Add non-Google providers to prove provider independence.

**Tasks:**
1. Implement Jobber calendar provider
2. Implement Stripe payment provider
3. Implement Twilio communication provider
4. Implement Dropbox storage provider
5. Test multi-provider workflows
6. Deploy and test

**Deliverables:**
- Jobber calendar provider
- Stripe payment provider
- Twilio communication provider
- Dropbox storage provider

**Success Metrics:**
- Providers are interchangeable
- Workflows work with any provider
- No domain logic changes required

### Phase 3: Business Intelligence (Weeks 13-16)

**Objective:** Build intelligence on top of the canonical concepts.

**Tasks:**
1. Implement Weekly Business Brief (reads Mission graph)
2. Implement Customer Health (reads Identity relationships)
3. Implement Evidence Intelligence (reads Evidence pipeline)
4. Implement SEO Assistant (reads Marketing capability)
5. Deploy and test

**Deliverables:**
- Weekly Business Brief
- Customer Health monitoring
- Evidence Intelligence
- SEO Assistant

**Success Metrics:**
- Intelligence reads canonical concepts, not providers
- Provider changes don't affect intelligence
- Multi-tenant isolation maintained

### Phase 4: Automation Workflows (Weeks 17-20)

**Objective:** Implement Mission-driven automation workflows.

**Tasks:**
1. Implement Estimate Accepted workflow (Mission-driven)
2. Implement New Estimate workflow (Mission-driven)
3. Implement Review Request workflow (Mission-driven)
4. Implement Warranty Claim workflow (Mission-driven)
5. Deploy and test

**Deliverables:**
- Mission-driven workflows
- Planner integration
- Capability Broker orchestration

**Success Metrics:**
- Workflows are Mission-driven
- Planner recomputes on changes
- Provider changes don't break workflows

---

## Conclusion

This revised architecture establishes:

**Five Canonical Concepts:**
1. Identity (Customer, Crew, Vendor)
2. Mission (Estimate, Job, Project)
3. Evidence (Photo, Email, PDF, Voice)
4. Capability (Google, Stripe, Jobber, Twilio)
5. Knowledge (Platform intelligence only)

**Critical Architectural Principles:**
1. **Capability Broker:** Google is one provider, not the runtime
2. **Canonical Customer:** Single source of truth with provider adapters
3. **Canonical Mission:** Central concept that owns everything
4. **Evidence Pipeline:** Generalized beyond photos
5. **Multi-Tenant Safety:** Mathematical impossibility of cross-tenant leakage

**Implementation Priority:**
1. **Phase 0 (Weeks 1-4):** Foundational concepts - Customer, Mission, Evidence, Capability Broker, Multi-tenant safety
2. **Phase 1 (Weeks 5-8):** Google Workspace providers
3. **Phase 2 (Weeks 9-12):** Additional providers (Jobber, Stripe, Twilio, Dropbox)
4. **Phase 3 (Weeks 13-16):** Business Intelligence
5. **Phase 4 (Weeks 17-20):** Mission-driven automation

This approach ensures that every new provider—Microsoft 365, Jobber, HubSpot, Dropbox, Stripe—plugs into the same execution model without forcing new domain concepts or accumulating architectural debt.

---

## 31. Engineering Standards, Governance, and Architectural Enforcement

### Objective

Transform the architecture from documentation into enforceable engineering rules. This section defines the constitution for developers, ensuring that contractors and future contributors build consistently with the architectural principles established in Sections 1–30.

---

### 31.1 Coding Standards

#### TypeScript Standards

```typescript
// STRICT MODE - All projects must use strict TypeScript
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true
  }
}
```

#### Naming Conventions

```typescript
// Canonical IDs: UPPER_SNAKE_CASE with prefix
const CUSTOMER_ID = "CUST-12345";
const MISSION_ID = "MISSION-67890";
const EVIDENCE_ID = "EVID-11111";

// Interfaces: PascalCase
interface Customer { }
interface Mission { }
interface Evidence { }

// Classes: PascalCase
class CustomerService { }
class CapabilityBroker { }
class GoogleCalendarProvider { }

// Functions: camelCase
function createCustomer() { }
function scheduleEvent() { }
function validateTenantSafety() { }

// Constants: UPPER_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;
const DEFAULT_TIMEOUT_MS = 30000;

// Private members: underscore prefix
class Example {
  private _internalState: string;
  private _helperMethod() { }
}
```

#### File Organization

```
src/
├── domain/              # Canonical models (NO provider dependencies)
│   ├── identity/
│   │   ├── customer.ts
│   │   ├── crew.ts
│   │   └── vendor.ts
│   ├── mission/
│   │   ├── mission.ts
│   │   ├── task.ts
│   │   └── appointment.ts
│   ├── evidence/
│   │   ├── evidence.ts
│   │   ├── observation.ts
│   │   └── verified-fact.ts
│   └── knowledge/
│       ├── pattern.ts
│       └── heuristic.ts
├── capability/          # Capability interfaces and broker
│   ├── broker.ts
│   ├── event-bus.ts
│   └── interfaces/
│       ├── calendar.ts
│       ├── storage.ts
│       └── communication.ts
├── providers/           # Provider adapters (ONE per provider)
│   ├── google/
│   │   ├── calendar-provider.ts
│   │   ├── drive-storage-provider.ts
│   │   └── gmail-provider.ts
│   ├── jobber/
│   │   └── calendar-provider.ts
│   └── stripe/
│       └── payment-provider.ts
├── services/           # Business logic
│   ├── customer-service.ts
│   ├── mission-service.ts
│   └── evidence-service.ts
├── infrastructure/     # External integrations
│   ├── database/
│   ├── messaging/
│   └── logging/
└── shared/            # Shared utilities
    ├── types.ts
    ├── constants.ts
    └── utils.ts
```

---

### 31.2 Repository Structure

#### Monorepo Structure

```
ping-platform/
├── apps/
│   ├── api/              # Next.js API
│   ├── web/              # Next.js web app
│   └── worker/           # Background worker
├── packages/
│   ├── domain/           # Canonical models
│   ├── capability/       # Capability interfaces
│   ├── providers/        # Provider adapters
│   └── shared/           # Shared utilities
├── infra/
│   ├── terraform/        # Infrastructure as code
│   ├── kubernetes/       # K8s manifests
│   └── scripts/          # Deployment scripts
├── docs/
│   ├── adr/              # Architecture Decision Records
│   └── api/              # API documentation
└── .github/
    └── workflows/        # CI/CD workflows
```

#### Package.json Rules

```json
{
  "name": "@ping/domain",
  "version": "1.0.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "lint": "eslint src --ext .ts",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    // NO provider SDKs in domain package
  },
  "peerDependencies": {
    // Only if needed
  }
}
```

---

### 31.3 Package Boundaries

#### Dependency Rules

```typescript
// ALLOWED dependencies
domain → shared
capability → domain
providers → capability
services → domain, capability
apps → services, providers

// FORBIDDEN dependencies
domain → providers          // Domain must never reference provider SDKs
domain → capability         // Domain must be pure
providers → domain          // Providers may only reference capability interfaces
apps → domain               // Apps must go through services
```

#### ESLint Rules for Boundaries

```javascript
// .eslintrc.js
module.exports = {
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['@ping/domain'],
            importNames: ['googleapis'],
            message: 'Domain layer must never reference provider SDKs'
          },
          {
           group: ['@ping/providers'],
            importNames: ['Customer', 'Mission'],
            message: 'Providers must only reference capability interfaces'
          }
        ]
      }
    ]
  }
}
```

---

### 31.4 Dependency Rules

#### Forbidden Dependencies

```typescript
// FORBIDDEN in domain package
import { google } from 'googleapis';           // ❌
import { JobberClient } from '@jobber/sdk';    // ❌
import Stripe from 'stripe';                   // ❌

// FORBIDDEN in capability package
import { Customer } from '@ping/domain';      // ❌
import { Mission } from '@ping/domain';       // ❌

// FORBIDDEN in provider package
import { Customer } from '@ping/domain';      // ❌
```

#### Allowed Dependencies

```typescript
// ALLOWED in domain package
import { TenantAware } from '@ping/shared';   // ✅

// ALLOWED in capability package
import { TenantAware } from '@ping/domain';   // ✅

// ALLOWED in provider package
import { CapabilityProvider } from '@ping/capability'; // ✅
import { CapabilityRequest } from '@ping/capability';  // ✅
```

---

### 31.5 ADR (Architecture Decision Record) Process

#### ADR Template

```markdown
# ADR-XXX: [Title]

## Status
Proposed | Accepted | Deprecated | Superseded

## Context
What is the issue that we're seeing that is motivating this decision or change?

## Decision
What is the change that we're proposing and/or doing?

## Consequences
What becomes easier or more difficult to do because of this change?

## Alternatives Considered
What other approaches did we consider, and why did we reject them?

## References
Links to related ADRs, documentation, or discussions.
```

#### ADR Process

1. **Propose:** Create ADR in `docs/adr/ADR-XXX-title.md` with status "Proposed"
2. **Review:** Discuss in architecture review meeting
3. **Accept:** Update status to "Accepted" and merge
4. **Implement:** Implement according to ADR
5. **Deprecate:** If superseded, update status and reference new ADR

#### Required ADRs

- ADR-001: Five Canonical Concepts
- ADR-002: Capability Broker Pattern
- ADR-003: Multi-Tenant Safety
- ADR-004: Event Sourcing Strategy
- ADR-005: Provider Adapter Pattern

---

### 31.6 Versioning Strategy

#### Semantic Versioning

```typescript
// MAJOR.MINOR.PATCH
// MAJOR: Breaking changes
// MINOR: New features, backward compatible
// PATCH: Bug fixes, backward compatible

{
  "name": "@ping/domain",
  "version": "1.2.3"
}
```

#### Canonical Model Versioning

```typescript
interface Customer {
  canonicalId: string;
  version: string;  // "1.0.0"
  tenantId: string;
  // ... other fields
}

// Breaking change requires version bump
interface CustomerV2 {
  canonicalId: string;
  version: string;  // "2.0.0"
  tenantId: string;
  // ... new or changed fields
}
```

#### Provider Adapter Versioning

```typescript
class GoogleCalendarProvider implements CapabilityProvider {
  providerId = "google-calendar";
  version = "1.0.0";
  capabilities = ["schedule", "find-window", "detect-conflict"];
  
  // Breaking change requires version bump and new class
}
```

---

### 31.7 API Evolution

#### API Versioning

```typescript
// URL-based versioning
GET /api/v1/customers/:id
GET /api/v2/customers/:id

// Header-based versioning
GET /api/customers/:id
Headers: {
  "API-Version": "v2"
}
```

#### Breaking Change Process

1. **Deprecate:** Add deprecation warning to old version
2. **Document:** Document breaking change in changelog
3. **Wait:** Wait 90 days for deprecation period
4. **Remove:** Remove old version after deprecation period

#### Backward Compatibility

```typescript
// New field with default value
interface Customer {
  canonicalId: string;
  name: string;
  email: string;
  phone?: string;  // Optional for backward compatibility
}

// Union type for evolution
type Status = "draft" | "submitted" | "accepted" | "completed" | "archived";
type StatusV2 = Status | "in_review" | "pending_approval";
```

---

### 31.8 Event Schema Evolution

#### Event Versioning

```typescript
interface Event {
  eventId: string;
  eventType: string;
  eventVersion: string;  // "1.0.0"
  tenantId: string;
  missionId?: string;
  payload: unknown;
  timestamp: Date;
  source: string;
}
```

#### Backward-Compatible Event Evolution

```typescript
// V1
interface EstimateAcceptedEvent {
  estimateId: string;
  acceptedAt: Date;
}

// V2 (backward compatible)
interface EstimateAcceptedEventV2 {
  estimateId: string;
  acceptedAt: Date;
  acceptedBy?: string;  // Optional field
  metadata?: Record<string, any>;  // Optional metadata
}
```

#### Event Migration Strategy

```typescript
// Event transformer for version migration
class EventTransformer {
  transform(event: Event): Event {
    if (event.eventVersion === "1.0.0") {
      return this.transformV1ToV2(event);
    }
    return event;
  }
  
  private transformV1ToV2(event: Event): Event {
    // Add new fields with defaults
    return {
      ...event,
      eventVersion: "2.0.0",
      payload: {
        ...event.payload,
        acceptedBy: "system",
        metadata: {}
      }
    };
  }
}
```

---

### 31.9 Database Migration Strategy

#### Migration Files

```typescript
// migrations/20240101_add_customer_version.ts
export const up = async (db: Database) => {
  await db.schema
    .alterTable('customers')
    .addColumn('version', 'varchar(20)', (col) => col.defaultTo('1.0.0').notNull())
    .execute();
};

export const down = async (db: Database) => {
  await db.schema
    .alterTable('customers')
    .dropColumn('version')
    .execute();
};
```

#### Migration Rules

1. **Never drop columns:** Add new columns, deprecate old ones
2. **Always reversible:** Every migration must have up and down
3. **Test migrations:** Run migrations in staging before production
4. **Rollback plan:** Every deployment must support rollback

#### Migration Execution

```bash
# Run migrations
npm run migrate:up

# Rollback migrations
npm run migrate:down

# Create new migration
npm run migrate:create add_field_name
```

---

### 31.10 Testing Strategy

#### Test Pyramid

```
        /\
       /E2E\        10% - Critical user journeys
      /------\
     /Integration\ 30% - Service integration
    /------------\
   /   Unit Tests  \ 60% - Business logic
  /----------------\
```

#### Mandatory Tests

```typescript
// Unit tests for domain logic
describe('CustomerService', () => {
  it('should create customer with canonical ID', () => {
    const customer = customerService.create({...});
    expect(customer.canonicalId).toMatch(/^CUST-\d+$/);
  });
  
  it('should enforce tenant isolation', () => {
    const customer = customerService.create({...});
    expect(customer.tenantId).toBeDefined();
  });
});

// Integration tests for provider adapters
describe('GoogleCalendarProvider', () => {
  it('should schedule event with attribution', async () => {
    const result = await provider.execute(request);
    expect(result.success).toBe(true);
    expect(result.attribution.actor).toBeDefined();
  });
  
  it('should reject cross-tenant requests', async () => {
    const request = { ...validRequest, tenantId: 'OTHER-TENANT' };
    await expect(provider.execute(request)).rejects.toThrow('Cross-tenant');
  });
});

// E2E tests for critical workflows
describe('Estimate Accepted Workflow', () => {
  it('should complete workflow from estimate to job', async () => {
    const mission = await workflow.execute(estimateId);
    expect(mission.status).toBe('job');
  });
});
```

#### Test Coverage Requirements

```typescript
// Minimum coverage thresholds
{
  "coverageThreshold": {
    "global": {
      "branches": 80,
      "functions": 80,
      "lines": 80,
      "statements": 80
    },
    "./src/domain": {
      "branches": 90,
      "functions": 90,
      "lines": 90,
      "statements": 90
    }
  }
}
```

---

### 31.11 CI/CD Requirements

#### CI Pipeline

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run test
      - run: npm run test:coverage
      - run: npm run build
      
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm audit
      - run: npm run snyk-test
      
  architecture:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm run check-boundaries
      - run: npm run check-dependencies
```

#### Required Checks

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Unit tests
npm run test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage
npm run test:coverage

# Security audit
npm audit

# Dependency check
npm run check-dependencies

# Boundary check
npm run check-boundaries
```

---

### 31.12 Security Gates

#### Pre-Commit Hooks

```bash
#!/bin/bash
# .husky/pre-commit

npm run typecheck
npm run lint
npm run test
```

#### Pre-Push Hooks

```bash
#!/bin/bash
# .husky/pre-push

npm run test:integration
npm run security-audit
```

#### Security Scanning

```bash
# Dependency vulnerability scan
npm audit

# Snyk security scan
snyk test

# Static application security testing
npm run sast

# Container scanning
trivy image ping-platform:latest
```

---

### 31.13 Static Analysis

#### ESLint Configuration

```javascript
// .eslintrc.js
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'prettier'
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-floating-promises': 'error',
    'no-console': 'warn',
    'no-debugger': 'error'
  }
};
```

#### Prettier Configuration

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
```

---

### 31.14 Performance Budgets

#### Bundle Size Limits

```json
{
  "budgets": [
    {
      "type": "initial",
      "maximumError": "500kb",
      "maximumWarning": "300kb"
    },
    {
      "type": "anyComponentStyle",
      "maximumError": "10kb",
      "maximumWarning": "5kb"
    }
  ]
}
```

#### API Response Time Limits

```typescript
// Performance monitoring
interface PerformanceMetrics {
  endpoint: string;
  p50: number;  // 50th percentile
  p95: number;  // 95th percentile
  p99: number;  // 99th percentile
}

// Budgets
const API_BUDGETS = {
  'GET /api/customers/:id': { p95: 100, p99: 200 },
  'POST /api/customers': { p95: 200, p99: 500 },
  'GET /api/missions': { p95: 300, p99: 600 }
};
```

---

### 31.15 Documentation Requirements

#### Code Documentation

```typescript
/**
 * Creates a new customer with provider synchronization.
 * 
 * @param customer - The customer data to create
 * @param providers - Array of provider IDs to sync with
 * @returns Promise<Customer> - The created customer
 * @throws {TenantValidationError} - If tenant validation fails
 * @throws {ProviderSyncError} - If provider synchronization fails
 * 
 * @example
 * ```typescript
 * const customer = await customerService.create(
 *   { name: 'John Doe', email: 'john@example.com' },
 *   ['google-contacts', 'jobber']
 * );
 * ```
 */
async create(customer: Customer, providers: string[]): Promise<Customer> {
  // Implementation
}
```

#### API Documentation

```typescript
/**
 * @api {post} /api/v1/customers Create Customer
 * @apiName CreateCustomer
 * @apiGroup Customers
 * @apiVersion 1.0.0
 * 
 * @apiParam {String} name Customer name
 * @apiParam {String} email Customer email
 * @apiParam {String} [phone] Customer phone
 * 
 * @apiSuccess {String} canonicalId Customer canonical ID
 * @apiSuccess {String} tenantId Tenant ID
 * 
 * @apiError 400 Invalid request
 * @apiError 401 Unauthorized
 * @apiError 409 Customer already exists
 */
```

---

### 31.16 Observability Standards

#### Required Telemetry

```typescript
interface TelemetryEvent {
  timestamp: Date;
  tenantId: string;
  missionId?: string;
  service: string;
  level: "info" | "warn" | "error";
  message: string;
  context: Record<string, any>;
}

// Every service must emit structured telemetry
logger.info('Customer created', {
  tenantId: customer.tenantId,
  customerId: customer.canonicalId,
  providers: providers
});
```

#### Metrics

```typescript
// Counter metrics
metrics.increment('customer.created', {
  tenantId: customer.tenantId
});

// Histogram metrics
metrics.histogram('api.request.duration', duration, {
  endpoint: '/api/customers',
  method: 'POST'
});

// Gauge metrics
metrics.gauge('active.missions', missionCount, {
  tenantId: tenantId
});
```

#### Tracing

```typescript
// Distributed tracing
const span = tracer.startSpan('customer.create');
try {
  span.setTag('tenantId', customer.tenantId);
  const result = await customerService.create(customer);
  span.finish();
  return result;
} catch (error) {
  span.setTag('error', true);
  span.finish();
  throw error;
}
```

---

### 31.17 Architectural Enforcement

#### CI Failures for Violations

```bash
# FAIL CI if:
- Domain layer references provider SDKs
- Provider references domain models directly
- Missing tenantId on canonical objects
- Missing attribution on write operations
- Breaking API changes without version bump
- Missing required telemetry
- Test coverage below threshold
- Security vulnerabilities found
- Performance budget exceeded
```

#### Layer Reference Rules

```typescript
// ALLOWED
services → domain
services → capability
providers → capability
apps → services
apps → providers

// FORBIDDEN
domain → providers
domain → capability
providers → domain
apps → domain
```

#### Forbidden Dependencies

```typescript
// FORBIDDEN in package.json
{
  "dependencies": {
    "googleapis": "❌",           // Only in providers/google
    "@jobber/sdk": "❌",          // Only in providers/jobber
    "stripe": "❌"                // Only in providers/stripe
  }
}
```

#### Provider Adapter Validation

```typescript
// Every provider adapter must:
1. Implement CapabilityProvider interface
2. Pass tenant isolation tests
3. Emit structured telemetry
4. Support rollback
5. Have integration tests

interface ProviderAdapterValidation {
  implementsInterface: boolean;
  passesTenantIsolationTests: boolean;
  emitsTelemetry: boolean;
  supportsRollback: boolean;
  hasIntegrationTests: boolean;
}
```

#### Canonical Model Validation

```typescript
// Every canonical object must have:
interface CanonicalModelValidation {
  hasCanonicalId: boolean;
  hasTenantId: boolean;
  hasVersion: boolean;
  hasOwner: boolean;
  hasAuthority: boolean;
  hasClassification: boolean;
}
```

#### Breaking Change Validation

```typescript
// Breaking changes require:
1. Semantic version bump
2. ADR documentation
3. Migration strategy
4. Deprecation period (90 days)
5. Backward compatibility layer

interface BreakingChangeValidation {
  versionBumped: boolean;
  adrDocumented: boolean;
  migrationStrategy: boolean;
  deprecationPeriod: boolean;
  backwardCompatibility: boolean;
}
```

#### Event Evolution Validation

```typescript
// Event evolution must:
1. Include eventVersion
2. Be backward compatible
3. Have transformer for migration
4. Document breaking changes

interface EventEvolutionValidation {
  hasEventVersion: boolean;
  backwardCompatible: boolean;
  hasTransformer: boolean;
  breakingChangesDocumented: boolean;
}
```

#### Mandatory Tests Before Deployment

```bash
# REQUIRED before deployment:
1. Unit tests pass (60%+ coverage)
2. Integration tests pass
3. E2E tests pass for critical workflows
4. Tenant isolation tests pass
5. Provider adapter tests pass
6. Security audit passes
7. Performance budgets met
8. Type checking passes
9. Linting passes
10. Documentation updated
```

#### Required Telemetry for Every Service

```typescript
// Every service must emit:
interface RequiredTelemetry {
  // Request metrics
  requestCount: Counter;
  requestDuration: Histogram;
  errorCount: Counter;
  
  // Business metrics
  operationsPerformed: Counter;
  operationsSucceeded: Counter;
  operationsFailed: Counter;
  
  // Tenant metrics
  tenantOperations: Counter;
  tenantErrors: Counter;
  
  // Tracing
  distributedTracing: Span;
}
```

#### Capability Review Process

```typescript
// New capability review checklist:
interface CapabilityReview {
  // Architecture
  implementsCapabilityInterface: boolean;
  followsProviderPattern: boolean;
  tenantIsolationGuaranteed: boolean;
  
  // Engineering
  hasUnitTests: boolean;
  hasIntegrationTests: boolean;
  hasE2ETests: boolean;
  meetsCoverageThreshold: boolean;
  
  // Documentation
  hasADR: boolean;
  hasAPIDocumentation: boolean;
  hasUsageExamples: boolean;
  
  // Operations
  emitsTelemetry: boolean;
  supportsRollback: boolean;
  hasRunbook: boolean;
  
  // Security
  passesSecurityAudit: boolean;
  hasAccessControl: boolean;
  encryptsSensitiveData: boolean;
}
```

---

### 31.18 Architectural Contracts

#### Contract 1: Domain Layer Purity

```typescript
// CONTRACT: Domain layer must never reference provider SDKs
// VIOLATION: CI failure
// ENFORCEMENT: ESLint rule, dependency check

// ❌ VIOLATION
import { google } from 'googleapis';
import { JobberClient } from '@jobber/sdk';

// ✅ CORRECT
import { TenantAware } from '@ping/shared';
```

#### Contract 2: Provider Adapter Interface

```typescript
// CONTRACT: Provider adapters may only implement capability interfaces
// VIOLATION: CI failure
// ENFORCEMENT: TypeScript strict mode, interface check

// ❌ VIOLATION
class GoogleCalendarProvider {
  async schedule(event: CalendarEvent) { }
}

// ✅ CORRECT
class GoogleCalendarProvider implements CapabilityProvider {
  providerId = "google-calendar";
  capabilities = ["schedule", "find-window", "detect-conflict"];
  
  async execute(request: CapabilityRequest): Promise<CapabilityResult> {
    // Implementation
  }
}
```

#### Contract 3: Attribution Metadata

```typescript
// CONTRACT: Every write operation must include attribution metadata
// VIOLATION: Runtime error
// ENFORCEMENT: Runtime validation

// ❌ VIOLATION
await calendarService.scheduleEvent(event);

// ✅ CORRECT
await capabilityBroker.execute({
  tenantId: tenantId,
  missionId: missionId,
  actor: "PING",
  authority: "automation",
  action: "schedule",
  capability: "calendar",
  provider: "google-calendar",
  payload: event
});
```

#### Contract 4: Tenant Identity

```typescript
// CONTRACT: Every canonical object must include tenant identity
// VIOLATION: Runtime error
// ENFORCEMENT: Runtime validation, TypeScript strict mode

// ❌ VIOLATION
interface Customer {
  canonicalId: string;
  name: string;
  email: string;
}

// ✅ CORRECT
interface Customer extends TenantAware {
  canonicalId: string;
  tenantId: string;
  owner: string;
  authority: string;
  classification: string;
  name: string;
  email: string;
}
```

#### Contract 5: Event Immutability

```typescript
// CONTRACT: Every event must be immutable
// VIOLATION: Runtime error
// ENFORCEMENT: Readonly types, runtime validation

// ❌ VIOLATION
const event: Event = { /* ... */ };
event.payload = newValue;

// ✅ CORRECT
const event: Readonly<Event> = { /* ... */ };
// TypeScript error: Cannot assign to 'payload' because it is a read-only property
```

#### Contract 6: Semantic Versioning

```typescript
// CONTRACT: Every API change requires semantic versioning
// VIOLATION: CI failure
// ENFORCEMENT: Version check, changelog validation

// ❌ VIOLATION
// Changed interface without version bump
interface Customer {
  canonicalId: string;
  newField: string;  // Breaking change
}

// ✅ CORRECT
// Version bump to 2.0.0
interface CustomerV2 {
  canonicalId: string;
  newField: string;
}
```

#### Contract 7: Tenant Isolation Tests

```typescript
// CONTRACT: Every provider integration must pass tenant isolation tests
// VIOLATION: CI failure
// ENFORCEMENT: Integration test suite

describe('Tenant Isolation', () => {
  it('should reject cross-tenant requests', async () => {
    const request = {
      tenantId: 'TENANT-A',
      // ... other fields
    };
    
    // Try to access TENANT-B data
    const result = await provider.execute({
      ...request,
      targetTenantId: 'TENANT-B'
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Cross-tenant');
  });
});
```

#### Contract 8: Workflow Replayability

```typescript
// CONTRACT: Every workflow must be replayable from the event log
// VIOLATION: CI failure
// ENFORCEMENT: Event sourcing tests

describe('Workflow Replayability', () => {
  it('should replay workflow from event log', async () => {
    const events = await eventLog.getEvents(missionId);
    const replayed = await workflowReplayer.replay(events);
    
    expect(replayed.state).toEqual(expectedState);
  });
});
```

#### Contract 9: Deployment Rollback

```typescript
// CONTRACT: Every deployment must support rollback
// VIOLATION: Deployment blocked
// ENFORCEMENT: Deployment pipeline validation

// Rollback strategy:
1. Database migrations must be reversible
2. API changes must support multiple versions
3. Feature flags must support rollback
4. Infrastructure changes must support rollback

// Rollback command:
npm run rollback:deployment <version>
```

#### Contract 10: Structured Telemetry

```typescript
// CONTRACT: Every service must emit structured telemetry
// VIOLATION: Runtime warning
// ENFORCEMENT: Telemetry validation middleware

// ❌ VIOLATION
console.log('Customer created');

// ✅ CORRECT
logger.info('Customer created', {
  tenantId: customer.tenantId,
  customerId: customer.canonicalId,
  timestamp: new Date().toISOString(),
  service: 'customer-service'
});
```

---

### 31.19 Governance Process

#### Architecture Review Board

```typescript
// Architecture Review Board (ARB) responsibilities:
interface ARBResponsibilities {
  // Review new capabilities
  reviewNewCapabilities: boolean;
  
  // Review breaking changes
  reviewBreakingChanges: boolean;
  
  // Review provider integrations
  reviewProviderIntegrations: boolean;
  
  // Review security changes
  reviewSecurityChanges: boolean;
  
  // Approve ADRs
  approveADRs: boolean;
}
```

#### Review Checklist

```typescript
interface ReviewChecklist {
  // Architecture
  followsCanonicalConcepts: boolean;
  implementsCapabilityPattern: boolean;
  maintainsTenantIsolation: boolean;
  
  // Engineering
  meetsCodingStandards: boolean;
  passesAllTests: boolean;
  meetsCoverageThreshold: boolean;
  
  // Documentation
  hasADR: boolean;
  hasDocumentation: boolean;
  hasExamples: boolean;
  
  // Security
  passesSecurityAudit: boolean;
  hasAccessControl: boolean;
  
  // Operations
  emitsTelemetry: boolean;
  hasRunbook: boolean;
  supportsRollback: boolean;
}
```

#### Approval Process

```typescript
// Approval workflow:
1. Create PR with ADR
2. Request ARB review
3. ARB reviews against checklist
4. ARB approves or requests changes
5. Merge if approved
6. Implement according to ADR
7. Verify implementation matches ADR
```

---

### 31.20 Summary

This section establishes the engineering constitution for PING:

**Mandatory Contracts:**
1. Domain layer must never reference provider SDKs
2. Provider adapters may only implement capability interfaces
3. Every write operation must include attribution metadata
4. Every canonical object must include tenant identity
5. Every event must be immutable
6. Every API change requires semantic versioning
7. Every provider integration must pass tenant isolation tests
8. Every workflow must be replayable from the event log
9. Every deployment must support rollback
10. Every service must emit structured telemetry

**CI Failures:**
- Domain layer references provider SDKs
- Provider references domain models directly
- Missing tenantId on canonical objects
- Missing attribution on write operations
- Breaking API changes without version bump
- Missing required telemetry
- Test coverage below threshold
- Security vulnerabilities found
- Performance budget exceeded

**Governance:**
- Architecture Decision Record process
- Architecture Review Board
- Mandatory review checklist
- Approval workflow

These standards ensure that contractors and future contributors build consistently with the architectural principles established in Sections 1–30.

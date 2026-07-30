# Capability-First Frontend Architecture

**Based on:** PING v1 Commissioning Order + User Feedback  
**Status:** Planning Phase - READ ONLY  
**Objective:** Organize frontend around canonical business objects, not implementation categories

---

## Ten Flaws in Previous Plan

### Flaw 1: File-Based Organization
**Problem:** Organized by files (ui, decorative, providers, brand) instead of capabilities  
**Fix:** Organize by business objects (Customer, Project, Review, Estimate, Mission, etc.)

### Flaw 2: Feature → Component Thinking
**Problem:** Assumes Feature → Component hierarchy  
**Fix:** Capability → State → Projection → UI hierarchy

### Flaw 3: Backward Adapters
**Problem:** Individual adapters per data source (ReviewAdapter, ProjectAdapter)  
**Fix:** Projection Gateway that aggregates from multiple sources (Google, PostHog, Neo4j, Qdrant, Ollama)

### Flaw 4: Admin Owns Components
**Problem:** Admin dashboard owns AuthorityCard, FindingsTable, MetricsPanel  
**Fix:** Admin consumes projections (Authority Projection, Finding Projection, Metrics Projection)

### Flaw 5: Missing Object Model
**Problem:** Frontend thinks in "Review Card, Service Card, Project Card"  
**Fix:** Frontend thinks in "Review Object → Projection → Card"

### Flaw 6: No Canonical Object Registry
**Problem:** Projects, Reviews, Services, Estimates scattered everywhere  
**Fix:** Single canonical object registry with types, projection, hooks, components, actions

### Flaw 7: No Intelligence Layer
**Problem:** Frontend asks "What data should I show?"  
**Fix:** Frontend asks "What should Ollama recommend?" (Customer Object → Projection → AI Recommendation → UI)

### Flaw 8: No Canonical Event Bus
**Problem:** Click → State → Component rerender  
**Fix:** Click → Frontend Event → PING Event → Projection Refresh

### Flaw 9: Motion Separated from Capabilities
**Problem:** Global motion/ folder with buttons, cards, hover, fade  
**Fix:** Capability-specific motion (review/motion.ts, customer/motion.ts, estimate/motion.ts)

### Flaw 10: No Universal Shell
**Problem:** Multiple pages, multiple layouts  
**Fix:** Single application shell that swaps projections

---

## Canonical Object Registry

### Business Objects

```
objects/
├── customer/
│   ├── types/           # Customer type definitions
│   ├── projection/      # Customer projection logic
│   ├── hooks/           # Customer-specific hooks
│   ├── components/      # Customer UI components
│   ├── actions/         # Customer actions
│   └── motion.ts        # Customer-specific animations
│
├── project/
│   ├── types/
│   ├── projection/
│   ├── hooks/
│   ├── components/
│   ├── actions/
│   └── motion.ts
│
├── review/
│   ├── types/
│   ├── projection/
│   ├── hooks/
│   ├── components/
│   ├── actions/
│   └── motion.ts
│
├── estimate/
│   ├── types/
│   ├── projection/
│   ├── hooks/
│   ├── components/
│   ├── actions/
│   └── motion.ts
│
├── mission/
│   ├── types/
│   ├── projection/
│   ├── hooks/
│   ├── components/
│   ├── actions/
│   └── motion.ts
│
├── artifact/
│   ├── types/
│   ├── projection/
│   ├── hooks/
│   ├── components/
│   ├── actions/
│   └── motion.ts
│
├── recommendation/
│   ├── types/
│   ├── projection/
│   ├── hooks/
│   ├── components/
│   ├── actions/
│   └── motion.ts
│
├── campaign/
│   ├── types/
│   ├── projection/
│   ├── hooks/
│   ├── components/
│   ├── actions/
│   └── motion.ts
│
├── employee/
│   ├── types/
│   ├── projection/
│   ├── hooks/
│   ├── components/
│   ├── actions/
│   └── motion.ts
│
├── connector/
│   ├── types/
│   ├── projection/
│   ├── hooks/
│   ├── components/
│   ├── actions/
│   └── motion.ts
│
└── event/
    ├── types/
    ├── projection/
    ├── hooks/
    ├── components/
    ├── actions/
    └── motion.ts
```

### Shared Primitives

```
shared/
├── primitives/           # Atomic UI components (Button, Input, etc.)
├── animation/           # Reusable animation primitives
├── layout/              # Layout primitives (Container, Section, etc.)
└── utilities/           # Utility functions
```

### Shell

```
shell/
├── layout/              # Universal shell layout
├── navigation/          # Universal navigation
├── providers/           # Global providers (Theme, Motion, etc.)
└── event-bus/           # Frontend event bus
```

---

## Projection Gateway Architecture

### Single Gateway Pattern

```typescript
// shared/projection/ProjectionGateway.ts

export interface ProjectionGateway {
  // Customer Projections
  customerHealth: CustomerHealthProjection;
  customerActivity: CustomerActivityProjection;
  customerRecommendations: CustomerRecommendationProjection;
  
  // Project Projections
  projectStatus: ProjectStatusProjection;
  projectTimeline: ProjectTimelineProjection;
  projectRecommendations: ProjectRecommendationProjection;
  
  // Review Projections
  reviewSentiment: ReviewSentimentProjection;
  reviewQuality: ReviewQualityProjection;
  reviewModeration: ReviewModerationProjection;
  
  // Estimate Projections
  estimateConversion: EstimateConversionProjection;
  estimateFollowUp: EstimateFollowUpProjection;
  
  // Mission Projections
  missionQueue: MissionQueueProjection;
  missionHealth: MissionHealthProjection;
  
  // Dashboard Projections
  dashboardOverview: DashboardOverviewProjection;
  workerHealth: WorkerHealthProjection;
  connectorStatus: ConnectorStatusProjection;
}

// Implementation aggregates from multiple sources
class ProjectionGatewayImpl implements ProjectionGateway {
  constructor(
    private googleSheets: GoogleSheetsAdapter,
    private postHog: PostHogAdapter,
    private neo4j: Neo4jAdapter,
    private qdrant: QdrantAdapter,
    private ollama: OllamaAdapter
  ) {}
  
  async customerHealth(customerId: string): Promise<CustomerHealthProjection> {
    // Aggregate from Google Sheets, PostHog, Neo4j
    const reviews = await this.googleSheets.getCustomerReviews(customerId);
    const activity = await this.postHog.getCustomerActivity(customerId);
    const relationships = await this.neo4j.getCustomerRelationships(customerId);
    
    return {
      reviews,
      activity,
      relationships,
      healthScore: this.calculateHealthScore(reviews, activity, relationships)
    };
  }
  
  async customerRecommendations(customerId: string): Promise<CustomerRecommendationProjection> {
    // Use Ollama for recommendations
    const context = await this.buildCustomerContext(customerId);
    const recommendation = await this.ollama.getRecommendation(context);
    
    return {
      recommendation,
      confidence: recommendation.confidence,
      evidence: recommendation.evidence
    };
  }
}
```

### Projection Reuse

**Same projection, multiple UIs:**

```
ReviewProjection
├── Dashboard (admin view)
├── Project Page (project view)
├── Customer Page (customer view)
├── Mobile App (mobile view)
└── Voice Interface (voice view)
```

---

## Capability → State → Projection → UI

### Example: Review Capability

```
objects/review/
├── types/
│   └── review.ts              # Review type definition
│
├── state/
│   └── review-state.ts        # Review state management
│
├── projection/
│   ├── review-projection.ts   # Review projection logic
│   ├── sentiment-projection.ts # Sentiment analysis projection
│   ├── quality-projection.ts  # Quality score projection
│   └── moderation-projection.ts # Moderation projection
│
├── hooks/
│   ├── use-review.ts          # Review hook
│   ├── use-reviews.ts         # Reviews list hook
│   └── use-review-moderation.ts # Moderation hook
│
├── components/
│   ├── ReviewCard.tsx         # Review card UI
│   ├── ReviewList.tsx         # Review list UI
│   ├── ReviewModeration.tsx   # Moderation UI
│   └── ReviewStructuredData.tsx # SEO data
│
├── actions/
│   ├── approve-review.ts      # Approve action
│   ├── reject-review.ts       # Reject action
│   └── feature-review.ts      # Feature action
│
└── motion.ts                  # Review-specific animations
```

### Data Flow

```
User Action
    ↓
Review Action (approve-review.ts)
    ↓
Frontend Event (REVIEW_APPROVED)
    ↓
PING Event (REVIEW_APPROVED)
    ↓
State Update (Google Sheets, Neo4j)
    ↓
Projection Refresh (ReviewProjection)
    ↓
UI Update (All consumers: Dashboard, Project Page, Customer Page)
```

---

## Admin as Consumer, Not Owner

### Current (Wrong) Approach

```
components/features/admin/components/
├── AuthorityCard.tsx          # Owns business logic
├── FindingsTable.tsx          # Owns business logic
├── HealthCard.tsx             # Owns business logic
└── MetricsPanel.tsx           # Owns business logic
```

### Correct Approach

```
objects/authority/projection/
├── authority-health.ts       # Authority health projection
└── authority-status.ts       # Authority status projection

objects/finding/projection/
├── finding-list.ts           # Finding list projection
└── finding-detail.ts         # Finding detail projection

objects/metric/projection/
├── metric-overview.ts        # Metric overview projection
└── metric-trend.ts           # Metric trend projection

shell/admin/
├── AuthorityHealth.tsx       # Consumes authority-health projection
├── FindingsTable.tsx         # Consumes finding-list projection
└── MetricsPanel.tsx          # Consumes metric-overview projection
```

**Multiple Consumers:**

```
AuthorityHealth Projection
├── Admin Dashboard
├── CEO Dashboard
├── Mission Control
└── Health Monitor
```

---

## Object Model Thinking

### Current (Wrong) Thinking

```
Review Card
Service Card
Project Card
```

### Correct Thinking

```
Review Object
    ↓
Review Projection
    ↓
Review Card UI
```

### Example Implementation

```typescript
// objects/review/types/review.ts
export interface Review {
  id: string;
  reviewer: Reviewer;
  rating: number;
  title?: string;
  body: string;
  status: ReviewStatus;
  sentiment?: Sentiment;
  qualityScore?: number;
  projectId?: string;
  // ... other fields
}

// objects/review/projection/review-projection.ts
export interface ReviewProjection {
  review: Review;
  sentiment: SentimentProjection;
  quality: QualityProjection;
  moderation: ModerationProjection;
  recommendations: RecommendationProjection;
}

// objects/review/components/ReviewCard.tsx
export function ReviewCard({ projection }: { projection: ReviewProjection }) {
  return (
    <CraftCard>
      <ReviewHeader review={projection.review} />
      <ReviewBody review={projection.review} />
      <ReviewSentiment sentiment={projection.sentiment} />
      <ReviewQuality quality={projection.quality} />
      <ReviewRecommendations recommendations={projection.recommendations} />
    </CraftCard>
  );
}
```

---

## Intelligence Layer Integration

### Current (Wrong) Approach

```
Frontend: "What data should I show?"
Backend: Returns data
Frontend: Displays data
```

### Correct Approach

```
Customer Object
    ↓
Customer Projection
    ↓
AI Recommendation (Ollama)
    ↓
UI
```

### Example Implementation

```typescript
// objects/customer/projection/customer-recommendation.ts

export interface CustomerRecommendationProjection {
  customerId: string;
  recommendations: Recommendation[];
  confidence: number;
  evidence: Evidence[];
}

export async function getCustomerRecommendations(
  customerId: string
): Promise<CustomerRecommendationProjection> {
  // Build customer context
  const context = await buildCustomerContext(customerId);
  
  // Get Ollama recommendation
  const recommendation = await ollama.getRecommendation({
    input: context,
    task: "recommendation",
    constraints: {
      maxRecommendations: 5,
      minConfidence: 0.7
    }
  });
  
  return {
    customerId,
    recommendations: recommendation.items,
    confidence: recommendation.confidence,
    evidence: recommendation.evidence
  };
}

// objects/customer/components/CustomerDashboard.tsx

export function CustomerDashboard({ customerId }: { customerId: string }) {
  const recommendations = useCustomerRecommendations(customerId);
  
  return (
    <div>
      <CustomerHealth customerId={customerId} />
      <RecommendationPanel recommendations={recommendations} />
      <CustomerActivity customerId={customerId} />
    </div>
  );
}
```

---

## Frontend Event Bus

### Current (Wrong) Approach

```
Click → State → Component rerender
```

### Correct Approach

```
Click → Frontend Event → PING Event → Projection Refresh
```

### Event Bus Implementation

```typescript
// shell/event-bus/FrontendEventBus.ts

export interface FrontendEvent {
  type: string;
  payload: any;
  timestamp: number;
  source: string;
}

export class FrontendEventBus {
  private listeners: Map<string, Set<Function>> = new Map();
  
  emit(event: FrontendEvent) {
    // Send to PING event system
    pingEvent.emit(event);
    
    // Notify local listeners
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      listeners.forEach(listener => listener(event));
    }
  }
  
  on(eventType: string, listener: Function) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(listener);
  }
  
  off(eventType: string, listener: Function) {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.delete(listener);
    }
  }
}

// Usage in Review Card

export function ReviewCard({ projection }: { projection: ReviewProjection }) {
  const eventBus = useEventBus();
  
  const handleApprove = () => {
    eventBus.emit({
      type: 'REVIEW_APPROVED',
      payload: { reviewId: projection.review.id },
      timestamp: Date.now(),
      source: 'ReviewCard'
    });
  };
  
  return (
    <CraftCard>
      {/* ... */}
      <Button onClick={handleApprove}>Approve</Button>
    </CraftCard>
  );
}
```

---

## Capability-Specific Motion

### Current (Wrong) Approach

```
motion/
├── buttons.ts
├── cards.ts
├── hover.ts
└── fade.ts
```

### Correct Approach

```
objects/review/motion.ts
objects/customer/motion.ts
objects/project/motion.ts
objects/estimate/motion.ts
```

### Example Implementation

```typescript
// objects/review/motion.ts

export const reviewMotion = {
  card: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.3, ease: "easeOut" }
  },
  moderation: {
    approve: {
      scale: [1, 1.05, 1],
      backgroundColor: ["#E6DFD3", "#2E5A4F", "#E6DFD3"],
      transition: { duration: 0.5 }
    },
    reject: {
      scale: [1, 0.95, 1],
      backgroundColor: ["#E6DFD3", "#8B3A3A", "#E6DFD3"],
      transition: { duration: 0.5 }
    }
  },
  sentiment: {
    positive: { color: "#2E5A4F" },
    negative: { color: "#8B3A3A" },
    neutral: { color: "#5E6259" }
  }
};

// objects/review/components/ReviewCard.tsx

export function ReviewCard({ projection }: { projection: ReviewProjection }) {
  return (
    <motion.div
      variants={reviewMotion.card}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {/* ... */}
    </motion.div>
  );
}
```

---

## Universal Shell Architecture

### Current (Wrong) Approach

```
Multiple pages, multiple layouts
```

### Correct Approach

```
Single application shell that swaps projections
```

### Shell Structure

```
shell/
├── layout/
│   ├── Shell.tsx              # Universal shell
│   ├── ShellLayout.tsx        # Shell layout
│   └── ShellNavigation.tsx    # Shell navigation
│
├── navigation/
│   ├── NavigationProvider.tsx # Navigation provider
│   ├── NavigationState.ts     # Navigation state
│   └── NavigationActions.ts   # Navigation actions
│
├── providers/
│   ├── ThemeProvider.tsx      # Theme provider
│   ├── MotionProvider.tsx     # Motion provider
│   └── EventProvider.tsx      # Event provider
│
└── event-bus/
    ├── FrontendEventBus.ts    # Event bus
    └── EventListeners.ts      # Event listeners
```

### Shell Implementation

```typescript
// shell/layout/Shell.tsx

export function Shell() {
  const { currentProjection, setCurrentProjection } = useNavigation();
  
  return (
    <ThemeProvider>
      <MotionProvider>
        <EventProvider>
          <ShellLayout>
            <ShellNavigation />
            <ShellContent>
              {currentProjection === 'dashboard' && <DashboardProjection />}
              {currentProjection === 'customer' && <CustomerProjection />}
              {currentProjection === 'project' && <ProjectProjection />}
              {currentProjection === 'review' && <ReviewProjection />}
              {currentProjection === 'estimate' && <EstimateProjection />}
              {currentProjection === 'mission' && <MissionProjection />}
            </ShellContent>
          </ShellLayout>
        </EventProvider>
      </MotionProvider>
    </ThemeProvider>
  );
}
```

---

## Revised Directory Structure

```
src/
├── app/                          # Next.js app router (unchanged)
│   ├── dashboard/
│   ├── customer/
│   ├── project/
│   ├── review/
│   ├── estimate/
│   └── mission/
│
├── objects/                      # Canonical business objects
│   ├── customer/
│   │   ├── types/
│   │   ├── projection/
│   │   ├── hooks/
│   │   ├── components/
│   │   ├── actions/
│   │   └── motion.ts
│   │
│   ├── project/
│   │   ├── types/
│   │   ├── projection/
│   │   ├── hooks/
│   │   ├── components/
│   │   ├── actions/
│   │   └── motion.ts
│   │
│   ├── review/
│   │   ├── types/
│   │   ├── projection/
│   │   ├── hooks/
│   │   ├── components/
│   │   ├── actions/
│   │   └── motion.ts
│   │
│   ├── estimate/
│   │   ├── types/
│   │   ├── projection/
│   │   ├── hooks/
│   │   ├── components/
│   │   ├── actions/
│   │   └── motion.ts
│   │
│   ├── mission/
│   │   ├── types/
│   │   ├── projection/
│   │   ├── hooks/
│   │   ├── components/
│   │   ├── actions/
│   │   └── motion.ts
│   │
│   ├── artifact/
│   ├── recommendation/
│   ├── campaign/
│   ├── employee/
│   ├── connector/
│   └── event/
│
├── shared/                       # Shared primitives
│   ├── primitives/              # Atomic UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   └── ...
│   │
│   ├── animation/               # Reusable animations
│   │   ├── fade.ts
│   │   ├── slide.ts
│   │   └── scale.ts
│   │
│   ├── layout/                  # Layout primitives
│   │   ├── Container.tsx
│   │   ├── Section.tsx
│   │   └── Grid.tsx
│   │
│   └── utilities/               # Utility functions
│       └── ...
│
├── shell/                        # Universal shell
│   ├── layout/
│   │   ├── Shell.tsx
│   │   ├── ShellLayout.tsx
│   │   └── ShellNavigation.tsx
│   │
│   ├── navigation/
│   │   ├── NavigationProvider.tsx
│   │   ├── NavigationState.ts
│   │   └── NavigationActions.ts
│   │
│   ├── providers/
│   │   ├── ThemeProvider.tsx
│   │   ├── MotionProvider.tsx
│   │   └── EventProvider.tsx
│   │
│   └── event-bus/
│       ├── FrontendEventBus.ts
│       └── EventListeners.ts
│
├── lib/                          # Business logic (unchanged)
├── types/                        # Shared types (unchanged)
├── config/                       # Configuration (unchanged)
└── services/                     # External services (unchanged)
```

---

## Migration Strategy

### Phase 1: Object Registry (High Priority)
1. Create `objects/` directory structure
2. Move existing types to `objects/*/types/`
3. Create projection interfaces for each object
4. Create hooks for each object

### Phase 2: Projection Gateway (High Priority)
1. Create `ProjectionGateway` interface
2. Implement projection aggregation logic
3. Connect to existing data sources
4. Test projection reuse across multiple UIs

### Phase 3: Event Bus (High Priority)
1. Create `FrontendEventBus`
2. Connect to PING event system
3. Replace direct state updates with events
4. Test event-driven projection refresh

### Phase 4: Component Migration (Medium Priority)
1. Move components to `objects/*/components/`
2. Update components to consume projections
3. Remove business logic from components
4. Test projection-driven UI updates

### Phase 5: Shell Implementation (Medium Priority)
1. Create universal shell structure
2. Implement navigation provider
3. Implement projection swapping
4. Test single-shell architecture

### Phase 6: Intelligence Layer (Medium Priority)
1. Create Ollama integration
2. Build recommendation projections
3. Add AI recommendations to UI
4. Test intelligence-driven workflows

### Phase 7: Motion Migration (Low Priority)
1. Create capability-specific motion files
2. Move motion logic from global to capability
3. Test capability-specific animations
4. Remove global motion folder

---

## Success Criteria

**Frontend becomes:**
- **Object-oriented:** Organized around canonical business objects
- **Projection-driven:** UI consumes projections, not raw data
- **Event-driven:** All interactions go through event bus
- **Intelligence-aware:** AI recommendations integrated into projections
- **Shell-unified:** Single application shell with projection swapping
- **Backend-aligned:** Same domain model as PING backend

**When backend team finishes wiring events, Neo4j, Qdrant, Ollama:**
- Frontend projections automatically aggregate new data sources
- No UI changes required
- Admin dashboard, CEO dashboard, Mission Control all consume same projections
- Intelligence layer automatically enhances projections

---

## Constitutional Rule

**Before creating any new component:**
1. Search the object registry for existing business object
2. Search projection gateway for existing projection
3. Search shared primitives for existing UI component
4. If found, extend or compose instead of creating new
5. Every new file must include justification why existing could not be reused

**Optimize for shared domain model, not prettier folders.**

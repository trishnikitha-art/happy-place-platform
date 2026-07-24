# Tenant OS Architecture

**Status:** Planning
**Purpose:** Define the relationship between Tenant OS and PING constitutional architecture
**Context:** Convergence of happy-place-platform (Estimate Intelligence Platform) with PING constitutional framework
**Approach:** Compiler-based architecture - Constitution → IR → Code Generator → Runtime (LLVM-style)

---

## 1. Architectural Comparison

### 1.1 Current State: happy-place-platform

**Architecture:** Google Workspace-centric with provider adapters

**Key Concepts:**
- Canonical Customer (with provider adapters)
- Canonical Mission (aggregate root)
- Evidence Pipeline (generalized)
- Capability Broker (provider abstraction)
- Multi-tenant safety (tenantId, owner, authority)

**Layers:**
- Domain Layer: Identity, Mission, Evidence, Capability, Knowledge
- Capability Layer: Google, Jobber, Stripe, Twilio
- Infrastructure: Next.js, PostgreSQL, Google APIs

**Strengths:**
- Provider independence through adapters
- Multi-tenant safety enforcement
- Event-driven architecture
- Capability broker pattern

**Weaknesses:**
- Knowledge stored as mutable records
- Mission not explicitly event-sourced
- Evidence chain not immutable
- Planner knows about providers
- No constitutional layer
- No replay mechanism

---

### 1.2 Target State: PING Constitutional Framework

**Architecture:** Constitutional with layered runtime

**Key Concepts:**
- Layer 0: Constitutional Kernel (axioms, authorities, root facts)
- Layer 1: Runtime (execution, replay, state reconstruction)
- Layer 2: Adapters (infrastructure, transport, provider)
- Layer 3: Orchestration (workflow, agent coordination)
- Layer 4: Infrastructure (deployment, operational substrate)

**Authorities:**
- Identity Authority (content normalization, identity assignment)
- Lineage Authority (derivation relationships, DAG legality)
- Event Recording Authority (append-only event sequence)
- Replay Authority (deterministic reconstruction)
- Policy Authority (mutation authorization)
- State Authority (derived state projections)

**Strengths:**
- Constitutional truth preservation
- Deterministic replay
- Immutable event log
- Clear authority boundaries
- Governance survivability
- Infrastructure independence

**Weaknesses:**
- No explicit tenant model
- No business domain concepts (Customer, Mission, Estimate)
- No provider adapter pattern for business systems
- Focused on constitutional mechanics, not business operations

---

## 2. Tenant OS Relationship Model

### 2.1 Core Principle

**Tenant OS is a Sovereign Constitutional Node**

Each tenant operates as an independent constitutional entity within the PING framework. The OS provides constitutional infrastructure; tenants provide business domain and governance.

```
PING Constitutional Framework
│
├── Constitutional Kernel (Layer 0)
│   ├── Axioms (Identity Determinism, Lineage Acyclicity, etc.)
│   ├── Authorities (Identity, Lineage, Event, Replay, Policy, State)
│   └── Root Facts (Content, Identity, Lineage Edge, Event, Policy Decision, Claim)
│
├── Runtime (Layer 1)
│   ├── Event Stream Processing
│   ├── Replay Execution
│   ├── State Reconstruction
│   └── Invariant Enforcement
│
└── Adapters (Layer 2)
    ├── Infrastructure (Postgres, Redis, Qdrant)
    └── Transport (HTTP, WebSocket)

Tenant OS (Sovereign Constitutional Node)
│
├── Domain Layer (Tenant-Specific)
│   ├── Identity (Customer, Crew, Vendor)
│   ├── Mission (Estimate, Job, Project)
│   ├── Evidence (Photo, PDF, Voice, Video)
│   └── Observation (Claim, Fact, Decision)
│
├── Constitution Layer (Tenant-Specific)
│   ├── Authorities (Observation, Claim, Verification, Fact)
│   ├── Contracts (Capability contracts for business operations)
│   ├── Policies (Tenant-specific business rules)
│   └── Canonical IDs (Tenant-specific ID schemes)
│
├── Runtime Layer (Tenant-Specific)
│   ├── Planner (Intent generation)
│   ├── Capability Broker (Provider resolution)
│   ├── Repository (Event store for tenant events)
│   ├── Projection (Read models for tenant queries)
│   └── Witness (Verification of tenant operations)
│
└── Capability Layer (Tenant-Specific)
    ├── Google Workspace (Calendar, Drive, Gmail)
    ├── Jobber (CRM, Scheduling)
    ├── Stripe (Payments)
    ├── Twilio (Communication)
    └── Dropbox (Storage)
```

---

### 2.2 Constitutional Hierarchy

```
PING Constitutional Law (Universal)
│
├── Axioms (Identity Determinism, Lineage Acyclicity, etc.)
├── Root Authorities (Identity, Lineage, Event, Replay, Policy, State)
└── Constitutional Invariants
│
↓
Tenant Constitutional Law (Tenant-Specific)
│
├── Business Axioms (Customer uniqueness, Mission lifecycle, etc.)
├── Derived Authorities (Observation, Claim, Verification, Fact)
├── Capability Contracts (Calendar, Storage, Payment, Communication)
└── Business Policies (Pricing rules, Approval workflows, etc.)
│
↓
Tenant Governance (Tenant-Specific)
│
├── Authority assignments
├── Capability grants
├── Policy decisions
└── Delegation rules
```

**Key Principle:** Tenant constitutional law cannot violate PING constitutional axioms. Tenant authorities are derived from PING root authorities.

---

### 2.3 Tenant Isolation Model

### 2.3.1 Constitutional Isolation

Each tenant has its own:
- Event stream (append-only, tenant-scoped)
- Lineage graph (tenant-scoped artifacts)
- Policy decisions (tenant-specific governance)
- State projections (tenant-specific read models)

### 2.3.2 Cross-Tenant Boundaries

**Allowed:**
- Tenant A observes Tenant B's public artifacts (with permission)
- Tenant A references Tenant B's canonical IDs (with permission)
- Constitutional replay of Tenant A's events (never Tenant B's)

**Forbidden:**
- Tenant A writes to Tenant B's event stream
- Tenant A modifies Tenant B's lineage
- Tenant A overrides Tenant B's policy decisions
- Cross-tenant lineage edges (creates shared ancestry)

### 2.3.3 Multi-Tenant Safety Enforcement

```typescript
// Every tenant operation must include:
interface TenantOperation {
  tenantId: string;           // Tenant identifier
  actor: string;              // Who is acting
  authority: string;          // Which authority authorizes
  capability: string;         // Which capability is being used
  payload: unknown;           // Operation payload
  attribution: {
    actor: string;
    reason: string;
    timestamp: Date;
  };
}

// Capability Broker validates before execution:
class CapabilityBroker {
  async execute(request: TenantOperation): Promise<CapabilityResult> {
    // 1. Validate tenant exists
    // 2. Validate actor has authority in tenant
    3. Validate capability is granted to tenant
    // 4. Validate operation respects tenant boundaries
    // 5. Execute with tenant-scoped context
    // 6. Emit event to tenant's event stream
  }
}
```

---

## 3. Architectural Convergence Plan

### 3.1 Reduce to Four Runtime Primitives

**Current:** Identity, Mission, Evidence, Capability, Knowledge

**Target:** Identity, Mission, Evidence, Observation

**Rationale:**
- Knowledge is not an object; it's the accumulation of verified observations
- Capability is runtime infrastructure, not business data
- Observation is the bridge between evidence and knowledge

**Mapping:**
```
Identity → Identity (unchanged)
Mission → Mission (unchanged)
Evidence → Evidence (unchanged)
Capability → Runtime infrastructure (moved to Runtime Layer)
Knowledge → Computed from Observations (removed as stored object)
Observation → New primitive (Evidence → Observation → Claim → Fact → Knowledge)
```

---

### 3.2 Knowledge as Computed, Not Stored

**Current:**
```typescript
interface Knowledge {
  type: string;
  confidence: number;
  evidence: Evidence[];
}
```

**Target:**
```typescript
// Knowledge is computed:
Knowledge = Σ Verified Facts

// Facts are derived from:
Evidence → Observation → Claim → Verification → Fact

// Each stage is immutable:
interface EvidenceStage {
  canonicalHash: string;
  parentHash: string;
  timestamp: Date;
  authority: string;
  content: unknown;
}
```

**Benefits:**
- Constitutional replay becomes trivial
- Knowledge is always reproducible from facts
- No shadow copies of knowledge
- Clear provenance for every fact

---

### 3.3 Mission as Event-Sourced Aggregate Root

**Current:**
```typescript
interface Mission {
  status: string;
  tasks: Task[];
  crew: Crew[];
  // ... other fields
}
```

**Target:**
```typescript
interface Mission {
  identity: string;
  timeline: Timeline;
  currentProjection: MissionState;
}

// Mission state is reconstructed from events:
interface MissionEvent {
  eventType: 'MissionCreated' | 'EstimateAccepted' | 'CrewAssigned' | 'InvoiceSent' | 'ReviewReceived';
  payload: unknown;
  timestamp: Date;
}

interface MissionState {
  status: string;
  tasks: Task[];
  crew: Crew[];
  // ... derived from events
}

// Mission projection:
MissionState = Replay(MissionEvents, MissionPolicy)
```

**Benefits:**
- Mission state is always reproducible
- Mission history is immutable
- Mission can be replayed at any point in time
- Mission transitions are auditable

---

### 3.4 Evidence Immutable Chain

**Current:**
```
Evidence → Analysis → Fact
```

**Target:**
```
Raw Evidence
    ↓ (canonicalHash, parentHash, timestamp, authority)
Observation
    ↓ (canonicalHash, parentHash, timestamp, authority)
Claim
    ↓ (canonicalHash, parentHash, timestamp, authority)
Fact
    ↓ (canonicalHash, parentHash, timestamp, authority)
Decision
```

**Implementation:**
```typescript
interface EvidenceChain {
  stages: EvidenceStage[];
  rootHash: string;
  currentHash: string;
}

interface EvidenceStage {
  canonicalHash: string;
  parentHash: string;
  timestamp: Date;
  authority: string;
  content: unknown;
  stage: 'raw' | 'observation' | 'claim' | 'fact' | 'decision';
}
```

**Benefits:**
- Every AI conclusion is replayable
- Evidence chain is tamper-evident
- Clear provenance for every stage
- Constitutional verification at each stage

---

### 3.5 Planner Produces Intent, Not Execution

**Current:**
```
Planner → ExecutionPlan → Broker → Provider
```

**Target:**
```
Planner → Intent Graph → Capability Resolution → Execution Plan → Broker → Provider
```

**Implementation:**
```typescript
// Planner produces business intents:
interface Intent {
  type: 'NeedAppointment' | 'NeedInvoice' | 'NeedPayment' | 'NeedReview';
  constraints: Record<string, any>;
  priority: number;
}

// Capability Broker resolves to providers:
interface CapabilityResolution {
  intent: Intent;
  provider: string;
  capability: string;
  parameters: Record<string, any>;
}

// Example:
Intent: NeedAppointment
  ↓
Capability Resolution: Google Calendar (or Jobber Calendar, or Outlook Calendar)
  ↓
Execution Plan: Schedule event on Google Calendar
  ↓
Broker: Execute via Google Calendar Provider
```

**Benefits:**
- Planner is completely provider-independent
- Provider swap requires no planner changes
- Intent graph is replayable
- Capability resolution is constitutional

---

### 3.6 Capability Registry with Versioning

**Current:**
```typescript
interface Capability {
  name: string;
  execute: (request: CapabilityRequest) => Promise<CapabilityResult>;
}
```

**Target:**
```typescript
interface CapabilityContract {
  capability: string;
  version: string;
  contract: {
    supports: string[];  // ['schedule', 'cancel', 'reschedule', 'availability', 'conflict-detection']
    inputs: Record<string, any>;
    outputs: Record<string, any>;
    constraints: Record<string, any>;
  };
}

interface CapabilityProvider {
  providerId: string;
  capability: string;
  version: string;
  implements: CapabilityContract;
}

// Example:
CapabilityContract: Calendar v1
  supports: ['schedule', 'cancel', 'reschedule', 'availability', 'conflict-detection']
  inputs: { startTime, endTime, attendees, location }
  outputs: { eventId, calendarUrl }

CapabilityProvider: Google Calendar
  implements: Calendar v1
  providerId: 'google-calendar'
```

**Benefits:**
- Capability contracts are constitutional
- Provider implementations are swappable
- Version evolution is tracked
- Contract violations are detectable

---

### 3.7 Constitutional Object

**New Concept:**

```typescript
interface Constitution {
  authorities: {
    observation: ObservationAuthority;
    claim: ClaimAuthority;
    verification: VerificationAuthority;
    fact: FactAuthority;
  };
  capabilityContracts: Record<string, CapabilityContract>;
  replayRules: ReplayRule[];
  hashingRules: HashingRule[];
  serializationRules: SerializationRule[];
  observationRules: ObservationRule[];
}

// Every runtime component consults Constitution:
Constitution → Authority → Execution
```

**Benefits:**
- Rules are explicit, not embedded
- Constitution is versioned
- Constitution is replayable
- Constitution is tenant-specific

---

### 3.8 Separate Repository from Projection

**Current:**
```typescript
// Repository mixed with read models
class Repository {
  async save(event: Event): Promise<void>;
  async findById(id: string): Promise<Object>;
  async query(query: Query): Promise<Object[]>;
}
```

**Target:**
```typescript
// Repository: Immutable event store
interface Repository {
  async append(event: Event): Promise<void>;
  async getStream(aggregateId: string): Promise<Event[]>;
  async getEvents(from: number, to: number): Promise<Event[]>;
}

// Projection: Queryable views
interface Projection {
  async rebuild(): Promise<void>;
  async query(query: Query): Promise<Object[]>;
  async invalidate(aggregateId: string): Promise<void>;
}

// Repository never changes
// Projection can always be rebuilt from events
```

**Benefits:**
- Clear separation of concerns
- Repository is append-only
- Projections are ephemeral
- Replay is trivial

---

### 3.9 Identity Canonical Across Providers

**Current:**
```typescript
interface Customer {
  canonicalId: string;
  providers: {
    googleContacts?: GoogleContactAdapter;
    jobber?: JobberCustomerAdapter;
  };
}
```

**Target:**
```typescript
interface Identity {
  canonicalId: string;
  externalIdentities: {
    [provider: string]: ExternalIdentity;
  };
}

interface ExternalIdentity {
  provider: string;
  externalId: string;
  mapping: Record<string, any>;
}

// Example:
Identity: ID-001
  externalIdentities:
    google:
      provider: 'google-contacts'
      externalId: 'contact-12345'
    jobber:
      provider: 'jobber'
      externalId: 'customer-67890'
    stripe:
      provider: 'stripe'
      externalId: 'cus-abc123'
```

**Benefits:**
- Identity never exposes provider IDs
- Provider swap doesn't affect Mission
- Identity is canonical across providers
- Provider mappings are explicit

---

### 3.10 Observation Authority

**New Concept:**

```
Evidence
    ↓
Observation Authority
    ↓
Observation
    ↓
Claim Authority
    ↓
Claim
    ↓
Verification Authority
    ↓
Fact
    ↓
Knowledge
```

**Implementation:**
```typescript
interface ObservationAuthority {
  observe(evidence: Evidence): Promise<Observation>;
}

interface ClaimAuthority {
  claim(observation: Observation): Promise<Claim>;
}

interface VerificationAuthority {
  verify(claim: Claim): Promise<Verification>;
}

interface FactAuthority {
  establish(verification: Verification): Promise<Fact>;
}
```

**Benefits:**
- Every transformation is constitutional
- Clear authority for each stage
- Verification is explicit
- Knowledge is derived from facts

---

### 3.11 Explicit Runtime Layers

**Current:** Implicit layering

**Target:**

```
Domain Layer
├── Identity (Customer, Crew, Vendor)
├── Mission (Estimate, Job, Project)
├── Evidence (Photo, PDF, Voice, Video)
└── Observation (Claim, Fact, Decision)
────────────
Constitution Layer
├── Authorities (Observation, Claim, Verification, Fact)
├── Contracts (Capability contracts)
├── Policies (Business rules)
├── Canonical IDs (ID schemes)
├── Hashes (Hashing rules)
└── Serialization (Encoding rules)
────────────
Runtime Layer
├── Kernel (Constitutional execution)
├── Replay (State reconstruction)
├── Broker (Capability resolution)
├── Planner (Intent generation)
├── Repository (Event store)
├── Projection (Read models)
└── Witness (Verification)
────────────
Capability Layer
├── Google Workspace
├── Jobber
├── Stripe
├── Twilio
└── Dropbox
────────────
Infrastructure
├── Docker
├── Postgres
├── Qdrant
├── Redis
└── Kubernetes
```

**Benefits:**
- Clear separation of concerns
- Each layer has defined responsibilities
- Layer boundaries are enforceable
- Evolution is independent per layer

---

## 4. Final Canonical Model

### 4.1 Domain Primitives (Four)

```
Identity
    │
    ▼
Mission
    │
    ▼
Evidence
    │
    ▼
Observation
    │
    ▼
Fact
    │
    ▼
Knowledge (computed)
```

### 4.2 Orthogonal Runtime Services

```
Planner (Intent generation)
Capability Broker (Provider resolution)
Repository (Event store)
Projection (Read models)
Replay (State reconstruction)
Witness (Verification)
Kernel (Constitutional execution)
Constitution (Rules and contracts)
```

### 4.3 Tenant OS Relationship

```
PING Constitutional Framework
│
├── Provides: Constitutional infrastructure
├── Enforces: Axioms, authorities, invariants
└── Guarantees: Deterministic replay, truth preservation
│
↓
Tenant OS
│
├── Provides: Business domain concepts
├── Defines: Tenant-specific constitution
├── Implements: Business capabilities
└── Governs: Tenant-specific policies
│
↓
Tenant
│
├── Owns: Business data
├── Controls: Provider integrations
├── Defines: Governance rules
└── Operates: Within constitutional boundaries
```

---

## 5. Generation-Based Architecture

### 5.1 Core Principle

**PING Generates Runtime from Tenant Constitution**

Instead of building layers separately, PING generates everything below the Constitution:

```
PING Kernel
        ↓
Tenant Constitution
        ↓
Generation Manifest
        ↓
Code Generator
        ↓
Repositories
Services
Events
APIs
Tests
Projections
Replay
Witness
```

**Key Insight:** The Constitution becomes executable. Instead of documentation for contractors, it becomes the source that PING agents compile into the application.

---

### 5.2 PING Owns Runtime

**Tenant OS Does NOT Implement:**
- Replay
- Witness
- Kernel
- Repository
- Event recording
- Authorities

**PING Already Provides:**
- Constitutional kernel (axioms, authorities, root facts)
- Runtime execution (event processing, replay, state reconstruction)
- Adapters (infrastructure, transport, provider)
- Multi-tenant safety enforcement

**Tenant OS Only Contributes:**
- Mission (domain concept)
- Identity (domain concept)
- Evidence (domain concept)
- Observation (domain concept)
- Policies (business rules)
- Capabilities (capability contracts)
- Workflows (business processes)

---

### 5.3 Three Sprint Approach

#### Sprint 1: Constitutional Domain (Week 1)

**Define Only:**
- Identity (Customer, Crew, Vendor)
- Mission (Estimate, Job, Project)
- Evidence (Photo, Video, Voice, PDF)
- Observation (RoofDamage, WaterLeak, BrokenWindow)

**Everything Event Sourced. Nothing Else.**

**Deliverable:** Declarative schemas for domain primitives.

---

#### Sprint 2: Capability Registry (Week 2)

**Define Only:**
- Calendar (schedule, cancel, reschedule, availability, conflict-detection)
- Payments (charge, refund, subscription, invoice)
- CRM (create customer, update customer, sync contacts)
- Messaging (send email, send SMS, send notification)
- Storage (upload, download, delete, archive)
- Vision (detect objects, classify images, extract text)
- Scheduling (find window, detect conflict, optimize schedule)

**Only Contracts. No Providers.**

**Deliverable:** Capability contracts with versioning.

---

#### Sprint 3: Generate Everything (Week 3-4)

**PING Agents Generate:**
- Services (MissionService, EvidenceService, CustomerService)
- Events (MissionCreated, EstimateAccepted, CrewAssigned)
- APIs (REST, GraphQL)
- Projections (read models)
- CQRS handlers
- Tests (unit, integration, replay)
- Replay tests
- Documentation

**From the Constitution.**

**Deliverable:** Fully operational platform generated from constitution.

---

### 5.4 Planning in PING

**Tenant OS Defines Intents:**
- Need Appointment
- Need Invoice
- Need Crew
- Need Review

**PING Planner Decides Execution:**
- Google Calendar (or Jobber Calendar, or Outlook Calendar, or Human)
- Stripe (or PayPal, or Square)
- Jobber (or HubSpot, or Salesforce)
- Twilio (or SendGrid, or AWS SES)

**Tenant OS Never Knows About Providers.**

---

### 5.5 Providers as Drivers

**Never Reference in Tenant OS:**
- Google
- Stripe
- Twilio
- Jobber

**Instead Reference:**
- Calendar
- Payments
- Storage
- Messaging

**PING Runtime Loads Providers:**
```
Calendar
    ↓
Google Calendar Provider
    ↓
Jobber Calendar Provider
    ↓
Outlook Calendar Provider
    ↓
Human Provider
```

**Exactly Like:**
```
Filesystem
    ↓
NTFS Driver
    ↓
EXT4 Driver
    ↓
APFS Driver
```

---

### 5.6 Declarative Domain Definition

**Instead of Writing Services:**

```typescript
// ❌ DON'T WRITE THIS
class MissionService {
  async create(mission: Mission): Promise<Mission> { }
  async accept(missionId: string): Promise<void> { }
  async assignCrew(missionId: string, crewId: string): Promise<void> { }
  async complete(missionId: string): Promise<void> { }
}
```

**Define Declaratively:**

```yaml
# ✅ DEFINE THIS
Mission:
  owns:
    - Tasks
    - Evidence
    - Crew
  events:
    - MissionCreated
    - MissionAccepted
    - CrewAssigned
    - MissionCompleted
  commands:
    - Accept
    - AssignCrew
    - Complete
  policies:
    - MustHaveCustomer
    - MustHaveProperty
    - MustHaveCrewBeforeComplete
```

**PING Generates:**
- Repository
- Service
- Events
- Replay
- Projections
- REST
- GraphQL
- SDK
- Tests

---

### 5.7 Remove Knowledge from Model

**Instead of:**
```
Evidence → Observation → Claim → Fact → Knowledge
```

**PING Computes:**
```
Evidence → Observation → Claim → Fact
```

**Knowledge is computed by PING from facts. Replay always regenerates it.**

**Benefits:**
- No shadow copies of knowledge
- Knowledge is always reproducible
- Constitutional replay is trivial
- Clear provenance for every fact

---

### 5.8 Define Only Authorities

**Instead of Services, Define Authorities:**

```yaml
Mission Authority:
  jurisdiction:
    - Mission lifecycle
    - Task assignment
    - Crew assignment
  owns:
    - Mission events
    - Mission state projections

Observation Authority:
  jurisdiction:
    - Evidence observation
    - Claim evaluation
    - Fact verification
  owns:
    - Observation events
    - Claim events
    - Fact events

Evidence Authority:
  jurisdiction:
    - Evidence ingestion
    - Evidence chain validation
  owns:
    - Evidence events
    - Evidence lineage

Identity Authority:
  jurisdiction:
    - Identity assignment
    - External identity mapping
  owns:
    - Identity events
    - External identity events
```

**Everything Else Becomes Generated.**

---

### 5.9 One Canonical Event Model

**Everything Becomes:**

```
Command
    ↓
Authority
    ↓
Event
    ↓
Projection
```

**Never Mutate State Directly.**

**PING Already Supports This.**

---

### 5.10 AI Generation Manifest

**Machine-Readable Constitution:**

```yaml
identities:
  Customer:
    fields:
      - name
      - email
      - phone
      - address
    external_mappings:
      - google_contacts
      - jobber
      - hubspot
      - salesforce

  Crew:
    fields:
      - name
      - role
      - skills
      - availability

  Vendor:
    fields:
      - name
      - category
      - rating

missions:
  Estimate:
    owns:
      - Tasks
      - Evidence
      - Crew
    events:
      - EstimateCreated
      - EstimateAccepted
      - EstimateRejected
      - EstimateExpired
    commands:
      - Accept
      - Reject
      - Expire
    policies:
      - MustHaveCustomer
      - MustHaveProperty

  Job:
    owns:
      - Tasks
      - Evidence
      - Crew
      - Invoice
    events:
      - JobCreated
      - JobStarted
      - JobCompleted
      - JobCancelled
    commands:
      - Start
      - Complete
      - Cancel
    policies:
      - MustHaveEstimate
      - MustHaveCrew

evidence:
  Photo:
    content_type: image/*
    processing:
      - object_detection
      - classification
      - text_extraction

  Video:
    content_type: video/*
    processing:
      - frame_extraction
      - motion_detection
      - audio_extraction

  Voice:
    content_type: audio/*
    processing:
      - transcription
      - sentiment_analysis

  PDF:
    content_type: application/pdf
    processing:
      - text_extraction
      - table_extraction
      - signature_detection

observations:
  RoofDamage:
    evidence_types: [Photo, Video]
    claims: [NeedsReplacement, NeedsRepair]

  WaterLeak:
    evidence_types: [Photo, Video]
    claims: [NeedsRepair, NeedsReplacement]

  BrokenWindow:
    evidence_types: [Photo, Video]
    claims: [NeedsReplacement]

claims:
  NeedsReplacement:
    confidence_threshold: 0.8
    requires_verification: true

  NeedsRepair:
    confidence_threshold: 0.6
    requires_verification: false

facts:
  VerifiedRoofDamage:
    source: NeedsReplacement
    verification_required: true

capabilities:
  Calendar:
    version: "1.0"
    supports:
      - schedule
      - cancel
      - reschedule
      - availability
      - conflict_detection
    inputs:
      - start_time
      - end_time
      - attendees
      - location
    outputs:
      - event_id
      - calendar_url

  Payments:
    version: "1.0"
    supports:
      - charge
      - refund
      - subscription
      - invoice
    inputs:
      - amount
      - currency
      - customer_id
    outputs:
      - payment_id
      - receipt_url

  CRM:
    version: "1.0"
    supports:
      - create_customer
      - update_customer
      - sync_contacts
    inputs:
      - name
      - email
      - phone
    outputs:
      - customer_id
      - sync_status

  Messaging:
    version: "1.0"
    supports:
      - send_email
      - send_sms
      - send_notification
    inputs:
      - recipient
      - subject
      - body
    outputs:
      - message_id
      - delivery_status

  Storage:
    version: "1.0"
    supports:
      - upload
      - download
      - delete
      - archive
    inputs:
      - file
      - metadata
    outputs:
      - file_id
      - storage_url

  Vision:
    version: "1.0"
    supports:
      - detect_objects
      - classify_images
      - extract_text
    inputs:
      - image
      - model
    outputs:
      - detections
      - classifications
      - text

  Scheduling:
    version: "1.0"
    supports:
      - find_window
      - detect_conflict
      - optimize_schedule
    inputs:
      - constraints
      - preferences
    outputs:
      - windows
      - conflicts
      - optimized_schedule

policies:
  TenantIsolation:
    description: "Every operation must include tenantId"
    enforcement: "runtime"
    scope: "all"

  Replay:
    description: "All state must be replayable from events"
    enforcement: "constitutional"
    scope: "all"

  Witness:
    description: "All operations must generate witness attestations"
    enforcement: "constitutional"
    scope: "all"

  Authority:
    description: "All mutations must go through authorities"
    enforcement: "constitutional"
    scope: "all"
```

**PING Agents Can Consume This Directly.**

---

### 5.11 Generate Instead of Code

**Target Flow:**

```
Constitution
    ↓
PING
    ↓
Generate (80-90%)
    ↓
Humans Review
    ↓
Deploy
```

**Not:**

```
Architecture
    ↓
Developers
    ↓
Code
    ↓
Review
```

---

### 5.12 Four-Week Milestone Plan

| Week | Deliverable |
|------|-------------|
| 1 | Constitutional manifest (Identity, Mission, Evidence, Observation, Capability contracts, Policies) |
| 2 | PING generator produces repositories, events, APIs, projections, replay tests |
| 3 | Plug in Google, Stripe, Jobber, Twilio adapters via the Capability Registry |
| 4 | Run an end-to-end flow: Estimate → Mission → Evidence → Observation → Fact → Planner → Capability Broker → Replay → Witness |

**At That Point, The Platform Is Operational.**

**Everything After That Becomes Incremental Capability Additions Rather Than Foundational Engineering.**

---

## 6. Success Criteria

1. **Constitutional Compliance:** All operations respect PING constitutional axioms
2. **Tenant Isolation:** Mathematical impossibility of cross-tenant leakage
3. **Deterministic Replay:** 100× replay produces identical state
4. **Provider Independence:** Provider swap requires no domain changes
5. **Knowledge Computation:** Knowledge is computed from facts, not stored
6. **Event Sourcing:** Mission state is reconstructed from events
7. **Immutable Evidence:** Evidence chain is tamper-evident
8. **Intent-Based Planning:** Planner produces intents, not execution plans
9. **Capability Versioning:** All capabilities have versioned contracts
10. **Constitutional Object:** All rules are explicit in constitution

---

## 7. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Constitutional layer adds complexity | High | High | Implement incrementally, document thoroughly |
| Tenant isolation enforcement fails | Medium | Critical | Multi-tenant safety tests, CI gates |
| Event sourcing performance degradation | Medium | High | Projection caching, event partitioning |
| Provider adapter complexity | High | Medium | Capability contracts, versioning |
| Knowledge computation performance | Medium | High | Incremental computation, caching |
| Planner intent resolution ambiguity | Medium | High | Intent graph validation, capability contracts |

---

## 8. Conclusion

The Tenant OS relationship model establishes each tenant as a sovereign constitutional node within the PING framework. PING provides constitutional infrastructure (axioms, authorities, replay), while Tenant OS provides business domain (Identity, Mission, Evidence, Observation) and tenant-specific governance.

The convergence plan reduces the architecture to four domain primitives (Identity, Mission, Evidence, Observation) with orthogonal runtime services (Planner, Broker, Repository, Projection, Replay, Witness, Kernel, Constitution). Knowledge is computed from facts, not stored. Mission is event-sourced. Evidence has an immutable chain. Planner produces intents, not execution plans.

This architecture provides:
- Constitutional truth preservation
- Deterministic replay
- Multi-tenant safety
- Provider independence
- Clear separation of concerns
- Independent evolution per layer

The Tenant OS operates within PING constitutional boundaries while maintaining sovereignty over business domain and governance.

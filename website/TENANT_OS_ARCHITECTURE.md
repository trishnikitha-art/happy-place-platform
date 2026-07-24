# Tenant OS Architecture

**Status:** Planning
**Purpose:** Define the relationship between Tenant OS and PING constitutional architecture
**Context:** Convergence of happy-place-platform (Estimate Intelligence Platform) with PING constitutional framework

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

## 5. Convergence Roadmap

### Phase 1: Constitutional Foundation (Weeks 1-4)

**Objective:** Establish PING constitutional layer in Tenant OS

**Tasks:**
1. Implement PING Layer 0 Kernel (axioms, authorities, root facts)
2. Implement PING Layer 1 Runtime (event processing, replay, state reconstruction)
3. Implement PING Layer 2 Adapters (Postgres, Redis, Qdrant)
4. Implement tenant isolation model
5. Implement multi-tenant safety enforcement

**Deliverables:**
- Constitutional kernel with authorities
- Event store with tenant-scoped streams
- Replay engine with tenant-scoped reconstruction
- Multi-tenant safety validation

---

### Phase 2: Domain Primitives (Weeks 5-8)

**Objective:** Implement four domain primitives

**Tasks:**
1. Implement Identity with external identity mappings
2. Implement Mission as event-sourced aggregate root
3. Implement Evidence with immutable chain
4. Implement Observation with authority pipeline

**Deliverables:**
- Identity model with provider mappings
- Mission model with event sourcing
- Evidence model with immutable chain
- Observation model with authority pipeline

---

### Phase 3: Constitutional Layer (Weeks 9-12)

**Objective:** Implement tenant-specific constitution

**Tasks:**
1. Implement Observation Authority
2. Implement Claim Authority
3. Implement Verification Authority
4. Implement Fact Authority
5. Implement Capability Registry with versioning
6. Implement Constitutional Object

**Deliverables:**
- Observation, Claim, Verification, Fact authorities
- Capability Registry with versioning
- Constitutional Object with rules and contracts

---

### Phase 4: Runtime Services (Weeks 13-16)

**Objective:** Implement orthogonal runtime services

**Tasks:**
1. Implement Planner (Intent generation)
2. Implement Capability Broker (Provider resolution)
3. Implement Repository (Event store)
4. Implement Projection (Read models)
5. Implement Replay (State reconstruction)
6. Implement Witness (Verification)

**Deliverables:**
- Planner with intent graph
- Capability Broker with provider resolution
- Repository with append-only event store
- Projection with rebuildable read models
- Replay with deterministic reconstruction
- Witness with verification

---

### Phase 5: Capability Layer (Weeks 17-20)

**Objective:** Implement provider adapters

**Tasks:**
1. Implement Google Workspace adapters
2. Implement Jobber adapters
3. Implement Stripe adapters
4. Implement Twilio adapters
5. Implement Dropbox adapters

**Deliverables:**
- Google Workspace provider adapters
- Jobber provider adapters
- Stripe provider adapters
- Twilio provider adapters
- Dropbox provider adapters

---

### Phase 6: Knowledge Computation (Weeks 21-24)

**Objective:** Implement knowledge as computed from facts

**Tasks:**
1. Remove stored Knowledge objects
2. Implement knowledge computation from facts
3. Implement knowledge graph
4. Implement knowledge projection

**Deliverables:**
- Knowledge computation engine
- Knowledge graph
- Knowledge projection

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

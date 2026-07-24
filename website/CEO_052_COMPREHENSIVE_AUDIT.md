# CEO 052 — Comprehensive Audit & Execution-Ready Patch Plan

**Date:** 2026-07-24
**Status:** READ-ONLY — No implementation. Execution-ready plan only.
**Context:** Tenant OS + PING Constitutional Framework convergence. Compiler-first architecture.

---

## 1. What Exists (Last 20 Commits)

### 1.1 Architecture Specs (Design-Only, No Code)

| Artifact | Status | Location |
|----------|--------|----------|
| Tenant OS Architecture | ✅ Complete | `TENANT_OS_ARCHITECTURE.md` (1403 lines) |
| Generation Manifest (Spec) | ✅ Complete | `GENERATION_MANIFEST.md` (1635 lines) |
| Generation Manifest (YAML) | ✅ Complete | `src/constitution/GENERATION_MANIFEST.yaml` (140 lines) |
| Generation Plan | ✅ Complete | `src/constitution/GENERATION_PLAN.md` (66 lines) |
| Constitutional Synthesis | ✅ Complete | `governance/CONSTITUTIONAL_SYNTHESIS.md` |
| 7 Governance Specs | ✅ Complete | `governance/*.md` (7 files) |
| Constitutional Primitive Catalog | ✅ Complete | `primitives/CONSTITUTIONAL_PRIMITIVE_CATALOG.md` |
| Canonical Business Object | ✅ Complete | `canonical-object.ts` (112 lines) |
| Canonical ID Authority | ✅ Complete | `objects/_ids.ts` (72 lines) |
| Canonical Object Instantiation | ✅ Complete | `objects/_canonical.ts` (56 lines) |

### 1.2 Implemented Code (Runtime)

| Component | Status | Location | Lines |
|-----------|--------|----------|-------|
| Authority Loader | ✅ Implemented | `lib/authority-loader.ts` | 351 |
| Media Authority Adapter | ✅ Implemented | `lib/media.ts` | 150 |
| Brand Authority | ✅ Implemented | `lib/brand.ts` | ~80 |
| Projects Authority | ✅ Implemented | `lib/projects.ts` | ~120 |
| Estimate Engine | ✅ Implemented | `lib/estimate-engine.ts` | 270 |
| Planning Context | ✅ Implemented | `lib/planning-context.ts` | 48 |
| Planning Strategies | ✅ Implemented | `lib/planning-strategies/` | multiple |
| Wizard Persistence | ✅ Implemented | `lib/wizard-persistence.ts` | ~200 |
| Validation Engine | ✅ Implemented | `lib/validation-engine.ts` | ~150 |
| Canonical Objects (7 domains) | ✅ Implemented | `objects/*.ts` | ~400 |
| Before/After Slider | ✅ Implemented | `components/before-after-slider.tsx` | 149 |
| Estimate Wizard | ✅ Implemented | `components/estimate-wizard.tsx` | 728 |
| Gallery Redirect | ✅ Implemented | `app/gallery/page.tsx` | 5 |

### 1.3 What's Missing (Compiler Infrastructure)

| Component | Status | Why |
|-----------|--------|-----|
| Compiler | ❌ Not implemented | No code exists |
| IR Specification | ❌ Not defined | YAML → AST not designed |
| IR Types | ❌ Not implemented | No `IRAggregate`, `IREvent`, etc. |
| Manifest Validator | ❌ Not implemented | No schema validation |
| Manifest → IR Compiler | ❌ Not implemented | No normalization pipeline |
| IR → Code Generator | ❌ Not implemented | No codegen |
| Capability ABI | ❌ Not implemented | No versioned contracts |
| Event Metadata Normalization | ❌ Not designed | No standardized envelope |
| Authority Overlap Resolution | ❌ Not resolved | Mission vs Evidence ambiguity |
| Workflow DAG Event Edges | ❌ Not designed | Commands, not events |
| State Machine Guards | ❌ Not implemented | No generated validators |
| Policy Normalization | ❌ Not implemented | requires/before/assert format |

---

## 2. The 15 Compiler Issues (From Directive)

### P0: Must Fix Before Any Generator

#### Issue 1: Manifest is Still a Schema, Not a Language

**Current State:**
```yaml
# GENERATION_MANIFEST.yaml — a schema describing objects
missions:
  - name: Estimate
    owns: [Tasks, Evidence, Crew]
    events: [EstimateCreated, EstimateAccepted]
```

**Required:**
```typescript
// IR — a language the compiler can reason about
interface IRAggregate {
  type: 'identity' | 'mission' | 'evidence' | 'observation';
  name: string;
  stateMachine: IRStateMachine;
  fields: IRField[];
  policies: IRPolicy[];
  relationships: IREdge[];
}

interface IRStateMachine {
  states: IRState[];
  transitions: IRTransition[];
  guards: IRGuard[];
}

interface IRTransition {
  from: string;
  to: string;
  requires: IRGuard[];
  emits: IREvent[];
}

interface IRGuard {
  type: 'entity_exists' | 'authority_granted' | 'policy_passed' | 'custom';
  predicate: string;
  parameters: Record<string, unknown>;
}

interface IREvent {
  type: 'created' | 'updated' | 'transitioned' | 'observed' | 'verified' | 'deleted';
  aggregate: string;
  metadata: IRMetadata;
}
```

**Gap:** YAML schema → AST conversion doesn't exist. Every generator would need custom parsing.

**Fix:** Define IR types first. Then build YAML → IR normalizer. Never generate from YAML directly.

#### Issue 2: No Canonical IR Specification

**Current State:** The Generation Manifest describes what to generate, but there's no IR type system.

**Required:** `IRAggregate`, `IREvent`, `IRStateMachine`, `IRField`, `IRPolicy`, `IRGuard`, `IRRelationship`, `IRCapability`, `IRWorkflow` — everything compiles into these.

**Gap:** No IR types exist. The compiler has nothing to target.

**Fix:** Create `src/constitution/ir/types.ts` with all IR types. Then build YAML → IR normalizer.

#### Issue 3: Capability ABI Needs Stability Guarantees

**Current State:**
```yaml
capabilities:
  - name: Calendar
    contract: [Schedule, Query, Update]
```

**Required:**
```yaml
capabilities:
  Calendar:
    version: "1.0.0"
    abi_id: "calendar.v1"
    operations:
      ScheduleEvent:
        inputs: [...]
        outputs: [...]
        errors: [...]
        side_effects: [...]
        required_authorities: [MissionAuthority]
        replay_behavior: idempotent
        idempotency_key: event_id
        determinism: pure | impure
        timeout: 30000
        cancellation: cancel | retry | ignore
        compensation: rollback | none
    version_negotiation:
      backward_compatible: true
      min_version: "1.0.0"
```

**Gap:** No versioning, no ABI stability guarantees, no determinism/timeout/cancellation/compensation declarations.

**Fix:** Extend capability schema with full ABI. Add `abi_id` for immutable identification. Add version negotiation rules.

#### Issue 4: Event Metadata Isn't Normalized

**Current State:** Events are described loosely. No standardized envelope.

**Required on Every Event:**
```typescript
interface EventMetadata {
  event_id: string;           // SHA-256 over identity fields
  aggregate_id: string;       // canonical ID of aggregate
  aggregate_type: string;     // "Mission" | "Identity" | "Evidence" | "Observation"
  authority_id: string;       // which authority emitted
  witness_id: string;         // provenance hash
  replay_sequence: number;    // ordering within aggregate
  correlation_id: string;     // links related events
  causation_id: string;       // links to triggering event
  schema_version: string;     // event schema version
  tenant_id: string;          // tenant isolation
  clock: string;              // logical clock
  hash: string;               // content hash
  recorded_at: string;        // ISO-8601
}
```

**Gap:** No standardized event envelope. Events have ad-hoc metadata.

**Fix:** Define `EventMetadata` interface in IR types. Enforce on all generated events.

### P1: High Priority

#### Issue 5: Authorities Still Overlap

**Current State:** Mission Authority, Observation Authority, Evidence Authority, Identity Authority — but ambiguity remains.

**Example:** Mission accepts evidence. Who owns that mutation? Mission? Evidence? Observation?

**Required Rule:** An authority only mutates its own aggregate. Everything else emits events.

**Gap:** No explicit ownership boundary for cross-aggregate mutations.

**Fix:** Add `owns: string[]` to authority IR. Add `emits_events_for: string[]` for cross-aggregate notifications. Generate authority boundary checks at compile time.

#### Issue 6: Workflow DAG Needs Event Edges

**Current State:**
```yaml
workflows:
  EstimateToJob:
    nodes:
      - name: create_job
        type: command
        target: Job.Create
        dependencies: []
```

**Required:**
```yaml
workflows:
  EstimateToJob:
    trigger: EstimateAccepted
    nodes:
      - name: create_job
        type: command
        target: Job.Create
        emits: JobCreated
        dependencies: []
      - name: schedule_appointment
        type: capability
        target: Calendar.ScheduleEvent
        dependencies: [create_job]
        trigger_event: JobCreated
```

**Gap:** Workflows use commands as edges, not events. Events are the constitutional primitive.

**Fix:** Redesign workflow IR to use events as edges. Commands are generated from event triggers.

#### Issue 7: State Machines Need Deterministic Guards

**Current State:**
```yaml
missions:
  Estimate:
    states:
      - name: draft
        allowed_transitions:
          - to: pending
            requires: [MustHaveCustomer, MustHaveProperty]
```

**Required:**
```yaml
missions:
  Estimate:
    states:
      - name: draft
        allowed_transitions:
          - to: pending
            guards:
              - type: entity_exists
                entity: Customer
                source: aggregate
              - type: entity_exists
                entity: Property
                source: aggregate
              - type: policy_passed
                policy: MustHaveCustomer
              - type: authority_granted
                authority: MissionAuthority
                permission: transition
```

**Gap:** Guards are policy names, not executable predicates. No generated validators.

**Fix:** Redesign guard IR with typed predicates. Generate validator functions from guards.

#### Issue 8: Policies Need Normalization

**Current State:**
```yaml
policies:
  MustHaveCustomer:
    rules:
      - requires: [Customer]
        before: [EstimateAccepted]
        assert: [customer_exists]
```

**Required:**
```yaml
policies:
  MustHaveCustomer:
    condition:
      type: entity_exists
      entity: Customer
      source: aggregate
    effect:
      type: allow_transition
      transition: draft -> pending
    else:
      type: reject
      reason: "Customer must exist before estimate can be submitted"
```

**Gap:** Policies use requires/before/assert syntax. Not reducible to IF/THEN/ELSE.

**Fix:** Normalize policies to Condition/Predicate/Effect. Generate enforcement logic from normalized form.

### P2: Refactor Before Scale

#### Issue 9: Evidence Pipeline Duplicates Observation Pipeline

**Current State:**
```
Evidence -> Observation -> Assertion -> Verified Assertion
```

**Required:**
```
Evidence -> Observation Authority -> Observation -> Verified Observation
```

**Gap:** Observation is already a transformation. Evidence processing should disappear into Observation Authority.

**Fix:** Merge Evidence pipeline into Observation Authority. One less compiler stage.

#### Issue 10: Mission Types Should Be Unified

**Current State:** Estimate, Job, Project are separate mission types.

**Required:**
```yaml
missions:
  Mission:
    type: Estimate | Job | Project
```

**Gap:** Compiler shouldn't know about mission types. Manifest should define `Mission` with a `type` discriminator.

**Fix:** Unify mission types. Generator handles type-specific behavior via discriminators.

#### Issue 11: Identity Types Should Be Unified

**Current State:** Customer, Crew, Vendor are separate identity types.

**Required:**
```yaml
identities:
  Identity:
    kind: Customer | Crew | Vendor
```

**Gap:** Same issue as missions.

**Fix:** Unify identity types. Generator handles kind-specific fields via discriminators.

#### Issue 12: Capability Registry Needs Unique ABI IDs

**Current State:** Capabilities identified by name (`Calendar`).

**Required:** Capabilities identified by immutable ABI ID (`calendar.v1`).

**Gap:** Names can change. ABI IDs must be immutable.

**Fix:** Add `abi_id` field to capability definitions. Use ABI IDs in all generated code.

### P3: Future Scalability

#### Issue 13-15: Constitution Packages, Generator Plugins, Manifest Diff Engine

These are future concerns. Not blocking current compiler work.

---

## 3. What's Already Solved (Don't Revisit)

| # | Solved | Evidence |
|---|--------|----------|
| 1 | Four domain primitives | `canonical-object.ts`, `objects/*.ts` |
| 2 | Event sourcing | `EVENT_SCHEMA_POLICY.md`, `EventEnvelope` |
| 3 | Knowledge is computed | `CONSTITUTIONAL_SYNTHESIS.md` §2 |
| 4 | Provider independence | `GENERATION_MANIFEST.yaml` providers section |
| 5 | Intent-based planning | `planning-context.ts`, `estimate-engine.ts` |
| 6 | Canonical identity | `_ids.ts` — SHA-256 over identity |
| 7 | Immutable evidence chain | `EvidenceRef` in `canonical-object.ts` |
| 8 | Replay-first architecture | `DETERMINISM_POLICY.md`, `REPLAY_CERTIFICATION_POLICY.md` |
| 9 | Witness generation | `DETERMINISM_POLICY.md` §5 |
| 10 | Compiler-first philosophy | `GENERATION_MANIFEST.md` |
| 11 | IR layer (designed) | `GENERATION_MANIFEST.md` §12 |
| 12 | Generated commands | Design in manifest |
| 13 | Generated repositories | Design in manifest |
| 14 | Generated APIs | Design in manifest |
| 15 | Generated tests | Design in manifest |
| 16 | DAG workflows | Design in manifest §10 |
| 17 | Mission state machines | Design in manifest §4 |
| 18 | Executable policies | Design in manifest §8 |

---

## 4. Execution-Ready Patch Plan

### Phase 1: IR Type System (Week 1)

**Objective:** Define the canonical IR that everything compiles into.

**Deliverables:**
1. `src/constitution/ir/types.ts` — All IR types
2. `src/constitution/ir/index.ts` — Barrel export

**IR Types to Define:**
```typescript
// Core aggregates
interface IRAggregate { ... }
interface IRStateMachine { ... }
interface IRState { ... }
interface IRTransition { ... }
interface IRGuard { ... }

// Events
interface IREvent { ... }
interface IRMetadata { ... }

// Fields and relationships
interface IRField { ... }
interface IRRelationship { ... }

// Policies
interface IRPolicy { ... }
interface IRCondition { ... }
interface IREffect { ... }

// Capabilities
interface IRCapability { ... }
interface IROperation { ... }
interface IRABI { ... }

// Workflows
interface IRWorkflow { ... }
interface IRWorkflowNode { ... }
interface IRWorkflowEdge { ... }

// Top-level IR document
interface IRDocument { ... }
```

**Files Affected:**
- New: `src/constitution/ir/types.ts`
- New: `src/constitution/ir/index.ts`

**Risk:** None — type-only module, no runtime impact.

### Phase 2: Manifest Validator (Week 1)

**Objective:** Validate the YAML manifest against constitutional rules.

**Deliverables:**
1. `src/constitution/compiler/validator.ts` — Schema validation
2. `src/constitution/compiler/validator.test.ts` — Tests

**Validation Rules:**
1. Every aggregate has exactly one owner authority
2. Every transition has at least one guard
3. Every capability has an ABI with version
4. Every policy has condition/effect/else
5. No circular dependencies in workflows
6. Every event has required metadata fields
7. Every guard has a typed predicate

**Files Affected:**
- New: `src/constitution/compiler/validator.ts`
- New: `src/constitution/compiler/validator.test.ts`

**Risk:** Low — validation only, no code generation.

### Phase 3: Manifest → IR Normalizer (Week 2)

**Objective:** Convert YAML manifest into canonical IR.

**Deliverables:**
1. `src/constitution/compiler/normalizer.ts` — YAML → IR conversion
2. `src/constitution/compiler/normalizer.test.ts` — Tests

**Normalization Steps:**
1. Parse YAML into intermediate AST
2. Resolve all cross-references (aggregate → authority, transition → guard, etc.)
3. Infer authorities from mutation ownership
4. Generate canonical events from state transitions
5. Normalize policies to Condition/Predicate/Effect
6. Build workflow DAGs with event edges

**Files Affected:**
- New: `src/constitution/compiler/normalizer.ts`
- New: `src/constitution/compiler/normalizer.test.ts`

**Risk:** Medium — complex transformation logic.

### Phase 4: IR → Code Generator (Week 3)

**Objective:** Generate TypeScript code from IR.

**Deliverables:**
1. `src/constitution/compiler/generator.ts` — Code generation engine
2. `src/constitution/compiler/templates/*.ts` — Code templates

**Generated Artifacts:**
1. Repository (event-sourced)
2. CQRS command/event handlers
3. Projection builders
4. REST API endpoints
5. GraphQL schemas
6. Unit tests
7. Replay tests
8. Documentation

**Files Affected:**
- New: `src/constitution/compiler/generator.ts`
- New: `src/constitution/compiler/templates/repository.ts`
- New: `src/constitution/compiler/templates/handler.ts`
- New: `src/constitution/compiler/templates/projection.ts`
- New: `src/constitution/compiler/templates/api.ts`
- New: `src/constitution/compiler/templates/test.ts`

**Risk:** High — complex code generation.

### Phase 5: Capability ABI (Week 3)

**Objective:** Define versioned capability contracts.

**Deliverables:**
1. `src/constitution/ir/capability-abi.ts` — ABI types
2. `src/constitution/objects/capabilities.ts` — Instantiated capabilities

**ABI Components:**
- Version (semver)
- ABI ID (immutable)
- Operations with inputs/outputs/errors
- Side effects
- Required authorities
- Replay behavior
- Idempotency key
- Determinism
- Timeout
- Cancellation
- Compensation

**Files Affected:**
- New: `src/constitution/ir/capability-abi.ts`
- New: `src/constitution/objects/capabilities.ts`

**Risk:** Medium — ABI design affects all generated code.

### Phase 6: Event Metadata Normalization (Week 4)

**Objective:** Standardize event envelope on all generated events.

**Deliverables:**
1. `src/constitution/ir/event-metadata.ts` — Event envelope types
2. Update normalizer to enforce metadata

**Event Metadata Fields:**
- event_id (SHA-256)
- aggregate_id
- aggregate_type
- authority_id
- witness_id
- replay_sequence
- correlation_id
- causation_id
- schema_version
- tenant_id
- clock
- hash
- recorded_at

**Files Affected:**
- New: `src/constitution/ir/event-metadata.ts`
- Modified: `src/constitution/compiler/normalizer.ts`

**Risk:** Medium — event model change.

### Phase 7: Authority Overlap Resolution (Week 4)

**Objective:** Resolve authority boundary ambiguity.

**Deliverables:**
1. Update IR types with `owns` and `emits_events_for`
2. Update normalizer to enforce authority boundaries
3. Generate authority boundary checks

**Rule:** An authority only mutates its own aggregate. Everything else emits events.

**Files Affected:**
- Modified: `src/constitution/ir/types.ts`
- Modified: `src/constitution/compiler/normalizer.ts`

**Risk:** Medium — authority model change.

---

## 5. Execution Order

```
Week 1: IR Types + Manifest Validator
  ├── Day 1-2: Define IR types (types.ts)
  ├── Day 3-4: Build manifest validator (validator.ts)
  └── Day 5: Tests + review

Week 2: Manifest → IR Normalizer
  ├── Day 1-2: Build YAML → IR normalizer (normalizer.ts)
  ├── Day 3-4: Handle edge cases + cross-references
  └── Day 5: Tests + review

Week 3: IR → Code Generator + Capability ABI
  ├── Day 1-2: Build code generator (generator.ts)
  ├── Day 3: Build code templates
  ├── Day 4: Define capability ABI types
  └── Day 5: Tests + review

Week 4: Event Metadata + Authority Resolution
  ├── Day 1-2: Standardize event envelope
  ├── Day 3-4: Resolve authority overlaps
  └── Day 5: Integration tests + review
```

---

## 6. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| IR types too rigid | Medium | High | Start with minimal types, extend incrementally |
| Normalizer too complex | High | Medium | Break into small steps, test each |
| Code generator produces bad code | Medium | High | Start with simple templates, validate output |
| ABI changes break generated code | Low | High | Use semver, backward-compatible changes only |
| Event metadata too verbose | Medium | Low | Use defaults, require only critical fields |

---

## 7. Dependencies

| Component | Depends On | Blocks |
|-----------|-----------|--------|
| IR Types | Nothing | Everything |
| Manifest Validator | IR Types | Normalizer |
| Manifest → IR Normalizer | IR Types, Validator | Generator |
| IR → Code Generator | IR Types, Normalizer | Runtime |
| Capability ABI | IR Types | Normalizer |
| Event Metadata | IR Types | Normalizer |
| Authority Resolution | IR Types | Normalizer |

---

## 8. What NOT to Do

1. **Don't redesign primitives** — Four primitives (Identity, Mission, Evidence, Observation) are frozen.
2. **Don't add new runtime subsystems** — PING owns runtime. Tenant OS adds only domain concepts.
3. **Don't reference providers in Tenant OS code** — Providers are drivers PING loads.
4. **Don't hand-write services** — Everything is generated from the constitution.
5. **Don't store knowledge** — Knowledge is computed from facts at replay time.
6. **Don't skip the compiler** — Build compiler before adding business capabilities.

---

## 9. Success Criteria

After 4 weeks:
1. IR types defined and tested
2. Manifest validator passes on current YAML
3. Normalizer converts YAML → IR correctly
4. Generator produces working TypeScript from IR
5. Capability ABI is versioned and stable
6. Event metadata is standardized
7. Authority boundaries are enforced at compile time

---

## 10. Next Phase (After Compiler Exists)

Once the compiler pipeline works:
1. Generate first business capability (Estimate flow)
2. Validate generated code compiles and runs
3. Add provider adapters via Capability Registry
4. Run end-to-end flow: Estimate → Mission → Evidence → Observation → Fact → Replay → Witness

---

*This plan supersedes all previous architecture discussions. The compiler pipeline is the product now — not the business application.*

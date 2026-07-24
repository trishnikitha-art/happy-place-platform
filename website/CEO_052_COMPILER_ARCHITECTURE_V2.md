# CEO 052 — Revised Compiler Architecture (v2)

**Date:** 2026-07-24
**Status:** READ-ONLY — No implementation. Execution-ready plan only.
**Context:** Tenant OS + PING Constitutional Framework convergence. Compiler-first architecture.
**Revision:** Incorporates 6 architectural corrections from CEO review.

---

## 1. Architectural Corrections

### Correction 1: IR Must Be Compiler-Oriented, Not Domain-Oriented

**WRONG (v1):**
```typescript
interface IRAggregate { ... }
interface IRStateMachine { ... }
interface IRCapability { ... }
interface IRAuthority { ... }
```

**RIGHT (v2):**
```typescript
// Compiler primitives — domain-agnostic
interface Symbol { ... }
interface Type { ... }
interface Node { ... }
interface Edge { ... }
interface Constraint { ... }
interface Authority { ... }
interface Transformation { ... }
interface Projection { ... }
interface Artifact { ... }

// Domain concepts compile INTO these primitives
// Mission → Node + Transformation + Constraint
// Identity → Symbol + Type + Authority
// Evidence → Artifact + Transformation + Constraint
// Observation → Projection + Constraint
```

**Why:** If the IR is domain-oriented, you'll need IR v2 when the domain changes. Compiler-oriented primitives are stable across domain evolution.

### Correction 2: Validator and Normalizer Must Be Separate

**WRONG (v1):**
```
Manifest → Validator/Normalizer → IR
```

**RIGHT (v2):**
```
Manifest
    ↓
Parser
    ↓
AST (immutable, with source locations)
    ↓
Validator (never mutates AST)
    ↓
Normalizer (never rejects)
    ↓
Canonical IR
    ↓
Optimizer (never changes semantics)
    ↓
Generators
```

**Rules:**
- Validator: reads AST, produces diagnostics. Never mutates.
- Normalizer: reads valid AST, produces IR. Never rejects.
- Optimizer: reads IR, produces optimized IR. Never changes semantics.

### Correction 3: Structured Diagnostics Model

**Required from day one:**

```typescript
interface CompilerDiagnostic {
  code: string;           // e.g. "E001", "W042", "I007"
  severity: 'error' | 'warning' | 'info' | 'note';
  source_location: {
    file: string;
    line: number;
    column: number;
    length: number;
  };
  message: string;
  suggested_fix?: string;
  related_diagnostics?: CompilerDiagnostic[];
}
```

**Diagnostic Codes:**
- `E001-E099`: Schema errors (missing fields, type mismatches)
- `E100-E199`: Reference errors (unknown authority, missing aggregate)
- `E200-E299`: Authority errors (ownership conflicts, boundary violations)
- `E300-E399`: State machine errors (invalid transitions, missing guards)
- `E400-E499`: Capability errors (ABI violations, version conflicts)
- `W001-W099`: Warnings (unused policies, dead code, redundant constraints)
- `I001-I099`: Info (optimization suggestions, deprecation notices)

### Correction 4: Authority Inference Must Be Deterministic

**Rule:** If two authorities could own a mutation, compilation FAILS. No guessing.

```typescript
interface AuthorityResolution {
  aggregate: string;
  mutation: string;
  candidates: string[];    // authorities that could own this
  resolved: string | null; // null if ambiguous
  deterministic: boolean;  // false if multiple candidates
}
```

**Enforcement:**
- Validator checks authority ownership at AST level
- If `candidates.length > 1`, emit `E200` error
- If `candidates.length === 0`, emit `E201` error (no authority found)
- If `candidates.length === 1`, resolve deterministically

### Correction 5: Optimizer Scope Must Be Defined

**Allowed optimizations:**
1. Collapse duplicate projections (same query, different names)
2. Inline trivial workflows (single-node DAGs)
3. Remove unreachable states (no incoming transitions)
4. Merge equivalent policies (same condition/effect)
5. Detect dead capabilities (no consumers)
6. Eliminate redundant guards (same predicate on same transition)
7. Merge equivalent event types (same aggregate, same metadata)

**Forbidden:**
- Changing transition semantics
- Adding/removing states
- Modifying authority ownership
- Altering capability contracts
- Changing event metadata
- Any optimization that affects replay determinism

### Correction 6: Certification Consumes IR, Not Generated Code

**WRONG (v1):**
```
IR → Generators → Code → Certification
```

**RIGHT (v2):**
```
IR ─────────────────────┐
                        │
         ┌──────────────┼──────────────┐
         │              │              │
    Generators    Certification   Proofs/Reports
         │              │              │
         ▼              ▼              ▼
      Code         Validation      Audit Trail
```

**Why:** Certification validates the IR directly. Every generated target inherits the same guarantees. One change to IR → all targets recertified.

---

## 2. Revised Compiler Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                    COMPILER PIPELINE                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Manifest (YAML)                                            │
│       │                                                     │
│       ▼                                                     │
│  ┌─────────┐                                                │
│  │ Parser  │  Parse YAML → immutable AST                    │
│  │         │  Preserve source locations                      │
│  │         │  Never validate, never transform                │
│  └────┬────┘                                                │
│       │                                                     │
│       ▼                                                     │
│  ┌──────────┐                                               │
│  │   AST    │  Immutable tree with source locations          │
│  │          │  Nodes: Symbol, Type, Node, Edge, etc.         │
│  │          │  No validation, no normalization               │
│  └────┬─────┘                                               │
│       │                                                     │
│       ▼                                                     │
│  ┌──────────┐                                               │
│  │Validator │  Validate references, schemas, authorities     │
│  │          │  Produce structured diagnostics                │
│  │          │  NEVER mutate AST                              │
│  └────┬─────┘                                               │
│       │                                                     │
│       ├── errors ──→ Diagnostics (human + agent readable)    │
│       │                                                     │
│       ▼ (if valid)                                           │
│  ┌───────────┐                                              │
│  │Normalizer │  Transform valid AST → Canonical IR           │
│  │           │  Resolve aliases, defaults, inferred metadata │
│  │           │  NEVER reject (validation is done)            │
│  └────┬──────┘                                              │
│       │                                                     │
│       ▼                                                     │
│  ┌────────────┐                                             │
│  │Canonical IR│  Domain-agnostic compiler primitives         │
│  │            │  Symbol, Type, Node, Edge, Constraint,       │
│  │            │  Authority, Transformation, Projection,      │
│  │            │  Artifact                                    │
│  └────┬───────┘                                             │
│       │                                                     │
│       ├──────────────────────────────┐                      │
│       │                              │                      │
│       ▼                              ▼                      │
│  ┌──────────┐                 ┌──────────────┐              │
│  │Optimizer │                 │Certification │              │
│  │          │                 │              │              │
│  │ ALLOWED: │                 │ Validates:   │              │
│  │ - collapse dup projections │ - Authority  │              │
│  │ - inline trivial workflows│ - Replay     │              │
│  │ - remove unreachable states│ - Determinism│              │
│  │ - merge equiv policies    │ - Witness    │              │
│  │ - detect dead capabilities│ - Tenant iso │              │
│  │                           │              │              │
│  │ FORBIDDEN:                │ Produces:    │              │
│  │ - change semantics        │ - Proofs     │              │
│  │ - add/remove states       │ - Reports    │              │
│  │ - alter authority ownership│ - Audit trail│              │
│  └────┬──────┘                └──────┬───────┘              │
│       │                              │                      │
│       ▼                              │                      │
│  ┌────────────┐                      │                      │
│  │Generators  │◄─────────────────────┘                      │
│  │            │  All generators consume IR                  │
│  │ - Repository│  No generator reads manifest directly      │
│  │ - API      │  All inherit certification guarantees       │
│  │ - SDK      │                                             │
│  │ - Tests    │                                             │
│  │ - Docs     │                                             │
│  └────────────┘                                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Canonical IR Specification (Compiler-Oriented)

### 3.1 Core Primitives

```typescript
/**
 * A named entity in the compilation scope.
 * Every domain concept (Mission, Identity, Evidence, Observation)
 * compiles into one or more Symbols.
 */
interface Symbol {
  name: string;
  kind: 'aggregate' | 'event' | 'command' | 'policy' | 'capability' | 'workflow';
  type: Type;
  metadata: Record<string, unknown>;
  source_location: SourceLocation;
}

/**
 * A type in the IR type system.
 * Types are structural, not nominal.
 */
interface Type {
  kind: 'primitive' | 'composite' | 'reference' | 'enum' | 'array' | 'optional';
  name?: string;
  fields?: Field[];
  elements?: Type;
  values?: string[];
  reference?: string;
}

/**
 * A node in the compilation graph.
 * Nodes represent computational units.
 */
interface Node {
  id: string;
  kind: 'aggregate' | 'state' | 'transition' | 'operation' | 'handler' | 'projection';
  symbol: string;
  properties: Record<string, unknown>;
  source_location: SourceLocation;
}

/**
 * An edge in the compilation graph.
 * Edges represent relationships between nodes.
 */
interface Edge {
  from: string;
  to: string;
  kind: 'ownership' | 'transition' | 'dependency' | 'emission' | 'consumption';
  properties: Record<string, unknown>;
}

/**
 * A constraint on the compilation.
 * Constraints are validated, not executed.
 */
interface Constraint {
  id: string;
  kind: 'guard' | 'policy' | 'invariant' | 'precondition' | 'postcondition';
  predicate: string;
  parameters: Record<string, unknown>;
  scope: string;
  source_location: SourceLocation;
}

/**
 * An authority in the compilation.
 * Authorities own mutations to aggregates.
 */
interface Authority {
  id: string;
  name: string;
  owns: string[];           // aggregates this authority can mutate
  emits_for: string[];      // aggregates this authority can observe (events only)
  constraints: string[];    // authority-specific constraints
  deterministic: boolean;   // false if ambiguous ownership
  source_location: SourceLocation;
}

/**
 * A transformation in the compilation.
 * Transformations map input to output.
 */
interface Transformation {
  id: string;
  kind: 'command' | 'event' | 'projection' | 'observation' | 'verification';
  input: string;
  output: string;
  authority: string;
  guards: string[];
  events: string[];
  source_location: SourceLocation;
}

/**
 * A projection in the compilation.
 * Projections are derived read models.
 */
interface Projection {
  id: string;
  source: string;
  query: string;
  fields: Field[];
  indexes: string[];
  deterministic: boolean;
  source_location: SourceLocation;
}

/**
 * An artifact in the compilation.
 * Artifacts are immutable data objects.
 */
interface Artifact {
  id: string;
  kind: 'event' | 'evidence' | 'witness' | 'proof' | 'certificate';
  type: Type;
  authority: string;
  hash: string;
  source_location: SourceLocation;
}
```

### 3.2 Canonical IR Document

```typescript
/**
 * The complete IR for a compiled constitution.
 * All generators consume this. No generator reads the manifest.
 */
interface IRDocument {
  version: string;
  source_manifest: string;
  compiled_at: string;
  
  // Core primitives
  symbols: Symbol[];
  types: Type[];
  nodes: Node[];
  edges: Edge[];
  constraints: Constraint[];
  authorities: Authority[];
  transformations: Transformation[];
  projections: Projection[];
  artifacts: Artifact[];
  
  // Metadata
  diagnostics: CompilerDiagnostic[];
  optimization_log: OptimizationEntry[];
  certification_result: CertificationResult;
}
```

---

## 4. Structured Diagnostics

### 4.1 Diagnostic Interface

```typescript
interface CompilerDiagnostic {
  code: string;           // e.g. "E001", "W042", "I007"
  severity: 'error' | 'warning' | 'info' | 'note';
  source_location: SourceLocation;
  message: string;
  suggested_fix?: string;
  related_diagnostics?: CompilerDiagnostic[];
}

interface SourceLocation {
  file: string;
  line: number;
  column: number;
  length: number;
}
```

### 4.2 Diagnostic Code Registry

| Code | Severity | Description |
|------|----------|-------------|
| E001 | error | Missing required field |
| E002 | error | Type mismatch |
| E003 | error | Unknown reference |
| E100 | error | Unknown authority |
| E101 | error | Authority ownership conflict |
| E102 | error | No authority found for mutation |
| E200 | error | Invalid state transition |
| E201 | error | Missing guard on transition |
| E202 | error | Unreachable state |
| E300 | error | Capability ABI violation |
| E301 | error | Version conflict |
| E400 | error | Workflow cycle detected |
| E401 | error | Missing workflow trigger |
| W001 | warning | Unused policy |
| W002 | warning | Dead capability |
| W003 | warning | Redundant guard |
| W004 | warning | Duplicate projection |
| I001 | info | Optimization applied |
| I002 | info | Deprecation notice |

---

## 5. Revised Execution Plan (4 Weeks)

### Week 1: Parser + AST + Diagnostics + Validator

| Day | Deliverable | Files |
|-----|-------------|-------|
| 1-2 | Manifest Parser | `compiler/parser.ts` |
| 2-3 | AST Types | `compiler/ast.ts` |
| 3-4 | Diagnostics Model | `compiler/diagnostics.ts` |
| 4-5 | AST Validator | `compiler/validator.ts` |
| 5 | Test Suite | `compiler/__tests__/` |

**Acceptance:** Valid YAML parses to immutable AST with source locations. Invalid YAML produces structured diagnostics.

### Week 2: Normalizer + Canonical IR + Authority Resolution + Policy Lowering

| Day | Deliverable | Files |
|-----|-------------|-------|
| 1-2 | Canonical IR Types | `ir/types.ts` |
| 2-3 | AST → IR Normalizer | `compiler/normalizer.ts` |
| 3-4 | Authority Resolution | `compiler/authority-resolver.ts` |
| 4-5 | Policy Lowering | `compiler/policy-lowerer.ts` |
| 5 | Test Suite | `compiler/__tests__/` |

**Acceptance:** Valid AST normalizes to canonical IR. Authority conflicts produce E101 errors. Policies lower to Condition/Predicate/Effect.

### Week 3: Optimizer + Event Model + Capability ABI + Repository Generator

| Day | Deliverable | Files |
|-----|-------------|-------|
| 1-2 | Optimizer | `compiler/optimizer.ts` |
| 2-3 | Event Model | `ir/event-model.ts` |
| 3-4 | Capability ABI | `ir/capability-abi.ts` |
| 4-5 | Repository Generator | `generators/repository.ts` |
| 5 | Test Suite | `generators/__tests__/` |

**Acceptance:** IR optimizes without semantic change. Event model standardizes. Repository generator produces working code from IR.

### Week 4: API Generators + SDK Generators + Tests + Replay Certification + Witness Verification

| Day | Deliverable | Files |
|-----|-------------|-------|
| 1-2 | API Generator | `generators/api.ts` |
| 2-3 | SDK Generator | `generators/sdk.ts` |
| 3-4 | Test Generator | `generators/test.ts` |
| 4-5 | Replay Certification | `certification/replay.ts` |
| 5 | Witness Verification | `certification/witness.ts` |

**Acceptance:** Full pipeline works. Manifest → IR → Code + Certification. All generated code inherits certification guarantees.

---

## 6. Sprint 1 — Compiler Core (Trusted Implementation Agent Direction)

### Mission

Build the compiler foundation only.

**Do not generate runtime code yet.**

### Deliverables

1. **Manifest Parser**
   - Parse YAML into immutable AST
   - Preserve source locations for diagnostics
   - Never validate, never transform

2. **AST Validator**
   - Validate references, schemas, authority ownership, state transitions, capability definitions
   - Produce structured diagnostics only
   - Never mutate the AST

3. **Canonical IR**
   - Define the complete IR specification
   - All future generators must consume only the IR
   - No generator may read the manifest directly

4. **Normalizer**
   - Transform valid AST → Canonical IR
   - Resolve aliases, defaults, inferred metadata, canonical identifiers
   - Never perform validation

5. **Compiler Test Suite**
   - Golden manifest tests
   - Invalid manifest tests
   - AST snapshot tests
   - IR snapshot tests
   - Determinism tests (same manifest → identical IR)

### Explicitly Out of Scope for Sprint 1

- Runtime
- APIs
- Repositories
- SDKs
- Provider adapters
- Capability implementations
- Business logic generation

### Acceptance Criterion

**A valid Generation Manifest deterministically compiles into a canonical IR with reproducible diagnostics and zero runtime generation.**

That's the gate before allowing code generation to begin.

---

## 7. What NOT to Do

1. **Don't make IR domain-oriented** — Use compiler primitives (Symbol, Type, Node, Edge), not business concepts (IRAggregate, IRStateMachine)
2. **Don't mix validator and normalizer** — Validator never mutates, normalizer never rejects
3. **Don't return string errors** — Use structured diagnostics with code, severity, location, fix
4. **Don't guess authority ownership** — If ambiguous, fail compilation
5. **Don't let optimizer change semantics** — Only collapse, inline, remove unreachable, merge equivalent
6. **Don't certify generated code** — Certify IR directly, all targets inherit guarantees

---

*This plan supersedes v1. The compiler pipeline is domain-agnostic, validator/normalizer are separated, diagnostics are structured, authority resolution is deterministic, optimizer scope is defined, and certification consumes IR directly.*

# Compiler Core — Sprint 1 (Execution-Ready)

**Mission:** Produce a deterministic compiler front-end. Nothing else.

**Date:** 2026-07-24
**Status:** Execution-ready. No implementation yet.

---

## What Already Exists (Do NOT Redo)

| Component | File | Status | Reuse? |
|-----------|------|--------|--------|
| CanonicalBusinessObject | `canonical-object.ts` | STABLE | **YES — IS the target IR type** |
| instantiate() | `objects/_canonical.ts` | STABLE | **YES — IS the instantiation primitive** |
| canonicalId() | `objects/_ids.ts` | STABLE | **YES — IS the identity system** |
| sha256Hex() | `objects/_sha256.ts` | STABLE | **YES — IS the hashing primitive** |
| Graph validator | `objects/_validate.ts` | STABLE | **YES — pattern for validation** |
| 69 canonical objects | `objects/*.ts` | STABLE | **YES — reference implementations** |
| GENERATION_MANIFEST.yaml | `constitution/GENERATION_MANIFEST.yaml` | STABLE | **YES — IS the compiler input** |
| GENERATION_PLAN.md | `constitution/GENERATION_PLAN.md` | STABLE | **YES — IS the design spec** |
| 7 governance specs | `governance/*.md` | STABLE | **YES — IS the policy engine** |
| Finding type | `lib/findings.ts` | PARTIAL | **MAYBE — adapt for diagnostics** |
| Validation engine | `lib/validation-engine.ts` | PARTIAL | **MAYBE — business validation, not compiler** |

**Bottom line:** The constitution layer has the **output type** (`CanonicalBusinessObject`) and **instantiation functions** already built. What's missing is everything between "YAML file on disk" and "those functions get called."

---

## What Does NOT Exist (Must Build)

| Component | Why |
|-----------|-----|
| YAML Parser | No YAML library in package.json |
| AST Types | No `interface Node`, `interface Token`, etc. |
| IR Types | No `interface Symbol`, `interface Type`, etc. |
| Diagnostic Types | `Finding` is business-domain, not compiler |
| Semantic Validator | No manifest validation |
| Normalizer | No AST → IR transformation |
| Compiler Pipeline | No stage orchestration |

---

## Sprint 1 Deliverables

### 1. YAML Parser

**Input:** `GENERATION_MANIFEST.yaml` (file on disk)
**Output:** Immutable AST with source locations

**Requirements:**
- Parse YAML into AST nodes
- Preserve source locations (file, line, column, length)
- Never validate, never normalize
- Never "helpfully" transform

**Implementation:**
- Add `yaml` dependency to package.json
- Create `src/compiler/parser.ts`
- Parser returns `ASTNode` tree with source locations

**Forbidden:**
- No validation in parser
- No normalization in parser
- No error recovery beyond syntax errors

### 2. AST Types

**Output:** Immutable type hierarchy for the AST

**Requirements:**
- Every node has `kind`, `source_location`, `children`
- Nodes are immutable (frozen after creation)
- Source locations preserved for diagnostics

**Implementation:**
- Create `src/compiler/ast.ts`
- Define node types:
  - `ManifestNode` (root)
  - `SectionNode` (identities, missions, evidence, observations, capabilities, policies, workflows)
  - `DefinitionNode` (individual definitions within sections)
  - `FieldNode` (key-value pairs)
  - `ListNode` (arrays)
  - `ReferenceNode` (cross-references to other definitions)
  - `ConstraintNode` (guards, policies, requirements)

**Forbidden:**
- No mutable fields
- No normalization in types

### 3. Structured Diagnostics

**Output:** Compiler diagnostic model

**Requirements:**
- Code, severity, source location, message, suggested fix
- Human and agent readable
- Deterministic (same error → same diagnostic)

**Implementation:**
- Create `src/compiler/diagnostics.ts`
- Define:
  ```typescript
  interface CompilerDiagnostic {
    code: string;           // "E001", "W042", "I007"
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
- Define diagnostic code registry (E001-E401, W001-W004, I001-I002)

**Forbidden:**
- No string-only errors
- No throwing exceptions for diagnostics

### 4. Semantic Validator

**Input:** Immutable AST
**Output:** Structured diagnostics (never mutates AST)

**Requirements:**
- Validate references, schemas, authority ownership, state transitions, capability definitions
- Produce structured diagnostics only
- NEVER mutate AST
- Deterministic (same AST → same diagnostics)

**Implementation:**
- Create `src/compiler/validator.ts`
- Validation rules:
  1. Every aggregate has exactly one owner authority
  2. Every transition has at least one guard
  3. Every capability has an ABI with version
  4. Every policy has condition/effect/else
  5. No circular dependencies in workflows
  6. Every event has required metadata fields
  7. Every guard has a typed predicate
  8. Authority ownership is unambiguous (E200 if ambiguous)
  9. All cross-references resolve
  10. State machines are valid (no dead states, all transitions valid)

**Forbidden:**
- No AST mutation
- No normalization
- No "fixing" errors

**Authority Rule:** If two authorities could own a mutation, compilation STOPS (E200). No warnings. No inference.

### 5. Normalizer

**Input:** Valid AST
**Output:** Canonical IR

**Requirements:**
- Transform valid AST → Canonical IR
- Resolve aliases, defaults, inferred metadata, canonical identifiers
- Never validate (validation is done)
- Never reject (AST is valid)
- Deterministic (same AST → same IR)

**Implementation:**
- Create `src/compiler/normalizer.ts`
- Normalization steps:
  1. Resolve all cross-references to canonical IDs
  2. Apply defaults for optional fields
  3. Infer authorities from mutation ownership (deterministic)
  4. Generate canonical events from state transitions
  5. Lower policies to Condition/Predicate/Effect
  6. Build workflow DAGs with event edges
  7. Freeze all output (Object.freeze)

**Forbidden:**
- No validation
- No rejection
- No mutation of input AST

### 6. Canonical IR

**Output:** Frozen IR v1 (the compiler ABI)

**Requirements:**
- Domain-agnostic compiler primitives
- Immutable (frozen after creation)
- Versioned (IR v1)
- Complete (all manifest concepts expressible)

**Implementation:**
- Create `src/constitution/ir/types.ts`
- Define primitives:
  ```typescript
  // Compiler primitives — domain-agnostic
  interface Symbol { name, kind, type, metadata, source_location }
  interface Type { kind, name?, fields?, elements?, values?, reference? }
  interface Node { id, kind, symbol, properties, source_location }
  interface Edge { from, to, kind, properties }
  interface Constraint { id, kind, predicate, parameters, scope, source_location }
  interface Authority { id, name, owns, emits_for, constraints, deterministic, source_location }
  interface Transformation { id, kind, input, output, authority, guards, events, source_location }
  interface Projection { id, source, query, fields, indexes, deterministic, source_location }
  interface Artifact { id, kind, type, authority, hash, source_location }
  
  // Top-level IR document
  interface IRDocument {
    version: string;          // "1.0.0"
    source_manifest: string;
    compiled_at: string;
    symbols: Symbol[];
    types: Type[];
    nodes: Node[];
    edges: Edge[];
    constraints: Constraint[];
    authorities: Authority[];
    transformations: Transformation[];
    projections: Projection[];
    artifacts: Artifact[];
    diagnostics: CompilerDiagnostic[];
  }
  ```
- Create `src/constitution/ir/index.ts` (barrel)

**Forbidden:**
- No mutable fields
- No domain-specific types (Mission, Identity, etc.)
- No business logic

### 7. Golden Tests

**Output:** Test suite proving determinism

**Requirements:**
- Same manifest → identical IR every run
- Invalid manifest → structured diagnostics
- AST snapshots
- IR snapshots

**Implementation:**
- Create `src/compiler/__tests__/parser.test.ts`
- Create `src/compiler/__tests__/validator.test.ts`
- Create `src/compiler/__tests__/normalizer.test.ts`
- Create `src/compiler/__tests__/compiler.test.ts` (integration)
- Test cases:
  - Valid manifest → IR v1 snapshot
  - Invalid manifest (missing authority) → E200 diagnostic
  - Invalid manifest (ambiguous ownership) → E201 diagnostic
  - Same manifest → byte-identical IR (determinism)
  - Source locations preserved through pipeline

---

## Execution Order (4 Weeks)

### Week 1: Parser + AST + Diagnostics + Validator

| Day | Deliverable | Files |
|-----|-------------|-------|
| 1-2 | YAML Parser + AST Types | `compiler/parser.ts`, `compiler/ast.ts` |
| 3 | Diagnostics Model | `compiler/diagnostics.ts` |
| 4-5 | Semantic Validator | `compiler/validator.ts` |
| 5 | Test Suite | `compiler/__tests__/` |

**Gate:** Valid YAML parses to immutable AST with source locations. Invalid YAML produces structured diagnostics.

### Week 2: Normalizer + Canonical IR

| Day | Deliverable | Files |
|-----|-------------|-------|
| 1-2 | Canonical IR Types | `ir/types.ts`, `ir/index.ts` |
| 3-4 | AST → IR Normalizer | `compiler/normalizer.ts` |
| 5 | Test Suite | `compiler/__tests__/` |

**Gate:** Valid AST normalizes to canonical IR. Authority conflicts produce E200 errors. IR is frozen v1.

### Week 3: First Generator (IR Snapshot v1 Frozen)

| Day | Deliverable | Files |
|-----|-------------|-------|
| 1-2 | IR Snapshot v1 | `ir/snapshot-v1.json` (frozen ABI) |
| 3-5 | Repository Generator | `generators/repository.ts` |

**Gate:** IR Snapshot v1 is frozen. Repository generator produces working code from IR only. No generator reads manifest.

### Week 4: Certification + Tests

| Day | Deliverable | Files |
|-----|-------------|-------|
| 1-2 | Replay Certification | `certification/replay.ts` |
| 3-4 | Witness Verification | `certification/witness.ts` |
| 5 | Integration Tests | `compiler/__tests__/integration/` |

**Gate:** Certification consumes IR directly. Generated code is disposable. Manifest → IR → Proof.

---

## Acceptance Criterion

**Sprint 1 is complete only when:**

```
Manifest
    ↓
  Parser
    ↓
   AST
    ↓
Validator
    ↓
Normalizer
    ↓
Canonical IR
```

Produces:
- Deterministic IR (same manifest → identical IR)
- Deterministic diagnostics (same error → same diagnostic)
- Snapshot-stable output (IR v1 frozen)
- Zero runtime generation

**Only after that should additional agents begin writing generators.**

---

## Explicitly Forbidden for Sprint 1

The trusted agent should NOT write:
- Repositories
- Services
- APIs
- SDKs
- Provider adapters
- Runtime code
- Planner
- Business logic
- REST
- GraphQL

Those all wait until the IR is frozen.

---

## Runtime Team Scope (Isolated)

The runtime team should only stabilize existing PING infrastructure:
- Replay engine
- Witness generation
- Hashing
- Capability broker
- Authority enforcement

They should NOT redesign runtime architecture. The governance specs are complete; the implementation is absent.

---

*This plan supersedes all previous versions. The compiler front-end is the only priority. Everything else waits.*

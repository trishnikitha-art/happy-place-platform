# IR Schema v1

**ir_version:** `1.0.0`
**meta.version:** `1.0.0`

## IRDocument Top-Level Keys

- `artifacts`
- `authorities`
- `constraints`
- `diagnostics`
- `edges`
- `ir_version`
- `meta`
- `nodes`
- `projections`
- `symbols`
- `transformations`
- `types`

## Symbol Kinds

- `aggregate`
- `authority`
- `capability`
- `claim`
- `event`
- `fact`
- `observation`

## Type Kinds

- `struct`

## Edge Kinds

- `claims`
- `emits`
- `guards`
- `owns`

## Constraint Kinds

- `policy`

## Transformation Kinds

- `command`
- `event`

## Artifact Kinds (registered but empty in Sprint 1)

_None yet._

## Counts

- Symbols: 28
- Types: 17
- Nodes: 35
- Edges: 33
- Constraints: 6
- Authorities: 5
- Transformations: 16
- Projections: 0
- Artifacts: 0

## Stability Rules

1. This file is the **canonical IR specification** for v1.
2. Any change to IRDocument shape requires a version bump (1.0.0 → 1.1.0 for additions, 2.0.0 for removals/renames).
3. Generators MUST consume only this schema. Direct manifest reading is forbidden.
4. The snapshot at `snapshot-v1.json` is the **deterministic reference** for all compatibility tests.

## IRDocument Interface (TypeScript)

```typescript
export interface IRDocument {
  readonly ir_version: string;
  readonly meta: IRMeta;
  readonly symbols: readonly Symbol[];
  readonly types: readonly Type[];
  readonly nodes: readonly Node[];
  readonly edges: readonly Edge[];
  readonly constraints: readonly Constraint[];
  readonly authorities: readonly Authority[];
  readonly transformations: readonly Transformation[];
  readonly projections: readonly Projection[];
  readonly artifacts: readonly Artifact[];
  readonly diagnostics: readonly CompilerDiagnostic[];
}
```

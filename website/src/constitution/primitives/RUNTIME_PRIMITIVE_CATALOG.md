# Runtime Primitive Catalog (Stage 4 — PING)

**Scope:** Runtime primitives in PING. **Tagging:** [O]=observed · [I]=inference · [U]=unknown.
**Questions per primitive:** General-purpose? Business-specific? Reusable? Already independent?

---

| Runtime Primitive | General? | Business-specific? | Reusable? | Independent? | Evidence |
|-------------------|----------|--------------------|-----------|--------------|----------|
| **Replay** | Yes | No | Yes | Partial (store+projection exist; loop phase stub) [O] | `storage` Event + `kernel/projection.py` |
| **Command** | Yes | No | Yes | Yes [O] | `kernel/command_bus.py` |
| **Mission** | Yes | No | Yes | Yes (IR exists; no generator) [O] | `runtime/planning/mission_compiler.py` |
| **Planning** | Yes | No | Yes | Yes [O] | `runtime/planning/` IR pipeline |
| **Capability** | Yes | No | Yes | Yes (policy hardcoded) [O] | `runtime/security/capability_broker.py` |
| **Authority** | Yes | No | Yes | Yes [O] | `constitution/authority/` + `ingress/route_authority.py` |
| **Registry** | Yes | No | Yes | Yes [O] | `storage` 6 registries |
| **Projection** | Yes | No | Yes | **Duplicate** (2 engines) [O] | `kernel/projection.py` + `runtime/event_sourcing/projections.py` |
| **Scheduler** | Yes | No | Yes | Partial (loop phase `Schedule` = stub) [O] | `kernel/scheduler.py` |
| **Queue** | Yes | No | Yes | Yes (outbox/inbox leasing+idempotency) [O] | `storage` `OutboxMessage`/`InboxMessage` |
| **Evidence** | Yes | No | Yes | Yes [O] | `runtime/evidence/` + `EventEnvelope.build_witness` |
| **Transport** | Yes | No | Yes | Partial (`ingress/route_authority`) [O/I] | ingress layer |
| **Observation** | Yes | No | Yes | Partial (loop phase `Observe`; Edge sensor external [A]) [O/I] | `runtime/loop.py` phase 1 |

---

## Key Findings

1. **Every PING runtime primitive is General-purpose, NOT business-specific** [O]. Confirmed: `storage/models.py` has generic `Aggregate(type:str)`; `apps/` empty; no Customer/Invoice/Job entities. PING is infrastructure, exactly as frozen spec states.
2. **All are Reusable** across any domain runtime (HPOS = Domain Runtime #1).
3. **Maturity gaps (not missing primitives):**
   - `Projection` is **duplicated** (D2) — collapse to one.
   - `Scheduler` and `Observation` are **partial** (loop phases 9 / 1 wiring).
   - `Capability` executor is **simulated** (`sleep(0.1)`) — real invocation missing.
   - `Mission` has no generator (`Orca` absent).
4. **No business-specific runtime primitive exists** — so HPOS must supply business semantics via a domain adapter (Wrap), not new PING primitives.

**Conclusion:** PING's runtime primitives are complete in *shape* and general in *purpose*. The gaps are maturity/wiring (simulated executor, stub scheduler, missing Orca, duplicate projection), not missing primitive types. Reduction holds: HPOS can be built by *composing* these, not by creating new runtime primitives.

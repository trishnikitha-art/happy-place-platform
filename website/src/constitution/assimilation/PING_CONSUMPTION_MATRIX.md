# PING Consumption Matrix (Stage 7)

**Frozen spec:** PING orchestrates. HPOS executes. HPOS depends only on **stable PING capabilities** — never PING internals.

**Evidence tags:** [Observed] = verified in `constitutional-runtime` · [Asserted] = context.

---

## How HPOS Should Consume PING

| Consumption | Current PING Capability [Observed] | Future Capability | Missing | Adapter Required |
|-------------|-----------------------------------|-------------------|---------|------------------|
| **Observation submission** | `constitution/models/event.py` `EventEnvelope` (canonical hash, `BuildWitness`); `runtime/evidence/` | Ingest endpoint accepting EvidenceEnvelope from HPOS/Edge | HPOS→PING observation client; verified Edge→PING sink | **Wrap** (HPOS OmniRoute client) |
| **Capability invocation** | `kernel/command_bus.py`, `runtime/security/capability_broker.py`, `runtime/executor/executor.py` (simulated `sleep(0.1)`) | Real executor invoking Happy-Place capability defs | Real executor; HPOS domain capability registry | **Wrap** (HPOS domain adapter) |
| **Replay request** | `storage/postgres/models.py` Event store; `kernel/projection.py`; loop phase `Project` | Replay API returning projection from event log | HPOS replay client | **Wrap** |
| **Authority validation** | `ingress/route_authority.py`, `capability_broker.py` (policy hardcoded) | Dynamic policy sourced from HPOS config | Policy bridge HPOS→PING | **Wrap** |
| **Mission execution** | `runtime/planning/` (IR pipeline, `mission_compiler`, `general_planner` impl-agnostic) | Mission execution from compiled IR | `Orca`/mission source (absent); real executor | **Wrap** + PING build (out of HPOS scope) |

---

## Key Findings

1. **PING already has the shape** of every consumption HPOS needs: EventEnvelope, command bus, capability broker, projection/replay, planning IR. HPOS must **Wrap**, not rebuild.
2. **Two PING gaps are NOT HPOS's to fix** (infrastructure scope): the simulated executor and the absent `Orca`. HPOS only needs the *client* side; PING must mature internally.
3. **Adapter = thin HPOS-side client** (`OmniRoute` / observation emitter / replay client). This is the runtime seam missing from Stage 1 (see Integration Audit G1/G2).
4. **No PING internal is exposed to the customer.** The HPOS client translates canonical objects ↔ capabilities; the UI never sees PING.

**Classification:** all five consumptions = **Wrap**. No Replace.

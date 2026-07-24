# Reduction Audit (Stage 6)

**Question for every planned subsystem:** *Could this be composed from primitives that already exist?*
**Answers:** **Yes** · **Partially** · **No** — each supported by evidence. **No new subsystem is recommended here; this audit only classifies composability.**

---

| Planned Subsystem | Composable? | Evidence (existing primitives used) |
|-------------------|-------------|--------------------------------------|
| **Photo Librarian** | **Partially** | Media canonical (owner `photo-librarian`) [O] + Relationship + Lifecycle + Observation (Drive sensor) [A] + Evidence + Replay [O]. Missing: HPOS observation emitter, PING ingest wiring, optional Knowledge tag rec. **No new primitive.** |
| **Estimator** | **Partially** | Pricing canonical [O] + Capability invocation (PING `command_bus`/`capability_broker`) [O] + (future Knowledge rec). Missing: real PING executor (simulated) [O], Knowledge. **No new primitive.** |
| **Marketing Oracle** | **Partially** | SEO config [O] + Observation [A] + (future Knowledge). Missing: Knowledge. **No new primitive.** |
| **Operations Oracle** | **Partially** | Projects/Media canonical [O] + Observation [A] + (future Knowledge). Missing: Knowledge. **No new primitive.** |
| **Scheduler** | **Partially** | PING `kernel/scheduler.py` [O] + Calendar provider-ref [A] + Capability [O]. Missing: scheduler loop-phase maturity (stub) [O]. **No new primitive.** |
| **CRM** | **Partially** | Customer = **Reference** (provider Contacts) [A] + canonical-object AuthorityRef pattern [O]. Missing: Customer object (Reference type). Pattern exists; **no new primitive.** |
| **Admin Portal** | **Partially** | config JSON + `featureFlags.ts` + `oauth.v1.json` + canonical objects [O]. Missing: unified surface (Wrap). Data exists; **no new primitive.** |
| **Knowledge Graph** | **Partially** | PING `knowledge_graph.py` [O] + HPOS canonical Relationship [O] + KC claim graph (prior audit). Missing: unification. **No new primitive.** |
| **Mission Engine** | **Partially** | PING planning IR + `mission_compiler` + `command_bus` + loop [O]; executor simulated [O]; `Orca` absent. Missing: real executor + mission generator. **No new primitive.** |

---

## Verdict

- **0 of 9 subsystems require a new primitive.** Every one is **Partially** composable from primitives that already exist.
- The blocking factors are **maturity/wiring**, not missing types:
  - PING executor is simulated (real invocation needed).
  - PING scheduler / observation loop phases are stubs.
  - `Orca` (mission/knowledge generator) is absent.
  - Knowledge Constitution is not built.
  - HPOS lacks the observation/replay *client* seam.
- **This confirms the thesis:** 80–90% of future systems can be composed from existing primitives. The work ahead is *assimilation and wiring*, not architecture expansion.

**Conclusion:** Reduction is complete at the primitive level. From here, implementation should proceed one vertical slice at a time (Media Pipeline first), using these documents as guardrails rather than writing further specifications.

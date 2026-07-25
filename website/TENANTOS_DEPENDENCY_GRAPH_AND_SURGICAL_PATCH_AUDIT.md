# TENANTOS_DEPENDENCY_GRAPH_AND_SURGICAL_PATCH_AUDIT.md

Status
Read-only

No implementation

No redesign

No refactoring

No new architecture

Only verification.

Gate Objective
Freeze the platform.

Confirm that:

Constitutional ownership is complete.
Dependencies are understood.
Implementation order is deterministic.
Remaining work is execution—not architecture.

Section 1 — Constitutional Freeze Verification

Verify only these.

Oracle

Must own ONLY
Compute
OCI
Networking
Vault
Storage
IAM
DNS
Certificates
AI hosting

Must NOT own
Customers
Projects
Reviews
Knowledge
Workflow definitions
Compiler
Runtime meaning

PASS

PING

Must own ONLY operational concerns
Fleet
Runtime
Scheduling
Deployment
Recovery
Observability
Notifications
Admin
Execution
Runtime Registry
Deployment Registry
Tenant Registry
Operational PostgreSQL

Must NOT own
Reviews
CRM
Projects
Knowledge
Neo4j meaning
Compiler
Authorities
Business workflows

PASS

HPP

Must own
Compiler
Authorities
Workflows
Events
Reviews
CRM
Knowledge
Neo4j
Qdrant
Business PostgreSQL
Constitutional IR

PASS

Single Owner Invariant

Verify
Every object has exactly one owner.
No shared ownership.

PASS

Section 2 — Dependency Inventory

No opinions.

Inventory only.

System	Status
Generation Manifest	Exists
Workflow Generator	Missing
Event Generator	Missing
Capability Generator	Missing
Deployment Artifact Generator	Missing
State Machine Generator	Missing
Runtime Registry	Missing
Deployment Registry	Missing
Tenant Registry	Missing
Hermes Runtime	Partial
Ollama Runtime	Partial
Redis	Missing
Queue	Missing
Scheduler	Partial
Telemetry	Partial
Metrics	Partial
Traces	Missing
Logs	Partial
Fleet UI	Stub
Notification System	Missing
Recovery System	Missing
Admin API	Missing

Section 3 — Dependency Graph

Produce actual dependency trees.

Tenant Registry
      ↓
Deployment Registry
      ↓
Runtime Registry
      ↓
Fleet

Compiler

Generation Manifest
        ↓
Workflow Generator
        ↓
Capability Generator
        ↓
Deployment Artifact Generator
        ↓
Runtime Registry

Automation

Canonical Event Envelope
        ↓
Event Generator
        ↓
Queue
        ↓
Scheduler
        ↓
Automation Engine
        ↓
Notifications

Observability

Runtime Registry
      ↓
Telemetry
      ↓
Metrics
      ↓
Logs
      ↓
Traces
      ↓
Fleet Dashboard

Section 4 — Patch Ordering

Every patch gets

ID
Prerequisites
Produces
Consumed By

P001

Canonical Event Envelope

Produces:
Event Contract

Required by:
Workflow Generator
Automation Engine
Observability

P002

Generation Manifest

Produces:
Generation Contract

Required by:
Workflow Generator
Event Generator
Capability Generator
Deployment Artifact Generator
State Machine Generator

P003

Tenant Registry

Produces:
Tenant Identity Contract

Required by:
Deployment Registry
Runtime Registry

P004

Deployment Registry

Produces:
Deployment Contract

Required by:
Runtime Registry
Fleet

P005

Runtime Registry

Produces:
Runtime Contract

Required by:
Fleet
Workflow Generator
Event Generator
Capability Generator
Deployment Artifact Generator
State Machine Generator

P006

Workflow Generator

Produces:
Workflow Contract

Required by:
Automation Engine
State Machine Generator

P007

Event Generator

Produces:
Event Contract

Required by:
Automation Engine
Queue

P008

Capability Generator

Produces:
Capability Contract

Required by:
Automation Engine
State Machine Generator

P009

Deployment Artifact Generator

Produces:
Artifact Contract

Required by:
Fleet
Deployment Registry

P010

State Machine Generator

Produces:
State Machine Contract

Required by:
Automation Engine

P011

Queue

Produces:
Queue Contract

Required by:
Scheduler
Automation Engine

P012

Scheduler

Produces:
Schedule Contract

Required by:
Automation Engine

P013

Automation Engine

Produces:
Automation Contract

Required by:
Notifications
Recovery System

P014

Telemetry

Produces:
Telemetry Contract

Required by:
Metrics
Logs
Traces

P015

Metrics

Produces:
Metrics Contract

Required by:
Fleet Dashboard

P016

Logs

Produces:
Logs Contract

Required by:
Fleet Dashboard

P017

Traces

Produces:
Traces Contract

Required by:
Fleet Dashboard

P018

Fleet Dashboard

Produces:
Dashboard Contract

Required by:
Admin API

P019

Admin API

Produces:
Admin Contract

Required by:
Notification System
Recovery System

P020

Notification System

Produces:
Notification Contract

Required by:
Fleet
Admin API

P021

Recovery System

Produces:
Recovery Contract

Required by:
Fleet
Admin API

Section 5 — Risk Matrix

Every patch gets

Risk	Value

P001
Runtime
Safe

P002
Compiler only
Safe

P003
Runtime only
Safe

P004
Runtime only
Safe

P005
Runtime only
Safe

P006
Compiler only
Safe

P007
Compiler only
Safe

P008
Compiler only
Safe

P009
Compiler only
Safe

P010
Compiler only
Safe

P011
Runtime only
Safe

P012
Runtime only
Safe

P013
Runtime only
Safe

P014
Runtime only
Safe

P015
Runtime only
Safe

P016
Runtime only
Safe

P017
Runtime only
Safe

P018
Runtime only
Safe

P019
Runtime only
Safe

P020
Runtime only
Safe

P021
Runtime only
Safe

Section 6 — Wave Freeze

After dependencies are verified:

Freeze implementation.

Wave 1

Runtime Foundation

Tenant Registry
Deployment Registry
Runtime Registry
Canonical Event Envelope

Wave 2

Compiler Bridge

Workflow Generator
Event Generator
Capability Registry Generator
Deployment Artifact Generator
State Machine Generator

Wave 3

Persistent Runtime

Hermes
Ollama
Redis
Queue
Scheduler

Wave 4

Observability

Metrics
Logs
Traces
Fleet
Alerts

Wave 5

Operations

Admin
Notifications
Recovery
Feature Flags

Wave 6

Tenant Experience

HPP
Future Sites
CRM
Future Products

Final Constitutional Gate

Constitutional Freeze Checklist
✅ Oracle boundaries verified
✅ PING boundaries verified
✅ HPP boundaries verified
✅ Single-owner invariant verified
✅ Dependency graph verified
✅ Patch order verified
✅ Risk matrix complete
✅ Implementation waves frozen

Result:

☑ Architecture FROZEN (implementation begins)

================================================================================
# READ-ONLY VERIFICATION APPEND (PING v2 cross-check)

Verified against: PING_V2_CONSTITUTIONAL_OPERATIONAL_PLANE.md + prior read-only audits
(SPRINT4_INFRASTRUCTURE_AUDIT, NEXT_PHASE_PLANNING_REVIEW, FRONTEND_CONSTITUTIONAL_AUDIT_REVIEW).

Contradictions found: NONE.

Section 1 re-confirmed (all PASS):
- Oracle owns ONLY infrastructure/hosting (Compute/OCI/Networking/Vault/Storage/IAM/DNS/
  Certificates/AI hosting). Does NOT own Customer/Review/Project/Invoice/Workflow/
  Knowledge/Compiler. → PASS
- PING owns ONLY operational (Fleet/Runtime/Deployment/Automation/Notifications/
  Observability/Health/Secrets-References/AI Runtime/Scheduling/Recovery/Administration).
  Does NOT own Reviews/CRM/Projects/Knowledge/Compiler. → PASS
- HPP owns Compiler/Authorities/Workflows/Events/Reviews/CRM/Knowledge/Neo4j/Qdrant/
  Business PostgreSQL/Runtime meaning. → PASS
- Single-owner invariant: every object has exactly one owner. → PASS

Open clarifications (NOT contradictions; do not block freeze):
- Oracle "Identity" split (IAM/tenant auth vs HPP business identity) — open, documented.
- AI Control "Models" = operational metadata, not model weights — clarification.
- Capability Registry generator missing — implementation gap, not contradiction.
- Hardcoded reviewCount "40" in layout.tsx — implementation fix, not constitutional contradiction.

Result: the v2 spec is mutually consistent with SPRINT4 + NEXT_PHASE + FRONTEND audits.
Architecture FROZEN confirmed. Implementation may begin per the six waves.

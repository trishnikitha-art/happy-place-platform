/**
 * Phase 1 instantiation validator.
 *
 * Runs the mission's validation checks against the instantiated graph and prints
 * a report. Graph-integrity checks (1-6) are defects; the review<->project id
 * mismatch (7) is a data-integrity finding, NOT a graph orphan, because we
 * deliberately did not link reviews to projects (see reviews.ts).
 */

import type { CanonicalBusinessObject } from "../canonical-object";
import { allObjects, projectId, serviceId } from "./index";
import services from "../../config/services.v1.json";
import projects from "../../config/projects.v1.json";
import media from "../../config/media.v1.json";
import reviews from "../../config/reviews.v1.json";

const ids = new Set(allObjects.map((o) => o.canonicalId));
const byType = new Map<string, number>();
for (const o of allObjects) byType.set(o.type, (byType.get(o.type) ?? 0) + 1);

const lines: string[] = [];
let failures = 0;
let graphFailures = 0;

function check(name: string, pass: boolean, detail: string, graph = true): void {
  lines.push(`${pass ? "PASS" : "FAIL"} — ${name}: ${detail}`);
  if (!pass) {
    failures++;
    if (graph) graphFailures++;
  }
}

function hasRel(o: CanonicalBusinessObject, kind: string, to: string): boolean {
  return o.relationships.some((r) => r.kind === kind && r.to === to);
}

// 1. No canonical ID collisions
check("No canonical ID collisions", ids.size === allObjects.length,
  `${allObjects.length} objects, ${ids.size} unique IDs`);

// 2. No orphaned relationships
const orphans: string[] = [];
for (const o of allObjects) {
  for (const r of o.relationships) {
    if (!ids.has(r.to)) orphans.push(`${o.type} -> ${r.kind} -> ${r.to}`);
  }
}
check("No orphaned relationships", orphans.length === 0,
  orphans.length ? orphans.join("; ") : "all relationship targets resolve");

// 3. Every project references an existing service
const serviceIdSet = new Set((services as { services: { id: string }[] }).services.map((s) => serviceId(s.id)));
const badProjects: string[] = [];
for (const p of (projects as { projects: { id: string; service: string }[] }).projects) {
  if (!serviceIdSet.has(serviceId(p.service))) badProjects.push(p.id);
}
check("Every project references an existing service", badProjects.length === 0,
  badProjects.length ? badProjects.join(", ") : "all projects map to a service");

// 4. Every media with a projectId references an existing project
const projectIdSet = new Set((projects as { projects: { id: string }[] }).projects.map((p) => projectId(p.id)));
const badMedia: string[] = [];
for (const m of (media as { media: { id: string; projectId?: string }[] }).media) {
  if (m.projectId && !projectIdSet.has(projectId(m.projectId))) badMedia.push(m.id);
}
check("Every media references an existing project", badMedia.length === 0,
  badMedia.length ? badMedia.join(", ") : "all media with projectId map to a project");

// 5. Bidirectional symmetry: Brand owns Service <-> Service ownedBy Brand
//    (scoped to Service targets only; Brand also owns Media via `supports`, not `ownedBy`)
const brand = allObjects.find((o) => o.type === "Brand");
if (brand) {
  const ownedServices = brand.relationships.filter((r) => {
    const t = allObjects.find((o) => o.canonicalId === r.to);
    return r.kind === "owns" && t !== undefined && t.type === "Service";
  });
  const asym: string[] = [];
  for (const r of ownedServices) {
    const svc = allObjects.find((o) => o.canonicalId === r.to);
    if (!svc || !hasRel(svc, "ownedBy", brand.canonicalId)) asym.push(r.to);
  }
  check("Brand<->Service bidirectional", asym.length === 0,
    asym.length ? asym.join(", ") : `symmetric (${ownedServices.length} services)`);
}

// 6. Project<->Service symmetry (spot check all projects)
let projSym = true;
const projSymBad: string[] = [];
for (const p of (projects as { projects: { id: string; service: string }[] }).projects) {
  const proj = allObjects.find((o) => o.canonicalId === projectId(p.id));
  const svc = allObjects.find((o) => o.canonicalId === serviceId(p.service));
  if (!proj || !svc) { projSym = false; projSymBad.push(p.id); continue; }
  if (!hasRel(proj, "belongsTo", svc.canonicalId) || !hasRel(svc, "contains", proj.canonicalId)) {
    projSym = false; projSymBad.push(p.id);
  }
}
check("Project<->Service bidirectional", projSym,
  projSymBad.length ? projSymBad.join(", ") : "symmetric for all projects");

// 7. Data-integrity: review.projectId vs Project ids (informational finding, not a graph defect)
const reviewProjectIds = (reviews as { reviews: { projectId?: string }[] }).reviews
  .map((r) => r.projectId).filter((x): x is string => typeof x === "string");
const matched = reviewProjectIds.filter((pid) => projectIdSet.has(projectId(pid))).length;
const mismatch = reviewProjectIds.filter((pid) => !projectIdSet.has(projectId(pid)));
check("Review.projectId matches a Project (seed-data integrity)", matched === reviewProjectIds.length,
  `${matched}/${reviewProjectIds.length} match; mismatched ids: ${mismatch.join(", ")} (deferred reconciliation)`, false);

lines.push("");
lines.push("Object counts: " + [...byType.entries()].map(([t, n]) => `${t}=${n}`).join(", "));
lines.push(`TOTAL OBJECTS: ${allObjects.length}`);
lines.push(`GRAPH-INTEGRITY FAILURES: ${graphFailures}`);

console.log(lines.join("\n"));

if (graphFailures > 0) {
  console.log("\nVALIDATION: FAILED (graph integrity)");
} else {
  console.log("\nVALIDATION: PASSED (graph integrity; see data-integrity notes above)");
}

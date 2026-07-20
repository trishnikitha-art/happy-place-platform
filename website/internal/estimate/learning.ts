/**
 * Estimate learning loop (P6) — the engine should start collecting statistics
 * from day one. Every estimate stores the planning range AND the eventual
 * actuals so the business learns, e.g.:
 *   "Cedar fences in Albany average X days."
 *   "Bathrooms in Corvallis usually end up ~12% above the planning range."
 * That becomes a genuine competitive advantage encoded into confidence models.
 */
import type { EstimateAnalytic } from "../sheets/schema";

export interface LearningInsight {
  dimension: string;       // e.g. "cedar-fence/albany/duration"
  observation: string;
  confidence: number;
  basedOn: number;         // sample size
}

/** Fold a completed estimate's actuals into the learning store. */
export function recordActuals(rec: EstimateAnalytic): void {
  // Persistence target: Estimate Analytics sheet via Sheets API (wired later).
  // For now this is the contract the backend calls on project completion.
  if (rec.accepted === undefined || rec.finalInvoice === undefined) return;
  // TODO(p6): append to Sheets "Estimate Analytics" with provenance.
}

/** Derive a simple insight from accumulated analytics (stub; grows with data). */
export function deriveInsights(rows: EstimateAnalytic[]): LearningInsight[] {
  const byKey = new Map<string, EstimateAnalytic[]>();
  for (const r of rows) {
    const key = `${r.requestedServices.join("+")}/${r.city}`;
    (byKey.get(key) ?? byKey.set(key, []).get(key)!).push(r);
  }
  const insights: LearningInsight[] = [];
  for (const [key, group] of byKey) {
    const completed = group.filter((g) => g.daysRequired != null);
    if (completed.length >= 3) {
      const avgDays = completed.reduce((a, g) => a + (g.daysRequired ?? 0), 0) / completed.length;
      insights.push({
        dimension: key,
        observation: `Average ${avgDays.toFixed(1)} days to complete.`,
        confidence: Math.min(0.9, 0.4 + completed.length * 0.05),
        basedOn: completed.length,
      });
    }
  }
  return insights;
}

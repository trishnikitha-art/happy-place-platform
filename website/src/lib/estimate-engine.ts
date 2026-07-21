/**
 * Estimate Engine — authoritative execution path for all estimates.
 *
 * This is the single pipeline through which every estimate must flow:
 *   EstimateRequest → PlanningContext → evaluateStrategy() → PlanningResult
 *
 * No duplicate estimators. No bypassing the strategy system.
 */

import type { ServiceSlug } from "@/config/services";
import type { PlanningContext } from "./planning-context";
import { buildPlanningContext } from "./planning-context";
import { SEEDS, type PlanningResult, type ServiceSeed, type EstimationStrategy, formatRange as formatRangeOriginal } from "./planning-range";
import { evaluateStrategy } from "./planning-strategies";

// Re-export formatRange for convenience
export { formatRangeOriginal as formatRange };

const HIGH_BIAS = 1.12; // conservative upward bias

/**
 * Estimate Engine — processes a PlanningContext and returns a PlanningResult.
 *
 * This is the authoritative estimate calculation. All estimate flows must
 * pass through this function.
 */
export function estimateEngine(context: PlanningContext): PlanningResult | null {
  const { services, answers } = context;

  if (!services.length) return null;

  let low = 0;
  let high = 0;
  const labels: string[] = [];
  const breakdown: PlanningResult["breakdown"] = [];
  const assumptions: string[] = [];
  const missingInputs: string[] = [];

  for (const service of services) {
    const seed = SEEDS[service];
    if (!seed) {
      missingInputs.push(`Unknown service: ${service}`);
      continue;
    }

    // Evaluate using the strategy system
    const result = evaluateStrategy(seed, answers, service);

    low += result.low;
    high += result.high;
    labels.push(seed.label);

    // Build breakdown entry
    breakdown.push({
      service,
      label: seed.label,
      low: result.low,
      high: result.high,
      strategy: seed.strategy ?? "flat",
      scopeUsed: result.scopeUsed,
      measurementUsed: result.measurementUsed,
    });

    // Collect reasoning as assumptions
    assumptions.push(...result.reasoning);

    // Track missing inputs
    if (result.measurementUsed === undefined && seed.strategy === "per-unit") {
      missingInputs.push(`Missing measurement for ${service}`);
    }
  }

  if (!labels.length) return null;

  // Apply conservative bias
  high = Math.round((high * HIGH_BIAS) / 100) * 100;
  low = Math.round(low / 100) * 100;

  // Compute overall confidence
  const confidence = computeOverallConfidence(breakdown);

  return {
    labels,
    low,
    high,
    note:
      "This is not an official quote. It is a conservative planning estimate based on similar Oregon projects, current material pricing, travel, permitting, and typical labor. Taylor will prepare your official estimate after reviewing your specific property.",
    breakdown,
    confidence,
    assumptions: assumptions.length > 0 ? assumptions : ["Based on typical project ranges for selected services"],
    missingInputs,
  };
}

/**
 * Convenience function: EstimateRequest → PlanningResult.
 *
 * This is the primary entry point for the wizard.
 */
export function estimateFromRequest(request: import("@/types").EstimateRequest): PlanningResult | null {
  const context = buildPlanningContext(request);
  return estimateEngine(context);
}

/**
 * Compute overall confidence based on breakdown strategies.
 */
function computeOverallConfidence(breakdown: PlanningResult["breakdown"]): "low" | "medium" | "high" {
  if (!breakdown || breakdown.length === 0) return "medium";

  const strategiesUsed = breakdown.map((b) => b.strategy);
  const anyFlat = strategiesUsed.includes("flat");
  const anyPerUnit = strategiesUsed.includes("per-unit");

  // If per-unit is used but no measurement is provided, confidence is low
  const anyMissingMeasurement = breakdown.some(
    (b) => b.strategy === "per-unit" && !b.measurementUsed
  );

  if (anyMissingMeasurement) return "low";
  if (anyFlat) return "medium";
  return "high";
}

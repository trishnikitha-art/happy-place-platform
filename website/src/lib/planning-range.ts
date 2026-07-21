/**
 * Customer-facing Preliminary Planning Range (P3 — the "planning assistant").
 *
 * This is intentionally NOT an official quote. It is a conservative planning
 * estimate biased ~12% high so the formal quote is often pleasantly lower.
 * The authoritative Oregon cost knowledge lives in /internal/knowledge (the
 * EstimateEngine). These seed figures mirror that knowledge for the live,
 * static site and are replaced by the engine once it is wired in.
 */

import type { ServiceSlug } from "@/config/services";

export type EstimationStrategy = "flat" | "per-unit" | "scope-based" | "composite";

export interface ServiceSeed {
  label: string;
  /** [low, high] planning range in dollars, before the +12% bias */
  range: [number, number];
  /** per-unit hint shown under the summary */
  unit?: { per: number; label: string };
  /** NEW — optional scope-keyed sub-ranges. Falls back to `range` if absent */
  scopeRanges?: Record<string, [number, number]>;
  /** NEW — optional per-unit rate */
  unitRate?: [number, number];
  /** NEW — optional modifiers applied multiplicatively */
  modifiers?: { id: string; label: string; multiplier: number }[];
  /** NEW — base confidence before dynamic adjustment */
  baseConfidence?: "low" | "medium" | "high";
  /** NEW — estimation strategy */
  strategy?: EstimationStrategy;
}

const SEEDS: Record<ServiceSlug, ServiceSeed> = {
  fences: { 
    label: "cedar privacy fence", 
    range: [6200, 14500], 
    unit: { per: 50, label: "linear ft" },
    strategy: "per-unit",
    unitRate: [50, 120], // $50-120 per linear ft
    scopeRanges: {
      "New fence": [8000, 18000],
      "Repair (1-3 sections)": [1500, 4000],
      "Full replacement": [7000, 16000],
    },
    baseConfidence: "high",
  },
  decks: { 
    label: "deck", 
    range: [11000, 34000], 
    unit: { per: 70, label: "sq ft" },
    strategy: "per-unit",
    unitRate: [35, 110], // $35-110 per sq ft
    scopeRanges: {
      "New build": [12000, 38000],
      "Repair / board replacement": [3000, 8000],
      "Resurface / re-stain only": [2000, 6000],
    },
    baseConfidence: "high",
  },
  pergolas: { label: "pergola / outdoor structure", range: [4500, 12000], strategy: "flat" },
  "kitchen-remodel": { 
    label: "kitchen remodel", 
    range: [18000, 55000], 
    strategy: "scope-based",
    scopeRanges: {
      "Full gut remodel": [25000, 65000],
      "Cabinets + counters": [15000, 40000],
      "Island only": [8000, 18000],
      "Flooring + paint": [10000, 25000],
      "Not sure": [18000, 55000],
    },
    baseConfidence: "high",
  },
  "bath-remodel": { 
    label: "bathroom remodel", 
    range: [9000, 28000], 
    strategy: "scope-based",
    scopeRanges: {
      "Full remodel": [12000, 35000],
      "Shower/tub only": [6000, 18000],
      "Vanity + fixtures": [5000, 15000],
      "Tile + paint": [7000, 20000],
    },
    baseConfidence: "high",
  },
  "built-ins": { 
    label: "built-ins & trim", 
    range: [2500, 9000], 
    strategy: "scope-based",
    scopeRanges: {
      "Single small piece": [1500, 5000],
      "Multi-piece project": [3000, 12000],
    },
    baseConfidence: "medium",
  },
  repairs: { label: "repair / handyman work", range: [600, 4500], strategy: "flat" },
};

const HIGH_BIAS = 1.12; // conservative upward bias

export interface PlanningResult {
  labels: string[];
  low: number;
  high: number;
  note: string;
  // NEW — breakdown, confidence, assumptions, missingInputs
  breakdown?: {
    service: ServiceSlug;
    label: string;
    low: number;
    high: number;
    strategy: EstimationStrategy;
    scopeUsed?: string;
    measurementUsed?: { answerId: string; value: number; unit: string };
  }[];
  confidence?: "low" | "medium" | "high";
  assumptions?: string[];
  missingInputs?: string[];
}

export function preliminaryRange(services: string[]): PlanningResult | null {
  const keys = services.filter((s): s is ServiceSlug => s in SEEDS);
  if (!keys.length) return null;
  let low = 0;
  let high = 0;
  const labels: string[] = [];
  const breakdown: PlanningResult["breakdown"] = [];
  
  for (const k of keys) {
    const [l, h] = SEEDS[k].range;
    low += l;
    high += h;
    labels.push(SEEDS[k].label);
    
    // Build breakdown for each service (flat strategy for now)
    breakdown.push({
      service: k,
      label: SEEDS[k].label,
      low: l,
      high: h,
      strategy: SEEDS[k].strategy ?? "flat",
    });
  }
  
  // bias the high end upward so the formal quote reads as a pleasant surprise
  high = Math.round((high * HIGH_BIAS) / 100) * 100;
  low = Math.round(low / 100) * 100;
  
  // Compute confidence based on strategies used
  const confidence = computeConfidence(breakdown);
  
  return {
    labels,
    low,
    high,
    note:
      "This is not an official quote. It is a conservative planning estimate based on similar Oregon projects, current material pricing, travel, permitting, and typical labor. Taylor will prepare your official estimate after reviewing your specific property.",
    breakdown,
    confidence,
    assumptions: ["Based on typical project ranges for selected services"],
    missingInputs: [],
  };
}

/**
 * Compute confidence based on strategies used in the breakdown.
 * - "low": if any per-unit strategy is missing a measurement
 * - "medium": if any flat strategy is used
 * - "high": if every service resolved via scope or real measurement
 */
function computeConfidence(breakdown: PlanningResult["breakdown"]): "low" | "medium" | "high" {
  if (!breakdown || breakdown.length === 0) return "medium";
  
  const strategiesUsed = breakdown.map(b => b.strategy);
  const anyFlat = strategiesUsed.includes("flat");
  const anyPerUnit = strategiesUsed.includes("per-unit");
  
  // If per-unit is used but no measurement is provided, confidence is low
  const anyMissingMeasurement = breakdown.some(
    b => b.strategy === "per-unit" && !b.measurementUsed
  );
  
  if (anyMissingMeasurement) return "low";
  if (anyFlat) return "medium";
  return "high"; // every contributing service resolved via scope or real measurement
}

export function formatRange(n: number): string {
  return "$" + n.toLocaleString("en-US");
}

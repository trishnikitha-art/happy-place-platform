/**
 * Customer-facing Preliminary Planning Range (P3 — the "planning assistant").
 *
 * This is intentionally NOT an official quote. It is a conservative planning
 * estimate biased ~12% high so the formal quote is often pleasantly lower.
 * The authoritative Oregon cost knowledge lives in /internal/knowledge (the
 * EstimateEngine). These seed figures mirror that knowledge for the live,
 * static site and are replaced by the engine once it is wired in.
 */

type ServiceKey =
  | "fences"
  | "decks"
  | "pergolas"
  | "kitchen"
  | "bathroom"
  | "builtins"
  | "repairs";

interface ServiceSeed {
  label: string;
  /** [low, high] planning range in dollars, before the +12% bias */
  range: [number, number];
  /** per-unit hint shown under the summary */
  unit?: { per: number; label: string };
}

const SEEDS: Record<ServiceKey, ServiceSeed> = {
  fences: { label: "cedar privacy fence", range: [6200, 14500], unit: { per: 50, label: "linear ft" } },
  decks: { label: "deck", range: [11000, 34000], unit: { per: 70, label: "sq ft" } },
  pergolas: { label: "pergola / outdoor structure", range: [4500, 12000] },
  kitchen: { label: "kitchen remodel", range: [18000, 55000] },
  bathroom: { label: "bathroom remodel", range: [9000, 28000] },
  builtins: { label: "built-ins & trim", range: [2500, 9000] },
  repairs: { label: "repair / handyman work", range: [600, 4500] },
};

const HIGH_BIAS = 1.12; // conservative upward bias

export interface PlanningResult {
  labels: string[];
  low: number;
  high: number;
  note: string;
}

export function preliminaryRange(services: string[]): PlanningResult | null {
  const keys = services.filter((s): s is ServiceKey => s in SEEDS);
  if (!keys.length) return null;
  let low = 0;
  let high = 0;
  const labels: string[] = [];
  for (const k of keys) {
    const [l, h] = SEEDS[k].range;
    low += l;
    high += h;
    labels.push(SEEDS[k].label);
  }
  // bias the high end upward so the formal quote reads as a pleasant surprise
  high = Math.round((high * HIGH_BIAS) / 100) * 100;
  low = Math.round(low / 100) * 100;
  return {
    labels,
    low,
    high,
    note:
      "This is not an official quote. It is a conservative planning estimate based on similar Oregon projects, current material pricing, travel, permitting, and typical labor. Taylor will prepare your official estimate after reviewing your specific property.",
  };
}

export function formatRange(n: number): string {
  return "$" + n.toLocaleString("en-US");
}

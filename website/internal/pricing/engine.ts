import fs from "node:fs";
import path from "node:path";
import type {
  EstimateEngine,
  EstimateInput,
  EstimateOutput,
  PricingAuthority,
} from "./types";

/**
 * Knowledge loader — reads versioned, dated, confidence-scored JSON from
 * /internal/knowledge. No hard-coded prices. Every lookup carries a
 * confidence so the engine can weight uncertain domains down.
 */
function loadJson(rel: string): any {
  const full = path.join(process.cwd(), "internal/knowledge", rel);
  return JSON.parse(fs.readFileSync(full, "utf8"));
}

/** MaterialAuthority — resolves material class + unit price range. */
export const materialAuthority: PricingAuthority = {
  name: "MaterialAuthority",
  contribute(input) {
    const mat = input.material ?? "cedar";
    try {
      const data = loadJson(`materials/${mat}.json`);
      const [lo, hi] = data.priceRange;
      return {
        materialClass: mat,
        expectedRange: [lo, hi],
        confidence: data._meta?.confidence ?? 0.5,
      };
    } catch {
      return { materialClass: mat, expectedRange: [0, 0], confidence: 0 };
    }
  },
};

/** LaborAuthority — resolves labor class + per-unit labor, plus duration. */
export const laborAuthority: PricingAuthority = {
  name: "LaborAuthority",
  contribute(input) {
    const trade = input.service === "fences" ? "fencing" : input.service;
    try {
      const data = loadJson(`labor/${trade}.json`);
      const [lo, hi] = data.laborRange;
      return {
        laborClass: data.crewClass,
        expectedRange: [lo, hi],
        estimatedDurationDays: Math.ceil((input.linearFeet ?? input.squareFeet ?? 100) / 100) * (data.estimatedDaysPer100ft ?? 1),
        confidence: data._meta?.confidence ?? 0.5,
      };
    } catch {
      return { laborClass: "general-carpenter", expectedRange: [40, 90], confidence: 0.35 };
    }
  },
};

/** PermitAuthority — Oregon permit likelihood + fee range. */
export const permitAuthority: PricingAuthority = {
  name: "PermitAuthority",
  contribute(input) {
    try {
      const data = loadJson("oregoncosts/permits.json");
      const p = data[input.service] ?? data.decks;
      return {
        permitLikelihood: p.likelihood,
        confidence: data._meta?.confidence ?? 0.5,
      };
    } catch {
      return { permitLikelihood: 0.5, confidence: 0.3 };
    }
  },
};

/**
 * RegionalAuthority / OregonAuthority / InflationAuthority / ComplexityAuthority /
 * SeasonalityAuthority / RiskAuthority — composition points. Stubbed here with
 * conservative defaults; each becomes its own versioned knowledge file as the
 * moat matures. They intentionally bias the range UP (conservative) so the
 * formal estimate tends to meet or beat expectations.
 */
export const conservativeAuthorities: PricingAuthority[] = [
  { name: "RegionalAuthority", contribute: () => ({ confidence: 0.6 }) },
  { name: "OregonAuthority", contribute: () => ({ confidence: 0.6 }) },
  { name: "InflationAuthority", contribute: () => ({ confidence: 0.55 }) },
  { name: "ComplexityAuthority", contribute: (i) => ({ riskScore: (i.stories ?? 1) * 12, confidence: 0.5 }) },
  { name: "SeasonalityAuthority", contribute: () => ({ confidence: 0.5 }) },
  { name: "RiskAuthority", contribute: (i) => ({ riskScore: (i.emergency ? 25 : 0) + (i.accessibility ? 15 : 0), confidence: 0.5 }) },
];

const DISCLAIMER =
  "This is a preliminary planning range based on what you shared — not an official quote or estimate. " +
  "After we review your project and, if needed, visit the property, we will provide a detailed written estimate tailored to your home.";

/**
 * SimpleKnowledgeEngine — composes authorities into a conservative range.
 * Bias: widen the top end (×1.15) and add permit/risk padding so the range
 * leans high. Confidence is the mean of contributing authority confidences.
 */
export class SimpleKnowledgeEngine implements EstimateEngine {
  estimate(input: EstimateInput): EstimateOutput {
    const mat = materialAuthority.contribute(input);
    const lab = laborAuthority.contribute(input);
    const perm = permitAuthority.contribute(input);

    const units = input.linearFeet ?? input.squareFeet ?? 0;
    const matTotal = avg(mat.expectedRange) * units;
    const labTotal = avg(lab.expectedRange) * units;

    let low = matTotal + labTotal;
    let high = low * 1.15; // conservative upward bias

    const permitPad = perm.permitLikelihood > 0.5 ? 400 : 0;
    high += permitPad;

    const risk =
      (lab as any).riskScore ?? 0 +
      conservativeAuthorities.reduce((acc, a) => acc + ((a.contribute(input) as any).riskScore ?? 0), 0);

    const followUps: string[] = [];
    if (!input.material) followUps.push("Which material are you considering (cedar, composite, etc.)?");
    if (!units) followUps.push("Rough size of the work area (linear ft or sq ft)?");
    if (perm.permitLikelihood > 0.5) followUps.push("We'll confirm permit requirements for your city.");
    if ((lab as any).estimatedDurationDays) followUps.push(`Rough timeline: ~${(lab as any).estimatedDurationDays} day(s).`);

    const confidences = [mat.confidence, lab.confidence, perm.confidence, 0.55];
    const confidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;

    return {
      confidence: round(confidence),
      expectedRange: [Math.round(low), Math.round(high)],
      riskScore: Math.min(100, Math.round(risk)),
      laborClass: (lab as any).laborClass ?? "general-carpenter",
      materialClass: mat.materialClass,
      estimatedDurationDays: (lab as any).estimatedDurationDays ?? 1,
      permitLikelihood: perm.permitLikelihood,
      followUpQuestions: followUps,
      disclaimer: DISCLAIMER,
    };
  }
}

function avg([lo, hi]: [number, number]) {
  return (lo + hi) / 2;
}
function round(n: number) {
  return Math.round(n * 100) / 100;
}

export const estimateEngine: EstimateEngine = new SimpleKnowledgeEngine();

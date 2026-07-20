/**
 * EstimateEngine — the knowledge-based quoting core (P2 moat).
 *
 * This lives in /internal, completely separate from the public marketing site.
 * The frontend (src/) never imports from here. When the backend matures, the
 * /api/estimate route swaps its mock transport for a call into this engine and
 * returns a confidence-based RANGE (not a fake-precise bid).
 *
 * Design: every number is a probability, never a promise. Outputs are
 * deliberately conservative (biased toward the higher end) so the eventual
 * formal estimate is more likely to meet or beat expectations.
 */

export interface EstimateInput {
  service: string;            // Service.slug
  material?: string;          // e.g. "cedar", "trex", "pressure-treated"
  linearFeet?: number;        // fencing / linear work
  squareFeet?: number;        // decks / flooring / pergola footprint
  stories?: number;           // elevated decks, multi-story
  emergency?: boolean;
  accessibility?: boolean;    // ADA / accessibility scope
  finishLevel?: "standard" | "premium" | "luxury";
  demolition?: boolean;
  permits?: boolean;
  zip?: string;
  city?: string;
  photos?: number;
  notes?: string;
}

export interface EstimateOutput {
  confidence: number;         // 0–1 — how much we trust the range
  expectedRange: [number, number]; // conservative planning range, USD
  riskScore: number;          // 0–100
  laborClass: string;         // e.g. "fencing-crew", "finish-carpenter"
  materialClass: string;      // e.g. "cedar", "composite"
  estimatedDurationDays: number;
  permitLikelihood: number;   // 0–1
  followUpQuestions: string[];
  disclaimer: string;         // legal-safe language
}

export interface PricingAuthority {
  readonly name: string;
  /** Returns a confidence-weighted factor or range for its domain. */
  contribute(input: EstimateInput): Partial<EstimateOutput> & { confidence: number };
}

export interface EstimateEngine {
  estimate(input: EstimateInput): EstimateOutput;
}

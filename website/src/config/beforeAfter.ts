import type { BeforeAfterPair } from "@/components/before-after-slider";

/**
 * Before/After pairs — grouped for the slider feature.
 *
 * No real before/after photos available yet. Empty array until real photography
 * is added to the pipeline and assigned Before/After roles in presentation.v1.json.
 *
 * Future: When real before/after photos arrive, add Before/After roles to
 * presentation.v1.json and migrate this file to use media.ts.
 */
export const beforeAfterPairs: BeforeAfterPair[] = [];

export function getBeforeAfterByService(slug: string): BeforeAfterPair[] {
  return beforeAfterPairs.filter((p) => p.service === slug);
}

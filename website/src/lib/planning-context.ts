/**
 * Planning Context — structured input for the planning engine.
 *
 * This module defines the shape of planning requests and provides a builder
 * function to construct PlanningContext from EstimateRequest.
 */

import type { ServiceSlug } from "@/config/services";

export interface PlanningContext {
  services: ServiceSlug[];
  answers: Record<string, string | boolean | number>;
  property?: { city?: string; county?: string };
  // Reserved for future enrichment — present in the type now so later phases
  // are additive, not breaking:
  materials?: Record<ServiceSlug, string>;
  regionalMultiplier?: number;
  historicalAdjustment?: number;
}

export interface EstimateRequest {
  services: string[];
  answers: Record<string, string | boolean | number>;
  property: { city?: string; county?: string };
}

export function buildPlanningContext(req: EstimateRequest): PlanningContext {
  return {
    services: req.services.filter((s): s is ServiceSlug => {
      // Filter to valid service slugs — this will be validated by the engine
      return typeof s === "string" && s.length > 0;
    }),
    answers: req.answers,
    property: { city: req.property.city, county: req.property.county },
  };
}

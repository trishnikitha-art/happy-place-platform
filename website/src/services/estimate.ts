import type { EstimateRequest } from "@/types";
import { company } from "@/config/company";
import { getService } from "@/config/services";

/**
 * Estimate submission service — INTERFACE.
 *
 * The MVP submits via email (mailto). Later, swap the implementation (e.g.
 * `submitEstimateApi`) WITHOUT touching any component — components depend on
 * this interface only. This is the single swap point mandated by Directive 021.
 */
export interface EstimateService {
  /** Build a shareable submission (mailto link today; API payload later). */
  prepare(request: EstimateRequest): { kind: "mailto"; href: string } | { kind: "api"; body: unknown };
}

function answersToText(req: EstimateRequest): string {
  const svc = getService(req.service);
  const lines: string[] = [];
  for (const [key, val] of Object.entries(req.answers)) {
    const q = svc?.estimateQuestions.find((q) => q.id === key);
    lines.push(`- ${q?.label ?? key}: ${val}`);
  }
  return lines.join("\n");
}

function photoText(req: EstimateRequest): string {
  if (!req.photos.length) return "(no photos attached)";
  return req.photos.map((p) => `  • ${p.name} (${p.size} bytes)`).join("\n");
}

/** Default mock implementation: composes a mailto: link to the business inbox. */
export const mockEstimateService: EstimateService = {
  prepare(req) {
    const svc = getService(req.service);
    const subject = `Estimate request: ${svc?.title ?? req.service}`;
    const body = [
      `New estimate request from ${req.customer.name}`,
      ``,
      `CONTACT`,
      `  Name:    ${req.customer.name}`,
      `  Email:   ${req.customer.email}`,
      `  Phone:   ${req.customer.phone}`,
      ``,
      `PROPERTY`,
      `  Address: ${req.property.address || "(not provided)"}`,
      `  City:    ${req.property.city}`,
      `  County:  ${req.property.county}`,
      `  Details: ${req.property.details || "-"}`,
      ``,
      `SERVICE: ${svc?.title ?? req.service}`,
      ``,
      `ANSWERS`,
      answersToText(req),
      ``,
      `PHOTOS (${req.photos.length})`,
      photoText(req),
      ``,
      `NOTES: ${req.notes || "-"}`,
    ].join("\n");

    const href = `mailto:${company.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    return { kind: "mailto", href };
  },
};

// The active service. Swap this single line to change transport.
export const estimateService: EstimateService = mockEstimateService;

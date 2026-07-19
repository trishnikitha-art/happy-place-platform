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
  /**
   * Submit the request. UI calls this and awaits a uniform result — identical
   * to the future API workflow. Today it opens the user's mail client. When a
   * backend exists, swap this implementation to POST; the wizard does not change.
   */
  submit(request: EstimateRequest): Promise<EstimateSubmitResult>;
}

export interface EstimateSubmitResult {
  ok: boolean;
  /** transport actually used, for analytics/telemetry */
  transport: "mailto" | "api";
  message?: string;
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

  async submit(req) {
    const prepared = this.prepare(req);
    if (prepared.kind === "mailto") {
      if (typeof window !== "undefined") {
        window.location.href = prepared.href;
      }
      return { ok: true, transport: "mailto", message: "Opened email client with your request." };
    }
    // Future API path — not used in the MVP. Swap this implementation to POST.
    return { ok: true, transport: "api" };
  },
};

// The active service. Swap this single line to change transport.
export const estimateService: EstimateService = mockEstimateService;

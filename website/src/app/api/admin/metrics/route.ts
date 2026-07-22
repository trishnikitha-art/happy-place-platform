/**
 * Admin Metrics API Endpoint
 * 
 * Returns the canonical Metrics object for the admin dashboard.
 * 
 * GET /api/admin/metrics
 * 
 * This endpoint:
 * - Runs validation engine to get Findings
 * - Runs analysis engine to get AnalysisResults
 * - Aggregates both into Metrics
 * - Returns Metrics as JSON
 * 
 * No calculations in the dashboard - everything happens here.
 */

import { NextResponse } from "next/server";
import { loadMediaManifest } from "@/lib/media";
import { loadProjectsManifest } from "@/lib/projects";
import { loadReviewsManifest } from "@/lib/reviews";
import { loadBrandManifest } from "@/lib/brand";
import { loadServicesRegistry } from "@/lib/registries";
import { validateAllAuthorities } from "@/lib/validation-engine";
import { analyzeAll } from "@/lib/analysis";
import { generateMetrics } from "@/lib/metrics";

export async function GET() {
  try {
    // Load all authorities
    const media = loadMediaManifest();
    const projects = loadProjectsManifest();
    const reviews = loadReviewsManifest();
    const brand = loadBrandManifest();
    const services = loadServicesRegistry();

    // Run validation engine
    const findings = validateAllAuthorities({
      media,
      projects,
      reviews,
      brand,
      services,
    });

    // Run analysis engine
    const analysis = analyzeAll({
      media,
      projects,
      reviews,
      brand,
    });

    // Generate metrics
    const metrics = generateMetrics({
      analysis,
      findings,
    });

    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Error generating metrics:", error);
    return NextResponse.json(
      { error: "Failed to generate metrics" },
      { status: 500 }
    );
  }
}

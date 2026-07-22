/**
 * Authority Reporting System (Deprecated)
 * 
 * This file is deprecated in favor of the new Metrics Engine.
 * Use src/lib/metrics.ts instead.
 * 
 * Architecture: Authority → Validation Engine → Findings → Analysis Engine → Metrics Engine → Health Score
 * 
 * @deprecated Use generateMetrics() from src/lib/metrics.ts instead
 */

import type { MediaManifest } from "@/types/media";
import type { ProjectsManifest } from "@/types/projects";
import type { ReviewsManifest } from "@/types/reviews";
import type { BrandManifest } from "@/types/brand";
import { generateMetrics } from "./metrics";
import { validateAllAuthorities } from "./validation-engine";
import { analyzeAll } from "./analysis";

/**
 * Generate all reports (deprecated - use Metrics Engine instead)
 * 
 * @deprecated Use generateMetrics() from src/lib/metrics.ts
 */
export function generateAllReports({
  media,
  projects,
  reviews,
  brand
}: {
  media: MediaManifest;
  projects: ProjectsManifest;
  reviews: ReviewsManifest;
  brand: BrandManifest;
}) {
  // Use the new Metrics Engine
  const analysis = analyzeAll({ media, projects, reviews, brand });
  const findings = validateAllAuthorities({ media, projects, reviews, brand });
  const metrics = generateMetrics({ analysis, findings });

  // Return legacy format for backward compatibility
  return {
    repositoryHealth: {
      overallHealth: metrics.repository.overallHealth,
      healthScore: metrics.health.score,
      healthCategory: metrics.health.category,
      authorities: [
        { name: "Media Authority", status: metrics.media.health as any, recordCount: metrics.media.total, issues: [], lastUpdated: new Date().toISOString(), score: metrics.media.score },
        { name: "Projects Authority", status: metrics.projects.health as any, recordCount: metrics.projects.total, issues: [], lastUpdated: new Date().toISOString(), score: metrics.projects.score },
        { name: "Reviews Authority", status: metrics.reviews.health as any, recordCount: metrics.reviews.total, issues: [], lastUpdated: new Date().toISOString(), score: metrics.reviews.score },
        { name: "Brand Authority", status: metrics.brand.health as any, recordCount: 1, issues: [], lastUpdated: new Date().toISOString(), score: metrics.brand.score },
      ],
      lastGenerated: metrics.timestamp,
      summary: {
        totalAuthorities: metrics.repository.totalAuthorities,
        healthyAuthorities: metrics.repository.healthyAuthorities,
        warningAuthorities: metrics.repository.warningAuthorities,
        criticalAuthorities: metrics.repository.criticalAuthorities,
      },
    },
    mediaCoverage: {
      totalProjects: metrics.projects.total,
      projectsWithHero: metrics.projects.total - metrics.projects.missingHero,
      projectsWithBeforeAfter: metrics.projects.withBeforeAfter,
      projectsWithGallery: metrics.projects.withGallery,
      coveragePercentage: metrics.projects.heroCoverage,
      missingMedia: [],
    },
    seoCoverage: {
      totalProjects: metrics.projects.total,
      projectsWithSlug: metrics.projects.total - metrics.projects.missingSlug,
      projectsWithTitle: metrics.projects.total,
      projectsWithDescription: metrics.projects.total - metrics.projects.missingSeoDescription,
      coveragePercentage: 100 - (metrics.projects.missingSeoDescription / metrics.projects.total * 100),
      missingSEO: [],
    },
    accessibilityHealth: {
      totalMedia: metrics.media.total,
      mediaWithAltText: metrics.media.total - metrics.media.missingAltText,
      altTextCoverage: metrics.media.altTextCoverage,
      missingAltText: [],
      score: metrics.media.altTextCoverage,
    },
    performanceHealth: {
      totalMedia: metrics.media.total,
      mediaWithWebVariant: metrics.media.total - metrics.media.missingWebVariant,
      mediaWithThumbnail: metrics.media.total - metrics.media.missingThumbnail,
      mediaWithBlurPlaceholder: metrics.media.total - metrics.media.missingBlurPlaceholder,
      webVariantCoverage: 100 - (metrics.media.missingWebVariant / metrics.media.total * 100),
      thumbnailCoverage: 100 - (metrics.media.missingThumbnail / metrics.media.total * 100),
      blurPlaceholderCoverage: 100 - (metrics.media.missingBlurPlaceholder / metrics.media.total * 100),
      score: metrics.media.score,
    },
    contentCoverage: {
      serviceCoverage: {
        totalServices: 0,
        servicesWithProjects: 0,
        coveragePercentage: 0,
        missingServices: [],
      },
      homepageCoverage: {
        homepageEligibleProjects: metrics.projects.homepageEligible,
        featuredProjects: metrics.projects.featured,
        homepageHeroConfigured: metrics.brand.hasHomepageHero,
      },
      reviewCoverage: {
        completedProjects: metrics.projects.total,
        projectsWithReviews: 0,
        coveragePercentage: 0,
        projectsWithoutReviews: [],
      },
      overallScore: metrics.health.score,
    },
    automationStatus: {
      googleDriveSync: {
        enabled: false,
        status: "inactive" as const,
      },
      variantGeneration: {
        totalMedia: metrics.media.total,
        mediaWithVariants: metrics.media.total - metrics.media.missingVariants,
        coveragePercentage: metrics.media.variantCoverage,
      },
      exifExtraction: {
        totalMedia: metrics.media.total,
        mediaWithExif: 0,
        coveragePercentage: 0,
      },
      overallStatus: "offline" as const,
    },
    brokenReferences: {
      orphanedMedia: [String(metrics.media.orphaned)],
      unusedProjects: [String(metrics.projects.unused)],
      brokenMediaReferences: [],
      brokenProjectReferences: [],
      totalIssues: metrics.media.orphaned + metrics.projects.unused,
      score: 100 - (metrics.media.orphaned + metrics.projects.unused) * 5,
    },
    generatedAt: metrics.timestamp,
  };
}

/**
 * Metrics Engine
 * 
 * Aggregates Findings and Analysis Results into unified Metrics.
 * This replaces the multiple report interfaces with a single, coherent metrics system.
 * 
 * Architecture: Authorities → Validation Engine → Findings → Analysis Engine → Metrics Engine → Health Score → Dashboard
 */

import type { AnalysisResults } from "./analysis";
import type { Finding, FindingsSummary } from "./findings";
import { loadHealthRules, checkThreshold } from "./health-rules";
import { calculateHealthScore, summarizeFindings } from "./findings";

export interface Metrics {
  repository: RepositoryMetrics;
  media: MediaMetrics;
  projects: ProjectMetrics;
  reviews: ReviewMetrics;
  brand: BrandMetrics;
  health: HealthMetrics;
  timestamp: string;
}

export interface RepositoryMetrics {
  totalAuthorities: number;
  healthyAuthorities: number;
  warningAuthorities: number;
  criticalAuthorities: number;
  overallHealth: "healthy" | "warning" | "critical";
}

export interface MediaMetrics {
  total: number;
  missingAltText: number;
  missingVariants: number;
  missingWebVariant: number;
  missingThumbnail: number;
  missingBlurPlaceholder: number;
  orphaned: number;
  invalidOrientation: number;
  brokenUrls: number;
  altTextCoverage: number;
  variantCoverage: number;
  health: "healthy" | "warning" | "critical";
  score: number;
}

export interface ProjectMetrics {
  total: number;
  byStatus: Record<string, number>;
  byService: Record<string, number>;
  missingHero: number;
  missingStory: number;
  missingLocation: number;
  missingSlug: number;
  missingSeoDescription: number;
  unused: number;
  featured: number;
  homepageEligible: number;
  withBeforeAfter: number;
  withGallery: number;
  heroCoverage: number;
  storyCoverage: number;
  health: "healthy" | "warning" | "critical";
  score: number;
}

export interface ReviewMetrics {
  total: number;
  missingRating: number;
  missingBody: number;
  missingProjectReference: number;
  byRating: Record<number, number>;
  bySource: Record<string, number>;
  averageRating: number;
  ratingCoverage: number;
  health: "healthy" | "warning" | "critical";
  score: number;
}

export interface BrandMetrics {
  hasHomepageHero: boolean;
  hasOwnerPortrait: boolean;
  homepageHeroMediaId?: string | null;
  ownerPortraitMediaId?: string | null;
  health: "healthy" | "warning" | "critical";
  score: number;
}

export interface HealthMetrics {
  score: number;
  category: "excellent" | "good" | "fair" | "poor";
  breakdown: {
    repository: number;
    media: number;
    projects: number;
    reviews: number;
    brand: number;
  };
  findings: FindingsSummary;
}

/**
 * Generate metrics from analysis results and findings
 */
export function generateMetrics({
  analysis,
  findings,
}: {
  analysis: AnalysisResults;
  findings: Finding[];
}): Metrics {
  const rules = loadHealthRules();

  // Repository metrics
  const repositoryMetrics = generateRepositoryMetrics(analysis, findings, rules);

  // Media metrics
  const mediaMetrics = generateMediaMetrics(analysis.media, findings, rules);

  // Project metrics
  const projectMetrics = generateProjectMetrics(analysis.projects, findings, rules);

  // Review metrics
  const reviewMetrics = generateReviewMetrics(analysis.reviews, findings, rules);

  // Brand metrics
  const brandMetrics = generateBrandMetrics(analysis.brand, findings, rules);

  // Health metrics
  const findingsSummary = summarizeFindings(findings);
  const healthScoreResult = calculateHealthScore(findings);

  const healthMetrics: HealthMetrics = {
    score: healthScoreResult.score,
    category: healthScoreResult.category,
    breakdown: {
      repository: repositoryMetrics.overallHealth === "healthy" ? 100 : repositoryMetrics.overallHealth === "warning" ? 70 : 40,
      media: mediaMetrics.score,
      projects: projectMetrics.score,
      reviews: reviewMetrics.score,
      brand: brandMetrics.score,
    },
    findings: findingsSummary,
  };

  return {
    repository: repositoryMetrics,
    media: mediaMetrics,
    projects: projectMetrics,
    reviews: reviewMetrics,
    brand: brandMetrics,
    health: healthMetrics,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Generate repository metrics
 */
function generateRepositoryMetrics(
  analysis: AnalysisResults,
  findings: Finding[],
  rules: any
): RepositoryMetrics {
  const authorityScores = {
    media: analysis.media.total > 0 ? 100 : 0,
    projects: analysis.projects.total > 0 ? 100 : 0,
    reviews: analysis.reviews.total > 0 ? 100 : 0,
    brand: analysis.brand.hasHomepageHero && analysis.brand.hasOwnerPortrait ? 100 : 0,
  };

  const healthyCount = Object.values(authorityScores).filter(s => s >= 90).length;
  const warningCount = Object.values(authorityScores).filter(s => s >= 70 && s < 90).length;
  const criticalCount = Object.values(authorityScores).filter(s => s < 70).length;

  let overallHealth: "healthy" | "warning" | "critical";
  if (criticalCount > 0) overallHealth = "critical";
  else if (warningCount > 0) overallHealth = "warning";
  else overallHealth = "healthy";

  return {
    totalAuthorities: 4,
    healthyAuthorities: healthyCount,
    warningAuthorities: warningCount,
    criticalAuthorities: criticalCount,
    overallHealth,
  };
}

/**
 * Generate media metrics
 */
function generateMediaMetrics(
  analysis: any,
  findings: Finding[],
  rules: any
): MediaMetrics {
  const total = analysis.total;
  const altTextCoverage = total > 0 ? ((total - analysis.missingAltText) / total) * 100 : 0;
  const variantCoverage = total > 0 ? ((total - analysis.missingVariants) / total) * 100 : 0;

  // Determine health based on rules
  const altTextThreshold = checkThreshold(analysis.missingAltText, total, rules.media.missingAltText);
  const variantsThreshold = checkThreshold(analysis.missingVariants, total, rules.media.missingVariants);

  let health: "healthy" | "warning" | "critical";
  if (altTextThreshold === "critical" || variantsThreshold === "critical") {
    health = "critical";
  } else if (altTextThreshold === "warning" || variantsThreshold === "warning") {
    health = "warning";
  } else {
    health = "healthy";
  }

  // Calculate score
  let score = 100;
  score -= (analysis.missingAltText / total) * 40;
  score -= (analysis.missingVariants / total) * 30;
  score -= (analysis.orphaned / total) * 30;
  score = Math.max(0, Math.round(score));

  return {
    total,
    missingAltText: analysis.missingAltText,
    missingVariants: analysis.missingVariants,
    missingWebVariant: analysis.missingWebVariant,
    missingThumbnail: analysis.missingThumbnail,
    missingBlurPlaceholder: analysis.missingBlurPlaceholder,
    orphaned: analysis.orphaned,
    invalidOrientation: analysis.invalidOrientation,
    brokenUrls: analysis.brokenUrls,
    altTextCoverage: Math.round(altTextCoverage),
    variantCoverage: Math.round(variantCoverage),
    health,
    score,
  };
}

/**
 * Generate project metrics
 */
function generateProjectMetrics(
  analysis: any,
  findings: Finding[],
  rules: any
): ProjectMetrics {
  const total = analysis.total;
  const heroCoverage = total > 0 ? ((total - analysis.missingHero) / total) * 100 : 0;
  const storyCoverage = total > 0 ? ((total - analysis.missingStory) / total) * 100 : 0;

  // Determine health based on rules
  const heroThreshold = checkThreshold(analysis.missingHero, total, rules.projects.missingHero);
  const storyThreshold = checkThreshold(analysis.missingStory, total, rules.projects.missingStory);

  let health: "healthy" | "warning" | "critical";
  if (heroThreshold === "critical" || storyThreshold === "critical") {
    health = "critical";
  } else if (heroThreshold === "warning" || storyThreshold === "warning") {
    health = "warning";
  } else {
    health = "healthy";
  }

  // Calculate score
  let score = 100;
  score -= (analysis.missingHero / total) * 40;
  score -= (analysis.missingStory / total) * 30;
  score -= (analysis.unused / total) * 30;
  score = Math.max(0, Math.round(score));

  return {
    total,
    byStatus: analysis.byStatus,
    byService: analysis.byService,
    missingHero: analysis.missingHero,
    missingStory: analysis.missingStory,
    missingLocation: analysis.missingLocation,
    missingSlug: analysis.missingSlug,
    missingSeoDescription: analysis.missingSeoDescription,
    unused: analysis.unused,
    featured: analysis.featured,
    homepageEligible: analysis.homepageEligible,
    withBeforeAfter: analysis.withBeforeAfter,
    withGallery: analysis.withGallery,
    heroCoverage: Math.round(heroCoverage),
    storyCoverage: Math.round(storyCoverage),
    health,
    score,
  };
}

/**
 * Generate review metrics
 */
function generateReviewMetrics(
  analysis: any,
  findings: Finding[],
  rules: any
): ReviewMetrics {
  const total = analysis.total;
  const ratingCoverage = total > 0 ? ((total - analysis.missingRating) / total) * 100 : 0;

  // Determine health based on rules
  const ratingThreshold = checkThreshold(analysis.missingRating, total, rules.reviews.missingRating);

  let health: "healthy" | "warning" | "critical";
  if (ratingThreshold === "critical") {
    health = "critical";
  } else if (ratingThreshold === "warning") {
    health = "warning";
  } else {
    health = "healthy";
  }

  // Calculate score
  let score = 100;
  score -= (analysis.missingRating / total) * 50;
  score -= (analysis.missingBody / total) * 50;
  score = Math.max(0, Math.round(score));

  return {
    total,
    missingRating: analysis.missingRating,
    missingBody: analysis.missingBody,
    missingProjectReference: analysis.missingProjectReference,
    byRating: analysis.byRating,
    bySource: analysis.bySource,
    averageRating: Math.round(analysis.averageRating * 10) / 10,
    ratingCoverage: Math.round(ratingCoverage),
    health,
    score,
  };
}

/**
 * Generate brand metrics
 */
function generateBrandMetrics(
  analysis: any,
  findings: Finding[],
  rules: any
): BrandMetrics {
  const hasHomepageHero = analysis.hasHomepageHero;
  const hasOwnerPortrait = analysis.hasOwnerPortrait;

  let health: "healthy" | "warning" | "critical" = "healthy";
  let score = 100;

  if (!hasHomepageHero) {
    health = "critical";
    score -= 50;
  }
  if (!hasOwnerPortrait) {
    health = "critical";
    score -= 50;
  }

  if (hasHomepageHero && hasOwnerPortrait) {
    health = "healthy";
  }

  score = Math.max(0, score);

  return {
    hasHomepageHero,
    hasOwnerPortrait,
    homepageHeroMediaId: analysis.homepageHeroMediaId,
    ownerPortraitMediaId: analysis.ownerPortraitMediaId,
    health,
    score,
  };
}

/**
 * Recommendation Engine - Takes Evidence, produces ranked options
 * 
 * This is the actual engine that derives recommendations from evidence.
 * It produces ranked options, not just a single fabricated recommendation.
 * 
 * Pipeline:
 * Evidence Package
 * ↓
 * Recommendation Engine
 * ↓
 * Ranked Options
 * ↓
 * Top Option
 */

import type { EvidencePackage } from '../intelligence/IntelligenceWorker';

export interface RecommendationOption {
  id: string;
  action: string;
  confidence: number;
  reasoning: string;
  evidenceId: string;
  rank: number;
  score: number;
  timestamp: string;
}

export interface RecommendationResult {
  topOption: RecommendationOption;
  allOptions: RecommendationOption[];
  generatedAt: string;
}

export interface RecommendationStrategy {
  name: string;
  generateOptions(evidence: EvidencePackage): RecommendationOption[];
}

export class RecommendationEngine {
  private strategies: Map<string, RecommendationStrategy> = new Map();

  constructor() {
    this.registerDefaultStrategies();
  }

  // Register recommendation strategy
  registerStrategy(strategy: RecommendationStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  // Generate recommendations from evidence
  async generateRecommendations(evidence: EvidencePackage): Promise<RecommendationResult> {
    // Generate options from all registered strategies
    const allOptions: RecommendationOption[] = [];

    for (const strategy of this.strategies.values()) {
      const options = strategy.generateOptions(evidence);
      allOptions.push(...options);
    }

    // Rank options by score
    const rankedOptions = this.rankOptions(allOptions);

    // Return top option and all ranked options
    return {
      topOption: rankedOptions[0],
      allOptions: rankedOptions,
      generatedAt: new Date().toISOString()
    };
  }

  // Rank options by score
  private rankOptions(options: RecommendationOption[]): RecommendationOption[] {
    return options
      .map((option, index) => ({
        ...option,
        rank: index + 1,
        score: this.calculateScore(option)
      }))
      .sort((a, b) => b.score - a.score);
  }

  // Calculate score for ranking
  private calculateScore(option: RecommendationOption): number {
    // Score combines confidence and other factors
    // In production, this would be more sophisticated
    return option.confidence;
  }

  // Register default strategies
  private registerDefaultStrategies(): void {
    this.registerStrategy(new ReviewResponseStrategy());
    this.registerStrategy(new LeadQualificationStrategy());
    this.registerStrategy(new ProjectManagementStrategy());
    this.registerStrategy(new CustomerEngagementStrategy());
  }
}

// Strategy: Review Response
class ReviewResponseStrategy implements RecommendationStrategy {
  name = 'review-response';

  generateOptions(evidence: EvidencePackage): RecommendationOption[] {
    const options: RecommendationOption[] = [];

    // Check if this is review-related evidence
    const hasReviewData = evidence.observations.some(obs => 
      obs.type.includes('review')
    );

    if (hasReviewData) {
      const rating = this.extractRating(evidence);
      
      if (rating >= 4) {
        options.push({
          id: `rec-thank-${Date.now()}`,
          action: 'thank-customer',
          confidence: 0.9,
          reasoning: 'Positive review received, thank customer and request referral',
          evidenceId: evidence.id,
          rank: 0,
          score: 0.9,
          timestamp: new Date().toISOString()
        });

        options.push({
          id: `rec-testimonial-${Date.now()}`,
          action: 'request-testimonial',
          confidence: 0.85,
          reasoning: 'Positive review, request testimonial for marketing',
          evidenceId: evidence.id,
          rank: 0,
          score: 0.85,
          timestamp: new Date().toISOString()
        });
      } else if (rating <= 2) {
        options.push({
          id: `rec-investigate-${Date.now()}`,
          action: 'investigate-issue',
          confidence: 0.95,
          reasoning: 'Negative review received, investigate issue immediately',
          evidenceId: evidence.id,
          rank: 0,
          score: 0.95,
          timestamp: new Date().toISOString()
        });

        options.push({
          id: `rec-followup-${Date.now()}`,
          action: 'follow-up',
          confidence: 0.88,
          reasoning: 'Negative review, follow up with customer to resolve',
          evidenceId: evidence.id,
          rank: 0,
          score: 0.88,
          timestamp: new Date().toISOString()
        });
      }
    }

    return options;
  }

  private extractRating(evidence: EvidencePackage): number {
    // Extract rating from evidence
    // In production, this would be more sophisticated
    for (const obs of evidence.observations) {
      if (obs.data.rating && typeof obs.data.rating === 'number') {
        return obs.data.rating;
      }
    }
    return 3; // Default neutral rating
  }
}

// Strategy: Lead Qualification
class LeadQualificationStrategy implements RecommendationStrategy {
  name = 'lead-qualification';

  generateOptions(evidence: EvidencePackage): RecommendationOption[] {
    const options: RecommendationOption[] = [];

    const hasLeadData = evidence.observations.some(obs => 
      obs.type.includes('lead')
    );

    if (hasLeadData) {
      options.push({
        id: `rec-qualify-${Date.now()}`,
        action: 'qualify-lead',
        confidence: evidence.confidence,
        reasoning: 'Lead received, qualify based on evidence',
        evidenceId: evidence.id,
        rank: 0,
        score: evidence.confidence,
        timestamp: new Date().toISOString()
      });

      options.push({
        id: `rec-notify-sales-${Date.now()}`,
        action: 'notify-sales',
        confidence: 0.75,
        reasoning: 'Lead received, notify sales team',
        evidenceId: evidence.id,
        rank: 0,
        score: 0.75,
        timestamp: new Date().toISOString()
      });
    }

    return options;
  }
}

// Strategy: Project Management
class ProjectManagementStrategy implements RecommendationStrategy {
  name = 'project-management';

  generateOptions(evidence: EvidencePackage): RecommendationOption[] {
    const options: RecommendationOption[] = [];

    const hasProjectData = evidence.observations.some(obs => 
      obs.type.includes('project')
    );

    if (hasProjectData) {
      options.push({
        id: `rec-schedule-${Date.now()}`,
        action: 'schedule-work',
        confidence: 0.8,
        reasoning: 'Project created, schedule work',
        evidenceId: evidence.id,
        rank: 0,
        score: 0.8,
        timestamp: new Date().toISOString()
      });

      options.push({
        id: `rec-assign-${Date.now()}`,
        action: 'assign-crew',
        confidence: 0.78,
        reasoning: 'Project created, assign crew',
        evidenceId: evidence.id,
        rank: 0,
        score: 0.78,
        timestamp: new Date().toISOString()
      });
    }

    return options;
  }
}

// Strategy: Customer Engagement
class CustomerEngagementStrategy implements RecommendationStrategy {
  name = 'customer-engagement';

  generateOptions(evidence: EvidencePackage): RecommendationOption[] {
    const options: RecommendationOption[] = [];

    const hasCustomerData = evidence.observations.some(obs => 
      obs.type.includes('customer')
    );

    if (hasCustomerData) {
      options.push({
        id: `rec-engage-${Date.now()}`,
        action: 'engage-customer',
        confidence: 0.7,
        reasoning: 'Customer activity detected, engage',
        evidenceId: evidence.id,
        rank: 0,
        score: 0.7,
        timestamp: new Date().toISOString()
      });
    }

    return options;
  }
}

// Initialize recommendation engine
export function initializeRecommendationEngine(): RecommendationEngine {
  return new RecommendationEngine();
}

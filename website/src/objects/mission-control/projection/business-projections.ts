/**
 * Mission Control Business Projections
 * 
 * Every screen answers a business question.
 * 
 * These projections answer:
 * - Active Opportunities: What opportunities are currently open?
 * - Active Customers: Which customers are currently active?
 * - Revenue Pipeline: What's the revenue pipeline status?
 * - Customer Risk: Which customers are at risk?
 * - Worker Health: Are workers healthy?
 * - Campaign Health: Are campaigns performing well?
 * - Operational Bottlenecks: What's blocking operations?
 * - Recommended Actions: What should we do next?
 * 
 * Not endpoint-by-endpoint thinking. Business question answering.
 */

// Active Opportunities Projection
export interface ActiveOpportunitiesProjection {
  id: string;
  type: 'active-opportunities';
  period: string;
  generatedAt: string;
  opportunities: Opportunity[];
  summary: OpportunitySummary;
}

export interface Opportunity {
  id: string;
  type: 'lead' | 'estimate' | 'proposal';
  customer: string;
  value: number;
  stage: string;
  probability: number;
  nextAction: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
}

export interface OpportunitySummary {
  total: number;
  totalValue: number;
  byStage: Record<string, number>;
  byPriority: Record<string, number>;
  weightedValue: number;
}

// Active Customers Projection
export interface ActiveCustomersProjection {
  id: string;
  type: 'active-customers';
  period: string;
  generatedAt: string;
  customers: ActiveCustomer[];
  summary: CustomerSummary;
}

export interface ActiveCustomer {
  id: string;
  name: string;
  status: 'active' | 'at-risk' | 'dormant';
  lastActivity: string;
  totalValue: number;
  projectCount: number;
  nextProject?: string;
  healthScore: number;
}

export interface CustomerSummary {
  total: number;
  active: number;
  atRisk: number;
  dormant: number;
  totalValue: number;
  averageHealth: number;
}

// Revenue Pipeline Projection
export interface RevenuePipelineProjection {
  id: string;
  type: 'revenue-pipeline';
  period: string;
  generatedAt: string;
  stages: PipelineStage[];
  summary: PipelineSummary;
}

export interface PipelineStage {
  name: string;
  count: number;
  value: number;
  conversionRate: number;
  averageDays: number;
}

export interface PipelineSummary {
  totalValue: number;
  weightedValue: number;
  averageConversionRate: number;
  totalCycleTime: number;
}

// Customer Risk Projection
export interface CustomerRiskProjection {
  id: string;
  type: 'customer-risk';
  period: string;
  generatedAt: string;
  risks: CustomerRisk[];
  summary: RiskSummary;
}

export interface CustomerRisk {
  customerId: string;
  customerName: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: RiskFactor[];
  lastInteraction: string;
  recommendedAction: string;
}

export interface RiskFactor {
  factor: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface RiskSummary {
  total: number;
  byLevel: Record<string, number>;
  criticalCount: number;
  recommendedActions: number;
}

// Worker Health Projection
export interface WorkerHealthProjection {
  id: string;
  type: 'worker-health';
  period: string;
  generatedAt: string;
  workers: WorkerHealth[];
  summary: WorkerHealthSummary;
}

export interface WorkerHealth {
  workerId: string;
  workerType: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  errorRate: number;
  latency: number;
  throughput: number;
  lastError?: string;
}

export interface WorkerHealthSummary {
  total: number;
  healthy: number;
  degraded: number;
  unhealthy: number;
  averageUptime: number;
  averageErrorRate: number;
}

// Campaign Health Projection
export interface CampaignHealthProjection {
  id: string;
  type: 'campaign-health';
  period: string;
  generatedAt: string;
  campaigns: CampaignHealth[];
  summary: CampaignSummary;
}

export interface CampaignHealth {
  campaignId: string;
  name: string;
  status: 'active' | 'paused' | 'completed';
  performance: 'excellent' | 'good' | 'fair' | 'poor';
  metrics: CampaignMetrics;
  budget: number;
  spent: number;
  roi: number;
}

export interface CampaignMetrics {
  impressions: number;
  clicks: number;
  conversions: number;
  cost: number;
  ctr: number;
  conversionRate: number;
}

export interface CampaignSummary {
  total: number;
  active: number;
  averageRoi: number;
  totalBudget: number;
  totalSpent: number;
}

// Operational Bottlenecks Projection
export interface OperationalBottlenecksProjection {
  id: string;
  type: 'operational-bottlenecks';
  period: string;
  generatedAt: string;
  bottlenecks: Bottleneck[];
  summary: BottleneckSummary;
}

export interface Bottleneck {
  id: string;
  area: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: string;
  affectedOperations: string[];
  estimatedResolution: string;
  recommendedActions: string[];
}

export interface BottleneckSummary {
  total: number;
  bySeverity: Record<string, number>;
  criticalCount: number;
  averageResolutionTime: number;
}

// Recommended Actions Projection
export interface RecommendedActionsProjection {
  id: string;
  type: 'recommended-actions';
  period: string;
  generatedAt: string;
  actions: RecommendedAction[];
  summary: ActionsSummary;
}

export interface RecommendedAction {
  id: string;
  action: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  description: string;
  evidence: string[];
  estimatedImpact: string;
  estimatedEffort: string;
  dueDate: string;
  assignee?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'deferred';
}

export interface ActionsSummary {
  total: number;
  byPriority: Record<string, number>;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  overdue: number;
}

// Unified Business Projection
export interface BusinessProjection {
  activeOpportunities?: ActiveOpportunitiesProjection;
  activeCustomers?: ActiveCustomersProjection;
  revenuePipeline?: RevenuePipelineProjection;
  customerRisk?: CustomerRiskProjection;
  workerHealth?: WorkerHealthProjection;
  campaignHealth?: CampaignHealthProjection;
  operationalBottlenecks?: OperationalBottlenecksProjection;
  recommendedActions?: RecommendedActionsProjection;
}

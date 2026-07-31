/**
 * Analytics Projection - Aggregated view of business analytics data
 * 
 * SHAREABLE CONTRACT: This interface is shared between HPP and PING.
 * Do not import HPP-specific types. All types must be defined here or
 * reference other shareable contracts.
 * 
 * Analytics is a canonical business capability in PING, owning:
 * - Facts (raw data points)
 * - Dimensions (attributes for grouping/filtering)
 * - Measures (quantitative values)
 * - Metrics (calculated KPIs)
 * - Aggregations (summarized data)
 * - Forecasts (predictive models)
 * 
 * Widgets are consumers, not producers.
 * 
 * Architecture:
 * - PostHog: Engagement metrics
 * - Neo4j: Relationship analytics
 * - Qdrant: Semantic analytics
 * - Ollama: Predictive analytics
 * - Google Sheets: Historical data
 */

// Core analytics data (minimal contract)
export interface AnalyticsData {
  id: string;
  type: 'business-health' | 'revenue' | 'mission' | 'customer' | 'operational' | 'executive';
  period: string; // ISO date range
  generatedAt: string;
}

export interface AnalyticsProjection {
  // Core analytics data (minimal contract)
  analytics: AnalyticsData;
  
  // Facts - raw data points
  facts?: Fact[];
  
  // Dimensions - attributes for grouping/filtering
  dimensions?: Dimension[];
  
  // Measures - quantitative values
  measures?: Measure[];
  
  // Metrics - calculated KPIs
  metrics?: Metric[];
  
  // Aggregations - summarized data
  aggregations?: Aggregation[];
  
  // Forecasts - predictive models
  forecasts?: Forecast[];
}

// Facts - raw data points
export interface Fact {
  id: string;
  name: string;
  value: any;
  timestamp: string;
  source: string;
  dimensions: Record<string, string>;
}

// Dimensions - attributes for grouping/filtering
export interface Dimension {
  name: string;
  values: DimensionValue[];
  type: 'categorical' | 'temporal' | 'geographical' | 'hierarchical';
}

export interface DimensionValue {
  value: string;
  count: number;
  parentId?: string;
}

// Measures - quantitative values
export interface Measure {
  name: string;
  value: number;
  unit: string;
  dimensions: Record<string, string>;
  timestamp: string;
}

// Metrics - calculated KPIs
export interface Metric {
  id: string;
  name: string;
  value: number;
  target?: number;
  unit: string;
  status: 'on-track' | 'at-risk' | 'off-track';
  trend: 'up' | 'down' | 'stable';
  calculatedFrom: string[];
  timestamp: string;
}

// Aggregations - summarized data
export interface Aggregation {
  id: string;
  name: string;
  type: 'sum' | 'average' | 'count' | 'min' | 'max' | 'percentile';
  groupBy: string[];
  results: AggregationResult[];
  period: string;
}

export interface AggregationResult {
  group: Record<string, string>;
  value: number;
  count: number;
}

// Forecasts - predictive models
export interface Forecast {
  id: string;
  metric: string;
  model: string;
  confidence: number;
  period: string;
  predictions: ForecastPoint[];
  features: string[];
}

export interface ForecastPoint {
  date: string;
  value: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
}

// Legacy projections for backward compatibility (to be migrated)
export interface BusinessHealthProjection {
  score: number;
  status: 'excellent' | 'good' | 'fair' | 'poor';
  factors: HealthFactor[];
  trend: 'improving' | 'stable' | 'declining';
}

export interface HealthFactor {
  factor: string;
  value: number;
  weight: number;
  status: 'positive' | 'neutral' | 'negative';
}

export interface RevenueProjection {
  total: number;
  period: string;
  growth: number;
  forecast: number;
  confidence: number;
  breakdown: RevenueBreakdown[];
}

export interface RevenueBreakdown {
  category: string;
  amount: number;
  percentage: number;
}

export interface MissionAnalyticsProjection {
  total: number;
  completed: number;
  failed: number;
  inProgress: number;
  averageDuration: number;
  successRate: number;
  byType: MissionTypeAnalytics[];
}

export interface MissionTypeAnalytics {
  type: string;
  count: number;
  successRate: number;
  averageDuration: number;
}

export interface CustomerAnalyticsProjection {
  total: number;
  active: number;
  new: number;
  churned: number;
  retentionRate: number;
  acquisitionRate: number;
  lifetimeValue: number;
}

export interface OperationalProjection {
  efficiency: number;
  throughput: number;
  latency: number;
  errorRate: number;
  uptime: number;
  capacity: number;
}

export interface ExecutiveProjection {
  summary: string;
  keyMetrics: ExecutiveMetric[];
  risks: Risk[];
  opportunities: Opportunity[];
  recommendations: string[];
}

export interface ExecutiveMetric {
  name: string;
  value: number;
  target: number;
  status: 'on-track' | 'at-risk' | 'off-track';
}

export interface Risk {
  risk: string;
  severity: 'low' | 'medium' | 'high';
  probability: number;
  impact: string;
}

export interface Opportunity {
  opportunity: string;
  potential: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  impact: string;
}

export interface TrendsProjection {
  period: string;
  metrics: TrendMetric[];
}

export interface TrendMetric {
  metric: string;
  current: number;
  previous: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
}

export interface ForecastingProjection {
  metric: string;
  period: string;
  predictions: ForecastPoint[];
  confidence: number;
  model: string;
}

/**
 * Strongly Typed Mission Payloads
 * 
 * Instead of Record<string, unknown>, each mission owns its schema.
 * This makes missions type-safe and self-documenting.
 */

// Base mission payload
export interface BaseMissionPayload {
  missionId: string;
  missionType: string;
  timestamp: string;
}

// Review-related missions
export interface RespondReviewMissionPayload extends BaseMissionPayload {
  missionType: 'respond-review';
  reviewId: string;
  customerName: string;
  rating: number;
  body: string;
  responseTemplate?: string;
}

export interface RequestTestimonialMissionPayload extends BaseMissionPayload {
  missionType: 'request-testimonial';
  reviewId: string;
  customerId: string;
  customerName: string;
  rating: number;
}

export interface InvestigateIssueMissionPayload extends BaseMissionPayload {
  missionType: 'investigate-issue';
  reviewId: string;
  customerId: string;
  rating: number;
  body: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// Lead-related missions
export interface QualifyLeadMissionPayload extends BaseMissionPayload {
  missionType: 'qualify-lead';
  leadId: string;
  name: string;
  email: string;
  source: string;
  qualificationCriteria?: Record<string, unknown>;
}

export interface NotifySalesMissionPayload extends BaseMissionPayload {
  missionType: 'notify-sales';
  leadId: string;
  name: string;
  source: string;
  assignee?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface CreateEstimateMissionPayload extends BaseMissionPayload {
  missionType: 'create-estimate';
  leadId: string;
  customerId: string;
  service: string;
  estimatedValue?: number;
}

// Project-related missions
export interface CreateProjectMissionPayload extends BaseMissionPayload {
  missionType: 'create-project';
  estimateId: string;
  customerId: string;
  services: string[];
  amount: number;
  startDate?: string;
  endDate?: string;
}

export interface ScheduleWorkMissionPayload extends BaseMissionPayload {
  missionType: 'schedule-work';
  projectId: string;
  customerId: string;
  startDate: string;
  crewSize?: number;
  equipment?: string[];
}

export interface ArchiveProjectMissionPayload extends BaseMissionPayload {
  missionType: 'archive-project';
  projectId: string;
  customerId: string;
  reason: string;
}

export interface AssignCrewMissionPayload extends BaseMissionPayload {
  missionType: 'assign-crew';
  projectId: string;
  crewId: string;
  crewSize: number;
  skills: string[];
  startDate: string;
}

// Invoice-related missions
export interface CreateInvoiceMissionPayload extends BaseMissionPayload {
  missionType: 'create-invoice';
  projectId: string;
  customerId: string;
  amount: number;
  dueDate: string;
  lineItems: InvoiceLineItem[];
}

export interface SendInvoiceMissionPayload extends BaseMissionPayload {
  missionType: 'send-invoice';
  invoiceId: string;
  customerId: string;
  method: 'email' | 'portal' | 'mail';
}

export interface SendReminderMissionPayload extends BaseMissionPayload {
  missionType: 'send-reminder';
  invoiceId: string;
  customerId: string;
  daysOverdue: number;
  reminderLevel: 1 | 2 | 3;
}

// Customer-related missions
export interface UpdateCustomerHealthMissionPayload extends BaseMissionPayload {
  missionType: 'update-customer-health';
  customerId: string;
  reviewId?: string;
  rating?: number;
  interactionType: 'review' | 'project' | 'payment' | 'communication';
  healthScore?: number;
}

export interface ReEngageCustomerMissionPayload extends BaseMissionPayload {
  missionType: 're-engage-customer';
  customerId: string;
  lastActivityDate: string;
  inactivityPeriod: number; // days
  engagementStrategy: 'email' | 'call' | 'visit' | 'offer';
}

export interface SaveCustomerMissionPayload extends BaseMissionPayload {
  missionType: 'save-customer';
  customerId: string;
  riskFactors: string[];
  retentionStrategy: string;
  assignee?: string;
}

// Marketing-related missions
export interface NotifyMarketingMissionPayload extends BaseMissionPayload {
  missionType: 'notify-marketing';
  reviewId: string;
  rating: number;
  service: string;
  action: 'testimonial' | 'case-study' | 'social-media' | 'referral';
}

export interface RequestReferralMissionPayload extends BaseMissionPayload {
  missionType: 'request-referral';
  customerId: string;
  projectId: string;
  referralIncentive?: string;
}

// Revenue-related missions
export interface UpdateRevenueMissionPayload extends BaseMissionPayload {
  missionType: 'update-revenue';
  projectId: string;
  amount: number;
  customerId: string;
  revenueType: 'project' | 'change-order' | 'add-on';
}

export interface RevenueRiskMissionPayload extends BaseMissionPayload {
  missionType: 'revenue-risk';
  reviewId: string;
  rating: number;
  service: string;
  potentialRevenueImpact: number;
  riskLevel: 'low' | 'medium' | 'high';
}

// Supporting types
export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

// Union type for all mission payloads
export type MissionPayload =
  | RespondReviewMissionPayload
  | RequestTestimonialMissionPayload
  | InvestigateIssueMissionPayload
  | QualifyLeadMissionPayload
  | NotifySalesMissionPayload
  | CreateEstimateMissionPayload
  | CreateProjectMissionPayload
  | ScheduleWorkMissionPayload
  | ArchiveProjectMissionPayload
  | AssignCrewMissionPayload
  | CreateInvoiceMissionPayload
  | SendInvoiceMissionPayload
  | SendReminderMissionPayload
  | UpdateCustomerHealthMissionPayload
  | ReEngageCustomerMissionPayload
  | SaveCustomerMissionPayload
  | NotifyMarketingMissionPayload
  | RequestReferralMissionPayload
  | UpdateRevenueMissionPayload
  | RevenueRiskMissionPayload;

// Type guards
export function isRespondReviewMissionPayload(payload: MissionPayload): payload is RespondReviewMissionPayload {
  return payload.missionType === 'respond-review';
}

export function isQualifyLeadMissionPayload(payload: MissionPayload): payload is QualifyLeadMissionPayload {
  return payload.missionType === 'qualify-lead';
}

export function isCreateProjectMissionPayload(payload: MissionPayload): payload is CreateProjectMissionPayload {
  return payload.missionType === 'create-project';
}

export function isCreateInvoiceMissionPayload(payload: MissionPayload): payload is CreateInvoiceMissionPayload {
  return payload.missionType === 'create-invoice';
}

// Helper to create typed mission payloads
export function createMissionPayload<T extends MissionPayload>(
  missionType: T['missionType'],
  data: Omit<T, 'missionId' | 'missionType' | 'timestamp'>
): T {
  return {
    missionId: `mission-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    missionType,
    timestamp: new Date().toISOString(),
    ...data
  } as T;
}

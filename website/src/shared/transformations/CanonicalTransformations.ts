/**
 * Canonical Transformations - Transform external formats to canonical entities
 * 
 * Everything downstream should only know canonical entities.
 * 
 * Examples:
 * - GitHub Issue → CanonicalTask
 * - Google Sheet row → CanonicalLead
 * - Stripe Invoice → CanonicalInvoice
 * - HubSpot Contact → CanonicalCustomer
 */

import type { CanonicalEntity, EntityMetadata } from '../types/SemanticTypes';

// Canonical Task (from GitHub Issues, Jira, etc.)
export interface CanonicalTask extends CanonicalEntity {
  type: 'task';
  data: {
    title: string;
    description: string;
    status: 'open' | 'in-progress' | 'completed' | 'closed';
    priority: 'low' | 'medium' | 'high' | 'critical';
    assignee?: string;
    labels: string[];
    dueDate?: string;
    createdAt: string;
    updatedAt: string;
    sourceUrl?: string;
  };
}

// Canonical Lead (from Google Sheets, HubSpot, etc.)
export interface CanonicalLead extends CanonicalEntity {
  type: 'lead';
  data: {
    name: string;
    email: string;
    phone?: string;
    company?: string;
    source: string;
    status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
    estimatedValue?: number;
    serviceInterest: string[];
    createdAt: string;
    updatedAt: string;
  };
}

// Canonical Customer (from HubSpot, Stripe, etc.)
export interface CanonicalCustomer extends CanonicalEntity {
  type: 'customer';
  data: {
    name: string;
    email: string;
    phone?: string;
    company?: string;
    status: 'active' | 'inactive' | 'archived';
    healthScore?: number;
    lifetimeValue?: number;
    createdAt: string;
    updatedAt: string;
  };
}

// Canonical Invoice (from Stripe, QuickBooks, etc.)
export interface CanonicalInvoice extends CanonicalEntity {
  type: 'invoice';
  data: {
    invoiceNumber: string;
    customerId: string;
    amount: number;
    currency: string;
    status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
    dueDate: string;
    paidDate?: string;
    lineItems: InvoiceLineItem[];
    createdAt: string;
    updatedAt: string;
  };
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

// Canonical Project (from Google Sheets, Asana, etc.)
export interface CanonicalProject extends CanonicalEntity {
  type: 'project';
  data: {
    name: string;
    customerId: string;
    status: 'planned' | 'in-progress' | 'completed' | 'on-hold' | 'cancelled';
    startDate?: string;
    endDate?: string;
    estimatedBudget?: number;
    actualBudget?: number;
    serviceType: string;
    createdAt: string;
    updatedAt: string;
  };
}

// Canonical Review (from Google Sheets, Trustpilot, etc.)
export interface CanonicalReview extends CanonicalEntity {
  type: 'review';
  data: {
    customerId: string;
    projectId?: string;
    rating: number;
    title?: string;
    body: string;
    status: 'pending' | 'approved' | 'rejected';
    service?: string;
    createdAt: string;
    updatedAt: string;
  };
}

// Transformer interface
export interface Transformer<TExternal, TCanonical extends CanonicalEntity> {
  transform(external: TExternal): TCanonical;
  transformBack(canonical: TCanonical): TExternal;
}

// GitHub Issue → CanonicalTask
export class GitHubIssueTransformer implements Transformer<any, CanonicalTask> {
  transform(external: any): CanonicalTask {
    return {
      id: external.id,
      type: 'task',
      version: '1.0.0',
      createdAt: new Date(external.created_at).toISOString(),
      updatedAt: new Date(external.updated_at).toISOString(),
      data: {
        title: external.title,
        description: external.body || '',
        status: this.mapStatus(external.state),
        priority: this.mapPriority(external.labels),
        assignee: external.assignee?.login,
        labels: external.labels?.map((l: any) => l.name) || [],
        dueDate: external.due_date ? new Date(external.due_date).toISOString() : undefined,
        createdAt: new Date(external.created_at).toISOString(),
        updatedAt: new Date(external.updated_at).toISOString(),
        sourceUrl: external.html_url
      },
      metadata: {
        source: 'github',
        confidence: 1.0,
        tags: external.labels?.map((l: any) => l.name) || []
      }
    };
  }

  transformBack(canonical: CanonicalTask): any {
    return {
      title: canonical.data.title,
      body: canonical.data.description,
      state: this.mapStatusBack(canonical.data.status),
      labels: canonical.data.labels.map(name => ({ name })),
      assignee: canonical.data.assignee ? { login: canonical.data.assignee } : undefined,
      due_date: canonical.data.dueDate
    };
  }

  private mapStatus(state: string): 'open' | 'in-progress' | 'completed' | 'closed' {
    const map: Record<string, 'open' | 'in-progress' | 'completed' | 'closed'> = {
      'open': 'open',
      'in_progress': 'in-progress',
      'completed': 'completed',
      'closed': 'closed'
    };
    return map[state] || 'open';
  }

  private mapStatusBack(status: 'open' | 'in-progress' | 'completed' | 'closed'): string {
    const map: Record<'open' | 'in-progress' | 'completed' | 'closed', string> = {
      'open': 'open',
      'in-progress': 'in_progress',
      'completed': 'completed',
      'closed': 'closed'
    };
    return map[status];
  }

  private mapPriority(labels: any[]): 'low' | 'medium' | 'high' | 'critical' {
    const labelNames = labels?.map((l: any) => l.name.toLowerCase()) || [];
    if (labelNames.includes('critical')) return 'critical';
    if (labelNames.includes('high')) return 'high';
    if (labelNames.includes('medium')) return 'medium';
    return 'low';
  }
}

// Google Sheet → CanonicalLead
export class GoogleSheetLeadTransformer implements Transformer<any, CanonicalLead> {
  transform(external: any): CanonicalLead {
    return {
      id: external.id || `lead-${Date.now()}`,
      type: 'lead',
      version: '1.0.0',
      createdAt: external.createdAt || new Date().toISOString(),
      updatedAt: external.updatedAt || new Date().toISOString(),
      data: {
        name: external.name,
        email: external.email,
        phone: external.phone,
        company: external.company,
        source: external.source || 'google-sheets',
        status: external.status || 'new',
        estimatedValue: external.estimatedValue,
        serviceInterest: external.serviceInterest || [],
        createdAt: external.createdAt || new Date().toISOString(),
        updatedAt: external.updatedAt || new Date().toISOString()
      },
      metadata: {
        source: 'google-sheets',
        confidence: 0.9,
        tags: [external.status, external.source || 'google-sheets']
      }
    };
  }

  transformBack(canonical: CanonicalLead): any {
    return {
      id: canonical.id,
      name: canonical.data.name,
      email: canonical.data.email,
      phone: canonical.data.phone,
      company: canonical.data.company,
      source: canonical.data.source,
      status: canonical.data.status,
      estimatedValue: canonical.data.estimatedValue,
      serviceInterest: canonical.data.serviceInterest,
      createdAt: canonical.data.createdAt,
      updatedAt: canonical.data.updatedAt
    };
  }
}

// Stripe Invoice → CanonicalInvoice
export class StripeInvoiceTransformer implements Transformer<any, CanonicalInvoice> {
  transform(external: any): CanonicalInvoice {
    return {
      id: external.id,
      type: 'invoice',
      version: '1.0.0',
      createdAt: new Date(external.created * 1000).toISOString(),
      updatedAt: new Date(external.created * 1000).toISOString(),
      data: {
        invoiceNumber: external.number,
        customerId: external.customer,
        amount: external.amount_paid / 100,
        currency: external.currency.toUpperCase(),
        status: this.mapStatus(external.status),
        dueDate: external.due_date ? new Date(external.due_date * 1000).toISOString() : new Date(external.created * 1000).toISOString(),
        paidDate: external.status_transitions?.paid ? new Date(external.status_transitions.paid * 1000).toISOString() : undefined,
        lineItems: external.lines?.data?.map((line: any) => ({
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.amount / 100,
          total: (line.amount * line.quantity) / 100
        })) || [],
        createdAt: new Date(external.created * 1000).toISOString(),
        updatedAt: new Date(external.created * 1000).toISOString()
      },
      metadata: {
        source: 'stripe',
        confidence: 1.0,
        tags: [external.status]
      }
    };
  }

  transformBack(canonical: CanonicalInvoice): any {
    return {
      number: canonical.data.invoiceNumber,
      customer: canonical.data.customerId,
      amount_paid: canonical.data.amount * 100,
      currency: canonical.data.currency.toLowerCase(),
      status: this.mapStatusBack(canonical.data.status),
      due_date: Math.floor(new Date(canonical.data.dueDate).getTime() / 1000),
      lines: {
        data: canonical.data.lineItems.map(item => ({
          description: item.description,
          quantity: item.quantity,
          amount: item.unitPrice * 100
        }))
      }
    };
  }

  private mapStatus(status: string): 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' {
    const map: Record<string, 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'> = {
      'draft': 'draft',
      'open': 'sent',
      'paid': 'paid',
      'uncollectible': 'overdue',
      'void': 'cancelled'
    };
    return map[status] || 'draft';
  }

  private mapStatusBack(status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'): string {
    const map: Record<'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled', string> = {
      'draft': 'draft',
      'sent': 'open',
      'paid': 'paid',
      'overdue': 'uncollectible',
      'cancelled': 'void'
    };
    return map[status];
  }
}

// Transformation Registry
export class TransformationRegistry {
  private transformers: Map<string, Transformer<any, CanonicalEntity>> = new Map();

  registerTransformer(sourceType: string, transformer: Transformer<any, CanonicalEntity>): void {
    this.transformers.set(sourceType, transformer);
  }

  transform(sourceType: string, external: any): CanonicalEntity | null {
    const transformer = this.transformers.get(sourceType);
    if (!transformer) return null;
    return transformer.transform(external);
  }

  transformBack(sourceType: string, canonical: CanonicalEntity): any | null {
    const transformer = this.transformers.get(sourceType);
    if (!transformer) return null;
    return transformer.transformBack(canonical);
  }
}

// Initialize transformation registry with default transformers
export function initializeTransformationRegistry(): TransformationRegistry {
  const registry = new TransformationRegistry();
  registry.registerTransformer('github-issue', new GitHubIssueTransformer());
  registry.registerTransformer('google-sheet-lead', new GoogleSheetLeadTransformer());
  registry.registerTransformer('stripe-invoice', new StripeInvoiceTransformer());
  return registry;
}

/** Client-side guidance only. No submission, persistence or provider operation. */
import type { EstimateRequest } from '@/types';

export interface EstimateGuideValues {
  service: string;
  notes: string;
  city: string;
  name: string;
  email: string;
  phone: string;
}
export function estimateGuideErrors(step: number, values: EstimateGuideValues): Record<string, string> {
  const errors: Record<string, string> = {};
  if (step === 0) {
    if (values.notes.trim().length < 10) errors.notes = 'Tell us a little more about what you have in mind (at least 10 characters).';
    if (values.notes.length > 1200) errors.notes = 'Please keep the introduction to 1,200 characters; you can add more in your email.';
    if (!values.city.trim()) errors.city = 'Add the city or town where the work is needed.';
  }
  if (step === 1) {
    if (!values.name.trim()) errors.name = 'Add your name so we know who to reply to.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = 'Enter an email address, such as you@example.com.';
  }
  return errors;
}
export function makeEstimateEmailRequest(values: EstimateGuideValues, projectTitle?: string): EstimateRequest {
  return {
    customer: { name: values.name.trim(), email: values.email.trim(), phone: values.phone.trim() },
    property: { city: values.city.trim(), county: '', address: '', details: '' },
    services: values.service ? [values.service] : [],
    otherNeed: values.service ? '' : 'Help choosing the right service',
    answers: {}, photos: [],
    notes: (projectTitle ? 'Inspired by: ' + projectTitle + '\n\n' : '') + values.notes.trim(),
    submittedAt: new Date().toISOString(),
  };
}

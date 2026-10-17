import { estimateGuideErrors, makeEstimateEmailRequest, type EstimateGuideValues } from '../estimate-email-guide';
const values: EstimateGuideValues = { service: 'painting', notes: 'Please repaint the entryway.', city: 'Corvallis', name: 'Example Homeowner', email: 'homeowner@example.com', phone: '' };
describe('public email estimate guidance', () => {
  it('validates the current step without requiring later details', () => {
    expect(estimateGuideErrors(0, { ...values, name: '', email: '' })).toEqual({});
    expect(estimateGuideErrors(0, { ...values, notes: 'short', city: '' })).toHaveProperty('notes');
    expect(estimateGuideErrors(0, { ...values, city: '' })).toHaveProperty('city');
    expect(estimateGuideErrors(1, { ...values, email: 'invalid' })).toHaveProperty('email');
    expect(estimateGuideErrors(1, values)).toEqual({});
  });
  it('does not demand a service or phone number', () => {
    expect(estimateGuideErrors(0, { ...values, service: '' })).toEqual({});
    expect(estimateGuideErrors(1, values)).toEqual({});
  });
  it('prepares the existing mail format without claiming submission or photos', () => {
    const request = makeEstimateEmailRequest(values, 'Existing public project');
    expect(request.services).toEqual(['painting']);
    expect(request.notes).toContain('Inspired by: Existing public project');
    expect(request.photos).toEqual([]);
    expect(request).not.toHaveProperty('received');
    expect(request).not.toHaveProperty('newsletterConsent');
  });
  it('retains a general enquiry and trims details', () => {
    const request = makeEstimateEmailRequest({ ...values, service: '', city: '  Corvallis  ' });
    expect(request.services).toEqual([]);
    expect(request.otherNeed).toBeTruthy();
    expect(request.property.city).toBe('Corvallis');
  });
});

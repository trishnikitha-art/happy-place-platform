import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { EstimateWizard } from "@/components/estimate-wizard";
import type { WizardState } from "../wizard-persistence";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams("step=Contact"),
}));

describe("public estimate contact step navigation", () => {
  it("renders the submit action on Contact without a Next button", () => {
    const markup = renderToStaticMarkup(React.createElement(EstimateWizard));

    expect(markup).toContain("How do we reach you?");
    expect(markup).toContain("Send My Estimate Request");
    expect(markup).not.toContain("Next");
  });
});


describe('Something Else required-field navigation', () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const originalLocalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const originalSessionStorage = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  const storage = { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() };

  beforeEach(() => {
    storage.getItem.mockReset();
    storage.setItem.mockReset();
    Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
    Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: storage });
  });
  afterEach(() => {
    for (const [key, descriptor] of [
      ['window', originalWindow], ['localStorage', originalLocalStorage], ['sessionStorage', originalSessionStorage],
    ] as const) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete (globalThis as unknown as Record<string, unknown>)[key];
    }
  });

  function renderDraft(step: number, customer = { name: '', email: '', phone: '' }, city = '', county = '') {
    const draft: WizardState = {
      step, selected: ['something-else'], projectType: '', otherNeed: 'Repair a custom gate',
      answers: {}, photos: [], property: { address: '', city, county, details: '' },
      customer, submitted: false, updatedAt: Date.now(),
    };
    storage.getItem.mockImplementation((key: string) => key === 'estimate-wizard-draft' ? JSON.stringify(draft) : null);
    return renderToStaticMarkup(React.createElement(EstimateWizard));
  }

  function action(markup: string, label: string) {
    const button = markup.match(/<button\b[^>]*>[\s\S]*?<\/button>/g)?.find(value => value.includes(label));
    expect(button).toBeDefined();
    return button!;
  }

  it('keeps Submit disabled on Something Else Contact while contact fields are empty', () => {
    const markup = renderDraft(4);
    expect(markup).toContain('How do we reach you?');
    expect(action(markup, 'Send My Estimate Request')).toMatch(/\sdisabled=""/);
  });

  it.each([
    { name: '', email: 'visitor@example.test', phone: '5550100' },
    { name: 'Visitor', email: '', phone: '5550100' },
    { name: 'Visitor', email: 'visitor@example.test', phone: '' },
  ])('keeps Submit disabled when an individual Something Else contact field is missing (%j)', customer => {
    expect(action(renderDraft(4, customer), 'Send My Estimate Request')).toMatch(/\sdisabled=""/);
  });

  it.each([['', 'benton'], ['Corvallis', ''], ['', '']])('keeps Next disabled on Something Else Property with city=%s county=%s', (city, county) => {
    const markup = renderDraft(3, undefined, city, county);
    expect(markup).toContain('Where is the work?');
    expect(action(markup, 'Next')).toMatch(/\sdisabled=""/);
  });

  it('allows navigation when the required fields are populated', () => {
    expect(action(renderDraft(4, { name: 'Visitor', email: 'visitor@example.test', phone: '5550100' }), 'Send My Estimate Request')).not.toMatch(/\sdisabled=""/);
    expect(action(renderDraft(3, undefined, 'Corvallis', 'benton'), 'Next')).not.toMatch(/\sdisabled=""/);
  });
});

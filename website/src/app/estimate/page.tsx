import type { Metadata } from 'next';
import { Suspense } from 'react';
import { EstimateWizard } from '@/components/estimate-wizard';
import { Container, Section, SectionHeading } from '@/components/section';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Free Estimate',
  description: 'Tell us about your carpentry project and prepare your estimate request.',
  alternates: { canonical: '/estimate' },
};

export default function EstimatePage() {
  return <Section><Container className="max-w-3xl">
    <SectionHeading as="h1" eyebrow="Free estimate" title="Let's scope your project" description="Choose a service, tell us about your project, and prepare your request." />
    <div className="mt-8"><Suspense fallback={<p role="status">Loading estimate form…</p>}><EstimateWizard /></Suspense></div>
  </Container></Section>;
}

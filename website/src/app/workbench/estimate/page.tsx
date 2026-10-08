import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { EstimateWizard } from '@/components/estimate-wizard';
import { workbenchSession } from '@/lib/workbench-session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Project scoping', robots: { index: false, follow: false } };

export default async function WorkbenchEstimatePage() {
  if (!(await workbenchSession.isAuthenticated())) redirect('/workbench/login');
  return <section className="mx-auto w-full max-w-3xl p-6">
    <h1 className="font-heading text-3xl">Project scoping</h1>
    <p className="mt-3 mb-8 text-muted-foreground">Private tools for preparing a project with the customer.</p>
    <Suspense fallback={<p>Loading project scoping…</p>}><EstimateWizard /></Suspense>
  </section>;
}

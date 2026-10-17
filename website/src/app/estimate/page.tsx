import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { workbenchSession } from '@/lib/workbench-session';
import { getCompany } from '@/lib/company';
import { getNonArchivedServices } from '@/lib/registries';
import { getAllProjects } from '@/lib/projects';
import { EstimateEmailGuide } from '@/components/estimate-email-guide';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Start your project',
  description: 'Tell Happy Place Carpentry about your project. Prepare an estimate request by email, or call to discuss work in Oregon’s Mid-Willamette Valley.',
  alternates: { canonical: '/estimate' },
};
export default async function EstimatePage({ searchParams }: { searchParams: Promise<{ service?: string; project?: string }> }) {
  if (await workbenchSession.isAuthenticated()) redirect('/workbench/estimate');
  const query = await searchParams;
  const company = getCompany();
  const services = getNonArchivedServices();
  const service = services.find(item => item.slug === query.service);
  const selectedProject = getAllProjects().find(item => item.slug === query.project || item.id === query.project);
  const project = selectedProject ? { title: selectedProject.title, href: '/projects/' + (selectedProject.slug || selectedProject.id) } : undefined;
  return <div className="craft-page craft-section"><div className="craft-shell grid items-start gap-10 lg:grid-cols-[.8fr_1.2fr] lg:gap-20">
    <div className="lg:sticky lg:top-32"><span className="craft-eyebrow text-primary">A good place to start</span><h1 className="craft-title mt-5 text-primary">Tell us what you have in mind.</h1><p className="craft-copy mt-7">A repair that needs attention. A space ready for a refresh. An idea you’re ready to explore.</p><p className="craft-copy mt-5">Start with a few details. We’ll help you prepare an email to Happy Place Carpentry. You review and send it from your email app.</p><p className="mt-8 border-t border-border-soft pt-6 text-xs leading-relaxed text-text-subtle">{company.serviceArea}</p><Link href="/contact" className="craft-link mt-4 text-primary">Prefer to call or email directly? →</Link><Link href="/our-work" className="craft-link mt-2 block text-primary">Looking for inspiration? Browse our work →</Link></div>
    <EstimateEmailGuide services={services.map(item => ({ slug: item.slug, name: item.name }))} initialService={service?.slug} project={project} email={company.email} phone={company.phone} phoneDisplay={company.phoneDisplay} />
  </div></div>;
}

/**
 * Workbench Preview Route
 * 
 * This route renders the ACTUAL website pages for Workbench preview.
 * No duplicate implementations - uses the real @/app/page components.
 * 
 * Route: /workbench/preview/[[...path]]
 * Purpose: Display real website in Workbench iframe with VisualSlot instrumentation
 * 
 * Optional catch-all: /workbench/preview → homepage, /workbench/preview/our-work → our-work
 */

import { notFound } from 'next/navigation';
import PreviewLayout from '../layout';

export const dynamic = 'force-dynamic';

interface PreviewPageProps {
  params: Promise<{
    path?: string[];
  }>;
  searchParams: Promise<{ textTransaction?: string }>;
}

export default async function PreviewPage({ params, searchParams }: PreviewPageProps) {
  const { path } = await params;
  const route = path && path.length > 0 ? '/' + path.join('/') : '/';

  // Render the ACTUAL website page components (no duplicates)
  // Wrap in PreviewLayout to provide WorkbenchModeContext
  switch (route) {
    case '/':
      const HomePage = (await import('@/app/page')).default;
      return <PreviewLayout><HomePage searchParams={searchParams} /></PreviewLayout>;
    case '/about':
      const AboutPage = (await import('@/app/about/page')).default;
      return <PreviewLayout><AboutPage /></PreviewLayout>;
    case '/services':
      const ServicesPage = (await import('@/app/services/page')).default;
      return <PreviewLayout><ServicesPage /></PreviewLayout>;
    case '/our-work':
      const OurWorkPage = (await import('@/app/our-work/page')).default;
      return <PreviewLayout><OurWorkPage /></PreviewLayout>;
    case '/reviews':
      const ReviewsPage = (await import('@/app/reviews/page')).default;
      return <PreviewLayout><ReviewsPage /></PreviewLayout>;
    case '/estimate':
      const EstimatePage = (await import('@/app/estimate/page')).default;
      return <PreviewLayout><EstimatePage /></PreviewLayout>;
    default:
      // Handle dynamic routes like /services/[slug]
      if (route.startsWith('/services/')) {
        const slug = route.replace('/services/', '');
        const ServicePage = (await import('@/app/services/[slug]/page')).default;
        return <PreviewLayout><ServicePage params={Promise.resolve({ slug })} /></PreviewLayout>;
      }
      // Handle /projects/[slug]
      if (route.startsWith('/projects/')) {
        const slug = route.replace('/projects/', '');
        const ProjectPage = (await import('@/app/projects/[slug]/page')).default;
        return <PreviewLayout><ProjectPage params={Promise.resolve({ slug })} /></PreviewLayout>;
      }
      return notFound();
  }
}

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

export const dynamic = 'force-dynamic';

interface PreviewPageProps {
  params: Promise<{
    path?: string[];
  }>;
}

export default async function PreviewPage({ params }: PreviewPageProps) {
  const { path } = await params;
  const route = path && path.length > 0 ? '/' + path.join('/') : '/';

  // Render the ACTUAL website page components (no duplicates)
  switch (route) {
    case '/':
      const HomePage = (await import('@/app/page')).default;
      return <HomePage />;
    case '/about':
      const AboutPage = (await import('@/app/about/page')).default;
      return <AboutPage />;
    case '/services':
      const ServicesPage = (await import('@/app/services/page')).default;
      return <ServicesPage />;
    case '/our-work':
      const OurWorkPage = (await import('@/app/our-work/page')).default;
      return <OurWorkPage />;
    case '/reviews':
      const ReviewsPage = (await import('@/app/reviews/page')).default;
      return <ReviewsPage />;
    case '/estimate':
      const EstimatePage = (await import('@/app/estimate/page')).default;
      return <EstimatePage />;
    default:
      // Handle dynamic routes like /services/[slug]
      if (route.startsWith('/services/')) {
        const slug = route.replace('/services/', '');
        const ServicePage = (await import('@/app/services/[slug]/page')).default;
        return <ServicePage params={Promise.resolve({ slug })} />;
      }
      // Handle /projects/[slug]
      if (route.startsWith('/projects/')) {
        const slug = route.replace('/projects/', '');
        const ProjectPage = (await import('@/app/projects/[slug]/page')).default;
        return <ProjectPage params={Promise.resolve({ slug })} />;
      }
      return notFound();
  }
}

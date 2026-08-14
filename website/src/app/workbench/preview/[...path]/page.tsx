/**
 * Workbench Preview Route
 * 
 * This route renders the EXACT main@5ba201cd website components.
 * These are the actual frontend files from main@5ba201cd.
 * 
 * Route: /workbench/preview/[...path]
 * Purpose: Display main@5ba201cd website in Workbench iframe
 */

import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface PreviewPageProps {
  params: Promise<{
    path: string[];
  }>;
}

export default async function PreviewPage({ params }: PreviewPageProps) {
  const { path } = await params;
  const route = '/' + path.join('/');

  // Render the ACTUAL main@5ba201cd page components
  switch (route) {
    case '/':
      const MainHomePage = (await import('@/app/workbench/preview/main-page')).default;
      return <MainHomePage />;
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
      return notFound();
  }
}

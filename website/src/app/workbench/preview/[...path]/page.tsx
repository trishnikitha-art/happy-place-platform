/**
 * Workbench Preview Route
 * 
 * This route renders the main website with a preview mode indicator.
 * The preview mode is detected via the fact that we're on this route.
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

  // Render the actual page component with preview mode enabled
  // The page will detect preview mode via the route being /workbench/preview/*
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
      return notFound();
  }
}

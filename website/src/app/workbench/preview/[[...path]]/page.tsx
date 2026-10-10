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
import { workbenchSession } from '@/lib/workbench-session';
import { redirect } from 'next/navigation';
import { readTextTransaction } from '@/lib/text-authority';
import { TextPreviewProvider } from '@/components/text-copy';
import { readContentReceipt } from '@/lib/content-authority';
import { ContentCopyPreviewProvider } from '@/components/content-copy';

export const dynamic = 'force-dynamic';

interface PreviewPageProps {
  params: Promise<{
    path?: string[];
  }>;
  searchParams: Promise<{ textTransaction?: string;contentTransaction?:string }>;
}

export default async function PreviewPage({ params, searchParams }: PreviewPageProps) {
  if (!await workbenchSession.isAuthenticated()) redirect('/workbench/login');
  const { path } = await params;
  const route = path && path.length > 0 ? '/' + path.join('/') : '/';
  const transactionId=(await searchParams).textTransaction;
  const receipt=transactionId ? await readTextTransaction(transactionId) : null;
  if(receipt && (!receipt.mutation || !receipt.stagingVerified || !['prepared','failed'].includes(receipt.state))) throw new Error('Text preview is unavailable for this transaction state');
  const draft=receipt?.mutation ? {key:receipt.mutation.key,value:receipt.mutation.value} : null;
  const contentId=(await searchParams).contentTransaction;
  const contentReceipt=contentId ? await readContentReceipt(contentId) : null;
  if(contentReceipt && (!contentReceipt.stagingVerified || !['prepared','failed'].includes(contentReceipt.state)))throw new Error('Content preview is unavailable for this transaction state');
  const page=await renderRoute();
  return <TextPreviewProvider draft={draft}>{contentReceipt ? <ContentCopyPreviewProvider collection={contentReceipt.mutation.collection} changes={contentReceipt.mutation.copy??[]}>{page}</ContentCopyPreviewProvider> : page}</TextPreviewProvider>;

  async function renderRoute() {

  // Render the ACTUAL website page components (no duplicates)
  // Wrap in PreviewLayout to provide WorkbenchModeContext
  switch (route) {
    case '/':
      const HomePage = (await import('@/app/page')).default;
      return <HomePage searchParams={searchParams} />;
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
    case '/contact':
      const ContactPage = (await import('@/app/contact/page')).default;
      return <ContactPage />;
    case '/faq':
      const FaqPage=(await import('@/app/faq/page')).default;
      return <FaqPage />;
    case '/privacy':
      const PrivacyPage=(await import('@/app/privacy/page')).default;
      return <PrivacyPage />;
    case '/review':
      const ReviewPage=(await import('@/app/review/page')).default;
      return <ReviewPage />;
    case '/newsletter':
      const NewsletterPage=(await import('@/app/newsletter/page')).default;
      return <NewsletterPage />;
    case '/newsletter/thank-you':
      const ThankYouPage=(await import('@/app/newsletter/thank-you/page')).default;
      return <ThankYouPage />;
    case '/blog':
      const BlogPage=(await import('@/app/blog/page')).default;
      return <BlogPage />;
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
      if(route.startsWith('/blog/')) {
        const BlogPostPage=(await import('@/app/blog/[slug]/page')).default;
        return <BlogPostPage params={Promise.resolve({slug:route.slice('/blog/'.length)})} />;
      }
      return notFound();
  }
  }
}

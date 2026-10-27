import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import catalog from '@/config/strings.v1.json';
import { pageMetadata } from '@/config/seo';
import { decodeTextCatalog } from '@/lib/text-contract';

const copy = decodeTextCatalog(catalog).fields;

export const metadata: Metadata = {
  ...pageMetadata({
    title: copy['review.title'].value,
    description: `${copy['review.introduction'].value} ${copy['review.question'].value}`,
    path: '/review',
  }),
  robots: { index: false, follow: true },
};

export default function ReviewLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

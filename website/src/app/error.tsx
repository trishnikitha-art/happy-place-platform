"use client";

import { PageErrorFallback } from '@/components/page-error-fallback';

export default function ErrorPage({ reset }: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <PageErrorFallback reset={reset} />;
}

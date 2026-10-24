"use client";

import { PageErrorFallback } from '@/components/page-error-fallback';

export default function GlobalError({ reset }: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#EDEAE0', fontFamily: 'system-ui, sans-serif' }}>
        <main><PageErrorFallback reset={reset} /></main>
      </body>
    </html>
  );
}

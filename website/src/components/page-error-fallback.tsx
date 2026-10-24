"use client";

/** Recovery UI deliberately avoids the data and providers that may have failed. */
export function PageErrorFallback({ reset }: { reset: () => void }) {
  return (
    <section
      aria-labelledby="page-error-heading"
      style={{ maxWidth: '42rem', margin: '0 auto', padding: '4rem 1.5rem', color: '#1F3F3C', background: '#EDEAE0' }}
    >
      <h1 id="page-error-heading" style={{ fontSize: '2rem', lineHeight: 1.2 }}>
        We couldn’t load this page
      </h1>
      <p style={{ margin: '1.5rem 0', lineHeight: 1.6 }}>
        Try again, or contact us if the problem continues.
      </p>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          type="button"
          onClick={reset}
          style={{ padding: '0.75rem 1.25rem', minHeight: '44px', border: 0, borderRadius: '0.5rem', background: '#1F3F3C', color: '#fff', cursor: 'pointer' }}
        >
          Try again
        </button>
        <a href="/contact" style={{ color: 'inherit', padding: '0.75rem 0' }}>Contact us</a>
      </div>
    </section>
  );
}

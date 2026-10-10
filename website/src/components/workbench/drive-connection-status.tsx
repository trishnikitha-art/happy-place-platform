'use client';

import { useEffect, useState } from 'react';

/** Display Google identity only after the server's principal and session checks succeed. */
export function DriveConnectionStatus() {
  const [refresh, setRefresh] = useState(0);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setChecking(true);
    setUnavailable(false);
    void (async () => {
      try {
        const response = await fetch('/api/drive/auth/status', { cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error('Connection check unavailable');
        const status = await response.json();
        if (controller.signal.aborted) return;
        setEmail(status.authenticated === true && typeof status.connection?.email === 'string'
          ? status.connection.email : null);
      } catch {
        if (controller.signal.aborted) return;
        setEmail(null);
        setUnavailable(true);
      } finally {
        if (!controller.signal.aborted) setChecking(false);
      }
    })();
    return () => controller.abort();
  }, [refresh]);

  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
      <p role="status" className="min-w-0 break-all text-muted-foreground">
        {checking ? 'Checking Google connection…' : email ? <>Google account: <span className="font-medium text-foreground">{email}</span></>
          : unavailable ? 'Google connection check unavailable.' : 'Google Drive is not connected.'}
      </p>
      <button type="button" disabled={checking} onClick={() => setRefresh(value => value + 1)}
        className="min-h-11 rounded px-2 text-sm font-medium text-primary hover:bg-primary/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50">
        Check connection
      </button>
    </div>
  );
}

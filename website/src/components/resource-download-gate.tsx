"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, Loader2 } from "lucide-react";

interface ResourceDownloadGateProps {
  resourceTitle: string;
  resourceUrl: string;
  tagName?: string;
}

export function ResourceDownloadGate({ resourceTitle, resourceUrl, tagName }: ResourceDownloadGateProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");
  const [isSuccess, setIsSuccess] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          source: `resource_download_${tagName || resourceTitle}`,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || "Failed to subscribe. Please try again.");
        setIsSubmitting(false);
        return;
      }

      setIsSuccess(true);
      // Log download event
      await fetch("/api/resources/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          resourceTitle,
          resourceUrl,
        }),
      });

      // Redirect to download after short delay
      setTimeout(() => {
        window.location.href = resourceUrl;
      }, 500);
    } catch (err) {
      setError("Network error. Please try again.");
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="rounded-lg bg-honey/10 border border-honey/20 p-6 text-center">
        <p className="text-honey font-semibold">Preparing your download...</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-deep border border-honey/20 p-6">
      <h3 className="mb-2 text-xl font-bold text-text-on-dark">
        Download {resourceTitle}
      </h3>
      <p className="mb-6 text-text-on-dark/80">
        Enter your email to receive this free resource and join our newsletter for homeowner tips and maintenance reminders.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            required
            disabled={isSubmitting}
            className="w-full rounded-lg border border-text-on-dark/20 bg-deep px-4 py-3 text-text-on-dark placeholder:text-text-on-dark/50 focus:border-honey focus:outline-none focus:ring-1 focus:ring-honey disabled:opacity-50"
          />
        </div>

        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !email}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-honey px-6 py-3 font-semibold text-deep transition-colors hover:bg-honey/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Download className="h-5 w-5" />
              Download Free Guide
            </>
          )}
        </button>

        <p className="text-xs text-text-on-dark/60">
          No spam, ever. Unsubscribe anytime.
        </p>
      </form>
    </div>
  );
}

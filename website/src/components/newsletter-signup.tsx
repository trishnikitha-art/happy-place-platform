"use client";
import { TextCopy, useTextCopy } from '@/components/text-copy';


import * as React from "react";
import { useRouter } from "next/navigation";
import { Mail, Loader2 } from "lucide-react";

export function NewsletterSignup() {
  const router = useRouter();
  const failureCopy = useTextCopy("newsletter.failure");
  const networkFailureCopy = useTextCopy("newsletter.networkFailure");

  const emailPlaceholder = useTextCopy("newsletter.emailPlaceholder");
  const namePlaceholder = useTextCopy("newsletter.namePlaceholder");
  const [email, setEmail] = React.useState("");
  const [firstName, setFirstName] = React.useState("");
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
          firstName,
          source: "homepage",
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || failureCopy);
        setIsSubmitting(false);
        return;
      }

      setIsSuccess(true);
      // Redirect to thank you page after short delay
      setTimeout(() => {
        router.push("/newsletter/thank-you");
      }, 500);
    } catch (err) {
      setError(networkFailureCopy);
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="rounded-lg bg-honey/10 border border-honey/20 p-6 text-center">
        <p className="text-honey font-semibold"><TextCopy textKey="newsletter.submitting" /></p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-deep border border-honey/20 p-6">
      <h3 className="mb-2 text-2xl font-bold text-text-on-dark">
        <TextCopy textKey="newsletter.title" />
      </h3>
      <p className="mb-6 text-text-on-dark/80">
        <TextCopy textKey="newsletter.description" />
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={emailPlaceholder} data-text-key="newsletter.emailPlaceholder" data-text-attribute="placeholder"
            required
            disabled={isSubmitting}
            className="w-full rounded-lg border border-text-on-dark/20 bg-deep px-4 py-3 text-text-on-dark placeholder:text-text-on-dark/50 focus:border-honey focus:outline-none focus:ring-1 focus:ring-honey disabled:opacity-50"
          />
        </div>

        <div>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder={namePlaceholder} data-text-key="newsletter.namePlaceholder" data-text-attribute="placeholder"
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
              <TextCopy textKey="newsletter.submitting" />
            </>
          ) : (
            <>
              <Mail className="h-5 w-5" />
              <TextCopy textKey="newsletter.submit" />
            </>
          )}
        </button>

        <p className="text-xs text-text-on-dark/60">
          <TextCopy textKey="newsletter.privacy" />
        </p>
      </form>
    </div>
  );
}

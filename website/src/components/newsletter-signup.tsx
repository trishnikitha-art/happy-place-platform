"use client";
import { TextCopy, useTextCopy } from '@/components/text-copy';


import * as React from "react";
import { useRouter } from "next/navigation";
import { Mail, Loader2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function NewsletterSignup() {
  const router = useRouter();
  const failureCopy = useTextCopy("newsletter.failure");
  const networkFailureCopy = useTextCopy("newsletter.networkFailure");

  const emailPlaceholder = useTextCopy("newsletter.emailPlaceholder");
  const namePlaceholder = useTextCopy("newsletter.namePlaceholder");
  const formId = React.useId();
  const emailId = `${formId}-email`;
  const nameId = `${formId}-name`;
  const errorId = `${formId}-error`;
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
      <div role="status" className="rounded-lg bg-honey/10 border border-honey/20 p-6 text-center">
        <p className="text-base text-honey font-semibold"><TextCopy textKey="newsletter.submitting" /></p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-deep border border-honey/30 border-t-2 border-t-honey/60 p-6 shadow-card">
      <h3 className="mb-2 text-2xl font-bold text-text-on-dark">
        <TextCopy textKey="newsletter.title" />
      </h3>
      <p className="mb-6 text-base text-text-on-dark/80">
        <TextCopy textKey="newsletter.description" />
      </p>

      <form onSubmit={handleSubmit} aria-busy={isSubmitting} aria-describedby={error ? errorId : undefined} className="space-y-4">
        {/* Publishing verifies the first marked node; keep the input first while the live preview updates both copies. */}
        <div className="flex flex-col">
          <input
            id={emailId}
            name="email"
            type="email"
            autoComplete="email"
            aria-describedby={error ? errorId : undefined}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={emailPlaceholder} data-text-key="newsletter.emailPlaceholder" data-text-attribute="placeholder"
            required
            disabled={isSubmitting}
            className="order-2 w-full rounded-lg border border-text-on-dark/30 bg-black/10 px-4 py-3 text-base text-text-on-dark placeholder:text-text-on-dark/50 focus:border-honey focus:outline-none focus:ring-1 focus:ring-honey disabled:opacity-50"
          />
          <label htmlFor={emailId} className="order-1 mb-2 block text-sm font-semibold text-text-on-dark">
            <TextCopy textKey="newsletter.emailPlaceholder" />
          </label>
        </div>

        <div className="flex flex-col">
          <input
            id={nameId}
            name="firstName"
            type="text"
            autoComplete="given-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder={namePlaceholder} data-text-key="newsletter.namePlaceholder" data-text-attribute="placeholder"
            disabled={isSubmitting}
            className="order-2 w-full rounded-lg border border-text-on-dark/30 bg-black/10 px-4 py-3 text-base text-text-on-dark placeholder:text-text-on-dark/50 focus:border-honey focus:outline-none focus:ring-1 focus:ring-honey disabled:opacity-50"
          />
          <label htmlFor={nameId} className="order-1 mb-2 block text-sm font-semibold text-text-on-dark">
            <TextCopy textKey="newsletter.namePlaceholder" />
          </label>
        </div>

        {error && (
          <p id={errorId} role="alert" className="text-sm text-text-on-dark">{error}</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !email}
          className={cn(buttonVariants({ size: "md" }), "w-full rounded-lg bg-honey text-honey-foreground shadow-sm hover:bg-honey-hover focus-visible:ring-honey focus-visible:ring-offset-deep disabled:cursor-not-allowed")}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5" aria-hidden="true" />
              <TextCopy textKey="newsletter.submitting" />
            </>
          ) : (
            <>
              <Mail className="h-5 w-5" aria-hidden="true" />
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

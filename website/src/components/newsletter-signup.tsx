"use client";
import { TextCopy, useTextCopy } from '@/components/text-copy';


import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Mail, Loader2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMotion } from "@/components/motion-provider";
import { distance, duration, easing } from "@/motion/motionTokens";

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
  const feedbackRef = React.useRef<HTMLParagraphElement>(null);
  const redirectTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const { isMotionEnabled } = useMotion();

  React.useEffect(() => () => {
    if (redirectTimer.current) clearTimeout(redirectTimer.current);
  }, []);

  React.useEffect(() => {
    const feedback = feedbackRef.current;
    if ((!error && !isSuccess) || !isMotionEnabled || !feedback?.animate) return;
    const animation = feedback.animate([
      { opacity: 0.94, transform: `translateY(${distance.tiny}px)` },
      { opacity: 1, transform: 'none' },
    ], { duration: duration.fast * 1000, easing: `cubic-bezier(${easing.premium.join(',')})` });
    return () => animation.cancel();
  }, [error, isSuccess, isMotionEnabled]);

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
      setIsSubmitting(false);
      // Redirect to thank you page after short delay
      redirectTimer.current = setTimeout(() => {
        router.push("/newsletter/thank-you");
      }, 500);
    } catch (err) {
      setError(networkFailureCopy);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-lg bg-deep border border-honey/30 border-t-2 border-t-honey/60 p-6 shadow-card">
      <h3 className="mb-2 text-2xl font-bold text-text-on-dark">
        <TextCopy textKey="newsletter.title" />
      </h3>
      <p className="mb-6 text-base text-text-on-dark/80">
        <TextCopy textKey="newsletter.description" />
      </p>

      <form onSubmit={handleSubmit} aria-busy={isSubmitting} aria-describedby={error || isSuccess ? errorId : undefined} className="space-y-4">
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
            disabled={isSubmitting || isSuccess}
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
            disabled={isSubmitting || isSuccess}
            className="order-2 w-full rounded-lg border border-text-on-dark/30 bg-black/10 px-4 py-3 text-base text-text-on-dark placeholder:text-text-on-dark/50 focus:border-honey focus:outline-none focus:ring-1 focus:ring-honey disabled:opacity-50"
          />
          <label htmlFor={nameId} className="order-1 mb-2 block text-sm font-semibold text-text-on-dark">
            <TextCopy textKey="newsletter.namePlaceholder" />
          </label>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || isSuccess || !email}
          className={cn(buttonVariants({ size: "md" }), "w-full rounded-lg bg-honey text-honey-foreground shadow-sm hover:bg-honey-hover focus-visible:ring-honey focus-visible:ring-offset-deep disabled:cursor-not-allowed")}
        >
          {isSuccess ? (
            <>
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              <TextCopy textKey="newsletter.submitting" />
            </>
          ) : isSubmitting ? (
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

        <p
          ref={feedbackRef}
          id={errorId}
          role={isSuccess ? "status" : error ? "alert" : undefined}
          className={cn("control-motion-feedback min-h-18", error || isSuccess ? "text-sm text-text-on-dark" : "text-xs text-text-on-dark/80")}
        >
          {isSuccess ? <TextCopy textKey="newsletter.submitting" /> : error || <TextCopy textKey="newsletter.privacy" />}
        </p>
      </form>
    </div>
  );
}

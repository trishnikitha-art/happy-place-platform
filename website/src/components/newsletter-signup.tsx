"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, Check, Loader2, Mail } from "lucide-react";
import { TextCopy, useTextCopy } from "@/components/text-copy";
import { newsletterSucceeded, subscribeToNewsletter, type NewsletterResult } from "@/services/newsletter";
import { cn } from "@/lib/utils";

export interface NewsletterSignupProps {
  source?: string;
  variant?: "card" | "inline";
  className?: string;
  title?: string;
  description?: string;
}

/** Uses only the existing subscription path; a page visit never implies signup. */
export function NewsletterSignup({
  source = "homepage",
  variant = "card",
  className,
  title,
  description,
}: NewsletterSignupProps = {}) {
  const formId = React.useId();
  const emailRef = React.useRef<HTMLInputElement>(null);
  const pending = React.useRef(false);
  const emailPlaceholder = useTextCopy("newsletter.emailPlaceholder");
  const namePlaceholder = useTextCopy("newsletter.namePlaceholder");
  const [email, setEmail] = React.useState("");
  const [firstName, setFirstName] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [result, setResult] = React.useState<NewsletterResult | null>(null);
  const success = result !== null && newsletterSucceeded(result);
  const invalid = result?.kind === "invalid";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setResult(null);
    setIsSubmitting(true);
    const nextResult = await subscribeToNewsletter({ email, firstName, source }, window.location.search);
    setResult(nextResult);
    setIsSubmitting(false);
    pending.current = false;
    if (nextResult.kind === "invalid") emailRef.current?.focus();
  }

  return (
    <div className={cn(
      "relative overflow-hidden text-text-on-dark",
      variant === "card" ? "rounded-sm border border-text-on-dark/15 bg-deep p-6 sm:p-10" : "bg-transparent",
      className,
    )}>
      {variant === "card" && <span aria-hidden="true" className="absolute left-0 top-0 h-16 w-16 border-l-2 border-t-2 border-honey" />}
      <div className="mb-6 flex items-center gap-3 text-honey">
        <Mail aria-hidden="true" className="h-5 w-5" />
        <p className="text-xs font-semibold uppercase tracking-[0.2em]">Notes from Happy Place</p>
      </div>
      <h2 id={`${formId}-title`} className="max-w-xl font-display text-3xl leading-tight sm:text-4xl">
        {title || <TextCopy textKey="newsletter.title" />}
      </h2>
      <p className="mb-7 mt-4 max-w-xl text-base leading-relaxed text-text-on-dark/80">{description || <TextCopy textKey="newsletter.description" />}</p>

      {success ? (
        <div role="status" aria-live="polite" className="border-t border-text-on-dark/20 pt-6">
          <Check aria-hidden="true" className="mb-3 h-6 w-6 text-honey" />
          <p className="max-w-xl text-lg leading-relaxed">{result.message}</p>
          <button type="button" className="mt-4 min-h-11 text-sm font-semibold underline decoration-honey underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-honey" onClick={() => { setEmail(""); setFirstName(""); setResult(null); }}>
            Use a different email
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} aria-labelledby={`${formId}-title`} aria-busy={isSubmitting} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor={`${formId}-email`} className="mb-2 block text-sm font-medium">Email address</label>
              <input
                type="email" id={`${formId}-email`} name="email" ref={emailRef}
                value={email} onChange={(event) => setEmail(event.target.value)}
                placeholder={emailPlaceholder} data-text-key="newsletter.emailPlaceholder" data-text-attribute="placeholder"
                required autoComplete="email" maxLength={254} disabled={isSubmitting}
                aria-invalid={invalid || undefined} aria-describedby={result ? `${formId}-result` : `${formId}-consent`}
                className="min-h-12 w-full rounded-sm border border-text-on-dark/35 bg-white/5 px-4 py-3 text-base text-text-on-dark placeholder:text-text-on-dark/55 focus:border-honey focus:outline-none focus:ring-2 focus:ring-honey disabled:opacity-60"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor={`${formId}-name`} className="mb-2 block text-sm font-medium">First name <span className="font-normal text-text-on-dark/65">(optional)</span></label>
              <input
                type="text" id={`${formId}-name`} name="given-name" value={firstName} onChange={(event) => setFirstName(event.target.value)}
                placeholder={namePlaceholder} data-text-key="newsletter.namePlaceholder" data-text-attribute="placeholder"
                autoComplete="given-name" maxLength={100} disabled={isSubmitting}
                className="min-h-12 w-full rounded-sm border border-text-on-dark/35 bg-white/5 px-4 py-3 text-base text-text-on-dark placeholder:text-text-on-dark/55 focus:border-honey focus:outline-none focus:ring-2 focus:ring-honey disabled:opacity-60"
              />
            </div>
          </div>

          {result && <p id={`${formId}-result`} role="alert" className="border-l-2 border-honey pl-3 text-sm leading-relaxed text-text-on-dark">{result.message}</p>}

          <button type="submit" disabled={isSubmitting} className="flex min-h-12 w-full items-center justify-between gap-3 rounded-sm bg-honey px-5 py-3 text-left font-semibold text-deep transition-colors hover:bg-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-honey disabled:cursor-wait disabled:opacity-70">
            {isSubmitting ? <><TextCopy textKey="newsletter.submitting" /><Loader2 aria-hidden="true" className="h-5 w-5 animate-spin motion-reduce:animate-none" /></> : <><span>{result ? "Try signup again" : <TextCopy textKey="newsletter.submit" />}</span><ArrowUpRight aria-hidden="true" className="h-5 w-5" /></>}
          </button>
          <p id={`${formId}-consent`} className="text-xs leading-relaxed text-text-on-dark/70">
            By subscribing, you’re asking to receive Happy Place Carpentry emails. <TextCopy textKey="newsletter.privacy" />{" "}
            <Link href="/privacy" className="underline underline-offset-4 hover:text-white">Privacy policy</Link>.
          </p>
          <noscript><p className="text-sm">This signup needs JavaScript. You can <a href="/contact" className="underline">contact us directly</a>.</p></noscript>
        </form>
      )}
      <p className="mt-6 text-sm leading-relaxed text-text-on-dark/75">
        Have a project in mind? <Link href="/contact" className="inline-flex min-h-11 items-center font-semibold text-text-on-dark underline decoration-honey underline-offset-4 hover:text-honey">Talk to us directly</Link>.
      </p>
    </div>
  );
}

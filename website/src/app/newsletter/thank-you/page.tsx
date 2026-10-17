import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Newsletter signup",
  description: "Find the Happy Place Carpentry newsletter signup and explore our work.",
  alternates: { canonical: "/newsletter" },
  robots: { index: false, follow: true },
};

/** Legacy destination: direct navigation cannot establish subscription status. */
export default function NewsletterThankYouPage() {
  return (
    <div className="craft-page">
      <section className="craft-section">
        <div className="craft-shell">
          <div className="max-w-3xl">
            <Mail aria-hidden="true" className="mb-7 h-8 w-8 text-primary" />
            <p className="craft-eyebrow">Notes from Happy Place</p>
            <h1 className="craft-title mt-5">Thanks for your interest.</h1>
            <p className="craft-copy mt-6 max-w-xl text-lg">
              Your signup result appears on the form when you submit it. If you haven’t signed up, or need to try again, you can return to the newsletter form.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/newsletter" className="craft-button craft-button--gold">Newsletter signup <ArrowUpRight aria-hidden="true" className="h-4 w-4" /></Link>
              <Link href="/our-work" className="craft-button craft-button--outline">Explore our work</Link>
            </div>
            <div className="mt-12 border-t border-border-soft pt-6">
              <p className="craft-copy">Have a project question? <Link href="/contact" className="craft-link inline-flex min-h-11 items-center">Contact Happy Place directly</Link>.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { NewsletterSignup } from "@/components/newsletter-signup";
import { TextCopy } from "@/components/text-copy";

export const metadata: Metadata = {
  title: "Notes from Happy Place",
  description: "Sign up for practical homeowner tips and updates from Happy Place Carpentry, or get in touch about your next project.",
  alternates: { canonical: "/newsletter" },
};

export default async function NewsletterPage({ searchParams }: { searchParams: Promise<{ source?: string }> }) {
  const query = await searchParams;
  const source = typeof query.source === 'string' && /^[a-z0-9-]{1,80}$/.test(query.source) ? query.source : 'newsletter';
  return (
    <div className="craft-page">
      <section className="craft-section overflow-hidden">
        <div className="craft-shell">
          <div className="grid items-start gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
            <div className="max-w-2xl pt-2 lg:pt-8">
              <p className="craft-eyebrow">Notes from Happy Place</p>
              <h1 className="craft-display mt-5"><TextCopy textKey="newsletter.title" /></h1>
              <p className="craft-copy mt-7 max-w-lg text-lg sm:text-xl">
                For the home you have, and the projects you’re planning. A place for practical ideas and a closer look at the work.
              </p>
              <div className="mt-10 border-t border-border-soft pt-6">
                <p className="text-sm font-semibold text-primary">Looking for help with a project?</p>
                <p className="craft-copy mt-2 max-w-md">You don’t need to subscribe to ask a question or talk about your home.</p>
                <Link href="/contact" className="craft-link mt-4 inline-flex min-h-11 items-center gap-2">
                  Talk to Happy Place <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              </div>
            </div>
            <NewsletterSignup source={source} title="A little Happy Place in your inbox." />
          </div>
        </div>
      </section>

      <section className="border-t border-border-soft bg-cream/40 py-12 sm:py-16">
        <div className="craft-shell grid gap-8 md:grid-cols-2 md:gap-16">
          <div>
            <p className="craft-eyebrow">See the craftsmanship</p>
            <h2 className="mt-3 font-display text-3xl text-primary sm:text-4xl">Good ideas start with real work.</h2>
            <p className="craft-copy mt-4 max-w-md">Explore the details, materials and finished spaces in our project collection.</p>
            <Link href="/our-work" className="craft-link mt-4 inline-flex min-h-11 items-center gap-2">See our work <ArrowUpRight aria-hidden="true" className="h-4 w-4" /></Link>
          </div>
          <div className="border-t border-border-soft pt-8 md:border-l md:border-t-0 md:pl-12 md:pt-0">
            <p className="craft-eyebrow">Find your next step</p>
            <h2 className="mt-3 font-display text-3xl text-primary sm:text-4xl">What does home need?</h2>
            <p className="craft-copy mt-4 max-w-md">Find the kind of help you’re looking for, from a useful repair to a more considered transformation.</p>
            <Link href="/services" className="craft-link mt-4 inline-flex min-h-11 items-center gap-2">Explore our services <ArrowUpRight aria-hidden="true" className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>
    </div>
  );
}

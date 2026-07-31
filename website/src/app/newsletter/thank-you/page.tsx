import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Container, Section, SectionHeading } from "@/components/section";
import { CTASection } from "@/components/cta-section";
import { getCompany } from "@/lib/company";

export const metadata: Metadata = {
  title: "Newsletter Subscription Confirmed",
  description: "You're subscribed to Happy Place Carpentry's homeowner tips and maintenance reminders.",
  alternates: { canonical: "/newsletter/thank-you" },
};

export default function NewsletterThankYouPage() {
  const company = getCompany();

  return (
    <>
      <Section className="bg-deep">
        <Container className="max-w-3xl text-center">
          <div className="mb-8 flex items-center justify-center gap-3">
            <span className="relative block h-10 w-auto">
              <Image src="/brand/logo.png" alt="Happy Place Carpentry logo" width={120} height={40} className="h-full w-auto" />
            </span>
          </div>
          <SectionHeading
            eyebrow={<span className="text-honey">You're in!</span>}
            title={<span className="text-text-on-dark">Welcome to the Happy Place community</span>}
            description={<span className="text-text-on-dark/90">Check your inbox for a confirmation email. You'll start receiving practical homeowner tips, seasonal maintenance reminders, and project inspiration soon.</span>}
          />
        </Container>
      </Section>

      <Section>
        <Container className="max-w-3xl">
          <div className="prose prose-lg mx-auto">
            <h3>What you'll receive:</h3>
            <ul>
              <li><strong>Seasonal maintenance reminders</strong> — Keep your home in top shape year-round</li>
              <li><strong>Remodeling ideas & inspiration</strong> — Before-and-after project showcases</li>
              <li><strong>Practical homeowner tips</strong> — DIY guidance from professional carpenters</li>
              <li><strong>Exclusive offers</strong> — First access to special promotions for subscribers</li>
            </ul>

            <h3>Explore more:</h3>
            <p>
              Browse our <Link href="/our-work" className="text-honey hover:underline">completed projects</Link> for inspiration, 
              or download our free <Link href="/resources" className="text-honey hover:underline">homeowner guides</Link> with 
              maintenance checklists and budget planners.
            </p>

            <h3>Ready to start your project?</h3>
            <p>
              Get a free estimate in minutes — no obligation, no pressure. We'll scope your project and provide a detailed 
              proposal tailored to your needs and budget.
            </p>

            <div className="mt-8">
              <Link
                href="/estimate"
                className="inline-flex items-center justify-center rounded-lg bg-honey px-8 py-4 font-semibold text-deep transition-colors hover:bg-honey/90"
              >
                Get Your Free Estimate
              </Link>
            </div>
          </div>
        </Container>
      </Section>

      <CTASection />
    </>
  );
}

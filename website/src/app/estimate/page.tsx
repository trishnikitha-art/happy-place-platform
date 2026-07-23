import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import { Container, Section, SectionHeading } from "@/components/section";
import { EstimateWizard } from "@/components/estimate-wizard";
import { getCompany } from "@/lib/company";

export const metadata: Metadata = {
  title: "Free Estimate",
  description:
    "Get a free carpentry estimate in minutes — pick a service, upload photos, answer a few questions, and we'll be in touch.",
  alternates: { canonical: "/estimate" },
};

export default function EstimatePage() {
  const company = getCompany();

  return (
    <Section>
      <Container className="max-w-3xl">
        <div className="mb-8 flex items-center justify-center gap-3">
          <span className="relative block h-10 w-auto">
            <Image src="/brand/logo.png" alt="Happy Place Carpentry logo" width={120} height={40} className="h-full w-auto" />
          </span>
        </div>
        <SectionHeading
          eyebrow="Free estimate"
          title="Let's scope your project"
          description="About two minutes. Your details go straight to our inbox — no account, no spam."
        />
        <div className="mt-8">
          <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl border border-border bg-surface" />}>
            <EstimateWizard />
          </Suspense>
        </div>
        <p className="mt-6 text-center text-sm text-text-subtle">
          Prefer to talk? Call {company.phoneDisplay} or email {company.email}.
        </p>
      </Container>
    </Section>
  );
}

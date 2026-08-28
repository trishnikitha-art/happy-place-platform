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

export const dynamic = 'force-dynamic';

export default function EstimatePage() {
  const company = getCompany();

  return (
    <Section className="bg-deep">
      <Container className="max-w-3xl">
        <div className="mb-8 flex items-center justify-center gap-3">
          <span className="relative block h-10 w-auto">
            <Image src="/brand/logo.png" alt="Happy Place Carpentry logo" width={120} height={40} className="h-full w-auto" />
          </span>
        </div>
        <SectionHeading
          eyebrow={<span className="text-honey">Free estimate</span>}
          title={<span className="text-text-on-dark">Let's scope your project</span>}
          description={<span className="text-text-on-dark/90">About two minutes. Your details go straight to our inbox — no account, no spam.</span>}
        />
        <div className="mt-8">
          <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl border border-border bg-surface" />}>
            <EstimateWizard />
          </Suspense>
        </div>
        <p className="mt-6 text-center text-sm text-text-on-dark">
          Prefer to talk? Call {company.phoneDisplay} or email {company.email}.
        </p>
      </Container>
    </Section>
  );
}

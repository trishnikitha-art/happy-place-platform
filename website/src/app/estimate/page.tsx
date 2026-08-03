import type { Metadata } from "next";
import Link from "next/link";
import { Phone, Mail, ArrowLeft } from "lucide-react";
import { Container, Section, SectionHeading } from "@/components/section";
import { getCompany } from "@/lib/company";

export const metadata: Metadata = {
  title: "Get a Free Estimate | Happy Place Carpentry",
  description: "Contact Happy Place Carpentry directly for a free estimate on your carpentry project.",
  alternates: { canonical: "/estimate" },
};

export default function EstimatePage() {
  const company = getCompany();

  return (
    <Section className="bg-[#F6F4F0]">
      <Container className="max-w-4xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="text-center mb-12">
          <SectionHeading
            eyebrow={<span className="text-honey">Contact Us</span>}
            title={<span className="text-primary">Get a Free Estimate</span>}
            description={<span className="text-text/80">We're currently updating our estimate process. For now, please contact us directly for a free estimate on your carpentry project.</span>}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <Link
            href={`tel:${company.phone}`}
            className="flex items-center gap-4 p-8 rounded-lg border border-border-soft bg-surface hover:bg-surface-hover transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Phone className="w-6 h-6 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-primary text-lg">Call Us</p>
              <p className="text-text/70">{company.phoneDisplay}</p>
            </div>
          </Link>

          <Link
            href={`mailto:${company.email}`}
            className="flex items-center gap-4 p-8 rounded-lg border border-border-soft bg-surface hover:bg-surface-hover transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-primary text-lg">Email Us</p>
              <p className="text-text/70">{company.email}</p>
            </div>
          </Link>
        </div>

        <div className="text-center text-sm text-text/60 border-t border-border-soft pt-8">
          <p className="mb-2">Mon–Fri 8am–5pm · Sat by appointment</p>
          <p>Serving Benton, Linn, Marion, and Polk Counties, Oregon</p>
        </div>
      </Container>
    </Section>
  );
}

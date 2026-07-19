import type { Metadata } from "next";
import { Container, Section } from "@/components/section";
import { company } from "@/config/company";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Happy Place Carpentry handles your information.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <Section>
      <Container className="max-w-3xl">
        <h1 className="text-3xl font-bold text-text">Privacy Policy</h1>
        <p className="mt-4 text-sm text-text-subtle">Last updated: {new Date().getFullYear()}</p>
        <div className="mt-8 space-y-6 text-text-muted">
          <section>
            <h2 className="text-xl font-bold text-text">Information we collect</h2>
            <p className="mt-2">
              When you submit an estimate request or contact form, we collect the information you
              provide — your name, contact details, property information, and the details of your
              project. Photos you upload are included only in the email you choose to send.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-text">How we use it</h2>
            <p className="mt-2">
              We use your information solely to respond to your request, prepare an estimate, and
              communicate about your project. We do not sell your information.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-text">Contact</h2>
            <p className="mt-2">
              Questions about your data? Email {company.email} or call {company.phoneDisplay}.
            </p>
          </section>
        </div>
      </Container>
    </Section>
  );
}

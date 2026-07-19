import type { Metadata } from "next";
import { Container, Section, SectionHeading } from "@/components/section";
import { CTASection } from "@/components/cta-section";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Common questions about estimates, permits, service area, materials, and warranties.",
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  const items = [
    { q: "Are you licensed and insured?", a: "Yes — Oregon CCB# 254240 and fully insured." },
    { q: "What areas do you serve?", a: "Benton, Linn, Marion, and Polk Counties." },
    { q: "How do estimates work?", a: "Use the free estimate wizard; we follow up to schedule a walk-through and give a written estimate." },
    { q: "Do you handle permits?", a: "Yes, for decks, fences, and structural work." },
    { q: "What materials do you use?", a: "Cedar, pressure-treated, composite, wood/vinyl/metal fencing, and standard cabinetry." },
    { q: "Do you warranty your work?", a: "Yes — workmanship warranty plus manufacturer material warranties." },
  ];
  return (
    <>
      <Section>
        <Container>
          <SectionHeading eyebrow="FAQ" title="Questions, answered" />
          <div className="mt-8 divide-y divide-stone-200 border-y border-stone-200">
            {items.map((it) => (
              <details key={it.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-stone-900">
                  {it.q}
                  <span className="text-amber-600 transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-stone-600">{it.a}</p>
              </details>
            ))}
          </div>
        </Container>
      </Section>
      <CTASection />
    </>
  );
}

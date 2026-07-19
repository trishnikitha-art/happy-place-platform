import type { Metadata } from "next";
import { Container, Section, SectionHeading } from "@/components/section";
import { GalleryLightbox } from "@/components/gallery-lightbox";
import { CTASection } from "@/components/cta-section";
import { mockGalleryService } from "@/services/gallery";

export const metadata: Metadata = {
  title: "Our Work",
  description: "Project gallery — decks, fences, pergolas, kitchens, baths, and custom carpentry across the Willamette Valley.",
  alternates: { canonical: "/gallery" },
};

export default function GalleryPage() {
  const items = mockGalleryService.all();
  return (
    <>
      <Section className="bg-stone-50">
        <Container>
          <SectionHeading
            eyebrow="Our Work"
            title="Happy places we've built"
            description="Real projects from Benton, Linn, Marion, and Polk Counties. Tap a service below to filter."
          />
          <div className="mt-10">
            <GalleryLightbox items={items} />
          </div>
        </Container>
      </Section>
      <CTASection />
    </>
  );
}

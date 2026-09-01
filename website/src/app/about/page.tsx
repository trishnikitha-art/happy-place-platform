import type { Metadata } from "next";
import Image from "next/image";
import { Container, Section, SectionHeading } from "@/components/section";
import { CTASection } from "@/components/cta-section";
import { HappyBrandSignature } from "@/components/happy-brand-signature";
import { getCompany } from "@/lib/company";
import { getOwnerPortrait } from "@/lib/brand";
import { getAllCities } from "@/lib/registries";
import { VisualSlot } from "@/components/visual-slot";
import { getServiceCardAssignment } from "@/lib/assignment-store";
import { resolvePublicMedia } from "@/lib/media";
import type { Media } from "@/types/media";

export const metadata: Metadata = {
  title: "About",
  description: `About Happy Place Carpentry — the family behind Happy Place Carpentry, helping homeowners across the mid-Willamette Valley find their happy place.`,
  alternates: { canonical: "/about" },
};

export const dynamic = 'force-dynamic';

export default async function AboutPage() {
  const company = getCompany();
  const cities = getAllCities();
  const ownerBrand = await getOwnerPortrait();
  
  // Diagnostic: Log the actual assignment state for brand-portrait
  console.log('[ABOUT_PAGE] OWNER_PORTRAIT_DIAGNOSTIC', {
    hasOwnerBrand: !!ownerBrand,
    mediaId: ownerBrand?.mediaId,
    hasResolvedMedia: !!ownerBrand?.resolvedMedia,
    resolvedMediaId: ownerBrand?.resolvedMedia?.id,
  });
  
  // P1 FIX: Use pre-validated resolvedMedia from brand function (passed public media gate)
  // This prevents bypassing the public media gate by calling getMediaById directly
  const ownerMedia = ownerBrand?.resolvedMedia || null;
  const ownerSrc = ownerMedia?.variants?.web || ownerMedia?.variants?.original;

  // P0 FIX: Resolve bottom visual slot through authoritative assignment path
  let bottomVisualMediaId: string | null = null;
  let bottomVisualMedia: Media | null = null;
  try {
    const bottomVisualAssignment = await getServiceCardAssignment('about-bottom-visual', 'about');
    if (bottomVisualAssignment?.mediaId && bottomVisualAssignment.mediaId !== '') {
      const resolvedMedia = await resolvePublicMedia(bottomVisualAssignment.mediaId);
      if (resolvedMedia) {
        bottomVisualMediaId = bottomVisualAssignment.mediaId;
        bottomVisualMedia = resolvedMedia;
        console.log('[PUBLIC_MEDIA_GATE] BOTTOM_VISUAL_RESOLUTION', {
          slotId: 'about-bottom-visual-slot',
          mediaId: bottomVisualMediaId,
          resolved: true,
        });
      } else {
        console.log('[PUBLIC_MEDIA_GATE] BOTTOM_VISUAL_REJECTED', {
          slotId: 'about-bottom-visual-slot',
          rejectedMediaId: bottomVisualAssignment.mediaId,
        });
      }
    }
  } catch (error) {
    console.error('[BOTTOM_VISUAL_ASSIGNMENT] ERROR', {
      slotId: 'about-bottom-visual-slot',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
  
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-deep text-text-on-dark">
        <div className="absolute inset-0 bg-gradient-to-br from-deep via-deep to-primary/30" />
        <Container className="relative grid items-center gap-10 py-20 lg:grid-cols-2">
          <div>
            <div className="mb-6 flex items-center gap-3">
              <span className="relative block h-12 w-auto">
                <Image src="/brand/logo.png" alt="Happy Place Carpentry logo" width={144} height={48} className="h-full w-auto" />
              </span>
            </div>
            <p className="text-sm font-semibold uppercase text-honey" style={{ letterSpacing: '0.12em' }}>Family-owned · {company.ccbNumber}</p>
            <h1 className="mt-3 font-display text-4xl font-bold sm:text-5xl text-text-on-dark" style={{ lineHeight: 'var(--leading-display)', letterSpacing: 'var(--tracking-display)' }}>
              Every family deserves a <HappyBrandSignature /> place.
            </h1>
            <p className="measure mt-5 text-lg text-text-on-dark/90" style={{ lineHeight: 'var(--leading-body)', letterSpacing: 'var(--tracking-body)' }}>
              {company.name} isn&apos;t built around sales teams, project managers, or handoffs. It&apos;s built around one family that believes your home should become your happy place. From your first conversation to the final walkthrough, you&apos;ll work directly with the people doing the work—people who care about every detail as much as you do.
            </p>
            <p className="mt-6 font-display text-xl text-text-on-dark/90" style={{ lineHeight: 'var(--leading-display)', letterSpacing: 'var(--tracking-display)' }}>
              Build it right. Explain it clearly. Stand behind the work.
            </p>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-card photo-mounted">
            {ownerSrc && (
              <VisualSlot
                id="about-owner-portrait-slot"
                route="/about"
                page="About"
                section="Hero"
                slotName="Owner Portrait"
                currentMediaId={ownerBrand?.mediaId || null}
                component="AboutSection"
              >
                <Image src={ownerSrc} alt="Portrait of Taylor and Lanie, the owners of Happy Place Carpentry, standing together in front of a completed carpentry project" fill sizes="(max-width: 1024px) 100vw, 50vw" className="h-full w-full object-cover" />
              </VisualSlot>
            )}
          </div>
        </Container>
      </section>

      {/* SERVICE AREA */}
      <Section className="bg-white">
        <Container>
          <SectionHeading eyebrow="Where we work" title="Serving the mid-Willamette Valley" />
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cities.map((c) => (
              <div key={c.id} className="rounded-2xl border border-border/40 bg-[#F8F6F3] p-5">
                <h3 className="font-bold text-primary">{c.name}</h3>
                <p className="mt-2 text-sm text-[#000000]">{c.county}, Oregon</p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* BOTTOM VISUAL — real media-bearing slot before CTA */}
      <Section className="relative bg-[#F0ECE5]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#F0ECE5] via-[#EDE9E0] to-[#E8E5DC] opacity-100" aria-hidden="true" />
        <Container className="relative z-10">
          <VisualSlot
            id="about-bottom-visual-slot"
            route="/about"
            page="About"
            section="Bottom Visual"
            slotName="Bottom Visual"
            currentMediaId={bottomVisualMediaId}
            component="BottomVisual"
          >
            {bottomVisualMedia && bottomVisualMedia.variants?.web ? (
              <div className="relative aspect-[16/9] overflow-hidden rounded-card photo-mounted">
                <Image
                  src={bottomVisualMedia.variants.web}
                  alt={bottomVisualMedia.alt || "Happy Place Carpentry - Bottom visual"}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="relative aspect-[16/9] overflow-hidden rounded-card photo-muted">
                {/* No media assigned or media failed public gate */}
              </div>
            )}
          </VisualSlot>
        </Container>
      </Section>

      <CTASection
        title="Ready to love coming home again?"
        subtitle="Let's start building your happy place."
      />
    </>
  );
}

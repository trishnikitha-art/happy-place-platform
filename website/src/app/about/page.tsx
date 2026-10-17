import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { TextCopy } from '@/components/text-copy';
import { HappyBrandSignature } from '@/components/happy-brand-signature';
import { CedarCorner } from '@/components/cedar-corner';
import { VisualSlot } from '@/components/visual-slot';
import { PreviewOnly } from '@/components/workbench/preview-only';
import { getCompany } from '@/lib/company';
import { getOwnerPortrait } from '@/lib/brand';
import { getAllCities } from '@/lib/registries';
import { getServiceCardAssignment } from '@/lib/assignment-store';
import { resolvePublicMedia } from '@/lib/media';
import type { Media } from '@/types/media';

export const metadata: Metadata = {
  title: 'About',
  description: 'About Happy Place Carpentry — the family behind Happy Place Carpentry, helping homeowners across the mid-Willamette Valley find their happy place.',
  alternates: { canonical: '/about' },
};
export const dynamic = 'force-dynamic';

export default async function AboutPage() {
  const company = getCompany();
  const cities = getAllCities();
  const ownerBrand = await getOwnerPortrait();
  const ownerMedia = ownerBrand?.resolvedMedia || null;
  const ownerSrc = ownerMedia?.variants?.web || ownerMedia?.variants?.original;
  let bottomVisualMediaId: string | null = null;
  let bottomVisualMedia: Media | null = null;
  try {
    const assignment = await getServiceCardAssignment('about-bottom-visual', 'about');
    if (assignment?.mediaId) {
      const media = await resolvePublicMedia(assignment.mediaId);
      if (media) { bottomVisualMediaId = assignment.mediaId; bottomVisualMedia = media; }
    }
  } catch (error) {
    console.error('[BOTTOM_VISUAL_ASSIGNMENT] ERROR', error);
  }

  return (
    <div className="craft-page bg-[#EDEAE0] text-[#1F3F3C]">
      <section className="craft-shell pb-16 pt-12 sm:pb-24 sm:pt-20">
        <p className="craft-eyebrow"><TextCopy textKey="about.familyLabel" /> <span className="ml-2">{company.ccbNumber}</span></p>
        <h1 className="craft-display mt-6 max-w-5xl"><TextCopy textKey="about.hero.prefix" /><HappyBrandSignature /><TextCopy textKey="about.hero.suffix" /></h1>
        <div className={`mt-12 grid items-center gap-10 lg:gap-20 ${ownerSrc ? 'lg:grid-cols-[1.1fr_0.9fr]' : ''}`}>
          {ownerSrc && ownerMedia ? <figure className="relative">
            <CedarCorner className="absolute -left-3 -top-3 z-10 h-12 w-12 text-[#9A6829] sm:-left-5 sm:-top-5 sm:h-16 sm:w-16" />
            <VisualSlot id="about-owner-portrait-slot" route="/about" page="About" section="Hero" slotName="Owner Portrait" currentMediaId={ownerBrand?.mediaId || null} component="AboutSection">
              <Image src={ownerSrc} alt={ownerMedia.alt || 'Taylor and Lanie, owners of Happy Place Carpentry'} width={ownerMedia.dimensions?.width || 1200} height={ownerMedia.dimensions?.height || 900} sizes="(min-width: 1024px) 55vw, 100vw" priority placeholder={ownerMedia.variants?.blur ? 'blur' : 'empty'} blurDataURL={ownerMedia.variants?.blur} className="h-auto max-h-[740px] w-full object-contain" />
            </VisualSlot>
            <figcaption className="mt-4 text-sm text-[#1F3F3C]/75">{company.owners.map(owner => owner.name).join(' & ')} <span className="mx-2" aria-hidden="true">/</span> Happy Place Carpentry</figcaption>
          </figure> : null}
          <div className="max-w-2xl">
            <p className="craft-copy text-lg leading-relaxed">{company.name}<TextCopy textKey="about.hero.description" /></p>
            <blockquote className="mt-8 border-l-2 border-[#D99A4E] pl-6 font-display text-3xl leading-tight sm:text-4xl"><TextCopy textKey="about.hero.promise" /></blockquote>
            <Link href="/our-work" className="craft-link mt-8 inline-flex min-h-11 items-center">See the work <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
      </section>

      <section className="craft-section bg-[#162B29] text-[#EDEAE0]">
        <div className="craft-shell grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-24">
          <div>
            <p className="craft-eyebrow text-[#D99A4E]"><TextCopy textKey="about.area.eyebrow" /></p>
            <h2 className="mt-6 font-display text-4xl leading-tight sm:text-5xl"><TextCopy textKey="about.area.title" /></h2>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-[#EDEAE0]/80"><TextCopy textKey="company.serviceArea" /></p>
            <Link href="/estimate" className="craft-button craft-button--gold mt-8">Tell us where your project is <span aria-hidden="true">↗</span></Link>
          </div>
          <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
            {cities.map(city => <div key={city.id} className="border-t border-[#EDEAE0]/20 py-6 sm:py-8"><h3 className="font-display text-3xl">{city.name}</h3><p className="mt-3 text-sm text-[#EDEAE0]/70">{city.county}, Oregon</p></div>)}
          </div>
        </div>
      </section>

      {bottomVisualMedia?.variants?.web ? <section className="craft-shell pt-16 sm:pt-24">
        <VisualSlot id="about-bottom-visual-slot" route="/about" page="About" section="Bottom Visual" slotName="Bottom Visual" currentMediaId={bottomVisualMediaId} component="BottomVisual">
          <Image src={bottomVisualMedia.variants.web} alt={bottomVisualMedia.alt || 'Happy Place Carpentry project'} width={bottomVisualMedia.dimensions?.width || 1400} height={bottomVisualMedia.dimensions?.height || 900} sizes="(min-width: 1440px) 1280px, 100vw" className="max-h-[720px] w-full object-contain" />
        </VisualSlot>
      </section> : <PreviewOnly><section className="craft-shell pt-10"><VisualSlot id="about-bottom-visual-slot" route="/about" page="About" section="Bottom Visual" slotName="Bottom Visual" currentMediaId={null} component="BottomVisual"><div className="flex h-24 items-center justify-center border border-dashed border-[#1F3F3C]/30 text-sm">Choose an About image</div></VisualSlot></section></PreviewOnly>}

      <section className="craft-section">
        <div className="craft-shell grid gap-8 lg:grid-cols-[1.4fr_0.6fr] lg:items-end lg:gap-20">
          <div><p className="craft-eyebrow">Your happy place</p><h2 className="craft-title mt-5 max-w-3xl"><TextCopy textKey="about.cta.title" /></h2><p className="craft-copy mt-5"><TextCopy textKey="about.cta.description" /></p></div>
          <div className="flex flex-col items-start gap-5"><Link href="/estimate" className="craft-button">Talk about your project <span aria-hidden="true">↗</span></Link><Link href="/services" className="craft-link inline-flex min-h-11 items-center">Explore our services <span aria-hidden="true">↗</span></Link><Link href="/newsletter?source=about" className="inline-flex min-h-11 items-center text-sm underline underline-offset-4">Homeowner notes by email</Link></div>
        </div>
      </section>
    </div>
  );
}

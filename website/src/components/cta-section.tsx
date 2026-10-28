import { TextCopy } from '@/components/text-copy';
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Container, Section } from "@/components/section";

/** Public call-to-action: opens the published business contact methods. */
export function CTASection({
  title = <TextCopy textKey="cta.title" />,
  subtitle = <TextCopy textKey="cta.description" />,
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
}) {
  return (
    <Section className="relative bg-[#EFECE5]">
      <div className="absolute inset-0 bg-gradient-to-br from-[#EFECE5] via-[#EAE8E0] to-[#E5E2D9] opacity-100" aria-hidden="true" />
      <Container className="relative z-10 flex flex-col items-center text-center">
        <h2 className="text-3xl font-bold text-primary sm:text-4xl" style={{ lineHeight: 'var(--leading-display)', letterSpacing: 'var(--tracking-display)' }}>
          {typeof title === 'string' ? title : title}
        </h2>
        <p className="mt-4 max-w-2xl text-lg text-[#000000]" style={{ lineHeight: 'var(--leading-body)', letterSpacing: 'var(--tracking-body)' }}>{typeof subtitle === 'string' ? subtitle : subtitle}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/contact" className={buttonVariants({ variant: "primary", size: "lg" })}>
            <TextCopy textKey="cta.primaryAction" />
          </Link>
          <Link href="/our-work" className={buttonVariants({ variant: "outline", size: "lg" })}>
            <TextCopy textKey="cta.secondaryAction" />
          </Link>
        </div>
      </Container>
    </Section>
  );
}

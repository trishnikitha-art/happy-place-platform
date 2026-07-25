import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Container, Section } from "@/components/section";
import { HappyBrandSignature } from "@/components/happy-brand-signature";

/** Reusable call-to-action: drives to the estimate wizard. */
export function CTASection({
  title = "Tell us what you're planning.",
  subtitle = "Whether you're fixing something that's worn out or building something completely new, we'd love to hear about it.",
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <Section className="relative bg-[#EFECE5]">
      <div className="absolute inset-0 bg-gradient-to-br from-[#EFECE5] via-[#EAE8E0] to-[#E5E2D9] opacity-100" aria-hidden="true" />
      <Container className="relative z-10 flex flex-col items-center text-center">
        <h2 className="text-3xl font-bold text-text sm:text-4xl">
          Tell us what you're planning to make your <HappyBrandSignature variant="inline" />.
        </h2>
        <p className="mt-4 max-w-2xl text-lg text-text-muted">{subtitle}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/estimate" className={cn(buttonVariants({ variant: "primary", size: "lg" }))}>
            Start Your Free Estimate
          </Link>
          <Link href="/gallery" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
            See Our Work
          </Link>
        </div>
      </Container>
    </Section>
  );
}

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Container, Section } from "@/components/section";

/** Reusable call-to-action: drives to the estimate wizard. */
export function CTASection({
  title = "Ready to build your happy place?",
  subtitle = "Get a free, no-pressure estimate in a few minutes.",
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <Section className="bg-primary/10">
      <Container className="flex flex-col items-center text-center">
        <h2 className="text-3xl font-bold text-text sm:text-4xl">{title}</h2>
        <p className="mt-4 max-w-2xl text-lg text-text-muted">{subtitle}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/estimate" className={cn(buttonVariants({ variant: "primary", size: "lg" }))}>
            Get a Free Estimate
          </Link>
          <Link href="/gallery" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
            See Our Work
          </Link>
        </div>
      </Container>
    </Section>
  );
}

import Link from "next/link";
import Image from "next/image";
import { Container, Section } from "@/components/section";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <Section className="bg-surface-muted">
      <Container className="text-center">
        <div className="mb-8 flex items-center justify-center gap-3">
          <span className="relative block h-12 w-auto">
            <Image src="/brand/logo.png" alt="Happy Place Carpentry logo" width={144} height={48} className="h-full w-auto" />
          </span>
        </div>
        <p className="text-6xl font-bold text-primary">404</p>
        <h1 className="mt-4 text-3xl font-bold text-text">Page not found</h1>
        <p className="mt-3 text-text-muted">That page wandered off. Let&apos;s get you back to a happy place.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/" className={cn(buttonVariants({ variant: "primary", size: "lg" }))}>Go home</Link>
          <Link href="/estimate" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>Get a free estimate</Link>
        </div>
      </Container>
    </Section>
  );
}

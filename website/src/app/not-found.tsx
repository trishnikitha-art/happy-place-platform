import Link from "next/link";
import { Container, Section } from "@/components/section";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <Section className="bg-stone-50">
      <Container className="text-center">
        <p className="text-6xl font-bold text-amber-500">404</p>
        <h1 className="mt-4 text-3xl font-bold text-stone-900">Page not found</h1>
        <p className="mt-3 text-stone-600">That page wandered off. Let&apos;s get you back to a happy place.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/" className={cn(buttonVariants({ variant: "primary", size: "lg" }))}>Go home</Link>
          <Link href="/estimate" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>Get a free estimate</Link>
        </div>
      </Container>
    </Section>
  );
}

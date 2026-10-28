import { TextCopy } from '@/components/text-copy';
import { navigationTextKey } from '@/lib/editable-shared-fields';
import Link from "next/link";
import Image from "next/image";
import { MapPin, Phone, Mail } from "lucide-react";
import { getCompany } from "@/lib/company";
import { getNavigation } from "@/lib/navigation";
import { PhoneLink, EmailLink } from "@/components/tracked-contact";
import { HappyBrandSignature } from "@/components/happy-brand-signature";
import { ScrollReveal } from "@/components/scroll-reveal";

export function SiteFooter() {
  const company = getCompany();
  const navigation = getNavigation();
  return (
    <footer className="border-t border-border/60 bg-deep text-text-on-dark">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.15fr_0.65fr_0.9fr_1.35fr] lg:px-8">
        <div className="min-w-0">
          <Link href="/" className="inline-flex min-h-11 items-center gap-2.5 font-bold text-text-on-dark">
            <span className="relative block h-8 w-auto">
              <Image src="/brand/logo.png" alt="Happy Place Carpentry logo" width={96} height={32} className="h-full w-auto" />
            </span>
            <span className="text-lg"><HappyBrandSignature /> Place</span>
          </Link>
          <p className="mt-3 text-sm text-text-on-dark">{company.description}</p>
          <ScrollReveal>
            <p className="mt-3 text-sm font-semibold text-text-on-dark">{company.ccbNumber}</p>
          </ScrollReveal>
          <p className="mt-1 text-xs text-text-on-dark">
            {company.proof.insured ? "Licensed · Insured" : "Licensed"} · {company.proof.yearsInBusiness} · {company.proof.projectsCompleted} projects
          </p>
        </div>

        <div className="min-w-0">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-text-on-dark"><TextCopy textKey="footer.explore" /></h3>
          <ul className="mt-3 grid grid-cols-2 gap-x-4 text-sm sm:grid-cols-1">
            {navigation.filter((n) => !n.secondary).map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="inline-flex min-h-11 min-w-11 items-center text-text-on-dark decoration-honey underline-offset-4 hover:underline">{navigationTextKey(n.href) ? <TextCopy textKey={navigationTextKey(n.href)!} /> : n.label}</Link>
              </li>
            ))}
            <li>
              <Link href="/review" className="inline-flex min-h-11 min-w-11 items-center font-semibold text-text-on-dark underline decoration-honey underline-offset-4"><TextCopy textKey="footer.reviewAction" /></Link>
            </li>
          </ul>
        </div>

        <div className="min-w-0">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-text-on-dark"><TextCopy textKey="footer.areaTitle" /></h3>
          <p className="mt-3 text-sm text-text-on-dark"><TextCopy textKey="company.serviceArea" /></p>
          <Link href="/services" className="mt-3 inline-flex min-h-11 items-center text-sm text-text-on-dark underline decoration-honey underline-offset-4"><TextCopy textKey="footer.servicesAction" /></Link>
        </div>

        <div className="min-w-0">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-text-on-dark"><TextCopy textKey="footer.contactTitle" /></h3>
          <ul className="mt-3 space-y-3 text-sm">
            <li className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-honey" aria-hidden="true" />
              {company.address.city}, {company.address.region}
            </li>
            <li>
              <PhoneLink phone={company.phone} className="flex gap-2 text-text-on-dark decoration-honey underline-offset-4 hover:underline">
                <Phone className="h-4 w-4 shrink-0 text-honey" aria-hidden="true" /> {company.phoneDisplay}
              </PhoneLink>
            </li>
            <li>
              <EmailLink email={company.email} className="flex gap-2 text-text-on-dark decoration-honey underline-offset-4 hover:underline">
                <Mail className="h-4 w-4 shrink-0 text-honey" aria-hidden="true" /> <span className="min-w-0 [overflow-wrap:anywhere]">{company.email}</span>
              </EmailLink>
            </li>
            <li className="text-text-on-dark"><TextCopy textKey="company.businessHours" /></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-text-on-dark/8 py-6 text-center text-xs text-text-on-dark">
        © {new Date().getFullYear()} {company.legalName}. <TextCopy textKey="footer.tagline" />
      </div>
    </footer>
  );
}

import Link from "next/link";
import { MapPin, Phone, Mail, Hammer } from "lucide-react";
import { company } from "@/config/company";
import { navigation } from "@/config/navigation";
import { serviceCategories } from "@/config/serviceCategories";
import { PhoneLink, EmailLink } from "@/components/tracked-contact";

export function SiteFooter() {
  const [taylor, lanie] = company.owners;
  return (
    <footer className="border-t border-border bg-primary text-text-on-dark">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div>
          <Link href="/" className="flex items-center gap-2 font-bold text-text-on-dark">
            <Hammer className="h-6 w-6 text-honey" aria-hidden="true" />
            <span className="text-lg">{company.name}</span>
          </Link>
          <p className="mt-3 text-sm text-text-on-dark/70">{company.description}</p>
          <p className="mt-3 text-sm font-semibold text-honey">{company.ccbNumber}</p>
          <p className="mt-1 text-xs text-text-on-dark/60">
            {company.proof.insured ? "Licensed · Insured" : "Licensed"} · {company.proof.yearsInBusiness} · {company.proof.projectsCompleted} projects
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-text-on-dark/60">Explore</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {navigation.filter((n) => !n.secondary).map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="text-text-on-dark/80 hover:text-honey">{n.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-text-on-dark/60">Services</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {serviceCategories.map((c) => (
              <li key={c.slug}>
                <Link href={`/services#${c.slug}`} className="text-text-on-dark/80 hover:text-honey">{c.title}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-text-on-dark/60">Contact</h3>
          <ul className="mt-3 space-y-3 text-sm">
            <li className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-honey" aria-hidden="true" />
              {company.address.city}, {company.address.region}
            </li>
            <li>
              <PhoneLink phone={company.phone} className="flex items-center gap-2 text-text-on-dark/80 hover:text-honey">
                <Phone className="h-4 w-4 text-honey" aria-hidden="true" /> {company.phoneDisplay}
              </PhoneLink>
            </li>
            <li>
              <EmailLink email={company.email} className="flex items-center gap-2 text-text-on-dark/80 hover:text-honey">
                <Mail className="h-4 w-4 text-honey" aria-hidden="true" /> {company.email}
              </EmailLink>
            </li>
            <li className="text-text-on-dark/60">{company.businessHours}</li>
            <li className="text-xs text-text-on-dark/50">{taylor.name} &amp; {lanie.name} · {company.serviceArea}</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-text-on-dark/10 py-6 text-center text-xs text-text-on-dark/50">
        © {new Date().getFullYear()} {company.legalName}. Built with care by {taylor.name} &amp; {lanie.name}.
      </div>
    </footer>
  );
}

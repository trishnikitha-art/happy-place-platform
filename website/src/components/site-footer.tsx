import Link from "next/link";
import { MapPin, Phone, Mail, Hammer } from "lucide-react";
import { company } from "@/config/company";
import { navigation } from "@/config/navigation";
import { serviceCategories } from "@/config/serviceCategories";
import { PhoneLink, EmailLink } from "@/components/tracked-contact";

export function SiteFooter() {
  return (
    <footer className="border-t border-stone-200 bg-stone-900 text-stone-300">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div>
          <Link href="/" className="flex items-center gap-2 font-bold text-white">
            <Hammer className="h-6 w-6 text-amber-500" aria-hidden="true" />
            <span className="text-lg">{company.name}</span>
          </Link>
          <p className="mt-3 text-sm text-stone-400">{company.description}</p>
          <p className="mt-3 text-sm font-semibold text-amber-400">{company.ccbNumber}</p>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-200">Explore</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {navigation.filter((n) => !n.secondary).map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="hover:text-amber-400">{n.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-200">Services</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {serviceCategories.map((c) => (
              <li key={c.slug}>
                <Link href={`/services#${c.slug}`} className="hover:text-amber-400">{c.title}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-200">Contact</h3>
          <ul className="mt-3 space-y-3 text-sm">
            <li className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-amber-400" aria-hidden="true" />
              {company.address.city}, {company.address.region}
            </li>
            <li>
              <PhoneLink phone={company.phone} className="flex items-center gap-2 hover:text-primary">
                <Phone className="h-4 w-4 text-primary" aria-hidden="true" /> {company.phoneDisplay}
              </PhoneLink>
            </li>
            <li>
              <EmailLink email={company.email} className="flex items-center gap-2 hover:text-primary">
                <Mail className="h-4 w-4 text-primary" aria-hidden="true" /> {company.email}
              </EmailLink>
            </li>
            <li className="text-stone-400">{company.businessHours}</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-stone-800 py-6 text-center text-xs text-stone-500">
        © {new Date().getFullYear()} {company.legalName}. Building your happy place.
      </div>
    </footer>
  );
}

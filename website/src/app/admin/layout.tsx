import Link from "next/link";
import { Container } from "@/components/section";

/**
 * Horizon 2 — Platform Foundation (DESIGN ONLY).
 *
 * These routes are reserved for the future platform. They render a layout shell
 * and a "planned" notice. No functionality is implemented here per Directive 021.
 * When the platform phase begins, these become real interfaces — the domain
 * objects (Customer, Project, EstimateRequest, etc.) already exist in src/types.
 */
const adminLinks = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/projects", label: "Projects" },
  { href: "/admin/estimates", label: "Estimates" },
  { href: "/admin/photos", label: "Photos" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/logs", label: "Logs" },
  { href: "/admin/integrations", label: "Integrations" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:px-8">
        <aside className="lg:w-56">
          <Link href="/" className="text-sm font-semibold text-amber-700">← Back to site</Link>
          <nav className="mt-4 flex flex-wrap gap-2 lg:flex-col" aria-label="Admin">
            {adminLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="flex-1">
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-stone-500">
            <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-stone-500">
              Planned · Horizon 2
            </span>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

import Link from "next/link";

/**
 * Authority Editor Layout
 * 
 * Internal CMS for managing content authorities:
 * - Dashboard (overview and metrics)
 * - Projects (Project Authority)
 * - Media (Media Authority)
 * - Reviews (Review Authority)
 * - Services (Service Registry)
 * - Brand (Brand Authority)
 * - SEO (SEO Authority)
 * - Settings (Configuration)
 * - System (Diagnostics and health)
 * 
 * All Authority Editor pages use the same adapter layer as the public website.
 * Google Drive, uploads, and future storage backends are producers of the
 * Media Authority—not dependencies of the UI.
 */
const authorityLinks = [
  { href: "/authority-editor", label: "Dashboard" },
  { href: "/authority-editor/projects", label: "Projects" },
  { href: "/authority-editor/media", label: "Media" },
  { href: "/authority-editor/reviews", label: "Reviews" },
  { href: "/authority-editor/services", label: "Services" },
  { href: "/authority-editor/brand", label: "Brand" },
  { href: "/authority-editor/seo", label: "SEO" },
  { href: "/authority-editor/settings", label: "Settings" },
  { href: "/authority-editor/system", label: "System" },
];

export default function AuthorityEditorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-muted">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:px-8">
        <aside className="lg:w-56">
          <Link href="/" className="text-sm font-semibold text-accent">← Back to site</Link>
          <nav className="mt-4 flex flex-wrap gap-2 lg:flex-col" aria-label="Authority Editor">
            {authorityLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-text-muted hover:bg-surface hover:text-text transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}

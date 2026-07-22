export default function SEOAuthorityPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text">SEO Authority</h1>
      <p className="text-text-muted">Manage SEO metadata, OpenGraph, structured data, and sitemap configuration.</p>
      
      <div className="rounded-lg border border-border bg-surface p-6">
        <h3 className="font-semibold text-text">Global SEO Settings</h3>
        <p className="mt-2 text-sm text-text-muted">Configure site-wide SEO defaults and templates.</p>
      </div>
      
      <div className="rounded-lg border border-border bg-surface p-6">
        <h3 className="font-semibold text-text">OpenGraph & Social</h3>
        <p className="mt-2 text-sm text-text-muted">Manage social media preview images and metadata.</p>
      </div>
      
      <div className="rounded-lg border border-border bg-surface p-6">
        <h3 className="font-semibold text-text">Structured Data</h3>
        <p className="mt-2 text-sm text-text-muted">Configure schema.org structured data for search engines.</p>
      </div>
      
      <div className="rounded-lg border border-border bg-surface p-6">
        <h3 className="font-semibold text-text">Sitemap</h3>
        <p className="mt-2 text-sm text-text-muted">Manage sitemap generation and URL priorities.</p>
      </div>
      
      <div className="rounded-lg border border-border bg-surface p-6">
        <h3 className="font-semibold text-text">Robots.txt</h3>
        <p className="mt-2 text-sm text-text-muted">Configure crawler access and indexing rules.</p>
      </div>
    </div>
  );
}

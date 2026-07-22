export default function BrandAuthorityPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text">Brand Authority</h1>
      <p className="text-text-muted">Manage brand assets - logos, owner portraits, team photos, marketing materials.</p>
      
      <div className="rounded-lg border border-border bg-surface p-6">
        <h3 className="font-semibold text-text">Homepage Hero</h3>
        <p className="mt-2 text-sm text-text-muted">Manage the primary hero image for the homepage.</p>
      </div>
      
      <div className="rounded-lg border border-border bg-surface p-6">
        <h3 className="font-semibold text-text">Owner Portraits</h3>
        <p className="mt-2 text-sm text-text-muted">Manage owner and team photos for About page and homepage.</p>
      </div>
      
      <div className="rounded-lg border border-border bg-surface p-6">
        <h3 className="font-semibold text-text">Logo & Brand Assets</h3>
        <p className="mt-2 text-sm text-text-muted">Manage company logos, icons, and brand identity assets.</p>
      </div>
      
      <div className="rounded-lg border border-border bg-surface p-6">
        <h3 className="font-semibold text-text">Marketing Assets</h3>
        <p className="mt-2 text-sm text-text-muted">Manage marketing materials and promotional assets.</p>
      </div>
    </div>
  );
}

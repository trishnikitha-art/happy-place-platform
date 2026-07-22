import { getAllProjects } from "@/lib/projects";
import { getMediaManifest } from "@/lib/media";
import { getFeaturedReviews } from "@/lib/reviews";
import { getAllServices } from "@/lib/registries";

export default function AuthorityEditorDashboard() {
  const projects = getAllProjects();
  const mediaManifest = getMediaManifest();
  const reviews = getFeaturedReviews();
  const services = getAllServices();
  
  const stats = {
    projects: {
      total: projects.length,
      published: projects.filter(p => p.status === 'completed').length,
      inProgress: projects.filter(p => p.status === 'in-progress').length,
    },
    media: {
      total: mediaManifest.media.length,
      withHero: mediaManifest.media.filter((m: any) => m.roles.includes('hero')).length,
      withGallery: mediaManifest.media.filter((m: any) => m.roles.includes('gallery')).length,
      missingAlt: mediaManifest.media.filter((m: any) => !m.alt || m.alt.trim() === '').length,
    },
    reviews: {
      total: reviews.length,
      featured: reviews.filter(r => r.featured).length,
      withProject: reviews.filter(r => r.projectId).length,
      withResponse: reviews.filter(r => r.ownerResponse).length,
    },
    services: {
      total: services.length,
      featured: services.filter(s => s.featured).length,
      homepageEligible: services.filter(s => s.homepageEligible).length,
    },
  };
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text">Authority Editor Dashboard</h1>
      <p className="text-text-muted">Content management dashboard for authorities and registries.</p>
      
      {/* Live Metrics */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-sm text-text-muted">Projects</p>
          <p className="text-2xl font-bold text-text">{stats.projects.total}</p>
          <p className="text-xs text-text-muted">{stats.projects.published} published</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-sm text-text-muted">Media</p>
          <p className="text-2xl font-bold text-text">{stats.media.total}</p>
          <p className="text-xs text-text-muted">{stats.media.withHero} heroes</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-sm text-text-muted">Reviews</p>
          <p className="text-2xl font-bold text-text">{stats.reviews.total}</p>
          <p className="text-xs text-text-muted">{stats.reviews.featured} featured</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-sm text-text-muted">Services</p>
          <p className="text-2xl font-bold text-text">{stats.services.total}</p>
          <p className="text-xs text-text-muted">{stats.services.featured} featured</p>
        </div>
      </div>
      
      {/* Authority Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-surface p-6">
          <h3 className="font-semibold text-text">Projects</h3>
          <p className="mt-2 text-sm text-text-muted">Manage project data and media references</p>
          <div className="mt-4 space-y-1">
            <p className="text-xs text-text-muted">Published: {stats.projects.published}</p>
            <p className="text-xs text-text-muted">In Progress: {stats.projects.inProgress}</p>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-surface p-6">
          <h3 className="font-semibold text-text">Media</h3>
          <p className="mt-2 text-sm text-text-muted">Media Authority - single source of truth</p>
          <div className="mt-4 space-y-1">
            <p className="text-xs text-text-muted">Heroes: {stats.media.withHero}</p>
            <p className="text-xs text-text-muted">Gallery: {stats.media.withGallery}</p>
            <p className="text-xs text-text-muted">Missing Alt: {stats.media.missingAlt}</p>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-surface p-6">
          <h3 className="font-semibold text-text">Reviews</h3>
          <p className="mt-2 text-sm text-text-muted">Review Authority and editorial controls</p>
          <div className="mt-4 space-y-1">
            <p className="text-xs text-text-muted">Featured: {stats.reviews.featured}</p>
            <p className="text-xs text-text-muted">With Project: {stats.reviews.withProject}</p>
            <p className="text-xs text-text-muted">With Response: {stats.reviews.withResponse}</p>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-surface p-6">
          <h3 className="font-semibold text-text">Services</h3>
          <p className="mt-2 text-sm text-text-muted">Service registry and categorization</p>
          <div className="mt-4 space-y-1">
            <p className="text-xs text-text-muted">Featured: {stats.services.featured}</p>
            <p className="text-xs text-text-muted">Homepage Eligible: {stats.services.homepageEligible}</p>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-surface p-6">
          <h3 className="font-semibold text-text">Brand</h3>
          <p className="mt-2 text-sm text-text-muted">Brand Authority - logos, owners, marketing assets</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-6">
          <h3 className="font-semibold text-text">SEO</h3>
          <p className="mt-2 text-sm text-text-muted">SEO Authority - metadata and structured data</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-6">
          <h3 className="font-semibold text-text">Settings</h3>
          <p className="mt-2 text-sm text-text-muted">Configuration and integrations</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-6">
          <h3 className="font-semibold text-text">System</h3>
          <p className="mt-2 text-sm text-text-muted">Diagnostics, validation, and health checks</p>
        </div>
      </div>
    </div>
  );
}

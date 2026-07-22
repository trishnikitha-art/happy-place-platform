import { getAllProjects } from "@/lib/projects";

export default function AuthorityEditorProjectsPage() {
  const projects = getAllProjects();
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text">Projects</h1>
      <p className="text-text-muted">Project Authority - manage project data and media references.</p>
      
      <div className="rounded-lg border border-border bg-surface">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left text-sm font-semibold text-text">Project</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-text">Service</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-text">Status</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-text">Location</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-text">Media</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-text">Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <div className="font-medium text-text">{project.title}</div>
                  <div className="text-xs text-text-muted">{project.seo?.slug || '—'}</div>
                </td>
                <td className="px-4 py-3 text-sm text-text-muted">{project.service}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-full px-2 py-1 text-xs font-medium bg-primary/10 text-primary">
                    {project.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-text-muted">
                  {project.location.city}, {project.location.state}
                </td>
                <td className="px-4 py-3 text-sm text-text-muted">
                  {project.media.hero ? '✓ Hero' : '—'}
                  {project.media.gallery.length > 0 && ` (${project.media.gallery.length} photos)`}
                </td>
                <td className="px-4 py-3">
                  <button className="text-sm text-accent hover:underline">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

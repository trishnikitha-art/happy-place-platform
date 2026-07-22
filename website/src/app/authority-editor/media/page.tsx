import { getMediaManifest } from "@/lib/media";

export default function AuthorityEditorMediaPage() {
  const manifest = getMediaManifest();
  const media = manifest.media;
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text">Media Library</h1>
      <p className="text-text-muted">Media Authority - single source of truth for all media assets.</p>
      
      <div className="rounded-lg border border-border bg-surface">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left text-sm font-semibold text-text">ID</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-text">Project</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-text">Roles</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-text">Alt Text</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-text">Actions</th>
            </tr>
          </thead>
          <tbody>
            {media.map((item: any) => (
              <tr key={item.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 text-sm text-text-muted">{item.id}</td>
                <td className="px-4 py-3 text-sm text-text-muted">{item.projectId || '—'}</td>
                <td className="px-4 py-3 text-sm text-text-muted">
                  {item.roles.join(', ')}
                </td>
                <td className="px-4 py-3 text-sm text-text-muted max-w-xs truncate">
                  {item.alt || '—'}
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

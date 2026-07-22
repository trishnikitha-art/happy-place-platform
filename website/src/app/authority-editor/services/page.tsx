import { getAllServices } from "@/lib/registries";

export default function AuthorityEditorServicesPage() {
  const services = getAllServices();
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text">Services</h1>
      <p className="text-text-muted">Service Registry - categorization and service definitions.</p>
      
      <div className="rounded-lg border border-border bg-surface">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left text-sm font-semibold text-text">Service</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-text">Category</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-text">Featured</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-text">Homepage</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-text">Actions</th>
            </tr>
          </thead>
          <tbody>
            {services.map((service: any) => (
              <tr key={service.slug} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <div className="font-medium text-text">{service.name}</div>
                  <div className="text-xs text-text-muted">{service.slug}</div>
                </td>
                <td className="px-4 py-3 text-sm text-text-muted">{service.category}</td>
                <td className="px-4 py-3">
                  {service.featured ? (
                    <span className="inline-flex rounded-full px-2 py-1 text-xs font-medium bg-primary/10 text-primary">Featured</span>
                  ) : (
                    <span className="text-xs text-text-muted">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {service.homepageEligible ? (
                    <span className="inline-flex rounded-full px-2 py-1 text-xs font-medium bg-primary/10 text-primary">Yes</span>
                  ) : (
                    <span className="text-xs text-text-muted">—</span>
                  )}
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

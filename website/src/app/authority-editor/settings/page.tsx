export default function AuthorityEditorSettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text">Settings</h1>
      <p className="text-text-muted">Configuration and integrations.</p>
      
      <div className="rounded-lg border border-border bg-surface p-6">
        <h3 className="font-semibold text-text">Google OAuth</h3>
        <p className="mt-2 text-sm text-text-muted">Configure Google Drive integration for media sync.</p>
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-muted">Status</span>
            <span className="text-sm text-accent">Not configured</span>
          </div>
          <button className="mt-2 text-sm bg-primary text-text-on-primary px-4 py-2 rounded-lg hover:bg-primary/90">
            Configure OAuth
          </button>
        </div>
      </div>
      
      <div className="rounded-lg border border-border bg-surface p-6">
        <h3 className="font-semibold text-text">Site Configuration</h3>
        <p className="mt-2 text-sm text-text-muted">Global site settings and defaults.</p>
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-muted">Site Name</span>
            <span className="text-sm text-text">Happy Place Carpentry</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-muted">Environment</span>
            <span className="text-sm text-text">Development</span>
          </div>
        </div>
      </div>
    </div>
  );
}

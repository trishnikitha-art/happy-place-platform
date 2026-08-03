export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-96 bg-surface-muted rounded-xl" />
      <div className="mt-8 space-y-4">
        <div className="h-8 bg-surface-muted rounded" />
        <div className="h-4 bg-surface-muted rounded w-3/4" />
      </div>
    </div>
  );
}

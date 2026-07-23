import { getFeaturedReviews } from "@/lib/reviews";

export default function AuthorityEditorReviewsPage() {
  const reviews = getFeaturedReviews();
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text">Reviews</h1>
      <p className="text-text-muted">Review Authority - editorial controls and review management.</p>
      
      <div className="rounded-lg border border-border bg-surface">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left text-sm font-semibold text-text">Client</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-text">Project</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-text">Rating</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-text">Featured</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-text">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((review: any) => (
              <tr key={review.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <div className="font-medium text-text">{review.clientName}</div>
                  <div className="text-xs text-text-muted">{typeof review.location === 'string' ? review.location : `${review.location?.city || ''}, ${review.location?.county || ''}`}</div>
                </td>
                <td className="px-4 py-3 text-sm text-text-muted">{review.projectId || '—'}</td>
                <td className="px-4 py-3 text-sm text-text-muted">{'★'.repeat(review.rating)}</td>
                <td className="px-4 py-3">
                  {review.featured ? (
                    <span className="inline-flex rounded-full px-2 py-1 text-xs font-medium bg-primary/10 text-primary">Featured</span>
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

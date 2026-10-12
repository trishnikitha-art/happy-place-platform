import { requireAdminDiagnosticSession } from '@/lib/admin-diagnostic-auth';
import { GET as getDeploymentStatus } from '../route';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const denied = await requireAdminDiagnosticSession();
  if (denied) return denied;

  // Preserve the existing authenticated, commit-specific provider verification.
  const response = await getDeploymentStatus(request);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

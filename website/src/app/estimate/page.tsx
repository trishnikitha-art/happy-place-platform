import { redirect } from 'next/navigation';
import { workbenchSession } from '@/lib/workbench-session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Project scoping', robots: { index: false, follow: false } };

export default async function EstimatePage() {
  return redirect(await workbenchSession.isAuthenticated() ? '/workbench/estimate' : '/contact');
}

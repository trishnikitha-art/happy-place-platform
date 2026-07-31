/**
 * Workbench Home - Redirect to default view
 */

import { redirect } from 'next/navigation';

export default function WorkbenchPage() {
  redirect('/workbench/explorer');
}

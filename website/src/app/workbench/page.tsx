/**
 * Workbench Home - Redirect to media manager
 */

import { redirect } from 'next/navigation';

export default function WorkbenchPage() {
  redirect('/workbench/media');
}

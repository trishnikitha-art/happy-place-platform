'use client';
import { createContext, useContext, type ReactNode } from 'react';
import catalog from '@/config/strings.v1.json';
import { decodeTextCatalog, type TextKey } from '@/lib/text-contract';
import type { TextPreviewDraft } from '@/lib/text-preview-bridge';

const text = decodeTextCatalog(catalog);
const PreviewCopy = createContext<TextPreviewDraft | null>(null);

// Only the authenticated preview route supplies a verified staged mutation.
export function TextPreviewProvider({ draft, children }: { draft: TextPreviewDraft | null; children: ReactNode }) {
  return <PreviewCopy.Provider value={draft}>{children}</PreviewCopy.Provider>;
}

// Inherits the actual field's font, responsive size, color and line-height.
// Never wraps or replaces a signature, icon, link or other formatted child.
export function TextCopy({ textKey }: { textKey: TextKey }) {
  return <span data-text-key={textKey}>{useTextCopy(textKey)}</span>;
}

export function useTextCopy(textKey: TextKey): string {
  const preview = useContext(PreviewCopy);
  return preview?.key === textKey ? preview.value : text.fields[textKey].value;
}

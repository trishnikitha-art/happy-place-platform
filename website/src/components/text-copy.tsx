'use client';
import { createContext, useContext, type ReactNode } from 'react';
import catalog from '@/config/strings.v1.json';
import { decodeTextCatalog, type TextKey } from '@/lib/text-contract';
import type { TextPreviewDraft } from '@/lib/text-preview-bridge';

const text = decodeTextCatalog(catalog);
const PreviewCopy = createContext<{ draft: TextPreviewDraft | null } | null>(null);

// Only the authenticated preview route supplies a verified staged mutation.
export function TextPreviewProvider({ draft, children }: { draft: TextPreviewDraft | null; children: ReactNode }) {
  return <PreviewCopy.Provider value={{ draft }}>{children}</PreviewCopy.Provider>;
}

// Inherits the actual field's font, responsive size, color and line-height.
// Never wraps or replaces a signature, icon, link or other formatted child.
export function TextCopy({ textKey }: { textKey: TextKey }) {
  return <span data-text-key={textKey}>{useTextCopy(textKey)}</span>;
}

export function useTextCopy(textKey: TextKey): string {
  return readText(textKey, useContext(PreviewCopy)?.draft);
}

function readText(key: TextKey, draft: TextPreviewDraft | null | undefined) {
  return draft?.key === key ? draft.value : text.fields[key].value;
}

export function useTextCopySource() {
  const preview = useContext(PreviewCopy);
  return { read: (key: TextKey) => readText(key, preview?.draft), isPreview: preview !== null };
}

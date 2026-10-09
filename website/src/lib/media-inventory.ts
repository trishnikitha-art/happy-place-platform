/** Read-only reference extraction. Unreferenced is never proof that deletion is safe. */
export function collectMediaReferences(value: unknown, source: string,
  references: Map<string, Set<string>>, field = ''): void {
  const referenceFields = ['mediaId', 'currentMediaId', 'gallery', 'hiddenGallery', 'hero', 'before', 'after', 'details', 'progress', 'portrait'];
  if (typeof value === 'string' && referenceFields.includes(field)) {
    const sources = references.get(value) || new Set<string>();
    sources.add(source);
    references.set(value, sources);
  } else if (Array.isArray(value)) {
    value.forEach(entry => collectMediaReferences(entry, source, references, field));
  } else if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, entry]) => collectMediaReferences(entry, source, references, key));
  }
}

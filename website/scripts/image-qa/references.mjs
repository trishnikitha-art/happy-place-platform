export function collectImageReferences(value, references = new Set()) {
  if (typeof value === 'string' && /^\/(images|gallery|brand)\//.test(value) && /\.(svg|png|jpe?g|webp|avif)$/i.test(value)) {
    references.add(value);
  } else if (Array.isArray(value)) {
    for (const entry of value) collectImageReferences(entry, references);
  } else if (value && typeof value === 'object') {
    for (const entry of Object.values(value)) collectImageReferences(entry, references);
  }
  return references;
}

export function isBlockingViolation(violation) {
  return violation.severity !== 'warning';
}

export const TEXT_AUTHORITY_PATH = 'website/src/config/strings.v1.json';
export const TEXT_FIELDS = {
  'homepage.hero.title': { label: 'Homepage headline', route: '/', maxLength: 180, source: 'src/app/page.tsx', classification: 'editable copy' },
  'homepage.hero.description': { label: 'Homepage introduction', route: '/', maxLength: 500, source: 'src/app/page.tsx', classification: 'editable copy' },
  'homepage.hero.primaryAction': { label: 'Homepage project button', route: '/', maxLength: 80, source: 'src/app/page.tsx', classification: 'editable copy' },
  'homepage.hero.secondaryAction': { label: 'Homepage work button', route: '/', maxLength: 80, source: 'src/app/page.tsx', classification: 'editable copy' },
} as const;
export type TextKey = keyof typeof TEXT_FIELDS;
export interface TextCatalog { version: 1; locale: 'en'; fields: Record<TextKey, { value: string; revision: number }> }
export interface TextMutation { schema: 'text.v1'; key: TextKey; previousValue: string; expectedRevision: number; value: string }
export function sameTextMutation(a: TextMutation, b: TextMutation): boolean {
  return a.schema === b.schema && a.key === b.key && a.previousValue === b.previousValue && a.expectedRevision === b.expectedRevision && a.value === b.value;
}

export function validateText(key: string, value: unknown): asserts value is string {
  if (!Object.hasOwn(TEXT_FIELDS, key)) throw new Error('Unknown or locked text field');
  const field = TEXT_FIELDS[key as TextKey];
  if (typeof value !== 'string' || !value.trim() || value.length > field.maxLength || /[\x00-\x1f\x7f<>]/.test(value) || /\{[^}]*\}/.test(value)) {
    throw new Error(`Invalid text for ${field.label}: use plain text, 1–${field.maxLength} characters`);
  }
}
export function decodeTextCatalog(input: unknown): TextCatalog {
  const c = input as TextCatalog;
  if (!c || c.version !== 1 || c.locale !== 'en' || !c.fields || Object.keys(c.fields).length !== Object.keys(TEXT_FIELDS).length) throw new Error('Invalid text authority');
  for (const key of Object.keys(TEXT_FIELDS) as TextKey[]) {
    const f = c.fields[key];
    if (!f || !Number.isSafeInteger(f.revision) || f.revision < 0) throw new Error(`Missing or invalid text field: ${key}`);
    validateText(key, f.value);
  }
  return c;
}
export function decodeTextMutation(input: unknown): TextMutation {
  const m = (typeof input === 'string' ? JSON.parse(input) : input) as TextMutation;
  if (!m || m.schema !== 'text.v1' || !Number.isSafeInteger(m.expectedRevision) || m.expectedRevision < 0) throw new Error('Invalid text staging schema');
  validateText(m.key, m.value);
  validateText(m.key, m.previousValue);
  if (m.value === m.previousValue) throw new Error('No text change to stage');
  return m;
}
export function applyTextMutation(catalog: TextCatalog, mutation: TextMutation): void {
  const m = decodeTextMutation(mutation);
  const field = decodeTextCatalog(catalog).fields[m.key];
  if (field.revision !== m.expectedRevision || field.value !== m.previousValue) throw new Error(`TEXT_REVISION_CONFLICT: ${m.key}. Reload the current text before editing.`);
  catalog.fields[m.key] = { value: m.value, revision: field.revision + 1 };
}

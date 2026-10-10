import catalog from '@/config/strings.v1.json';
import faqRecords from '@/config/faq.v1.json';
import { getAllFaqs, loadFaqManifest } from '@/lib/faq';
import { BLOG_COPY_RECORDS, getBlogCopy } from '@/lib/blog-copy';
import { decodeTextCatalog, type TextKey } from '@/lib/text-contract';

it('keeps FAQ record IDs/categories while resolving question and answer references from text authority', () => {
  const copy = decodeTextCatalog(catalog);
  const manifest = loadFaqManifest();
  expect(getAllFaqs()).toEqual(manifest.faqs);
  expect(manifest.faqs).toHaveLength(faqRecords.faqs.length);
  for (const [index, record] of faqRecords.faqs.entries()) {
    expect(record.question).toMatch(/^faq\.[^.]+\.question$/);
    expect(record.answer).toMatch(/^faq\.[^.]+\.answer$/);
    expect(manifest.faqs[index]).toEqual({ ...record,
      question: copy.fields[record.question as TextKey].value,
      answer: copy.fields[record.answer as TextKey].value,
    });
  }
});

it('does not retain a second FAQ prose authority when canonical copy changes', () => {
  const copy = decodeTextCatalog(catalog);
  const key = faqRecords.faqs[0].question as TextKey;
  const original = copy.fields[key].value;
  try {
    copy.fields[key].value = 'Updated FAQ question from the canonical text authority?';
    expect(getAllFaqs()[0].question).toBe(copy.fields[key].value);
  } finally { copy.fields[key].value = original; }
});

it('uses one blog record identity and the same canonical title for public rendering and metadata', () => {
  const copy = decodeTextCatalog(catalog);
  for (const record of BLOG_COPY_RECORDS) {
    const post = getBlogCopy(record.slug)!;
    expect(post.slug).toBe(record.slug);
    expect(post.date).toBe(record.date);
    expect(post.title).toBe(copy.fields[record.titleKey].value);
    expect(post.excerpt).toBe(copy.fields[record.excerptKey].value);
    expect(post.category).toBe(copy.fields[record.categoryKey].value);
    expect(post.content.startsWith('\n# ')).toBe(true);
    expect(post.content).toContain('\n\n## ');
  }
  expect(getBlogCopy('unpublished-unknown-article')).toBeNull();
});

it('reflects canonical blog edits without changing the article slug, date or paragraph separators', () => {
  const copy = decodeTextCatalog(catalog), record = BLOG_COPY_RECORDS[0];
  const original = copy.fields[record.titleKey].value;
  const before = getBlogCopy(record.slug)!;
  try {
    copy.fields[record.titleKey].value = 'An edited article title';
    const after = getBlogCopy(record.slug)!;
    expect(after.title).toBe('An edited article title');
    expect(after.slug).toBe(before.slug);
    expect(after.date).toBe(before.date);
    expect(after.content).toBe(before.content);
  } finally { copy.fields[record.titleKey].value = original; }
});

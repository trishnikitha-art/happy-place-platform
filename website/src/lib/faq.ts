/**
 * FAQ Authority Adapter
 * 
 * Provides intent-based access to FAQ items.
 * Components never import faq.v1.json directly.
 * 
 * All authority loading flows through AuthorityLoader (CEO 051 constitutional requirement).
 */

import textCatalog from '@/config/strings.v1.json';
import { decodeTextCatalog, type TextKey } from './text-contract';
import type { FaqManifest, FaqItem } from "@/types/faq";
import { loadAuthority, clearAuthorityCache, findById } from "./authority-loader";
import { getCompany } from './company';

export function formatServiceCounties(counties: string[]): string {
  if (!counties.length) return '';
  if (counties.length === 1) return `${counties[0]} County`;
  if (counties.length === 2) return `${counties[0]} and ${counties[1]} Counties`;
  return `${counties.slice(0, -1).join(', ')}, and ${counties[counties.length - 1]} Counties`;
}

export function resolveServiceAreaCopy(value: string): string {
  return value.replaceAll('{{serviceCounties}}', formatServiceCounties(getCompany().proof.serviceCounties));
}

export function loadFaqManifest(): FaqManifest {
  const manifest = loadAuthority<FaqManifest>({
    path: "@/config/faq.v1.json",
    fallback: {
      version: "1.0.0",
      generatedAt: new Date().toISOString(),
      faqs: [],
    },
    name: "FAQ",
  });
  const copy=decodeTextCatalog(textCatalog);
  return {
    ...manifest,
    faqs: manifest.faqs.map((item) => {
      const answerKey = item.answer as TextKey;
      const answer = copy.fields[answerKey].value;
      return {
        ...item,
        question: copy.fields[item.question as TextKey].value,
        answer: answerKey === 'faq.f2.answer' ? resolveServiceAreaCopy(answer) : answer,
      };
    }),
  };
}

/**
 * Get all FAQ items
 */
export function getAllFaqs(): FaqItem[] {
  const manifest = loadFaqManifest();
  return manifest.faqs;
}

/**
 * Get FAQ by ID
 */
export function getFaqById(id: string): FaqItem | null {
  const faqs = getAllFaqs();
  return findById(faqs, id);
}

/**
 * Get FAQs by category
 */
export function getFaqsByCategory(category: string): FaqItem[] {
  const faqs = getAllFaqs();
  return faqs.filter(f => f.category === category);
}

/**
 * Get all unique categories
 */
export function getFaqCategories(): string[] {
  const faqs = getAllFaqs();
  const categories = new Set(faqs.map(f => f.category));
  return Array.from(categories);
}

/**
 * Clear FAQ cache (useful for testing or hot reload)
 */
export function clearFaqCache(): void {
  clearAuthorityCache("@/config/faq.v1.json");
}

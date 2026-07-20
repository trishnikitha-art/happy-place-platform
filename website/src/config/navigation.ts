export interface NavItem {
  label: string;
  href: string;
  /** show only on desktop (secondary links) */
  secondary?: boolean;
}

/**
 * Primary navigation — equal visual weight, never wraps (CEO review).
 * Order: Home · Services · Our Work · About · Reviews · Estimate.
 * "Our Work" = merged Projects + Gallery hub. Estimate is a warm CTA, not a plain link.
 */
export const navigation: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services" },
  { label: "Our Work", href: "/gallery" },
  { label: "About", href: "/about" },
  { label: "Reviews", href: "/reviews" },
  { label: "Estimate", href: "/estimate", secondary: true },
];

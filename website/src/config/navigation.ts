export interface NavItem {
  label: string;
  href: string;
  /** show only on desktop (secondary links) */
  secondary?: boolean;
}

/**
 * Primary navigation — deliberately lean (CEO review): Home · Services ·
 * Our Work · Estimate · About · Contact. Everything else lives lower on the
 * page or in the footer. "Our Work" is the merged Projects + Gallery hub.
 */
export const navigation: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services" },
  { label: "Our Work", href: "/gallery" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Free Estimate", href: "/estimate", secondary: true },
];

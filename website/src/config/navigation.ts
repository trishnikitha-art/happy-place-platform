export interface NavItem {
  label: string;
  href: string;
  /** show only on desktop (secondary links) */
  secondary?: boolean;
}

/** Primary navigation — order matters. */
export const navigation: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services" },
  { label: "Our Work", href: "/gallery" },
  { label: "About", href: "/about" },
  { label: "Reviews", href: "/reviews" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
  { label: "Free Estimate", href: "/estimate", secondary: true },
];

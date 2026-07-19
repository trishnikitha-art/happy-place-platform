import type { ServiceCategory } from "@/types";

/**
 * Service categories. The estimate wizard and services page render from these.
 * Icons are lucide-react icon names (resolved in a shared Icon component).
 */
export const serviceCategories: ServiceCategory[] = [
  {
    slug: "outdoor-living",
    title: "Outdoor Living",
    description: "Decks, fences, pergolas, and outdoor spaces built to last in the Oregon climate.",
    icon: "Trees",
    order: 1,
  },
  {
    slug: "remodeling",
    title: "Remodeling",
    description: "Kitchens, baths, and whole-home remodels that make your house work for you.",
    icon: "Hammer",
    order: 2,
  },
  {
    slug: "custom-carpentry",
    title: "Custom Carpentry",
    description: "Built-ins, trim, and one-of-a-kind pieces crafted for your space.",
    icon: "Frame",
    order: 3,
  },
  {
    slug: "repairs",
    title: "Repairs & Maintenance",
    description: "Honest, reliable repair work that keeps your home safe and happy.",
    icon: "Wrench",
    order: 4,
  },
];

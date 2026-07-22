import type { ServiceCategory } from "@/types";

/**
 * Service categories. The estimate wizard and services page render from these.
 * Icons are lucide-react icon names (resolved in a shared Icon component).
 */
export const serviceCategories: ServiceCategory[] = [
  {
    slug: "outdoor-living",
    title: "Outdoor Living",
    description: "Decks, pergolas, and outdoor spaces built to last in the Oregon climate.",
    icon: "Trees",
    order: 1,
  },
  {
    slug: "fencing",
    title: "Fencing",
    description: "Cedar, vinyl, and metal fencing and gates set straight and detailed to sit naturally with your home.",
    icon: "Fence",
    order: 2,
  },
  {
    slug: "remodeling",
    title: "Remodeling",
    description: "Kitchens, baths, and whole-home remodels that make your house work for you.",
    icon: "Hammer",
    order: 3,
  },
  {
    slug: "finish-carpentry",
    title: "Finish Carpentry",
    description: "Built-ins, trim, and one-of-a-kind pieces crafted for your space.",
    icon: "Frame",
    order: 4,
  },
  {
    slug: "restoration-repair",
    title: "Restoration & Repair",
    description: "Dry rot repair, trim restoration, and structural carpentry focused on restoring your home to sound condition.",
    icon: "Wrench",
    order: 5,
  },
  {
    slug: "painting",
    title: "Painting & Surface Restoration",
    description: "Interior and exterior painting, staining, and surface restoration with proper prep and quality finishes.",
    icon: "Paintbrush",
    order: 6,
  },
];

import type { Company } from "@/types";

/**
 * Company profile — the single source of truth for business identity.
 * Components render this; they never hardcode business data.
 */
export const company: Company = {
  name: "Happy Place Carpentry",
  legalName: "Happy Place Carpentry LLC",
  tagline: "Building your happy place, one project at a time.",
  description:
    "Happy Place Carpentry is a licensed Oregon carpentry partnership helping families across the Mid-Willamette Valley find their happy place — through decks, fences, kitchens, baths, and custom carpentry built to last.",
  ccbNumber: "CCB# 254240",
  email: "taylor@happyplacecarpentry.com",
  phone: "+15419990870",
  phoneDisplay: "(541) 999-0870",
  address: {
    city: "Adair Village",
    region: "OR",
    country: "US",
  },
  serviceArea: "Benton, Linn, Marion, and Polk Counties, Oregon",
  businessHours: "Mon–Fri 8am–5pm · Sat by appointment",
  social: [
    { platform: "facebook", label: "Facebook", url: "https://facebook.com/happyplacecarpentry" },
    { platform: "instagram", label: "Instagram", url: "https://instagram.com/happyplacecarpentry" },
  ],
  owners: [
    {
      name: "Taylor Happy",
      title: "Co-Owner · Lead Carpenter",
      focus: "Bringing decades of hands-on craftsmanship to every project.",
    },
    {
      name: "Lanie Happy",
      title: "Co-Owner · Client Experience",
      focus: "Helping every project feel clear, comfortable, and well cared for.",
    },
  ],
  proof: {
    projectsCompleted: "50+",
    estimateResponse: "Most estimates scheduled within 1–2 business days",
    yearsInBusiness: "Est. 2024",
    insured: true,
    bonded: true,
    serviceCounties: ["Benton", "Linn", "Marion", "Polk"],
  },
};

export const siteUrl = "https://www.happyplacecarpentry.com";

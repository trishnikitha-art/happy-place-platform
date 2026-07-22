/**
 * Company Authority Adapter
 * 
 * Provides intent-based access to company profile.
 * Components never import company.v1.json directly.
 * 
 * All authority loading flows through AuthorityLoader (CEO 051 constitutional requirement).
 */

import type { CompanyManifest, Company } from "@/types/company";
import { loadAuthority, clearAuthorityCache } from "./authority-loader";

export function loadCompanyManifest(): CompanyManifest {
  return loadAuthority<CompanyManifest>({
    path: "@/config/company.v1.json",
    fallback: {
      version: "1.0.0",
      generatedAt: new Date().toISOString(),
      company: {
        name: "Happy Place Carpentry",
        legalName: "Happy Place Carpentry LLC",
        tagline: "Building your happy place, one project at a time.",
        description: "Building decks, fences, remodels, repairs, custom carpentry, and exterior improvements across Oregon's Mid-Willamette Valley.",
        ccbNumber: "CCB# 254240",
        email: "taylor@happyplacecarpentry.com",
        phone: "+15412865190",
        phoneDisplay: "541-286-5190",
        address: {
          city: "Adair Village",
          region: "OR",
          country: "US"
        },
        serviceArea: "Benton, Linn, Marion, and Polk Counties, Oregon",
        businessHours: "Mon–Fri 8am–5pm · Sat by appointment",
        social: [],
        owners: [],
        proof: {
          projectsCompleted: "50+",
          estimateResponse: "Most estimates scheduled within 1–2 business days",
          yearsInBusiness: "Est. 2024",
          insured: true,
          bonded: true,
          serviceCounties: ["Benton", "Linn", "Marion", "Polk"]
        }
      }
    },
    name: "Company",
  });
}

/**
 * Get company profile
 */
export function getCompany(): Company {
  const manifest = loadCompanyManifest();
  return manifest.company;
}

/**
 * Clear company cache (useful for testing or hot reload)
 */
export function clearCompanyCache(): void {
  clearAuthorityCache("@/config/company.v1.json");
}

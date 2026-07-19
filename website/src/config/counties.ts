import type { County } from "@/types";

/** Service counties (Horizon-1 MVP covers Benton/Linn/Marion/Polk). */
export const counties: County[] = [
  { slug: "benton", name: "Benton County", cities: ["Corvallis", "Philomath", "Adair Village", "Albany (west)"] },
  { slug: "linn", name: "Linn County", cities: ["Albany", "Lebanon", "Sweet Home"] },
  { slug: "marion", name: "Marion County", cities: ["Salem", "Keizer", "Woodburn"] },
  { slug: "polk", name: "Polk County", cities: ["Dallas", "Monmouth", "Independence"] },
];

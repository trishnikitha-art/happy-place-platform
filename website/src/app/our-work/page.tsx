import type { Metadata } from "next";
import { getAllProjects, getFeaturedProjects } from "@/lib/projects";
import { getCompany } from "@/lib/company";
import OurWorkClient from "./OurWorkClient";

export const metadata: Metadata = {
  title: "Our Work",
  description:
    "Featured transformations, recent projects, and the complete archive of Happy Place Carpentry — decks, fences, kitchens, baths, and custom carpentry across the Willamette Valley.",
  alternates: { canonical: "/our-work" },
};

export default function OurWorkPage() {
  const company = getCompany();
  const allProjects = getAllProjects().filter(p => !p.archived);
  const featuredProjects = getFeaturedProjects();

  return <OurWorkClient company={company} allProjects={allProjects} featuredProjects={featuredProjects} />;
}


import type { Metadata } from "next";
import { getAllProjects, getProjectsWithResolvedMedia } from "@/lib/projects";
import { getCompany } from "@/lib/company";
import OurWorkClient from "./OurWorkClient";

export const metadata: Metadata = {
  title: "Our Work",
  description:
    "Featured transformations, recent projects, and the complete archive of Happy Place Carpentry — decks, fences, kitchens, baths, and custom carpentry across the Willamette Valley.",
  alternates: { canonical: "/our-work" },
};

export const dynamic = 'force-dynamic';

export default async function OurWorkPage() {
  const company = getCompany();
  const allProjects = getAllProjects().filter(p => !p.archived);
  // Featured cards reuse the exact resolved objects from this request.
  const allProjectsWithMedia = await getProjectsWithResolvedMedia(allProjects);
  const featuredProjectsWithMedia = allProjectsWithMedia.filter(project => project.featured);
  return <OurWorkClient company={company} allProjects={allProjectsWithMedia} featuredProjects={featuredProjectsWithMedia} />;
}


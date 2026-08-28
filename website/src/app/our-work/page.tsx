import type { Metadata } from "next";
import { getAllProjects, getFeaturedProjects, getProjectsWithResolvedMedia } from "@/lib/projects";
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
  const featuredProjects = getFeaturedProjects();
  
  // Resolve project media server-side through authoritative path before passing to client
  // This uses the same resolvePublicMedia() path that Home page uses successfully
  const allProjectsWithMedia = await getProjectsWithResolvedMedia(allProjects);
  const featuredProjectsWithMedia = await getProjectsWithResolvedMedia(featuredProjects);

  return <OurWorkClient company={company} allProjects={allProjectsWithMedia} featuredProjects={featuredProjectsWithMedia} />;
}


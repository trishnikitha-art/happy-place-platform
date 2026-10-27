import { archiveSnapshot } from '@/lib/archive-order';
import { loadProjectsManifest } from '@/lib/projects';
import type { ContentCatalog } from '@/lib/content-contract';
import type { Metadata } from "next";
import { getAllProjects, getProjectsWithResolvedMedia } from "@/lib/projects";
import { getCompany } from "@/lib/company";
import OurWorkClient from "./OurWorkClient";
import { pageMetadata } from "@/config/seo";

export const metadata: Metadata = pageMetadata({
  title: "Carpentry Project Photos & Local Transformations",
  description:
    "See real fence, painting, repair and courtyard projects by Happy Place Carpentry in the Mid-Willamette Valley. Browse photos and project stories.",
  path: "/our-work",
});

export const dynamic = 'force-dynamic';

export default async function OurWorkPage() {
  const company = getCompany();
  const allProjects = getAllProjects().filter(p => !p.archived);
  // Featured cards reuse the exact resolved objects from this request.
  const allProjectsWithMedia = await getProjectsWithResolvedMedia(allProjects);
  const featuredProjectsWithMedia = allProjectsWithMedia.filter(project => project.featured);
  return <OurWorkClient archiveOrder={archiveSnapshot(loadProjectsManifest() as unknown as ContentCatalog)} company={company} allProjects={allProjectsWithMedia} featuredProjects={featuredProjectsWithMedia} />;
}


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
  
  console.log('[OUR_WORK_PAGE] ALL_PROJECTS_BEFORE_RESOLUTION', {
    totalProjects: allProjects.length,
    projectsWithGallery: allProjects.filter(p => (p.media?.gallery?.length || 0) > 0).length,
    projectGalleryCounts: allProjects.map(p => ({
      id: p.id,
      title: p.title,
      galleryLength: p.media?.gallery?.length || 0,
      galleryIds: p.media?.gallery || []
    }))
  });
  
  // Resolve project media server-side through authoritative path before passing to client
  // This uses the same resolvePublicMedia() path that Home page uses successfully
  const allProjectsWithMedia = await getProjectsWithResolvedMedia(allProjects);
  const featuredProjectsWithMedia = await getProjectsWithResolvedMedia(featuredProjects);
  
  console.log('[OUR_WORK_PAGE] ALL_PROJECTS_AFTER_RESOLUTION', {
    totalProjects: allProjectsWithMedia.length,
    projectsWithGalleryMedia: allProjectsWithMedia.filter(p => (p.media?.galleryMedia?.length || 0) > 0).length,
    projectGalleryMediaCounts: allProjectsWithMedia.map(p => ({
      id: p.id,
      title: p.title,
      galleryLength: p.media?.gallery?.length || 0,
      galleryMediaLength: p.media?.galleryMedia?.length || 0,
      galleryIds: p.media?.gallery || [],
      galleryMediaIds: p.media?.galleryMedia?.map(m => m.id) || []
    }))
  });

  return <OurWorkClient company={company} allProjects={allProjectsWithMedia} featuredProjects={featuredProjectsWithMedia} />;
}


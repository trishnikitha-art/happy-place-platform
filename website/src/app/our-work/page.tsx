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

export const dynamic = 'force-dynamic';

export default async function OurWorkPage() {
  const company = getCompany();
  const allProjects = getAllProjects().filter(p => !p.archived);
  const featuredProjects = getFeaturedProjects();
  
  // P0 FIX: Resolve project media on client-side to avoid static build collision with runtime authority
  // Public media gate requires KV + Blob verification which cannot execute during static generation
  const allProjectsWithMedia = allProjects;
  const featuredProjectsWithMedia = featuredProjects;

  return <OurWorkClient company={company} allProjects={allProjectsWithMedia} featuredProjects={featuredProjectsWithMedia} />;
}


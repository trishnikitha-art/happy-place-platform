import type { Metadata } from "next";
import { Container, Section, SectionHeading } from "@/components/section";
import { notFound } from "next/navigation";

// Placeholder blog post data - will be replaced with actual markdown content system
const blogPosts: Record<string, {
  title: string;
  date: string;
  category: string;
  content: string;
}> = {
  "spring-maintenance-checklist": {
    title: "Spring Maintenance Checklist for Oregon Homeowners",
    date: "2024-03-15",
    category: "Maintenance",
    content: `
# Spring Maintenance Checklist for Oregon Homeowners

Spring is the perfect time to assess your home's condition after winter weather and prepare for the warmer months ahead. Here's our professional checklist for Oregon homeowners.

## Exterior Inspection

- **Roof**: Check for missing or damaged shingles, especially after winter storms
- **Gutters**: Clean out debris and ensure proper drainage away from foundation
- **Siding**: Look for cracks, peeling paint, or water damage
- **Foundation**: Inspect for cracks or signs of water intrusion

## Deck and Outdoor Structures

- **Deck boards**: Check for rot, loose nails, or warped boards
- **Railings**: Ensure all railings are secure and meet code requirements
- **Stairs**: Check for loose treads or risers
- **Sealing**: Consider re-staining or sealing if the previous coat is worn

## Windows and Doors

- **Weatherstripping**: Replace worn weatherstripping to improve energy efficiency
- **Screens**: Repair or replace damaged screens
- **Caulking**: Inspect and replace cracked caulk around windows and doors

## Professional Help

Some tasks are best left to professionals:
- Roof repairs on steep or high roofs
- Structural foundation issues
- Major deck repairs or replacements
- Electrical or plumbing inspections

Contact Happy Place Carpentry for a professional assessment of your home's maintenance needs.
    `,
  },
  "deck-maintenance-guide": {
    title: "Professional Deck Maintenance Guide",
    date: "2024-02-20",
    category: "Outdoor",
    content: `
# Professional Deck Maintenance Guide

A well-maintained deck can last decades with proper care. Here's our professional guide to keeping your deck safe and beautiful.

## Annual Inspection

Every spring, inspect your deck for:

- **Rot**: Use a screwdriver to probe soft spots in the wood
- **Loose fasteners**: Tighten or replace loose nails and screws
- **Split wood**: Replace boards with significant splits or cracks
- **Railings**: Ensure all railings are secure and wobble-free

## Cleaning

- **Sweep regularly**: Remove leaves and debris that can trap moisture
- **Annual deep clean**: Use a deck cleaner and stiff brush
- **Pressure washing**: Use low pressure to avoid damaging wood fibers
- **Mold treatment**: Apply mold remover if you see black or green spots

## Sealing and Staining

- **Water test**: Sprinkle water on the deck - if it beads, the seal is still good
- **Restaining**: Every 2-3 years, depending on sun exposure
- **Clear vs. stain**: Clear sealers show wood grain; stains add color
- **Professional help**: Consider hiring professionals for large decks

## Safety First

- **Load capacity**: Don't exceed the deck's rated capacity
- **Fire safety**: Keep grills away from railings and siding
- **Lighting**: Ensure adequate lighting for evening use

Need professional deck maintenance or repair? Contact Happy Place Carpentry for a free estimate.
    `,
  },
  "kitchen-remodeling-trends": {
    title: "Kitchen Remodeling Trends for 2024",
    date: "2024-01-10",
    category: "Remodeling",
    content: `
# Kitchen Remodeling Trends for 2024

Kitchen design continues to evolve, balancing functionality with aesthetics. Here are the trends we're seeing in Oregon homes.

## Design Trends

- **Natural materials**: Wood cabinets, stone countertops, and natural finishes
- **Two-tone cabinets**: Mixing light and dark colors for visual interest
- **Statement islands**: Larger islands with seating and storage
- **Smart storage**: Pull-out pantries, corner drawers, and custom organizers

## Functional Improvements

- **Workflow optimization**: Better work triangles and appliance placement
- **Lighting layers**: Ambient, task, and accent lighting
- **Ventilation**: Powerful range hoods for serious cooks
- **Accessibility**: Universal design features for all ages

## Budget Considerations

- **Cabinets**: 30-40% of budget
- **Countertops**: 10-15% of budget
- **Appliances**: 15-20% of budget
- **Labor**: 20-35% of budget

## Planning Your Remodel

1. **Set budget**: Determine what you can afford
2. **Prioritize needs**: Must-haves vs. nice-to-haves
3. **Get estimates**: Work with licensed professionals
4. **Plan timeline**: Kitchen remodels typically take 6-12 weeks

Considering a kitchen remodel? Happy Place Carpentry can help with custom cabinetry, structural changes, and complete kitchen renovations.
    `,
  },
};

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = blogPosts[params.slug];
  if (!post) return { title: "Blog Post Not Found" };

  return {
    title: post.title,
    description: post.content.split("\n")[1]?.replace("# ", "") || post.title,
    alternates: { canonical: `/blog/${params.slug}` },
  };
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = blogPosts[params.slug];

  if (!post) {
    notFound();
  }

  return (
    <>
      <Section className="bg-deep">
        <Container className="max-w-4xl">
          <div className="mb-4">
            <span className="inline-block px-3 py-1 bg-honey/10 text-honey rounded text-sm font-semibold">
              {post.category}
            </span>
          </div>
          <h1 className="font-display text-4xl font-bold text-text-on-dark sm:text-5xl">
            {post.title}
          </h1>
          <div className="mt-4 text-text-on-dark/80">
            {new Date(post.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        </Container>
      </Section>

      <Section>
        <Container className="max-w-4xl">
          <article className="prose prose-lg max-w-none">
            <div className="whitespace-pre-line">{post.content}</div>
          </article>

          <div className="mt-12 pt-8 border-t border-border-soft">
            <h3 className="text-xl font-bold text-text mb-4">Ready to start your project?</h3>
            <p className="text-text-muted mb-6">
              Get a free estimate from Happy Place Carpentry. We'll help you plan your project and provide a detailed proposal.
            </p>
            <a
              href="/estimate"
              className="inline-flex items-center justify-center rounded-lg bg-honey px-6 py-3 font-semibold text-deep transition-colors hover:bg-honey/90"
            >
              Get Free Estimate
            </a>
          </div>
        </Container>
      </Section>
    </>
  );
}

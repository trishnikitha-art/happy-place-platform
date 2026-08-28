import type { Metadata } from "next";
import { Container, Section, SectionHeading } from "@/components/section";

export const metadata: Metadata = {
  title: "Blog",
  description: "Homeowner tips, carpentry advice, and project inspiration from Happy Place Carpentry.",
  alternates: { canonical: "/blog" },
};

export const dynamic = 'force-dynamic';

// Placeholder blog data - will be replaced with actual markdown content system
const blogPosts = [
  {
    id: 1,
    slug: "spring-maintenance-checklist",
    title: "Spring Maintenance Checklist for Oregon Homeowners",
    date: "2024-03-15",
    excerpt: "Essential tasks to prepare your home for spring weather and prevent costly repairs.",
    category: "Maintenance",
  },
  {
    id: 2,
    slug: "deck-maintenance-guide",
    title: "Professional Deck Maintenance Guide",
    date: "2024-02-20",
    excerpt: "Keep your deck safe and beautiful with our professional maintenance tips.",
    category: "Outdoor",
  },
  {
    id: 3,
    slug: "kitchen-remodeling-trends",
    title: "Kitchen Remodeling Trends for 2024",
    date: "2024-01-10",
    excerpt: "Popular design trends and practical considerations for your kitchen renovation.",
    category: "Remodeling",
  },
];

export default function BlogPage() {
  return (
    <>
      <Section className="bg-deep">
        <Container className="max-w-4xl">
          <SectionHeading
            eyebrow={<span className="text-honey">Blog</span>}
            title={<span className="text-text-on-dark">Homeowner Tips & Project Inspiration</span>}
            description={<span className="text-text-on-dark/90">Practical advice from professional carpenters to help you maintain and improve your home.</span>}
          />
        </Container>
      </Section>

      <Section>
        <Container className="max-w-4xl">
          <div className="space-y-8">
            {blogPosts.map((post) => (
              <article
                key={post.id}
                className="rounded-lg border border-border-soft bg-surface p-6 transition-shadow hover:shadow-md"
              >
                <div className="mb-3 flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="inline-block px-2 py-1 bg-honey/10 text-honey rounded text-xs font-semibold">
                    {post.category}
                  </span>
                  <span>·</span>
                  <span>
                    {new Date(post.date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <h3 className="mb-2 text-xl font-bold text-text">{post.title}</h3>
                <p className="text-text-muted mb-4">{post.excerpt}</p>
                <a
                  href={`/blog/${post.slug}`}
                  className="text-honey hover:underline font-medium"
                >
                  Read article →
                </a>
              </article>
            ))}
          </div>
        </Container>
      </Section>
    </>
  );
}

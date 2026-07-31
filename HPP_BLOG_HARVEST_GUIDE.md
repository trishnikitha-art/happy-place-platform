# HPP Blog System Harvest Guide

**Purpose:** Replace placeholder blog with MIT-licensed next-md-blog system

---

## Recommended Solution: next-md-blog

**Repository:** https://github.com/next-md-blog/next-md-blog
**License:** MIT
**NPM Package:** @next-md-blog/core

### Features
- Markdown and MDX support
- Frontmatter metadata
- GitHub-flavored markdown
- Server Components for App Router
- SEO helpers (Metadata, Open Graph, Twitter Cards, JSON-LD)
- RSS and sitemap generation
- CLI for scaffolding
- TypeScript support
- Collections for multiple content surfaces

### Installation Steps

1. **Install the package:**
   ```bash
   npm install @next-md-blog/core
   ```

2. **Run the CLI to scaffold:**
   ```bash
   npx next-md-blog-init
   ```

   This will create:
   - `posts/` directory for markdown content
   - `next-md-blog.config.ts` configuration file
   - `/blog/[slug]` route
   - `/blogs` listing route
   - `sitemap.ts`
   - `robots.ts`
   - `feed.xml/route.ts`
   - Optional Open Graph image route
   - Tailwind Typography tweaks

3. **Customize configuration:**
   Edit `next-md-blog.config.ts` to match HPP branding

4. **Migrate placeholder content:**
   Move existing blog posts from `src/app/blog/[slug]/page.tsx` to markdown files in `posts/`

5. **Update styling:**
   Adapt the generated components to match HPP design system

---

## Alternative: nexifi/mdx-blog

**Repository:** https://github.com/nexifi/mdx-blog
**License:** MIT
**NPM Package:** @nexifi/mdx-blog

### Features
- Framework-agnostic (Next.js, Remix, Astro, Nuxt, SvelteKit)
- API client and React hooks
- SEO components (JSON-LD, sitemap, RSS)
- MDX widgets (Newsletter, TableOfContents, AuthorBio, ProductCard, RelatedPosts, StatsBox, FeatureList)
- Responsive images
- Security utilities
- i18n support
- TypeScript

### Installation Steps

1. **Install packages:**
   ```bash
   npm install @nexifi/mdx-blog @nexifi/mdx-blog/server @nexifi/mdx-blog/mdx
   ```

2. **Follow framework-specific setup:**
   - See documentation for Next.js App Router setup
   - Requires more manual configuration than next-md-blog

---

## Implementation Priority

### Phase 1: Install next-md-blog (Recommended)
1. Run npm install command
2. Run CLI scaffold
3. Configure basic settings
4. Test with sample content

### Phase 2: Content Migration
1. Convert existing placeholder posts to markdown
2. Add frontmatter metadata
3. Test rendering

### Phase 3: Styling Integration
1. Adapt to HPP design system
2. Add custom components if needed
3. Test responsive behavior

### Phase 4: SEO & Analytics
1. Configure metadata
2. Set up RSS feed
3. Generate sitemap
4. Add analytics tracking

---

## Current State

**HPP has:**
- Placeholder blog listing at `/blog`
- Placeholder blog detail at `/blog/[slug]`
- 3 sample posts with hardcoded content

**HPP needs:**
- Production-ready markdown blog system
- SEO optimization
- RSS feed
- Sitemap generation
- Easy content management

---

## Blocking Issues

**PowerShell Execution Policy:** Cannot run npm install commands due to PowerShell execution policy restrictions.

**Resolution Required:** User needs to either:
1. Enable PowerShell script execution
2. Run npm install commands manually
3. Use alternative installation method

---

## Next Steps

1. **User Action:** Run `npm install @next-md-blog/core`
2. **User Action:** Run `npx next-md-blog-init`
3. **Developer Action:** Configure next-md-blog.config.ts
4. **Developer Action:** Migrate placeholder content to markdown
5. **Developer Action:** Adapt styling to HPP design system
6. **Developer Action:** Test and deploy

---

## Alternative: Manual Implementation

If npm install continues to be blocked, manually implement:
- Markdown file reading from `posts/` directory
- Frontmatter parsing (use gray-matter package)
- MDX rendering (use next-mdx-remote)
- Basic SEO metadata
- Simple listing page

This approach requires more development time but avoids npm install issues.

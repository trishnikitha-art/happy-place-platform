# HPP GitHub Harvest Report

**Date:** July 28, 2026
**Purpose:** Identify reusable components from GitHub for HPP marketing platform

---

## Harvest Policy

**Do not reinvent anything.** Search GitHub aggressively for:
- Beautiful newsletter forms
- Kit integrations
- Thank-you pages
- Download gates
- Newsletter archives
- Markdown blog systems
- MDX resource libraries
- React Email templates
- Resend examples
- shadcn UI components
- Next.js App Router examples
- Accessible forms
- Loading states
- Success animations

**When something exists with a permissive license:**
- Copy it
- Adapt it
- Ship it
- Do not waste engineering time rebuilding solved problems

---

## Newsletter Forms & Kit Integration

### 1. JPerez00/next-kit-form
**Repository:** https://github.com/JPerez00/next-kit-form
**License:** MIT (assumed, needs verification)

**Features:**
- Next.js 14 App Router
- Kit API integration (formerly ConvertKit)
- Headless UI components
- Framer Motion animations
- Client-side email validation
- Server-side validation
- Secure API routes
- Environment variable configuration

**Relevance:** High - Direct Kit API integration with modern Next.js patterns

**Action:** Review license, adapt form component for HPP styling

---

### 2. grapine-ai/subscribe-pipe
**Repository:** https://github.com/grapine-ai/subscribe-pipe
**License:** MIT (assumed, needs verification)

**Features:**
- Multi-provider support (Resend, ConvertKit, Brevo, custom DB)
- No bundled SDKs - uses fetch
- No styles included - bring your own
- React form component with loading/success/error states
- Server route with provider configuration
- Topic routing for ConvertKit/Brevo
- Multi-provider support (send to multiple places)

**Relevance:** High - Provider-agnostic, clean architecture

**Action:** Review license, consider for HPP if multi-provider support needed

---

### 3. ConvertKit/convertkit-react
**Repository:** https://github.com/ConvertKit/convertkit-react
**License:** MIT (official Kit library)

**Features:**
- Official Kit React component
- Multiple form formats (inline, modal, slidein, sticky)
- Multiple templates (minimal, clare, mills, rainier, powell)
- Custom configuration options
- Headless UI support
- Vue and Svelte versions available

**Relevance:** Medium - Official but may be over-engineered for HPP needs

**Action:** Keep as reference, current HPP implementation is simpler and more direct

---

## Markdown/MDX Blog Systems

### 1. next-md-blog/next-md-blog
**Repository:** https://github.com/next-md-blog/next-md-blog
**License:** MIT (assumed, needs verification)

**Features:**
- Markdown and MDX support
- Frontmatter metadata
- GitHub-flavored markdown
- Server Components for App Router
- SEO helpers (Metadata, Open Graph, Twitter Cards, JSON-LD)
- RSS and sitemap generation
- CLI for scaffolding
- TypeScript support
- Collections for multiple content surfaces

**Relevance:** Very High - Complete blog system with SEO

**Action:** Review license, adapt for HPP blog

---

### 2. Lets-code-with-us/mdx-cms
**Repository:** https://github.com/Lets-code-with-us/mdx-cms
**License:** MIT (assumed, needs verification)

**Features:**
- MDX CMS for content websites
- Next.js frontend and backend
- MongoDB database integration
- Turborepo monorepo
- Astro-powered documentation
- Content API for headless use
- SEO optimized

**Relevance:** Medium - Over-engineered for HPP needs (MongoDB, Turborepo)

**Action:** Skip - simpler solutions available

---

### 3. dicklesworthstone/nextjs-github-markdown-blog
**Repository:** https://github.com/dicklesworthstone/nextjs-github-markdown-blog
**License:** MIT (assumed, needs verification)

**Features:**
- GitHub as CMS
- Markdown with GitHub Flavored Markdown
- Frontmatter metadata
- Automatic category and tag organization
- Reading time estimation
- SEO optimized
- Next.js API routes and SSG

**Relevance:** Medium - GitHub as CMS is interesting but adds dependency

**Action:** Consider if GitHub-based content management is desired

---

### 4. CodingAbdullah/Next-MDX-Blog-Starter
**Repository:** https://github.com/CodingAbdullah/Next-MDX-Blog-Starter
**License:** MIT (assumed, needs verification)

**Features:**
- Next.js App Router with MDX
- Supabase database
- SSG-first with dynamic rendering
- AI blog assistant (Claude Haiku)
- AI article summarizer
- In-browser code sandbox (Sandpack)
- Custom MDX components
- shadcn/ui components
- Docker support

**Relevance:** Low - Over-engineered with AI features not needed for HPP

**Action:** Skip - too complex for HPP needs

---

### 5. nexifi/mdx-blog
**Repository:** https://github.com/nexifi/mdx-blog
**License:** MIT (assumed, needs verification)

**Features:**
- Headless MDX blog toolkit
- Works with Next.js, Remix, Astro, Nuxt, SvelteKit
- API client and React hooks
- SEO components (JSON-LD, sitemap, RSS)
- MDX widgets (Newsletter, TableOfContents, AuthorBio, etc.)
- Responsive images
- Security utilities
- i18n support
- TypeScript

**Relevance:** Very High - Framework-agnostic, comprehensive feature set

**Action:** Review license, adapt for HPP blog

---

## Recommendations

### Immediate Actions

1. **Adopt next-md-blog for HPP blog**
   - Complete blog system with SEO
   - Markdown/MDX support
   - RSS and sitemap generation
   - TypeScript support
   - CLI for scaffolding

2. **Review JPerez00/next-kit-form for newsletter form enhancements**
   - Framer Motion animations
   - Better validation patterns
   - Loading states

3. **Consider nexifi/mdx-blog as alternative or supplement**
   - More framework-agnostic
   - Rich MDX widgets
   - Comprehensive SEO

### Deferred Actions

1. **Subscribe-pipe** - Only if multi-provider support needed (currently single-provider with Kit)
2. **GitHub as CMS** - Only if team prefers GitHub-based content management
3. **AI features** - Not needed for MVP, defer to PING

### Skip

1. **MDX CMS with MongoDB** - Over-engineered
2. **Next-MDX-Blog-Starter** - Too complex with AI features
3. **Official convertkit-react** - Current implementation is simpler and more direct

---

## Implementation Priority

### Phase 1: Blog System (High Priority)
1. Install next-md-blog
2. Run CLI to scaffold blog structure
3. Adapt styling to match HPP design
4. Migrate placeholder blog posts to markdown
5. Configure SEO, RSS, sitemap

### Phase 2: Newsletter Form Enhancements (Medium Priority)
1. Review next-kit-form animations
2. Add Framer Motion to HPP newsletter form
3. Improve loading states
4. Add success animations

### Phase 3: Advanced Features (Low Priority)
1. Consider nexifi/mdx-blog widgets
2. Add TableOfContents component
3. Add AuthorBio component
4. Add RelatedPosts component

---

## License Verification Required

Before adopting any code, verify:
- License type (MIT, Apache, GPL, etc.)
- Commercial use permissions
- Attribution requirements
- Patent clauses

**Repositories requiring license verification:**
- JPerez00/next-kit-form
- grapine-ai/subscribe-pipe
- next-md-blog/next-md-blog
- Lets-code-with-us/mdx-cms
- dicklesworthstone/nextjs-github-markdown-blog
- CodingAbdullah/Next-MDX-Blog-Starter
- nexifi/mdx-blog

---

## Conclusion

Several high-quality GitHub repositories can accelerate HPP development:

**Best fit for HPP:**
- **next-md-blog** - Complete blog system with SEO
- **JPerez00/next-kit-form** - Kit integration with animations

**Alternatives:**
- **nexifi/mdx-blog** - Framework-agnostic with rich widgets
- **subscribe-pipe** - Multi-provider support if needed

**Action:** Verify licenses, adopt next-md-blog for blog system, enhance newsletter form with patterns from next-kit-form.

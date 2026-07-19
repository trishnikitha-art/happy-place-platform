# DEPLOYMENT.md — Production Runbook

**Goal:** owner opens laptop → signs into GitHub, Vercel, Google Workspace →
points the domain → verifies contact email → **live in under 30 minutes.**
No Google Cloud Console. No OAuth. No billing. No databases.

This is the repeatable playbook for **every** contractor site. Do the steps in
order.

---

## 0. Before you sit down (one-time, ~5 min)

- [ ] Confirm the client owns their domain (Google Domains / Squarespace /
      registrar) and their Google Workspace email works.
- [ ] Know the production domain (e.g. `happyplacecarpentry.com`).
- [ ] Have the repo pushed to GitHub (see §1).

---

## 1. GitHub (~3 min)

```bash
cd happy-place-platform
git remote add origin https://github.com/<owner>/<repo>.git
git push -u origin master
```

- [ ] Repo is **private**.
- [ ] `.env*` is git-ignored (verify: `git ls-files | grep -i env` → nothing
      except `*.example`).

---

## 2. Vercel (~8 min)

1. vercel.com → **Add New → Project** → import the GitHub repo.
2. **Root Directory:** set to `website` (the Next app is in a subfolder).
3. Framework auto-detects **Next.js**. Build command `npm run build`, output
   auto. Leave defaults.
4. **Environment Variables** (Project → Settings → Environment Variables):
   | Name | Value | Environments |
   |---|---|---|
   | `NEXT_PUBLIC_SITE_URL` | `https://<production-domain>` | Production, Preview, Development |
   > *Until the code reads this env (Directive 025), also confirm `src/config/
   > company.ts` `siteUrl` matches the production domain.*
5. **Deploy.** Wait for the green preview URL. Click it — the site should load.

- [ ] Preview deployment is green and loads.

---

## 3. Custom Domain + HTTPS (~7 min)

1. Vercel → Project → **Settings → Domains → Add** → enter the domain.
2. Vercel shows DNS records. In the registrar (Google Domains etc.):
   - Apex `@` → **A** record to Vercel's IP (Vercel shows it), **or**
   - `www` → **CNAME** `cname.vercel-dns.com`.
   - Follow exactly what Vercel displays for this domain.
3. Wait for DNS to verify (usually minutes). Vercel issues HTTPS automatically.

- [ ] Domain resolves to the site over **https://** (padlock shown).
- [ ] `www` and apex both work (set one as primary redirect in Vercel).

---

## 4. Contact / Estimate Email (~2 min)

The MVP estimate wizard and contact links open the visitor's mail client
addressed to the business inbox. **No server email needed.**

1. Confirm `src/config/company.ts` `email` = the client's real Google Workspace
   inbox (e.g. `taylor@happyplacecarpentry.com`).
2. On the live site: open **/estimate**, complete the wizard, press **Send** —
   your mail app should open a pre-filled message to that inbox. Send a test.
3. Confirm the client **receives** the test in Gmail.

- [ ] Test estimate email arrives in the client's Gmail.
- [ ] Header phone/email links work on mobile (tel:/mailto:).

---

## 5. Launch Verification Checklist (~5 min)

- [ ] Home, Services, Gallery, Projects, About, Reviews, FAQ, Contact, Estimate,
      Privacy all load (no 404).
- [ ] `/<domain>/sitemap.xml` and `/<domain>/robots.txt` return valid content.
- [ ] Gallery lightbox opens; arrows + Esc + swipe work.
- [ ] A project spotlight page opens and renders the story.
- [ ] Mobile: nav menu opens/closes; layout is clean on a phone.
- [ ] Favicon + social preview image show (paste the URL into a Slack/iMessage to
      preview OG).
- [ ] 404: visit a bad URL → branded not-found page.
- [ ] Lighthouse (Chrome DevTools → Lighthouse, mobile): Performance / A11y /
      Best Practices / SEO all strong.

---

## 6. Real Photos (do before or right after launch)

The site ships with branded SVG placeholders. To use real client photos:

```bash
cd website
npm i -D sharp                       # one time
# drop client photos into website/scripts/source-images/{gallery,projects,services}/
npm run images                       # generates variants + WebP/AVIF + blur + manifest
```

Then update `src/config/gallery.ts` / `projects.ts` `src`/`width`/`height`/
`blurDataURL` from `src/config/generated/image-manifest.json`, write descriptive
`alt` text, and **remove `dangerouslyAllowSVG` from `next.config.ts`**. Commit &
push → Vercel redeploys automatically.

- [ ] Real photos in place, `dangerouslyAllowSVG` removed, redeployed.

---

## 7. Onboarding the NEXT contractor (repeat playbook)

No code changes — only configuration:
1. Edit `src/config/*`: `company, navigation, serviceCategories, services (+estimate
   questions), gallery, projects, reviews, faq, counties, seo`.
2. Rebrand tokens in `src/app/globals.css` (`@theme` colors).
3. Swap images (§6). 4. New repo/Vercel project + domain (§1–4).

That's the whole platform promise: **the second deployment is faster than the
first.**

---

## Rollback

Vercel → Project → **Deployments** → pick the last good one → **Promote to
Production**. Instant. Git history is the source of truth.

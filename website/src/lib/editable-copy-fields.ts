// Explicit page-copy registry. Routes, identity, factual records and review testimony remain separate authorities.
export const EDITABLE_COPY_FIELDS = {
  "homepage.services.title": {
    "label": "Home services heading",
    "route": "/",
    "maxLength": 180,
    "source": "app/page.tsx",
    "classification": "editable copy"
  },
  "homepage.services.description": {
    "label": "Home services introduction",
    "route": "/",
    "maxLength": 500,
    "source": "app/page.tsx",
    "classification": "editable copy"
  },
  "homepage.projects.title": {
    "label": "Home projects heading",
    "route": "/",
    "maxLength": 180,
    "source": "app/page.tsx",
    "classification": "editable copy"
  },
  "homepage.projects.description": {
    "label": "Home projects introduction",
    "route": "/",
    "maxLength": 500,
    "source": "app/page.tsx",
    "classification": "editable copy"
  },
  "homepage.family.eyebrow": {
    "label": "Family section caption",
    "route": "/",
    "maxLength": 180,
    "source": "app/page.tsx",
    "classification": "editable copy"
  },
  "homepage.family.title": {
    "label": "Family section heading",
    "route": "/",
    "maxLength": 180,
    "source": "app/page.tsx",
    "classification": "editable copy"
  },
  "homepage.family.introduction": {
    "label": "Family introduction",
    "route": "/",
    "maxLength": 500,
    "source": "app/page.tsx",
    "classification": "editable copy"
  },
  "homepage.family.taylor": {
    "label": "Taylor biography",
    "route": "/",
    "maxLength": 500,
    "source": "app/page.tsx",
    "classification": "editable copy"
  },
  "homepage.family.lanie": {
    "label": "Lanie biography",
    "route": "/",
    "maxLength": 500,
    "source": "app/page.tsx",
    "classification": "editable copy"
  },
  "homepage.reviews.title": {
    "label": "Home reviews heading",
    "route": "/",
    "maxLength": 180,
    "source": "app/page.tsx",
    "classification": "editable copy"
  },
  "homepage.reviews.empty": {
    "label": "Home reviews empty message",
    "route": "/",
    "maxLength": 500,
    "source": "app/page.tsx",
    "classification": "editable copy"
  },
  "about.hero.prefix": {
    "label": "About headline before signature",
    "route": "/about",
    "maxLength": 180,
    "source": "app/about/page.tsx",
    "classification": "editable copy"
  },
  "about.hero.suffix": {
    "label": "About headline after signature",
    "route": "/about",
    "maxLength": 180,
    "source": "app/about/page.tsx",
    "classification": "editable copy"
  },
  "about.hero.description": {
    "label": "About introduction",
    "route": "/about",
    "maxLength": 900,
    "source": "app/about/page.tsx",
    "classification": "editable copy"
  },
  "about.hero.promise": {
    "label": "About promise",
    "route": "/about",
    "maxLength": 180,
    "source": "app/about/page.tsx",
    "classification": "editable copy"
  },
  "about.area.eyebrow": {
    "label": "About service area caption",
    "route": "/about",
    "maxLength": 100,
    "source": "app/about/page.tsx",
    "classification": "editable copy"
  },
  "about.area.title": {
    "label": "About service area heading",
    "route": "/about",
    "maxLength": 180,
    "source": "app/about/page.tsx",
    "classification": "editable copy"
  },
  "about.cta.title": {
    "label": "About closing headline",
    "route": "/about",
    "maxLength": 500,
    "source": "app/about/page.tsx",
    "classification": "editable copy"
  },
  "about.cta.description": {
    "label": "About closing introduction",
    "route": "/about",
    "maxLength": 500,
    "source": "app/about/page.tsx",
    "classification": "editable copy"
  },
  "services.hero.title": {
    "label": "Services headline",
    "route": "/services",
    "maxLength": 600,
    "source": "app/services/page.tsx",
    "classification": "editable copy"
  },
  "services.hero.description": {
    "label": "Services introduction",
    "route": "/services",
    "maxLength": 600,
    "source": "app/services/page.tsx",
    "classification": "editable copy"
  },
  "services.other.title": {
    "label": "Other services heading",
    "route": "/services",
    "maxLength": 600,
    "source": "app/services/page.tsx",
    "classification": "editable copy"
  },
  "services.other.description": {
    "label": "Other services introduction",
    "route": "/services",
    "maxLength": 600,
    "source": "app/services/page.tsx",
    "classification": "editable copy"
  },
  "contact.hero.title": {
    "label": "Contact headline",
    "route": "/contact",
    "maxLength": 600,
    "source": "app/contact/page.tsx",
    "classification": "editable copy"
  },
  "contact.hero.description": {
    "label": "Contact introduction",
    "route": "/contact",
    "maxLength": 600,
    "source": "app/contact/page.tsx",
    "classification": "editable copy"
  },
  "contact.details.title": {
    "label": "Contact details heading",
    "route": "/contact",
    "maxLength": 600,
    "source": "app/contact/page.tsx",
    "classification": "editable copy"
  },
  "contact.details.description": {
    "label": "Contact details introduction",
    "route": "/contact",
    "maxLength": 600,
    "source": "app/contact/page.tsx",
    "classification": "editable copy"
  },
  "contact.details.action": {
    "label": "Contact email button",
    "route": "/contact",
    "maxLength": 600,
    "source": "app/contact/page.tsx",
    "classification": "editable copy"
  },
  "reviews.hero.title": {
    "label": "Reviews headline",
    "route": "/reviews",
    "maxLength": 180,
    "source": "app/reviews/page.tsx",
    "classification": "editable copy"
  },
  "reviews.empty": {
    "label": "Reviews empty message",
    "route": "/reviews",
    "maxLength": 500,
    "source": "app/reviews/page.tsx",
    "classification": "editable copy"
  },
  "work.transformations.title": {
    "label": "Work transformations heading",
    "route": "/our-work",
    "maxLength": 500,
    "source": "app/our-work/OurWorkClient.tsx",
    "classification": "editable copy"
  },
  "work.transformations.description": {
    "label": "Work transformations introduction",
    "route": "/our-work",
    "maxLength": 500,
    "source": "app/our-work/OurWorkClient.tsx",
    "classification": "editable copy"
  },
  "work.stories.title": {
    "label": "Work stories heading",
    "route": "/our-work",
    "maxLength": 500,
    "source": "app/our-work/OurWorkClient.tsx",
    "classification": "editable copy"
  },
  "work.stories.description": {
    "label": "Work stories introduction",
    "route": "/our-work",
    "maxLength": 500,
    "source": "app/our-work/OurWorkClient.tsx",
    "classification": "editable copy"
  },
  "work.archive.title": {
    "label": "Work archive heading",
    "route": "/our-work",
    "maxLength": 500,
    "source": "app/our-work/OurWorkClient.tsx",
    "classification": "editable copy"
  },
  "work.archive.description": {
    "label": "Work archive introduction",
    "route": "/our-work",
    "maxLength": 500,
    "source": "app/our-work/OurWorkClient.tsx",
    "classification": "editable copy"
  },
  "newsletter.title": {
    "label": "Newsletter heading",
    "route": "/",
    "maxLength": 600,
    "source": "components/newsletter-signup.tsx",
    "classification": "editable copy"
  },
  "newsletter.description": {
    "label": "Newsletter introduction",
    "route": "/",
    "maxLength": 600,
    "source": "components/newsletter-signup.tsx",
    "classification": "editable copy"
  },
  "newsletter.privacy": {
    "label": "Newsletter privacy note",
    "route": "/",
    "maxLength": 600,
    "source": "components/newsletter-signup.tsx",
    "classification": "editable copy"
  },
  "cta.title": {
    "label": "Shared closing headline",
    "route": "*",
    "maxLength": 180,
    "source": "components/cta-section.tsx",
    "classification": "editable copy"
  },
  "cta.description": {
    "label": "Shared closing introduction",
    "route": "*",
    "maxLength": 600,
    "source": "components/cta-section.tsx",
    "classification": "editable copy"
  },
  "cta.primaryAction": {
    "label": "Shared project button",
    "route": "*",
    "maxLength": 80,
    "source": "components/cta-section.tsx",
    "classification": "editable copy"
  },
  "cta.secondaryAction": {
    "label": "Shared work button",
    "route": "*",
    "maxLength": 80,
    "source": "components/cta-section.tsx",
    "classification": "editable copy"
  }
} as const;

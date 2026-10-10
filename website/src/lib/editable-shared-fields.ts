// Static shared copy only. Identity, destinations and submitted form values retain their original authorities.
export const EDITABLE_SHARED_FIELDS = {
  "company.serviceArea": {
    "label": "Service area",
    "route": "*",
    "maxLength": 300,
    "source": "components/site-footer.tsx",
    "classification": "editable copy",
    "context": "Service area in footer, contact details and company metadata"
  },
  "company.businessHours": {
    "label": "Business hours",
    "route": "*",
    "maxLength": 300,
    "source": "components/site-footer.tsx",
    "classification": "editable copy",
    "context": "Business hours in footer and contact details"
  },
  "navigation.home": {
    "label": "Navigation Home",
    "route": "*",
    "maxLength": 80,
    "source": "lib/navigation.ts",
    "classification": "editable copy",
    "context": "Shared desktop, mobile and footer navigation label; destination remains /"
  },
  "navigation.services": {
    "label": "Navigation Services",
    "route": "*",
    "maxLength": 80,
    "source": "lib/navigation.ts",
    "classification": "editable copy",
    "context": "Shared desktop, mobile and footer navigation label; destination remains /services"
  },
  "navigation.work": {
    "label": "Navigation Work",
    "route": "*",
    "maxLength": 80,
    "source": "lib/navigation.ts",
    "classification": "editable copy",
    "context": "Shared desktop, mobile and footer navigation label; destination remains /our-work"
  },
  "navigation.about": {
    "label": "Navigation About",
    "route": "*",
    "maxLength": 80,
    "source": "lib/navigation.ts",
    "classification": "editable copy",
    "context": "Shared desktop, mobile and footer navigation label; destination remains /about"
  },
  "navigation.reviews": {
    "label": "Navigation Reviews",
    "route": "*",
    "maxLength": 80,
    "source": "lib/navigation.ts",
    "classification": "editable copy",
    "context": "Shared desktop, mobile and footer navigation label; destination remains /reviews"
  },
  "navigation.contact": {
    "label": "Navigation Contact",
    "route": "*",
    "maxLength": 80,
    "source": "lib/navigation.ts",
    "classification": "editable copy",
    "context": "Shared desktop, mobile and footer navigation label; destination remains /contact"
  },
  "footer.tagline": {
    "label": "Footer Tagline",
    "route": "*",
    "maxLength": 600,
    "source": "components/site-footer.tsx",
    "classification": "editable copy",
    "context": "Footer tagline after legal name"
  },
  "footer.servicesAction": {
    "label": "Footer Servicesaction",
    "route": "*",
    "maxLength": 600,
    "source": "components/site-footer.tsx",
    "classification": "editable copy",
    "context": "Footer services link"
  },
  "footer.reviewAction": {
    "label": "Footer Reviewaction",
    "route": "*",
    "maxLength": 600,
    "source": "components/site-footer.tsx",
    "classification": "editable copy",
    "context": "Footer review link"
  },
  "footer.areaTitle": {
    "label": "Footer Areatitle",
    "route": "*",
    "maxLength": 600,
    "source": "components/site-footer.tsx",
    "classification": "editable copy",
    "context": "Footer heading"
  },
  "footer.explore": {
    "label": "Footer Explore",
    "route": "*",
    "maxLength": 600,
    "source": "components/site-footer.tsx",
    "classification": "editable copy",
    "context": "Footer heading"
  },
  "footer.contactTitle": {
    "label": "Footer Contacttitle",
    "route": "*",
    "maxLength": 600,
    "source": "components/site-footer.tsx",
    "classification": "editable copy",
    "context": "Footer heading"
  },
  "navigation.themeLabel": {
    "label": "Navigation Themelabel",
    "route": "*",
    "maxLength": 600,
    "source": "components/mobile-site-navigation.tsx",
    "classification": "editable copy",
    "context": "Mobile drawer theme label"
  },
  "newsletter.submit": {
    "label": "Newsletter Submit",
    "route": "*",
    "maxLength": 600,
    "source": "components/newsletter-signup.tsx",
    "classification": "editable copy",
    "context": "Idle newsletter submit button"
  },
  "newsletter.submitting": {
    "label": "Newsletter Submitting",
    "route": "*",
    "maxLength": 600,
    "source": "components/newsletter-signup.tsx",
    "classification": "editable copy",
    "context": "Visible only during submission and before thank-you redirect"
  },
  "newsletter.emailPlaceholder": {
    "label": "Newsletter Emailplaceholder",
    "route": "/",
    "maxLength": 120,
    "source": "components/newsletter-signup.tsx",
    "classification": "editable copy",
    "context": "Input placeholder; edit in copy inventory",
    "attribute": "placeholder"
  },
  "newsletter.namePlaceholder": {
    "label": "Newsletter Nameplaceholder",
    "route": "/",
    "maxLength": 120,
    "source": "components/newsletter-signup.tsx",
    "classification": "editable copy",
    "context": "Input placeholder; edit in copy inventory",
    "attribute": "placeholder"
  },
  "review.success.googleDescription": {
    "label": "Review Success Googledescription",
    "route": "/review",
    "maxLength": 600,
    "source": "app/review/page.tsx",
    "classification": "editable copy",
    "context": "After successful review submission only"
  },
  "review.success.feedback": {
    "label": "Review Success Feedback",
    "route": "/review",
    "maxLength": 600,
    "source": "app/review/page.tsx",
    "classification": "editable copy",
    "context": "After successful review submission only"
  },
  "review.contactConsent": {
    "label": "Review Contactconsent",
    "route": "/review",
    "maxLength": 600,
    "source": "app/review/page.tsx",
    "classification": "editable copy",
    "context": "Review form; before submission"
  },
  "review.nameConsent": {
    "label": "Review Nameconsent",
    "route": "/review",
    "maxLength": 600,
    "source": "app/review/page.tsx",
    "classification": "editable copy",
    "context": "Review form; before submission"
  },
  "review.success.thanks": {
    "label": "Review Success Thanks",
    "route": "/review",
    "maxLength": 600,
    "source": "app/review/page.tsx",
    "classification": "editable copy",
    "context": "After successful review submission only"
  },
  "review.introduction": {
    "label": "Review Introduction",
    "route": "/review",
    "maxLength": 600,
    "source": "app/review/page.tsx",
    "classification": "editable copy",
    "context": "Review form; before submission"
  },
  "review.ratingLabel": {
    "label": "Review Ratinglabel",
    "route": "/review",
    "maxLength": 600,
    "source": "app/review/page.tsx",
    "classification": "editable copy",
    "context": "Review form; before submission"
  },
  "review.question": {
    "label": "Review Question",
    "route": "/review",
    "maxLength": 600,
    "source": "app/review/page.tsx",
    "classification": "editable copy",
    "context": "Review form; before submission"
  },
  "review.success.personal": {
    "label": "Review Success Personal",
    "route": "/review",
    "maxLength": 600,
    "source": "app/review/page.tsx",
    "classification": "editable copy",
    "context": "After successful review submission only"
  },
  "review.bodyLabel": {
    "label": "Review Bodylabel",
    "route": "/review",
    "maxLength": 600,
    "source": "app/review/page.tsx",
    "classification": "editable copy",
    "context": "Review form; before submission"
  },
  "review.title": {
    "label": "Review Title",
    "route": "/review",
    "maxLength": 600,
    "source": "app/review/page.tsx",
    "classification": "editable copy",
    "context": "Review form; before submission"
  },
  "review.success.googleAction": {
    "label": "Review Success Googleaction",
    "route": "/review",
    "maxLength": 600,
    "source": "app/review/page.tsx",
    "classification": "editable copy",
    "context": "After successful review submission only"
  },
  "review.success.homeAction": {
    "label": "Review Success Homeaction",
    "route": "/review",
    "maxLength": 600,
    "source": "app/review/page.tsx",
    "classification": "editable copy",
    "context": "After successful review submission only"
  },
  "review.serviceLabel": {
    "label": "Review Servicelabel",
    "route": "/review",
    "maxLength": 600,
    "source": "app/review/page.tsx",
    "classification": "editable copy",
    "context": "Review form; before submission"
  },
  "review.cityLabel": {
    "label": "Review Citylabel",
    "route": "/review",
    "maxLength": 600,
    "source": "app/review/page.tsx",
    "classification": "editable copy",
    "context": "Review form; before submission"
  },
  "review.success.title": {
    "label": "Review Success Title",
    "route": "/review",
    "maxLength": 600,
    "source": "app/review/page.tsx",
    "classification": "editable copy",
    "context": "After successful review submission only"
  },
  "review.nameLabel": {
    "label": "Review Namelabel",
    "route": "/review",
    "maxLength": 600,
    "source": "app/review/page.tsx",
    "classification": "editable copy",
    "context": "Review form; before submission"
  },
  "review.namePlaceholder": {
    "label": "Review Nameplaceholder",
    "route": "/review",
    "maxLength": 300,
    "source": "app/review/page.tsx",
    "classification": "editable copy",
    "context": "Form input placeholder; edit in inventory",
    "attribute": "placeholder"
  },
  "review.cityPlaceholder": {
    "label": "Review Cityplaceholder",
    "route": "/review",
    "maxLength": 300,
    "source": "app/review/page.tsx",
    "classification": "editable copy",
    "context": "Form input placeholder; edit in inventory",
    "attribute": "placeholder"
  },
  "review.bodyPlaceholder": {
    "label": "Review Bodyplaceholder",
    "route": "/review",
    "maxLength": 300,
    "source": "app/review/page.tsx",
    "classification": "editable copy",
    "context": "Form input placeholder; edit in inventory",
    "attribute": "placeholder"
  },
  "review.submitting": {
    "label": "Review Submitting",
    "route": "/review",
    "maxLength": 100,
    "source": "app/review/page.tsx",
    "classification": "editable copy",
    "context": "Submission button; pending request only"
  },
  "review.submit": {
    "label": "Review Submit",
    "route": "/review",
    "maxLength": 100,
    "source": "app/review/page.tsx",
    "classification": "editable copy",
    "context": "Submission button; idle state"
  },
  "review.serviceOption.choose": {
    "label": "Review Serviceoption Choose",
    "route": "/review",
    "maxLength": 100,
    "source": "app/review/page.tsx",
    "classification": "editable copy",
    "context": "Native service option label; submitted option value stays unchanged",
    "attribute": "option"
  },
  "review.serviceOption.deck": {
    "label": "Review Serviceoption Deck",
    "route": "/review",
    "maxLength": 100,
    "source": "app/review/page.tsx",
    "classification": "editable copy",
    "context": "Native service option label; submitted option value stays unchanged",
    "attribute": "option"
  },
  "review.serviceOption.pergola": {
    "label": "Review Serviceoption Pergola",
    "route": "/review",
    "maxLength": 100,
    "source": "app/review/page.tsx",
    "classification": "editable copy",
    "context": "Native service option label; submitted option value stays unchanged",
    "attribute": "option"
  },
  "review.serviceOption.fence": {
    "label": "Review Serviceoption Fence",
    "route": "/review",
    "maxLength": 100,
    "source": "app/review/page.tsx",
    "classification": "editable copy",
    "context": "Native service option label; submitted option value stays unchanged",
    "attribute": "option"
  },
  "review.serviceOption.painting": {
    "label": "Review Serviceoption Painting",
    "route": "/review",
    "maxLength": 100,
    "source": "app/review/page.tsx",
    "classification": "editable copy",
    "context": "Native service option label; submitted option value stays unchanged",
    "attribute": "option"
  },
  "review.serviceOption.bathroom": {
    "label": "Review Serviceoption Bathroom",
    "route": "/review",
    "maxLength": 100,
    "source": "app/review/page.tsx",
    "classification": "editable copy",
    "context": "Native service option label; submitted option value stays unchanged",
    "attribute": "option"
  },
  "review.serviceOption.kitchen": {
    "label": "Review Serviceoption Kitchen",
    "route": "/review",
    "maxLength": 100,
    "source": "app/review/page.tsx",
    "classification": "editable copy",
    "context": "Native service option label; submitted option value stays unchanged",
    "attribute": "option"
  },
  "review.serviceOption.carpentry": {
    "label": "Review Serviceoption Carpentry",
    "route": "/review",
    "maxLength": 100,
    "source": "app/review/page.tsx",
    "classification": "editable copy",
    "context": "Native service option label; submitted option value stays unchanged",
    "attribute": "option"
  },
  "review.serviceOption.other": {
    "label": "Review Serviceoption Other",
    "route": "/review",
    "maxLength": 100,
    "source": "app/review/page.tsx",
    "classification": "editable copy",
    "context": "Native service option label; submitted option value stays unchanged",
    "attribute": "option"
  },
  "newsletter.failure": {
    "label": "Newsletter failure fallback",
    "route": "/",
    "maxLength": 300,
    "source": "components/newsletter-signup.tsx",
    "classification": "editable copy",
    "context": "Conditional local failure fallback; dynamic provider/API messages stay unchanged"
  },
  "newsletter.networkFailure": {
    "label": "Newsletter networkFailure fallback",
    "route": "/",
    "maxLength": 300,
    "source": "components/newsletter-signup.tsx",
    "classification": "editable copy",
    "context": "Conditional local failure fallback; dynamic provider/API messages stay unchanged"
  },
  "review.failure": {
    "label": "Review failure fallback",
    "route": "/review",
    "maxLength": 300,
    "source": "app/review/page.tsx",
    "classification": "editable copy",
    "context": "Conditional local failure fallback; dynamic provider/API messages stay unchanged"
  },
  "review.unknownFailure": {
    "label": "Review unknownFailure fallback",
    "route": "/review",
    "maxLength": 300,
    "source": "app/review/page.tsx",
    "classification": "editable copy",
    "context": "Conditional local failure fallback; dynamic provider/API messages stay unchanged"
  }
} as const;

const NAVIGATION_TEXT_KEYS = {
  "/": "navigation.home",
  "/services": "navigation.services",
  "/our-work": "navigation.work",
  "/about": "navigation.about",
  "/reviews": "navigation.reviews",
  "/contact": "navigation.contact"
} as const;
export function navigationTextKey(href: string) {
  return NAVIGATION_TEXT_KEYS[href as keyof typeof NAVIGATION_TEXT_KEYS];
}

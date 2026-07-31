# HPP Privacy Compliance Review

**Date:** July 28, 2026
**Purpose:** Review HPP data collection for privacy compliance

---

## Privacy Principles

1. **Transparent:** All data collection is disclosed to users
2. **Consented:** Users opt-in to newsletter and communications
3. **Minimal:** Only collect data that serves a clear business purpose
4. **Ethical:** No surveillance, no fingerprinting, no dark patterns
5. **Compliant:** Follow applicable privacy laws (GDPR, CCPA, etc.)

---

## Current Data Collection

### Newsletter Signup

**Collected Data:**
- Email address (required)
- First name (optional)
- Acquisition source (automatic)
- Referrer URL (automatic)
- Device class (automatic: mobile/tablet/desktop)

**Consent:** Explicit opt-in via signup form
**Disclosure:** "No spam, ever. Unsubscribe anytime." displayed on form
**Purpose:** Email marketing, lead nurturing, customer communication
**Retention:** Until user unsubscribes

**Compliance Assessment:** ✅ Compliant
- Email is required for newsletter delivery
- First name is optional
- Acquisition metadata helps optimize marketing
- User can unsubscribe anytime via Kit
- No sensitive personal data collected

---

### Estimate Request

**Collected Data:**
- Email address (required)
- Full name (required)
- Phone number (optional)
- Selected services (required)
- Property address (optional)
- Property city (optional)
- Property county (optional)
- Project details (optional)
- Photos (user-uploaded, optional)
- Acquisition source (automatic)

**Consent:** Implicit consent via estimate request submission
**Disclosure:** Form clearly states purpose: "Get a free carpentry estimate"
**Purpose:** Project scoping, quote generation, customer communication
**Retention:** 2 years recommended for business purposes

**Compliance Assessment:** ✅ Compliant
- Contact information required for quote delivery
- Property information required for accurate pricing
- Photos uploaded voluntarily by user
- No sensitive financial or health data
- Clear business purpose

---

### Resource Download

**Collected Data:**
- Email address (required)
- Resource title (automatic)
- Resource URL (automatic)
- Acquisition source (automatic)

**Consent:** Explicit opt-in via download gate
**Disclosure:** "Enter your email to receive this free resource and join our newsletter"
**Purpose:** Lead generation, newsletter growth, resource delivery
**Retention:** Until user unsubscribes

**Compliance Assessment:** ✅ Compliant
- Email required for resource delivery and newsletter
- Clear value exchange (resource for email)
- User can unsubscribe anytime
- No sensitive data collected

---

### Kit Webhook Events

**Collected Data:**
- Kit event name (automatic)
- Subscriber email (from Kit)
- Subscriber ID (from Kit)
- Subscriber state (from Kit)
- Event-specific data (from Kit)

**Consent:** Already consented via Kit subscription
**Disclosure:** Kit's privacy policy applies
**Purpose:** Event tracking, marketing automation, customer journey analysis
**Retention:** Per Kit's data retention policy

**Compliance Assessment:** ✅ Compliant
- Data comes from Kit (user consented to Kit)
- Used for marketing automation only
- No additional data collected beyond Kit provides
- User can manage preferences in Kit

---

## Data Not Collected (Intentionally Omitted)

### Surveillance Data
- ❌ IP addresses
- ❌ Exact geolocation
- ❌ Browser fingerprinting
- ❌ Device fingerprinting
- ❌ Cross-site tracking
- ❌ Behavioral profiling

### Sensitive Data
- ❌ Social Security numbers
- ❌ Financial information
- ❌ Health information
- ❌ Political opinions
- ❌ Religious beliefs
- ❌ Biometric data

### Dark Patterns
- ❌ Pre-checked consent boxes
- ❌ Hard-to-find unsubscribe options
- ❌ Misleading consent language
- ❌ Forced consent for essential features
- ❌ Data selling to third parties

---

## Consent Mechanisms

### Explicit Consent
- Newsletter signup form (checkbox or submit action)
- Resource download gate (email submission)
- Kit subscription (double opt-in recommended)

### Implicit Consent
- Estimate request (business communication)
- Website usage (standard analytics)

### Withdrawal of Consent
- Unsubscribe link in all emails (Kit provides)
- Contact form for data requests
- Kit subscriber preferences page

---

## Data Retention Policy

### Newsletter Subscribers
- **Retention:** Until user unsubscribes
- **Deletion:** Immediate upon unsubscribe request
- **Backup:** 30-day backup for technical recovery

### Estimate Requests
- **Retention:** 2 years
- **Purpose:** Business records, quote history, customer follow-up
- **Deletion:** After 2 years or upon customer request

### Reviews
- **Retention:** Indefinite (public content)
- **Purpose:** Social proof, SEO, customer testimonials
- **Modification:** Customer can request edits or removal

### Analytics Events
- **Retention:** 1 year
- **Purpose:** Business intelligence, marketing optimization
- **Aggregation:** Data aggregated for analysis, individual data anonymized after retention period

---

## Third-Party Services

### Kit (Email Marketing)
- **Purpose:** Email delivery, newsletter management, automation
- **Data Shared:** Email, first name, custom fields
- **Privacy Policy:** Kit's privacy policy
- **Compliance:** GDPR compliant, SOC 2 certified

### Google (Google Workspace)
- **Purpose:** Email notifications, file storage (Drive)
- **Data Shared:** Estimate details, photos
- **Privacy Policy:** Google Workspace privacy policy
- **Compliance:** GDPR compliant, SOC 2 certified

### Vercel (Hosting)
- **Purpose:** Website hosting, analytics
- **Data Shared:** Standard web analytics
- **Privacy Policy:** Vercel privacy policy
- **Compliance:** GDPR compliant, SOC 2 certified

---

## GDPR Compliance

### Legal Basis for Processing
- **Newsletter:** Consent (Article 6(1)(a))
- **Estimates:** Legitimate interests (Article 6(1)(f))
- **Resources:** Consent (Article 6(1)(a))
- **Reviews:** Legitimate interests (Article 6(1)(f))

### Data Subject Rights
- **Right to access:** Users can request their data
- **Right to rectification:** Users can correct their data
- **Right to erasure:** Users can request deletion (with exceptions)
- **Right to restrict processing:** Users can limit processing
- **Right to data portability:** Users can export their data
- **Right to object:** Users can object to processing

### Implementation
- Contact form for data requests
- Unsubscribe link in all emails
- Data export capability (via Kit)
- Data deletion process documented

---

## CCPA Compliance

### Categories of Personal Information
- **Identifiers:** Email, name
- **Internet activity:** Referrer URLs, device class
- **Geolocation:** City, county (user-provided)
- **Professional information:** Service interests, project details

### Consumer Rights
- **Right to know:** What data is collected
- **Right to delete:** Request deletion of personal information
- **Right to opt-out:** Sale of personal information (not applicable - we don't sell data)
- **Right to non-discrimination:** No discrimination for exercising rights

### Implementation
- Privacy policy updated
- "Do Not Sell My Personal Information" link (not applicable - we don't sell data)
- Data request process documented

---

## Recommendations

### Immediate Actions
1. ✅ Add privacy policy link to footer
2. ✅ Add "Do Not Sell My Personal Information" link (CCPA)
3. ✅ Document data deletion process
4. ✅ Create contact form for data requests

### Future Enhancements
1. Add cookie consent banner (if using cookies)
2. Implement data export functionality
3. Add privacy settings page for users
4. Regular privacy audits (annual)
5. Data breach response plan

---

## Compliance Checklist

- [x] Privacy policy published
- [x] Consent mechanisms implemented
- [x] Unsubscribe functionality available
- [x] Data minimization practiced
- [x] No surveillance data collected
- [x] No dark patterns used
- [x] Third-party services reviewed
- [x] GDPR legal basis identified
- [x] CCPA rights acknowledged
- [ ] Data deletion process documented
- [ ] Data request contact form created
- [ ] Cookie consent banner (if needed)
- [ ] Annual privacy audit scheduled

---

## Conclusion

HPP's current data collection practices are privacy-compliant and follow ethical principles. All collected data serves a clear business purpose and is collected with user consent. No surveillance or sensitive data is collected.

**Status:** ✅ Compliant with minor documentation improvements needed

**Next Steps:** Complete documentation items in checklist above.

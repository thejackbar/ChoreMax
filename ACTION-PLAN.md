# SEO Action Plan: www.freemanchiropractic.com.au

**Generated:** 10 March 2026
**Current Score:** 52/100
**Target Score:** 75+/100

---

## CRITICAL Priority (Fix Immediately)

### 1. Add Meta Descriptions to All Pages
**Impact:** High CTR improvement in SERPs
**Effort:** 1-2 hours
**Pages needing meta descriptions:**

| Page | Suggested Meta Description |
|------|---------------------------|
| Homepage | "Freeman Chiropractic in Victoria Park, Perth. Expert chiropractic care for back pain, neck pain & headaches. Book your first appointment today. Ph: 0493 290 505" |
| Back Pain | "Effective back pain treatment in Victoria Park, Perth. Dr Alex Freeman provides expert chiropractic adjustments for lasting relief. Book online today." |
| Neck Pain | "Neck pain treatment by experienced Victoria Park chiropractors. Manual adjustments, dry needling & soft tissue therapy. Book at Freeman Chiropractic Perth." |
| Headaches | "Headache and migraine relief through chiropractic care in Victoria Park, Perth. Address the cause, not just symptoms. Book at Freeman Chiropractic." |
| Shoulder Pain | "Shoulder pain treatment in Victoria Park. Expert chiropractic care for rotator cuff, frozen shoulder & more. Freeman Chiropractic Perth. Book online." |
| Disc Injuries | "Disc injury treatment in Victoria Park, Perth. Non-surgical chiropractic care for bulging & herniated discs. Freeman Chiropractic. Book today." |
| Hip Pain | "Hip pain treatment in Victoria Park. Expert chiropractic assessment and care for hip joint issues. Freeman Chiropractic Perth. Ph: 0493 290 505" |
| Meet The Team | "Meet Dr Alex Freeman and the team at Freeman Chiropractic Victoria Park. Nearly 20 years experience in chiropractic care across Australia." |
| What To Expect | "What to expect at your first chiropractic visit at Freeman Chiropractic Victoria Park. Initial consultation, assessment & personalised care plan." |
| FAQs | "Frequently asked questions about chiropractic care at Freeman Chiropractic Victoria Park. Booking, referrals, safety, and what to expect." |
| Contact | "Contact Freeman Chiropractic Victoria Park. 249B Albany Hwy, WA 6151. Ph: 0493 290 505. Book online or email hello@freemanchiropractic.com.au" |

**How to do it in Squarespace:** Settings → Marketing → SEO → Page-level SEO descriptions, or edit each page → Settings → SEO tab.

---

### 2. Fix LocalBusiness Schema → Upgrade to Chiropractor Schema
**Impact:** Google Knowledge Panel, Local Pack visibility
**Effort:** 1 hour

Replace the current incomplete LocalBusiness schema with a complete Chiropractor schema. Add this JSON-LD to the homepage via Squarespace Code Injection (Settings → Advanced → Code Injection → Header):

```json
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Chiropractor",
  "@id": "https://www.freemanchiropractic.com.au/#organization",
  "name": "Freeman Chiropractic",
  "url": "https://www.freemanchiropractic.com.au",
  "logo": "https://images.squarespace-cdn.com/content/v1/YOUR-LOGO-PATH.png",
  "image": "https://images.squarespace-cdn.com/content/v1/YOUR-HERO-IMAGE.jpg",
  "description": "Freeman Chiropractic provides expert chiropractic care in Victoria Park, Perth. Specialising in back pain, neck pain, headaches, and musculoskeletal conditions.",
  "telephone": "+61493290505",
  "email": "hello@freemanchiropractic.com.au",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "249B Albany Hwy",
    "addressLocality": "Victoria Park",
    "addressRegion": "WA",
    "postalCode": "6151",
    "addressCountry": "AU"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": -31.9768,
    "longitude": 115.8946
  },
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": "Tuesday",
      "opens": "08:00",
      "closes": "12:00"
    },
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": "Tuesday",
      "opens": "15:00",
      "closes": "19:00"
    },
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": "Wednesday",
      "opens": "07:30",
      "closes": "12:00"
    },
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": "Thursday",
      "opens": "12:00",
      "closes": "17:00"
    },
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": "Friday",
      "opens": "07:30",
      "closes": "14:00"
    },
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": "Saturday",
      "opens": "07:00",
      "closes": "12:00"
    }
  ],
  "priceRange": "$$",
  "currenciesAccepted": "AUD",
  "paymentAccepted": "Cash, Credit Card, EFTPOS, HICAPS",
  "sameAs": [
    "https://www.facebook.com/profile.php?id=61577292584145"
  ],
  "areaServed": [
    {"@type": "City", "name": "Victoria Park"},
    {"@type": "City", "name": "Perth"},
    {"@type": "City", "name": "East Victoria Park"},
    {"@type": "City", "name": "South Perth"},
    {"@type": "City", "name": "Bentley"},
    {"@type": "City", "name": "Carlisle"}
  ]
}
</script>
```

---

### 3. Fix Duplicate Title Tag on Team Page
**Impact:** Prevents duplicate content signals
**Effort:** 5 minutes

Change the "Meet The Team" page title from:
> "Chiropractor Victoria Park | Freeman Chiropractic Perth WA"

To:
> "Meet Our Chiropractors | Dr Alex Freeman & Team | Victoria Park Perth"

---

## HIGH Priority (Fix Within 1 Week)

### 4. Expand Condition Pages to 1,500-2,500 Words
**Impact:** Major ranking improvement for condition-specific local queries
**Effort:** 2-3 hours per page (6 pages)

Each condition page (back pain, neck pain, headaches, shoulder pain, disc injuries, hip pain) should include:

- **What is [condition]** — definition, anatomy overview
- **Common causes** — expanded list with brief explanations
- **Symptoms** — detailed checklist format
- **When to seek chiropractic care** — clear guidance
- **How we treat [condition]** — specific techniques used at Freeman Chiropractic
- **What to expect during treatment** — visit breakdown
- **Self-care tips** — evidence-based home management advice
- **FAQ section** — 3-5 condition-specific questions
- **Author attribution** — "Written by Dr Alex Freeman, Chiropractor" with link to bio

### 5. Add Patient Reviews/Testimonials
**Impact:** Critical for E-E-A-T and conversion
**Effort:** 2-4 hours setup

Options:
- **Google Reviews widget** — embed via third-party tool (e.g., EmbedSocial, Elfsight)
- **Testimonials section** on homepage and condition pages
- **Dedicated reviews page** with curated patient stories

### 6. Add Person Schema for Practitioners
**Impact:** E-E-A-T signal, potential Knowledge Panel
**Effort:** 30 minutes

Add to team page via page-level code injection:

```json
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Dr Alex Freeman",
  "jobTitle": "Chiropractor",
  "description": "Founder of Freeman Chiropractic with nearly 20 years of clinical experience. Bachelor and Master of Chiropractic from Murdoch University.",
  "url": "https://www.freemanchiropractic.com.au/dr-alex-freeman-perth-chiropractor",
  "worksFor": {
    "@id": "https://www.freemanchiropractic.com.au/#organization"
  },
  "alumniOf": {
    "@type": "EducationalOrganization",
    "name": "Murdoch University"
  },
  "knowsAbout": ["Chiropractic", "Spinal Health", "Sports Chiropractic", "Dry Needling", "Soft Tissue Therapy"]
}
</script>
```

### 7. Unblock AI Crawlers in robots.txt
**Impact:** AI search visibility (Google AI Overviews, ChatGPT search, Perplexity)
**Effort:** 10 minutes

In Squarespace: Settings → SEO → Robots.txt → Remove blocks for:
- ClaudeBot
- GPTBot
- Amazonbot
- Other AI bots

**Note:** This is a business decision. Blocking AI crawlers prevents AI from training on or citing your content, but also prevents your site from appearing in AI-powered search results.

### 8. Add Author Bylines to Health Content Pages
**Impact:** E-E-A-T signal for YMYL content
**Effort:** 1 hour

Add to each condition page:
- "Reviewed by Dr Alex Freeman, Chiropractor (B.Chiro, M.Chiro — Murdoch University)"
- Link to the practitioner's bio page
- Date of last review/update

---

## MEDIUM Priority (Fix Within 1 Month)

### 9. Improve Internal Cross-Linking
**Effort:** 2 hours

Add contextual links between related condition pages:
- Back Pain → link to Disc Injuries, Hip Pain
- Neck Pain → link to Headaches, Shoulder Pain
- Disc Injuries → link to Back Pain, Neck Pain
- Use descriptive anchor text: "Learn about our disc injury treatment" not "Learn More"

### 10. Fix Duplicate/Confusing URLs
**Effort:** 30 minutes

- Remove `/book-online-1` from sitemap (redirect to `/book-online`)
- Ensure `/home` redirects to `/` (or remove from sitemap)
- Rename `/our-story-1` to `/our-story` if possible

### 11. Add BreadcrumbList Schema to All Inner Pages
**Effort:** 1 hour

Implement via Squarespace code injection per page, or use a site-wide script that generates breadcrumbs dynamically.

### 12. Improve Image Alt Text
**Effort:** 1-2 hours

Review all images and ensure:
- Team headshots: "Dr Alex Freeman, Chiropractor at Freeman Chiropractic Victoria Park"
- Condition images: Descriptive text including condition and treatment context
- Logo: "Freeman Chiropractic logo"

### 13. Create a Blog / Educational Content Section
**Effort:** Ongoing (1-2 articles per month)

Suggested topics:
- "5 Desk Stretches to Prevent Back Pain"
- "How Often Should You See a Chiropractor?"
- "Chiropractic vs Physiotherapy: Which Is Right for You?"
- "Understanding Sciatica: Causes and Treatment Options"
- "The Benefits of Chiropractic Care for Office Workers in Perth"

### 14. Add Professional Trust Badges
**Effort:** 30 minutes

Display on homepage and team page:
- AHPRA registration number
- Chiropractic Australia membership
- Professional indemnity insurance
- HICAPS accepted badge

### 15. Update FAQ Safety Reference
**Effort:** 15 minutes

Replace the 1979 New Zealand study reference with more recent evidence. Consider citing:
- Recent systematic reviews on chiropractic safety
- AHPRA guidelines
- Current chiropractic associations' position statements

---

## LOW Priority (Backlog)

### 16. Add Content-Security-Policy Header
Squarespace limits header control. Consider if additional security headers are needed for your use case.

### 17. Create an llms.txt File
For AI crawler guidance — add at site root to help AI search engines understand site structure.

### 18. Add Google Business Profile Link
Ensure the website links to and from a fully optimized Google Business Profile.

### 19. Consider Platform Migration (Long-Term)
Squarespace limits technical SEO control (custom headers, server-side rendering, schema flexibility). For a competitive healthcare niche, WordPress with a quality SEO plugin (Rank Math/Yoast) or a custom build may offer more control.

### 20. Add Instagram Integration
Currently only Facebook is linked. Instagram is a strong visual platform for healthcare businesses to demonstrate expertise and build trust.

---

## Implementation Timeline

| Week | Tasks | Expected Score Impact |
|------|-------|----------------------|
| Week 1 | #1 (Meta descriptions), #2 (Schema), #3 (Title fix), #7 (AI crawlers) | +8 points |
| Week 2 | #6 (Person schema), #8 (Author bylines), #12 (Alt text), #10 (URL cleanup) | +6 points |
| Week 3-4 | #4 (Expand condition pages — 2 pages/week), #5 (Reviews setup) | +10 points |
| Month 2 | #4 (Remaining condition pages), #9 (Cross-links), #11 (Breadcrumbs), #13 (Blog launch) | +8 points |
| Month 3+ | #13 (Ongoing content), #14 (Trust badges), #15-20 (Remaining items) | +5 points |

**Projected score after full implementation: 75-85/100**

---

*Report generated by SEO Audit Tool. For questions about implementation, consult with a web developer familiar with Squarespace or your SEO specialist.*

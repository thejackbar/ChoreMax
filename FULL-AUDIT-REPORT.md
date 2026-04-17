# SEO Audit Report: www.freemanchiropractic.com.au

**Audit Date:** 10 March 2026
**Business Type:** Healthcare / Chiropractic (YMYL)
**Platform:** Squarespace
**Location:** 249B Albany Hwy, Victoria Park, WA 6151

---

## Executive Summary

### Overall SEO Health Score: 52/100

| Category | Score | Weight | Weighted |
|----------|-------|--------|----------|
| Technical SEO | 62/100 | 25% | 15.5 |
| Content Quality | 48/100 | 25% | 12.0 |
| On-Page SEO | 55/100 | 20% | 11.0 |
| Schema / Structured Data | 30/100 | 10% | 3.0 |
| Performance (CWV) | 60/100 | 10% | 6.0 |
| Images | 45/100 | 5% | 2.25 |
| AI Search Readiness | 40/100 | 5% | 2.0 |
| **Total** | | | **51.75** |

### Top 5 Critical Issues
1. **Missing meta descriptions** on all pages — critical for CTR in SERPs
2. **Incomplete LocalBusiness schema** — missing phone, email, geo coordinates, opening hours
3. **No FAQPage schema** on the FAQ page (though rich results restricted for non-authority health sites)
4. **Thin content** on several condition pages (~800 words) — insufficient for YMYL health topics
5. **Blocking AI crawlers** (ClaudeBot, GPTBot) in robots.txt — hurts AI search visibility

### Top 5 Quick Wins
1. Add meta descriptions to all 15 pages (30 min effort, immediate CTR improvement)
2. Complete the LocalBusiness/Chiropractor schema with full business details
3. Add Person schema for Dr. Alex Freeman and Dr. Joel Maylor
4. Add alt text to all images (several are missing or generic)
5. Unblock AI crawlers if AI search visibility is desired

---

## 1. Technical SEO (62/100)

### Crawlability

| Check | Status | Notes |
|-------|--------|-------|
| robots.txt | Present | Squarespace default + AI bot blocks |
| Sitemap | Present | 15 URLs, all valid |
| Canonical tags | Present | Self-referencing on homepage |
| HTTP → HTTPS redirect | PASS | 301 redirect working |
| non-www → www redirect | PASS | 301 redirect working |
| Redirect chains | PASS | Single-hop redirects only |

**Issues Found:**

- **[High] AI crawler blocking**: robots.txt blocks ClaudeBot, GPTBot, Amazonbot, and other AI crawlers. This prevents the site from appearing in AI-powered search results (Google AI Overviews, ChatGPT search, Perplexity).
- **[Medium] Duplicate booking pages**: `/book-online` and `/book-online-1` both exist in the sitemap — creates confusion for crawlers.
- **[Medium] Home page URL**: Sitemap lists `/home` as the homepage (priority 1.0) while the canonical is `/`. Potential duplicate content signal.
- **[Low] changefreq set to "daily"** on all pages — unrealistic and ignored by Google, but not harmful.

### Indexability

| Check | Status |
|-------|--------|
| noindex tags | None found (PASS) |
| Orphan pages | None detected |
| Crawl depth | All pages within 2 clicks (PASS) |

### Security Headers

| Header | Status | Value |
|--------|--------|-------|
| HTTPS | PASS | TLS enabled |
| HSTS | PASS | `max-age=15552000` (180 days) |
| X-Content-Type-Options | PASS | `nosniff` |
| X-Frame-Options | PASS | `SAMEORIGIN` |
| Content-Security-Policy | FAIL | Not present |
| Permissions-Policy | FAIL | Not present |
| Referrer-Policy | FAIL | Not present |

**Recommendations:**
- **[Medium]** Add Content-Security-Policy header (Squarespace limitation — may require custom domain proxy)
- **[Low]** Add Referrer-Policy and Permissions-Policy headers

### URL Structure

| Check | Status |
|-------|--------|
| Clean URLs | PASS — descriptive, keyword-rich slugs |
| Trailing slashes | Consistent (no trailing slash) |
| URL length | All under 75 characters (PASS) |
| Keyword in URL | PASS — `/back-pain-perth`, `/neck-pain-perth` etc. |

**Good examples:** `/back-pain-perth`, `/dr-alex-freeman-perth-chiropractor`
**Odd URL:** `/our-story-1` and `/book-online-1` have "-1" suffix suggesting duplicates were created

### Mobile Optimization

| Check | Status |
|-------|--------|
| Viewport meta tag | PASS |
| Responsive design | PASS (Squarespace template) |
| Touch targets | Likely PASS (Squarespace default) |
| Font sizes | Likely PASS |

---

## 2. Content Quality (48/100)

### E-E-A-T Assessment (YMYL Healthcare — Higher Standards Apply)

| Signal | Status | Score |
|--------|--------|-------|
| **Experience** | Moderate | 6/10 |
| **Expertise** | Moderate | 6/10 |
| **Authoritativeness** | Low | 4/10 |
| **Trustworthiness** | Moderate | 5/10 |

**Experience Signals:**
- Dr. Alex Freeman: Nearly 20 years clinical experience — mentioned on team page
- Dr. Joel Maylor: Exercise Science background, works with elite athletes
- Patient testimonials/reviews: **NONE visible on site** — major gap

**Expertise Signals:**
- Qualifications listed (Bachelor/Master from Murdoch University)
- Multiple treatment techniques named (Diversified, Gonstead, SOT)
- Postgraduate training mentioned but not detailed
- **Missing**: AHPRA registration number, professional association memberships on site

**Authoritativeness Signals:**
- **No external proof**: No Google reviews widget, no third-party review integration
- **No publications or media mentions**
- **No professional association badges** (Chiropractic Australia, AHPRA)
- **No case studies**

**Trustworthiness Signals:**
- Privacy policy page exists
- Physical address prominently displayed
- Phone and email visible
- **Missing**: AHPRA registration, Terms of Service, clear disclaimer on health claims

### Content Depth by Page

| Page | Word Count | Verdict |
|------|-----------|---------|
| Homepage | ~1,200 | Adequate |
| Back Pain Perth | ~800-900 | **Thin for YMYL** |
| Neck Pain Perth | ~800 (est.) | **Thin for YMYL** |
| Headaches Perth | ~800 (est.) | **Thin for YMYL** |
| Shoulder Pain Perth | ~800 (est.) | **Thin for YMYL** |
| Disc Injuries Perth | ~800 (est.) | **Thin for YMYL** |
| Hip Pain Perth | ~800 (est.) | **Thin for YMYL** |
| Meet The Team | ~1,000 | Adequate |
| What To Expect | ~550-650 | **Thin** |
| FAQs | ~1,200-1,500 | Adequate |
| Contact | ~200 | Expected for contact page |
| Our Story | Unknown | — |
| Privacy | Unknown | — |

**YMYL Content Threshold:** For health-related condition pages competing in local search, 1,500-2,500 words is recommended with:
- Detailed condition explanation
- Symptoms checklist
- When to seek care
- Treatment options with evidence
- What to expect from chiropractic treatment
- FAQ section per condition
- Author attribution with credentials

### Content Issues

- **[Critical] No meta descriptions** on any page — Squarespace may auto-generate but none were found in the HTML
- **[High] Condition pages are thin** — ~800 words is insufficient for YMYL health topics competing against established medical sites
- **[High] No patient reviews or testimonials** visible anywhere on the site
- **[High] No author bylines** on condition pages — health content should clearly attribute the authoring practitioner
- **[Medium] FAQ page references a 1979 New Zealand study** for chiropractic safety — outdated reference that may undermine trust
- **[Medium] No blog or educational content** beyond the condition landing pages
- **[Low] "Careers" navigation links to `/book-online-1`** — confusing and misleading

---

## 3. On-Page SEO (55/100)

### Title Tags

| Page | Title | Length | Verdict |
|------|-------|--------|---------|
| Homepage | "Chiropractor Victoria Park \| Freeman Chiropractic Perth WA" | 58 chars | PASS |
| Back Pain | "Back Pain Treatment in Victoria Park \| Freeman Chiropractic" | 60 chars | PASS |
| Team | "Chiropractor Victoria Park \| Freeman Chiropractic Perth WA" | 58 chars | **DUPLICATE of homepage** |
| FAQs | "Frequently Asked Questions \| Freeman Chiropractic Victoria Park" | 63 chars | PASS |
| Contact | "Contact Us at Freeman Chiropractic Victoria Park" | 49 chars | PASS |
| What To Expect | "What to Expect at Freeman Chiropractic \| Victoria Park Chiropractor" | 67 chars | PASS |

**Issues:**
- **[High]** "Meet The Team" page uses the same title as the homepage — should be unique
- **[Medium]** Title tags could be more action-oriented (e.g., "Best Chiropractor in Victoria Park" or "Expert Back Pain Treatment Victoria Park")

### Meta Descriptions

**[Critical]** No custom meta descriptions detected on any page. Google will auto-generate from page content, reducing CTR control.

### Heading Structure

| Page | H1 | Issues |
|------|-----|--------|
| Homepage | "Full Function, Forever." | Keyword not in primary H1 — secondary H1 exists with keyword |
| Back Pain | "BACK PAIN TREATMENT IN VICTORIA PARK" | PASS |
| Team | "Our Team" | Generic — could include "Chiropractors in Victoria Park" |
| FAQs | "FREQUENTLY ASKED QUESTIONS" | Generic — could include business name/location |
| Contact | Missing dedicated H1 | **FAIL** |
| What To Expect | "WHAT TO EXPECT AT FREEMAN CHIROPRACTIC" | PASS |

**Issues:**
- **[Medium]** Homepage has a branding H1 ("Full Function, Forever.") rather than keyword-focused — the keyword appears in a secondary element
- **[Medium]** Multiple H1 tags on homepage (branding + keyword subtitle)
- **[Low]** All headings use ALL CAPS styling — consider sentence case for readability

### Internal Linking

| Check | Status |
|-------|--------|
| Navigation coverage | All 15 pages accessible from nav |
| Cross-linking between conditions | Limited — condition pages link back to booking but not to each other |
| Contextual links | Few — mostly CTA-style "Book Now" links |
| Anchor text quality | Generic ("Learn More →", "Book Online") |

**Recommendations:**
- **[Medium]** Add cross-links between related condition pages (e.g., "Back Pain" should link to "Disc Injuries", "Hip Pain")
- **[Medium]** Use descriptive anchor text instead of generic "Learn More"
- **[Low]** Add a services/conditions hub page that links to all condition pages

---

## 4. Schema & Structured Data (30/100)

### Current Implementation

| Schema Type | Present | Complete |
|-------------|---------|----------|
| WebSite | Yes | Partial — missing SearchAction |
| LocalBusiness | Yes | **Incomplete** — missing phone, email, geo, hours |
| Chiropractor | No | — |
| Person | No | — |
| BreadcrumbList | No | — |
| Service | No | — |
| FAQPage | No | — |
| MedicalWebPage | No | — |

### Issues

- **[Critical]** LocalBusiness schema is missing critical fields: `telephone`, `email`, `geo` (coordinates), `openingHoursSpecification`, `priceRange`
- **[High]** Should use `Chiropractor` type (subtype of LocalBusiness) instead of generic `LocalBusiness`
- **[High]** No Person schema for practitioners — critical for healthcare E-E-A-T
- **[Medium]** No BreadcrumbList schema on inner pages
- **[Medium]** No Service schema on condition/treatment pages
- **[Low]** No MedicalWebPage schema on health content pages

### Recommended Schema Additions

**Priority 1 — Chiropractor Schema (homepage):**
Replace current LocalBusiness with `Chiropractor` type including:
- Full address with geo coordinates (-31.9768, 115.8946 approx.)
- Phone: 0493 290 505
- Email: hello@freemanchiropractic.com.au
- Opening hours (Tues-Sat schedule)
- Social profiles
- Available services

**Priority 2 — Person Schema (team page):**
Add for Dr. Alex Freeman and Dr. Joel Maylor with:
- Qualifications (Murdoch University credentials)
- Job title, employer reference
- knowsAbout topics

**Priority 3 — BreadcrumbList (all inner pages)**

**Priority 4 — Service Schema (condition pages)**

---

## 5. Performance (60/100)

### Server Response

| Metric | Value | Verdict |
|--------|-------|---------|
| TTFB | 336ms | GOOD (under 800ms) |
| HTTP/2 | Yes | PASS |
| Compression | Gzip (via Vary header) | PASS |
| CDN | Squarespace CDN | PASS |
| Page size | ~50KB HTML | GOOD |

### Squarespace Performance Characteristics

Based on the HTML analysis:
- **Multiple render-blocking scripts**: Squarespace bundles (rollup, vendors, moment.js)
- **Google Maps API** loaded on pages with map embed — heavy resource
- **reCAPTCHA Enterprise** loaded globally — adds weight to every page
- **Moment.js** bundled — large datetime library loaded unnecessarily
- **Multiple CSS files** from Squarespace template system

### Estimated Core Web Vitals (Lab)

| Metric | Estimated | Target | Status |
|--------|-----------|--------|--------|
| LCP | 2.5-4.0s (mobile est.) | < 2.5s | NEEDS IMPROVEMENT |
| INP | ~200-400ms (est.) | < 200ms | NEEDS IMPROVEMENT |
| CLS | ~0.05-0.15 (est.) | < 0.1 | BORDERLINE |

*Note: PageSpeed Insights API was rate-limited during this audit. Estimates based on Squarespace platform baseline and resource analysis. Run a manual test at pagespeed.web.dev for exact numbers.*

### Recommendations

- **[Medium]** Lazy-load Google Maps (only load when map section is in viewport)
- **[Medium]** Defer reCAPTCHA loading to form pages only, not globally
- **[Low]** Squarespace limits server-side optimization — consider if platform is suitable long-term for SEO-competitive healthcare niche

---

## 6. Images (45/100)

### Findings

| Check | Status |
|-------|--------|
| Alt text present | Partial — some images have descriptive alt, others are generic or missing |
| Image formats | JPEG/PNG (no WebP/AVIF detected) |
| Lazy loading | Squarespace default (likely present) |
| Responsive images | Squarespace srcset likely present |
| Image compression | Squarespace auto-compression (moderate) |

### Issues

- **[High]** Several images have generic alt text (e.g., logo filename rather than descriptive text)
- **[Medium]** No WebP format detected — Squarespace may serve WebP automatically via CDN but original uploads should be optimized
- **[Medium]** Team page headshots appear to lack descriptive alt text
- **[Low]** Consider adding caption text to treatment/condition images for additional context

---

## 7. AI Search Readiness (40/100)

### AI Crawler Access

| Crawler | Status |
|---------|--------|
| Googlebot | ALLOWED |
| ClaudeBot | **BLOCKED** |
| GPTBot | **BLOCKED** |
| Amazonbot | **BLOCKED** |
| PerplexityBot | **BLOCKED** (likely) |

### Citability Assessment

| Signal | Score | Notes |
|--------|-------|-------|
| Clear factual statements | 4/10 | Content is mostly marketing-oriented |
| Structured Q&A content | 6/10 | FAQ page exists with clear Q&A format |
| Author attribution | 3/10 | No bylines on condition pages |
| Data/statistics cited | 2/10 | Minimal references to studies |
| Passage-level structure | 5/10 | Reasonable heading hierarchy |

### Recommendations

- **[High]** Unblock AI crawlers (ClaudeBot, GPTBot) in robots.txt if you want visibility in AI-powered search
- **[High]** Add clear, citable factual statements to condition pages (e.g., prevalence statistics, treatment success rates with references)
- **[Medium]** Add author attribution (Dr. Freeman) to all health content pages
- **[Medium]** Create an `llms.txt` file for AI crawler guidance
- **[Low]** Add structured "Key Takeaways" sections to condition pages

---

## Appendix: Complete Page Inventory

| # | URL | Title | Status |
|---|-----|-------|--------|
| 1 | / | Chiropractor Victoria Park \| Freeman Chiropractic Perth WA | 200 |
| 2 | /book-online | Book Online | 200 |
| 3 | /shoulder-pain-perth | Shoulder Pain Perth | 200 |
| 4 | /privacy | Privacy | 200 |
| 5 | /dr-alex-freeman-perth-chiropractor | Meet The Team | 200 |
| 6 | /back-pain-perth | Back Pain Treatment in Victoria Park | 200 |
| 7 | /contact | Contact Us at Freeman Chiropractic Victoria Park | 200 |
| 8 | /home | Home (duplicate of /) | 200 |
| 9 | /faqs | Frequently Asked Questions | 200 |
| 10 | /neck-pain-perth | Neck Pain Perth | 200 |
| 11 | /headaches-perth | Headaches Perth | 200 |
| 12 | /what-to-expect | What to Expect | 200 |
| 13 | /disc-injuries-perth | Disc Injuries Perth | 200 |
| 14 | /hip-pain-perth | Hip Pain Perth | 200 |
| 15 | /book-online-1 | Book Online (duplicate) | 200 |
| 16 | /our-story-1 | Our Story | 200 |

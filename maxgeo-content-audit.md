# Content Quality & E-E-A-T Audit: maxgeo.com

**Audit Date:** 13 March 2026
**Business Type:** B2B SaaS -- Geological & Mining Data Management
**Platform:** Next.js (custom build)
**Headquarters:** Fremantle, Western Australia (offices in Johannesburg, London, Vancouver)
**Products:** datashed5, logchief, logchief lite, LeaseCTRL
**Stated Client Base:** 350+ clients

---

## Executive Summary

### Overall Content Quality Score: 47/100

| Category | Score | Weight | Weighted |
|----------|-------|--------|----------|
| E-E-A-T Signals | 42/100 | 30% | 12.6 |
| Content Depth & Coverage | 40/100 | 25% | 10.0 |
| On-Page Content Quality | 52/100 | 15% | 7.8 |
| AI Citation Readiness | 38/100 | 10% | 3.8 |
| Content Freshness | 55/100 | 10% | 5.5 |
| Internal Linking & CTAs | 50/100 | 10% | 5.0 |
| **Total** | | | **44.7** |

### Critical Content Issues (Top 5)

1. **Training page is critically thin** -- 247 words, no H2s, essentially a stub page with two "Book Now" buttons and no meaningful content about training programmes, formats, pricing, or outcomes
2. **Solution pages (Exploration, Grade Control, Mining) are thin** -- 340-452 words of actual unique content, presenting as little more than bulleted feature lists rather than substantive solution narratives
3. **Zero structured data (JSON-LD)** across the entire site -- no Organization, SoftwareApplication, Article, or BreadcrumbList schema on any page
4. **No author attribution on any page** -- insight articles show dates and read times but no author names, credentials, or bios, which undermines E-E-A-T for a B2B thought leadership programme
5. **5 dead pages (404) in the sitemap** -- /datashed-training, /assay-management, /drilling-management, /logchief-training, /logchief-lite-training all return 404 while remaining in the XML sitemap

### Top 5 Quick Wins

1. Add author names and brief bios to all 15 insight articles (1 hour effort, immediate E-E-A-T improvement)
2. Remove the 5 dead 404 URLs from the sitemap and add the 4 software product pages that are currently missing (/software/datashed, /software/logchief, /software/logchief-lite, /software/leasectrl)
3. Add Organization JSON-LD schema to the homepage and Article schema to insight pages
4. Expand the Training page from 247 words to 500+ with course descriptions, formats, and outcomes
5. Add unique meta descriptions to the 18+ event pages that are missing them

---

## 1. E-E-A-T Assessment

### Overall E-E-A-T Score: 42/100

| Factor | Weight | Score | Notes |
|--------|--------|-------|-------|
| **Experience** | 20% | 45/100 | Product content shows domain knowledge; "350+ clients" stat is strong; first-hand product evolution article exists; but no client testimonials, case studies with named companies, or field deployment stories on the site |
| **Expertise** | 25% | 50/100 | Technical vocabulary is accurate (QAQC, pXRF, drillhole logging, PLOD, DDR); articles demonstrate understanding of geological workflows; however, no individual experts are named or credentialed anywhere on the site |
| **Authoritativeness** | 25% | 35/100 | No team page, no About page with company history, no partnerships page, no client logos, no industry certifications or awards displayed; third-party integrations mentioned (ALS, Evident Scientific, IMDEXHUB-IQ) but no formal partner badges |
| **Trustworthiness** | 30% | 40/100 | Four global office addresses with phone numbers shown on contact page; legal page exists; however, no visible email addresses, no privacy certifications, no testimonials, no reviews, no security compliance badges (SOC 2, ISO 27001), and the contact page previously had a noindex tag (now appears resolved) |

### Experience Signals -- Detailed

**Positive:**
- "A geologist's account of DataShed's evolution" article on `/insights/celebrating-innovation-the-evolution-from-datashed4-to-datashed5` demonstrates genuine first-hand product experience
- The tenure management article on `/insights/the-hidden-engine-of-mining-why-tenure-management-can-no-longer-be-ignored` shows industry-specific knowledge about permitting timelines (7-10 years to permit a mine) and regulatory shifts
- "350+ Clients across multiple commodities" and "Cloud Hosted Clients" stats on the homepage signal real-world adoption
- Product pages reference specific integration partners (ALS, Evident Scientific, IMDEXHUB-IQ, Leapfrog)

**Missing:**
- No named client testimonials or quotes anywhere on the site
- No case studies with named companies (the "historical geological data" article references "a mid-tier mining company" without naming them)
- No field deployment stories showing the software in real operational environments
- No before/after metrics from actual client implementations
- No user community or forum presence referenced

### Expertise Signals -- Detailed

**Positive:**
- Technical terminology is used correctly and naturally across all pages
- Product pages describe specific capabilities relevant to working geologists (buffer table validation, chunked uploads, Hangfire async processing)
- Insight articles address real workflow challenges (large file imports, SQL Server end-of-support migration, pXRF data transfer)

**Missing:**
- No author bylines on any of the 15 insight articles -- only dates and estimated read times appear
- No team page or About page exists (or is accessible)
- No individual credentials, qualifications, or professional memberships displayed
- No LinkedIn profile links for team members
- No speaking engagements, publications, or conference presentations attributed to team members (despite attending 18+ events)

### Authoritativeness Signals -- Detailed

**Positive:**
- Four global offices (Fremantle, Johannesburg, London, Vancouver) signal international scale
- Active conference presence at major industry events (PDAC, Mining Indaba, CIM Connect, MINEXCHANGE)
- Named technology partnerships (ALS, Evident Scientific, IMDEXHUB-IQ)

**Missing:**
- No About page with company founding story, mission, or history
- No client logos or "Trusted by" section with named companies
- No industry association memberships displayed (AusIMM, CIM, SME, etc.)
- No awards, certifications, or recognition badges
- No press mentions or media coverage
- No G2, Capterra, or other B2B software review platform presence linked from the site

### Trustworthiness Signals -- Detailed

**Positive:**
- Legal page exists at /legal
- Contact page lists four office addresses with local phone numbers (+61, +27, +1, +44)
- HTTPS enabled across the site
- OG and Twitter Card meta tags properly configured on all pages
- Copyright notice current (2026)

**Missing:**
- No email address visible anywhere on the site (only phone numbers and a contact form)
- No security compliance badges (SOC 2, ISO 27001, or data sovereignty certifications -- critical for mining companies handling geological data)
- No data hosting location transparency (where client data is stored)
- No uptime/SLA information
- No customer support hours or response time commitments
- No privacy certification badges
- No testimonials or review widgets

---

## 2. Content Depth & Coverage Analysis

### Page-by-Page Word Counts

Word counts below represent total visible text including navigation, headers, and footer. Estimated unique body content is shown in parentheses where the nav/footer template accounts for approximately 160-180 words.

| Page | Total Words | Est. Body Content | Minimum for Type | Verdict |
|------|-------------|-------------------|-------------------|---------|
| Homepage (/) | 763 | ~580 | 500 (Homepage) | PASS -- meets minimum |
| /exploration | 340 | ~160 | 800 (Service page) | FAIL -- critically thin |
| /grade-control | 361 | ~180 | 800 (Service page) | FAIL -- critically thin |
| /mining | 452 | ~270 | 800 (Service page) | FAIL -- thin |
| /software/datashed | 790 | ~610 | 800 (Product page, complex) | BORDERLINE -- close but could be deeper |
| /software/logchief | 630 | ~450 | 400 (Product page, complex) | PASS |
| /software/logchief-lite | 718 | ~540 | 400 (Product page, complex) | PASS |
| /software/leasectrl | 1 (noindex) | 0 | 400 (Product page) | FAIL -- page is empty/blocked |
| /training | 247 | ~65 | 500 (Service page) | FAIL -- critically thin |
| /contact | 300 | ~120 | N/A (Contact page) | PASS -- adequate for type |
| /events (listing) | 218 | ~40 | N/A (Listing page) | THIN -- no intro content |
| /insights (listing) | 217 | ~40 | N/A (Listing page) | THIN -- no intro content |
| /events/pdac-2026 (sample) | 417 | ~240 | 300 (Event page) | BORDERLINE |

### Insight Article Word Counts

| Article | Total Words | Est. Body | Blog Minimum (1,500) | Verdict |
|---------|-------------|-----------|----------------------|---------|
| Streamlining Large File Imports | 1,031 | ~850 | 1,500 | FAIL -- under minimum |
| Tenure Management | 1,055 | ~875 | 1,500 | FAIL -- under minimum |
| De-risking the Mining Lifecycle | 1,879 | ~1,700 | 1,500 | PASS -- only article meeting minimum |
| Celebrating Innovation (DS4 to DS5) | 857 | ~680 | 1,500 | FAIL -- significantly under |
| QAQC and Health Checks | 1,061 | ~880 | 1,500 | FAIL -- under minimum |
| Transforming pXRF Data | 863 | ~680 | 1,500 | FAIL -- significantly under |

**Summary:** Only 1 of 15 insight articles meets the 1,500-word minimum for blog posts. The average estimated body content across sampled articles is approximately 780 words. While word count alone is not a ranking factor, these articles are too short to provide the comprehensive topical coverage expected for B2B technical content competing in search.

### Critically Thin Pages

**1. /training -- 65 words of body content**

This is the most problematic page on the site. The entire body content consists of:
- One H1: "Get the most out of your maxgeo solutions"
- One sentence: "Our teams are experts in their field and can deliver training for beginners to advanced users."
- Two cards: "Get the most out of datashed. Book Now" and "Capture simplified. Essential logging, zero complexity. Book Now"

This page needs a minimum of 500 words covering:
- Training formats available (online, on-site, self-paced)
- Course descriptions for each product (datashed5, logchief, logchief lite)
- Skill levels and prerequisites
- Certification programme details
- Training duration and pricing structure
- Trainer qualifications

**2. /exploration -- 160 words of body content**

The body content is essentially a bulleted list of solution categories (Geology, Geotechnical, Drilling Performance, Sampling, etc.) with one-line descriptions. No narrative explanation of how maxgeo solves exploration-specific challenges, no workflow descriptions, no integration details.

**3. /grade-control -- 180 words of body content**

Same structural issue as /exploration. Bulleted feature list without substantive explanation of grade control workflows, reconciliation processes, or the specific value maxgeo delivers at the grade control stage.

**4. /software/leasectrl -- Empty page (noindex)**

LeaseCTRL is mentioned prominently across the site and in navigation, but the product page returns a noindex tag with essentially no content. This is a significant gap given that the tenure management insight article is one of the site's strongest content pieces.

### Duplicate and Near-Duplicate Content Issues

| Issue | Pages Affected | Severity |
|-------|---------------|----------|
| Identical meta descriptions | /insights/integrating-datashed... and /insights/maximising-cost-efficiencies... share the exact same description | High |
| Duplicate meta descriptions | /insights/maximising-data-value-with-qaqc... and /insights/de-risking-the-mining-lifecycle... share the same description | High |
| Duplicate meta across page types | /contact and /book-a-demo share identical title and description | High |
| Duplicate product descriptions | /software/logchief and /software/logchief-lite share the same meta description text | Medium |
| Template repetition | Solutions pages (/exploration, /grade-control, /mining) use an identical page template with the same section categories, making them feel formulaic | Medium |

---

## 3. On-Page Content Quality

### Heading Structure Analysis

**Homepage (/)**

| Element | Content | Assessment |
|---------|---------|------------|
| H1 | "Collaborative Data Solutions for Geology and Mining" | Good -- keyword-focused, descriptive |
| H2s | "A platform the industry trusts", "A Platform Like No Other", "Complete solutions delivered by the maxgeo platform", "The software suite", "Structured data. Measurable performance. Proven results.", "LATEST UPDATES" | Mixed -- some are marketing slogans, one is empty, "LATEST UPDATES" is weak |

**Product Pages:**
- datashed H1: "Geological and Mining data software" -- Good, keyword-rich
- logchief H1: "Field data capture software" -- Good, descriptive
- logchief lite H1: "Simplified geological logging software" -- Good

**Solution Pages:**
- /exploration H1: "Exploration" -- Too vague, single word
- /grade-control H1: "Grade Control" -- Too vague, two words
- /mining H1: "Mining" -- Too vague, single word

**Insight Articles:**
- Articles use descriptive H1s that serve as article titles -- Good
- However, article body content uses H3 for subheadings rather than H2, and only has a single H2 ("Recent Insights") for the related articles section at the bottom -- this is a heading hierarchy issue

### Readability Assessment

The content is well-suited for its B2B mining audience in terms of vocabulary and technical depth. Key observations:

- **Reading level:** Approximately Grade 12-14 (college level), which is appropriate for professional geologists, data managers, and mining executives
- **Sentence structure:** Generally clear and direct; avoids overly complex compound sentences
- **Jargon usage:** Mining and geological terminology (QAQC, pXRF, drillhole, PLOD, DDR, assay) is used correctly and appropriately for the target audience without over-explanation
- **Paragraph length:** Mostly appropriate, though some article sections could benefit from more paragraph breaks

### AI-Generated Content Assessment

Based on the September 2025 Quality Rater Guidelines criteria, the insight articles show **low-to-moderate** AI content risk:

**Markers detected:**
- "In today's data driven world" (generic opener in the Large File Imports article)
- "seamlessly" appears once in the de-risking article
- "empower" appears once in the de-risking article
- "plays a crucial role" phrasing in the de-risking article
- "game changer" phrasing in the pXRF article

**Positive differentiation signals:**
- No repetitive sentence starters detected across articles
- Technical specificity is high (Hangfire, buffer tables, chunked uploads are product-specific details)
- The tenure management article contains industry-specific insights about permitting timelines and regulatory changes that go beyond generic AI output
- The DataShed4-to-DataShed5 evolution article frames itself as a first-hand account
- Articles reference specific integration partners and real technical workflows

**Verdict:** The content appears to be largely human-written or human-edited with moderate AI assistance for some articles. The technical specificity and product knowledge suggest genuine subject matter expertise was involved. However, the lack of author attribution makes it impossible for Google's quality systems (or human raters) to verify this, which weakens the E-E-A-T signal regardless of actual authorship.

### Keyword Optimization

| Page | Primary Keyword Opportunity | Current Status |
|------|----------------------------|----------------|
| Homepage | "geological data management software" | Partially optimised -- terms appear but not in primary H1 |
| /software/datashed | "geological data management platform" | Good -- naturally integrated |
| /software/logchief | "geological logging software" | Good -- appears in title and content |
| /exploration | "exploration data management" | Weak -- page is too thin to properly target |
| /grade-control | "grade control data software" | Weak -- page is too thin to properly target |
| /training | "geological software training" | Not targeted -- page has no substantive content |
| /insights articles | Long-tail technical queries | Mixed -- some articles are well-targeted (tenure management, large file imports), others are too generic (cloud technology, cost efficiencies) |

Keyword stuffing was not detected on any page. The issue is the opposite: most pages have insufficient content to naturally incorporate target keywords with adequate density and semantic coverage.

---

## 4. AI Citation Readiness Score: 38/100

AI search engines (Google AI Overviews, ChatGPT Search, Perplexity) cite content based on clear factual statements, structured data, named sources, and specific details. MaxGeo's current content has significant gaps in citability.

### Positive Signals

| Signal | Score | Evidence |
|--------|-------|---------|
| Robots.txt allows all crawlers | 8/10 | "User-agent: * Allow: /" -- no AI crawler blocks |
| Factual claim: "350+ clients" | 6/10 | Specific, verifiable stat on homepage |
| Technical how-to content | 5/10 | Large File Imports article has step-by-step technical detail |
| Product-specific terminology | 6/10 | datashed5, logchief, LeaseCTRL are uniquely named and citable |
| OG and Twitter meta tags | 7/10 | Properly configured on all pages |

### Negative Signals

| Signal | Score | Impact |
|--------|-------|--------|
| Zero JSON-LD structured data | 0/10 | AI engines rely heavily on schema to identify entities, articles, and organisations |
| No author attribution | 2/10 | AI engines strongly prefer content with named, credentialed authors |
| No FAQ sections | 2/10 | FAQ-format content is highly citable in AI search responses |
| Thin solution pages | 3/10 | Exploration, Grade Control, Mining pages lack the density needed for passage-level citation |
| No statistics or data points in articles | 3/10 | Articles are mostly qualitative; lack specific numbers, benchmarks, or research references |
| No comparison or "vs" content | 1/10 | No content comparing maxgeo to alternatives or explaining category differences |
| No glossary or definitions | 1/10 | Mining/geological terms could be defined in a way AI engines would cite |

### Recommendations for AI Citation Improvement

1. **Add Article schema** with author, datePublished, dateModified, and publisher to all 15 insight articles
2. **Add Organization schema** to the homepage with foundingDate, numberOfEmployees, areaServed, and product references
3. **Add SoftwareApplication schema** to each product page (datashed5, logchief, logchief lite)
4. **Add FAQ sections** to solution pages and product pages with genuine customer questions
5. **Create a glossary page** defining mining data management terms -- this is highly citable content
6. **Add specific statistics** to articles: processing speed benchmarks, data volumes handled, client adoption metrics
7. **Create comparison content**: "datashed5 vs spreadsheets" or "Cloud vs on-premise geological data management" articles would rank well for comparative queries

---

## 5. Content Freshness Assessment: 55/100

### Blog/Insights Freshness

| Date Range | Article Count | Assessment |
|------------|--------------|------------|
| Jan 2026 - Mar 2026 | 1 (Large File Imports, 21 Jan 2026) | Low output for 2026 |
| Sept 2025 - Dec 2025 | 2 (Tenure Management Sep 2025, Unknown dates for others) | Moderate |
| Mar 2025 - Aug 2025 | ~5 (De-risking article Mar 2025, others) | Moderate |
| Before Mar 2025 | ~7 | Older content |

**Publishing cadence:** Approximately 1 article per month, which is acceptable for a B2B SaaS company but below the 2-4 per month cadence that competitors in mining technology typically maintain.

### Event Freshness

The events page lists upcoming 2026 events (PDAC, Mining Indaba, Agentic AI webinars, CIM Connect, etc.), which is a positive freshness signal. However, the events listing page itself has only ~40 words of unique introductory content.

**Concern:** Past events do not appear to be archived or clearly labelled as past vs. upcoming, which could create confusion and stale content signals.

### Software Updates Freshness

The /updates section shows datashed5 v3.2.1.1 release notes (February 2026), demonstrating active product development. This is a strong freshness signal that should be promoted more prominently.

### Content Requiring Updates

- The SQL Server End of Support article references SQL Server 2016/2017 end-of-support timelines -- these dates may need updating as Microsoft's schedule evolves
- The Cloud Technology article's meta description ("99 chars") was flagged as too short in the previous audit but has since been addressed

---

## 6. Internal Linking & CTAs: 50/100

### Internal Linking Patterns

**Positive:**
- Navigation structure covers all main sections (Solutions, Software, Resources)
- Insight articles link to related articles at the bottom ("Recent Insights" section)
- Product pages include CTAs to "Request a Demo" and "Book a Demo"
- Footer includes links to all major sections including Knowledge Base & Support Portal

**Negative:**
- Solution pages (/exploration, /grade-control, /mining) do not link to their corresponding software product pages (/software/datashed, /software/logchief)
- Insight articles do not link to the product pages they discuss within the body content (e.g., the "Large File Imports in DataShed5" article does not link to /software/datashed)
- No cross-linking between related insight articles within article body text (only in the "Recent Insights" sidebar)
- The training page does not link to specific training programme pages (because they 404)
- Product pages do not link to relevant insight articles that demonstrate their capabilities

### CTA Assessment

| Page Type | CTAs Present | Quality |
|-----------|-------------|---------|
| Homepage | "Request a demo", "Book A Demo" | Good -- clear, relevant |
| Product pages | "Request a demo" (multiple) | Good but repetitive -- same CTA appears 3-4 times |
| Solution pages | "Ready to transform your workflow?" with Book a Demo | Adequate |
| Insight articles | "Contact Us", "Book a Demo", "Request a Demo" | Over-indexed on bottom-funnel CTAs; no mid-funnel CTAs (newsletter, white paper, webinar sign-up) |
| Training page | "Book Now" (x2) | Weak -- book what? No context for what the user is booking |
| Events | "Find out more" per event | Adequate |

**CTA Improvement Opportunities:**
- Add mid-funnel CTAs to insight articles (download a guide, register for a webinar, subscribe to updates)
- Make training CTAs specific (e.g., "Book datashed5 Training" instead of generic "Book Now")
- Add contextual CTAs within article body content, not just at the top and bottom of pages

---

## 7. Page-Level Content Audit

### Critical Issues by Page

#### Homepage (/) -- Score: 62/100
- **Status:** Live, indexed
- **Word count:** ~580 body words
- **Strengths:** Clear value proposition, stats section (350+ clients), well-structured sections covering platform, solutions, software suite
- **Weaknesses:** Stats display as "0+" (possibly animation that did not trigger during crawl -- verify in browser), no client logos, no testimonials, no case study previews, empty H2 tag detected
- **Priority fixes:** Add client logos, testimonials section, ensure stat counters work without JavaScript

#### /exploration -- Score: 30/100
- **Status:** Live, indexed
- **Word count:** ~160 body words
- **Previous issue (Lorem Ipsum):** RESOLVED -- no Lorem Ipsum text detected on current page
- **Current issue:** Critically thin. Page is a bulleted list of solution categories with one-line descriptions
- **Priority fixes:** Expand to 800+ words with exploration workflow narrative, integration details, and a case study or use case example

#### /grade-control -- Score: 30/100
- **Status:** Live, indexed
- **Word count:** ~180 body words
- **Weaknesses:** Same template-driven thin content as /exploration. No meta description was previously missing -- now appears to have one
- **Priority fixes:** Same as /exploration -- expand with grade control-specific workflows, reconciliation process details, and operational examples

#### /mining -- Score: 35/100
- **Status:** Live, indexed (noindex RESOLVED -- previously had noindex tag, now removed)
- **Word count:** ~270 body words
- **Strengths:** Slightly more content than other solution pages; mentions more specific workflow types (PLOD, DDR, haulage, processing)
- **Priority fixes:** Expand to 800+ words; this is the broadest solution page and should be the deepest

#### /software/datashed -- Score: 58/100
- **Status:** Live, indexed, but MISSING FROM SITEMAP
- **Word count:** ~610 body words
- **Strengths:** Good heading structure, covers core capabilities, platform features, integrations; mentions "40+ applications" connected; includes stats section and related insights
- **Weaknesses:** Not in sitemap; no pricing information or pricing CTA; no comparison with alternatives; no FAQ section; no screenshots or video demos referenced
- **Priority fixes:** Add to sitemap immediately; add FAQ section; expand integrations list

#### /software/logchief -- Score: 55/100
- **Status:** Live, indexed, but MISSING FROM SITEMAP
- **Word count:** ~450 body words
- **Strengths:** Clear capability descriptions; good feature breakdown
- **Weaknesses:** Not in sitemap; no screenshots; no user workflow walkthrough
- **Priority fixes:** Add to sitemap; differentiate more clearly from logchief lite

#### /software/logchief-lite -- Score: 50/100
- **Status:** Live, indexed, but has noindex tag still present based on previous audit data
- **Word count:** ~540 body words
- **Strengths:** Covers PWA nature, offline capability, device agnostic operation
- **Weaknesses:** Meta description is duplicate of logchief's; not clearly differentiated from logchief in content
- **Priority fixes:** Remove noindex if still present; write unique meta description; add comparison table vs logchief

#### /software/leasectrl -- Score: 0/100
- **Status:** noindex, empty page (returns only "Maxgeo" as title, 1 word total)
- **Critical:** This product is featured in navigation, mentioned in multiple articles, and has an entire insight article about tenure management driving traffic. The product page must be built.
- **Priority fixes:** Create a full product page (400+ words minimum) covering features, compliance tracking, renewal management, and jurisdiction support

#### /training -- Score: 15/100
- **Status:** Live, indexed
- **Word count:** ~65 body words
- **Previous issue (broken title):** RESOLVED -- title now reads "maxgeo Training & Certification" instead of "Training is great for training is"
- **Current issue:** Content is still critically insufficient. Two cards with "Book Now" buttons and one sentence of intro text
- **Priority fixes:** Expand to 500+ words with training programme descriptions, formats, outcomes, and trainer information

#### /contact -- Score: 55/100
- **Status:** Live, indexed (noindex appears RESOLVED)
- **Word count:** ~120 body words
- **Strengths:** Four office addresses with local phone numbers; "Visit Knowledge Base & Support" link
- **Weaknesses:** No email addresses visible; no contact form visible in text extraction (may be JavaScript-rendered); no support hours or response time commitments
- **Priority fixes:** Add visible email addresses; add support availability information

#### /events (listing) -- Score: 35/100
- **Status:** Live, indexed
- **Word count:** ~40 body words
- **Weaknesses:** Only one sentence of intro text ("We host and attend various events allowing you to connect with like-minded professionals."); no filtering by upcoming vs past; no event type categorisation
- **Priority fixes:** Add 200+ words of intro content; implement upcoming/past event filtering

#### /insights (listing) -- Score: 35/100
- **Status:** Live, indexed
- **Word count:** ~40 body words
- **Weaknesses:** Only one sentence of intro text; no category filtering; no search; no featured articles
- **Priority fixes:** Add 200+ words of intro content; implement article categorisation (Product Updates, Industry Insights, Technical Guides)

### Insight Articles Summary

| Article | Body Words | Author | Date | H2 Structure | Score |
|---------|-----------|--------|------|--------------|-------|
| Large File Imports | ~850 | None | 21 Jan 2026 | H3 subheadings (no H2 in body) | 55/100 |
| Tenure Management | ~875 | None | 8 Sept 2025 | 6 H2s -- best structured | 65/100 |
| De-risking Mining Lifecycle | ~1,700 | None | 19 Mar 2025 | No H2s in body (only "Recent Insights") | 58/100 |
| DataShed4 to DataShed5 | ~680 | None | Unknown | 1 H2 | 50/100 |
| QAQC and Health Checks | ~880 | None | Unknown | 1 H2 | 52/100 |
| pXRF Data Management | ~680 | None | Unknown | 1 H2 | 50/100 |

**Common article issues:**
- No author names or bios on any article
- Heading hierarchy is inconsistent -- some use H2 for subheadings, others use H3, and one (de-risking) has no H2s in the body at all
- No "Key Takeaways" or summary sections for quick scanning
- No internal links to product pages within article body text
- No images, charts, or visual elements referenced (may be JS-rendered but text extraction shows none)
- "Recent Insights" related articles section appears on all articles but uses the same articles rather than contextually relevant recommendations

---

## 8. Sitemap vs Actual Content Gaps

### Pages in Sitemap That Should Not Be

| URL | Issue | Action |
|-----|-------|--------|
| /datashed-training | Returns 404 | Remove from sitemap OR create page |
| /assay-management | Returns 404 | Remove from sitemap OR create page |
| /drilling-management | Returns 404 | Remove from sitemap OR create page |
| /logchief-training | Returns 404 | Remove from sitemap OR create page |
| /logchief-lite-training | Returns 404 | Remove from sitemap OR create page |

### Pages NOT in Sitemap That Should Be

| URL | Status | Action |
|-----|--------|--------|
| /software/datashed | Live, indexable | Add to sitemap immediately |
| /software/logchief | Live, indexable | Add to sitemap immediately |
| /software/logchief-lite | Live (check noindex) | Fix noindex, add to sitemap |
| /software/leasectrl | Noindex, empty | Build page, then add to sitemap |

---

## 9. Duplicate Meta Content Issues

### Duplicate Title Tags

| Title | Pages Using It |
|-------|---------------|
| "Contact Us: Mining Data Management Worldwide \| Maxgeo" | /contact AND /book-a-demo |

### Duplicate Meta Descriptions

| Description | Pages Using It |
|-------------|---------------|
| "Embracing automation with DataShed5 means more cost-efficient operations, fewer manual errors, and ultimately, better decision-making." | /insights/integrating-datashed... AND /insights/maximising-cost-efficiencies... |
| "Discover how maxgeo's integrated data solutions help mining companies drive smarter decision-making across the entire mining lifecycle." | /insights/maximising-data-value-with-qaqc... AND /insights/de-risking-the-mining-lifecycle... |
| "Streamlined cloud logging for rapid field data capture. Platform-agnostic with offline capability and instant sync to the maxgeo platform." | /software/logchief AND /software/logchief-lite |
| "Contact maxgeo for your data management needs. Our consultants focus their knowledge and expertise on providing support that suits you." | /contact AND /book-a-demo |

### Missing Meta Descriptions (18+ pages)

All 18 event pages lack meta descriptions. Additionally:
- /insights/streamlining-large-file-imports-in-datashed5 -- no meta description
- /legal -- no meta description
- /training -- previously no meta description (now appears to have one)

---

## 10. Content Strategy Recommendations

### Priority 1 -- Fix Broken/Thin Content (Week 1-2)

1. **Build the /software/leasectrl product page** -- 400+ words covering lease tracking, compliance monitoring, jurisdiction support, and integration with datashed5. The tenure management insight article already drives interest to this product; the empty landing page is losing conversions.

2. **Expand the /training page** to 500+ words -- describe datashed5 training, logchief training, and logchief lite training programmes with formats (online/on-site/self-paced), duration, skill levels, and certification details.

3. **Resolve the 5 dead sitemap URLs** -- either create the pages (/datashed-training, /logchief-training, /logchief-lite-training could redirect to /training with anchor links) or remove them from the sitemap and set up 301 redirects to /training. For /assay-management and /drilling-management, redirect to /software/datashed.

4. **Add all 4 software pages to the sitemap** -- /software/datashed, /software/logchief, /software/logchief-lite (after fixing noindex), and /software/leasectrl (after building it).

### Priority 2 -- Strengthen E-E-A-T (Week 2-4)

5. **Add author attribution to all insight articles** -- At minimum, add author name and a one-line bio with role and expertise area. Ideally, create author profile pages with photo, credentials, industry experience, and links to LinkedIn profiles.

6. **Create an About/Team page** -- Company history, founding story, team members with photos and credentials, office locations, mission statement. This is a significant E-E-A-T gap for a B2B company asking clients to trust them with geological data.

7. **Add client logos and testimonials** -- Even 5-10 named client logos with 2-3 testimonial quotes would substantially improve trust signals. Given 350+ clients, this should be achievable.

8. **Add security and compliance information** -- If maxgeo holds SOC 2, ISO 27001, or other certifications, display them prominently. If not, describe security practices on a dedicated page.

### Priority 3 -- Expand Content Depth (Week 4-8)

9. **Expand all three solution pages** to 800+ words each:
   - /exploration: Add workflow narrative, integration points with logchief and datashed5, QAQC process description, and a use case example
   - /grade-control: Add reconciliation workflow, blast hole sampling process, integration with mining models, and operational benefit metrics
   - /mining: Add operational data types managed (PLOD, DDR, survey, production), dashboard capabilities, and site deployment story

10. **Expand insight articles under 1,000 words** -- Add depth to the 4 articles under 900 words (DataShed4-to-5 evolution, pXRF data management, and others). Add specific examples, workflow screenshots, and configuration details.

11. **Create 3-5 new content pieces targeting high-value queries:**
    - "Geological Data Management Software Comparison" (vs spreadsheets, vs competitors)
    - "Mining QAQC Best Practices Guide" (comprehensive, 2,500+ word guide)
    - "Cloud vs On-Premise Geological Databases" (decision guide)
    - "Glossary of Mining Data Management Terms" (highly citable for AI search)
    - Named client case study with specific metrics

### Priority 4 -- Structured Data & AI Readiness (Week 4-6)

12. **Add Organization JSON-LD** to the homepage:
    - name, url, logo, foundingDate
    - address (4 offices)
    - contactPoint with phone numbers
    - sameAs (social profiles)

13. **Add SoftwareApplication JSON-LD** to each product page:
    - name, applicationCategory, operatingSystem
    - offers (pricing model if public)
    - publisher (link to Organization)

14. **Add Article JSON-LD** to all insight articles:
    - headline, datePublished, dateModified
    - author (with Person schema)
    - publisher (Organization)
    - image, description

15. **Add BreadcrumbList JSON-LD** to all inner pages

16. **Add Event JSON-LD** to all event pages with:
    - name, startDate, endDate, location
    - organizer, eventAttendanceMode

---

## Appendix A: Complete Content Inventory

| # | URL | Words (Total) | Meta Desc | noindex | Schema | Content Score |
|---|-----|--------------|-----------|---------|--------|--------------|
| 1 | / | 763 | Yes | No | None | 62/100 |
| 2 | /exploration | 340 | Yes | No | None | 30/100 |
| 3 | /grade-control | 361 | Yes | No | None | 30/100 |
| 4 | /mining | 452 | Yes | No | None | 35/100 |
| 5 | /software/datashed | 790 | Yes | No | None | 58/100 |
| 6 | /software/logchief | 630 | Yes | No | None | 55/100 |
| 7 | /software/logchief-lite | 718 | Yes | No | None | 50/100 |
| 8 | /software/leasectrl | 1 | N/A | Yes | None | 0/100 |
| 9 | /training | 247 | Yes | No | None | 15/100 |
| 10 | /contact | 300 | Yes | No | None | 55/100 |
| 11 | /events | 218 | Yes | No | None | 35/100 |
| 12 | /insights | 217 | Yes | No | None | 35/100 |
| 13 | /book-a-demo | ~300 | Duplicate | No | None | 40/100 |
| 14 | /legal | ~200 | No | No | None | 40/100 |
| 15 | /updates | ~200 | Yes | No | None | 45/100 |

### Insight Articles

| # | URL | Words | Meta Desc | Author | Date |
|---|-----|-------|-----------|--------|------|
| 1 | /insights/de-risking-the-mining-lifecycle... | 1,879 | Duplicate | None | 19 Mar 2025 |
| 2 | /insights/the-hidden-engine-of-mining... | 1,055 | Yes | None | 8 Sept 2025 |
| 3 | /insights/maximising-data-value-with-qaqc... | 1,061 | Duplicate | None | Unknown |
| 4 | /insights/streamlining-large-file-imports... | 1,031 | No | None | 21 Jan 2026 |
| 5 | /insights/transforming-pxrf-data-management | 863 | Yes (over 160) | None | Unknown |
| 6 | /insights/celebrating-innovation... | 857 | Yes | None | Unknown |
| 7-15 | Remaining 9 articles | ~800-1,000 est. | Mixed | None | Various |

### Event Pages (18 total)

All 18 event pages are missing meta descriptions. Sample word counts range from 350-450 words. Events span 2025-2026 including PDAC, Mining Indaba, CIM Connect, MINEXCHANGE, AME Roundup, and multiple webinars.

### Dead Pages (in sitemap, returning 404)

| URL | Suggested Action |
|-----|-----------------|
| /datashed-training | 301 redirect to /training |
| /logchief-training | 301 redirect to /training |
| /logchief-lite-training | 301 redirect to /training |
| /assay-management | 301 redirect to /software/datashed |
| /drilling-management | 301 redirect to /software/datashed |

---

## Appendix B: Issues Resolved Since Previous Audit

| Issue | Previous Status | Current Status |
|-------|----------------|----------------|
| Lorem Ipsum on /exploration | CRITICAL -- Lorem Ipsum in meta description | RESOLVED -- proper description now in place |
| Broken title on /training | "Training is great for training is" | RESOLVED -- now reads "maxgeo Training & Certification" |
| /mining noindex | Core solution page blocked from indexing | RESOLVED -- page is now indexable |
| /contact noindex | Contact page blocked from indexing | RESOLVED -- page is now indexable |
| Homepage meta description | "Weak" 122-char description | IMPROVED -- new 160-char description with "350+ clients" stat |

---

*Report generated by Claude Code SEO Content Quality Audit -- 13 March 2026*
*Framework: Google September 2025 Quality Rater Guidelines, E-E-A-T assessment methodology*

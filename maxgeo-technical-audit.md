# Technical SEO Audit: maxgeo.com

**Date:** 2026-03-13
**Auditor:** Automated Technical SEO Analysis
**Target:** https://maxgeo.com (non-www canonical, www 301-redirects to non-www)
**Tech Stack:** Next.js App Router (Turbopack), Cloudflare CDN, Sanity CMS

---

## Executive Summary

**Overall Technical SEO Score: 48/100**

The site has solid fundamentals -- server-side rendering via Next.js App Router, proper viewport meta, clean URL slugs, and correct www-to-non-www redirects. However, the audit uncovered **two critical systemic issues** that are actively undermining indexing and security posture: every canonical tag and og:url across the entire site contains a double-slash path error (`https://maxgeo.com//page`), and the HSTS header is set to `max-age=0`, which effectively disables transport security. Additionally, Cloudflare Rocket Loader is rewriting all 34 Next.js script tags, which risks breaking React hydration and degrading Core Web Vitals. No structured data (JSON-LD) exists on any page, and no security headers beyond `X-Content-Type-Options` are present.

---

## Issue Summary by Priority

| Priority | Count | Issues |
|----------|-------|--------|
| Critical | 2 | Double-slash canonicals site-wide; HSTS max-age=0 |
| High | 3 | Rocket Loader rewriting Next.js hydration scripts; No JSON-LD structured data; Missing Content-Security-Policy |
| Medium | 5 | Sitemap vs canonical URL mismatch; /software/datashed orphaned from sitemap; Training page thin content; No AI crawler directives; Trailing-slash 308 redirect chains |
| Low | 4 | No hreflang tags; No Permissions-Policy header; Preloading third-party tracking scripts; No X-Frame-Options header |

---

## 1. Crawlability

### 1.1 robots.txt -- PASS (with caveats)

**File:** https://maxgeo.com/robots.txt

```
# Allow all crawlers
User-agent: *
Allow: /

# Sitemap location
Sitemap: https://maxgeo.com/sitemap.xml
```

**Assessment:**
- The file is well-formed and permits all crawlers full access.
- The sitemap directive is correctly placed and uses the canonical (non-www) domain.
- `Allow: /` is technically redundant (the default is allow) but harmless and explicit.

**Issue [Medium]: No AI Crawler Management**
No directives exist for AI-specific crawlers. The following bots have no rules:
- GPTBot, ChatGPT-User (OpenAI)
- ClaudeBot, anthropic-ai (Anthropic)
- CCBot (Common Crawl / training data)
- Google-Extended (Gemini training)
- PerplexityBot, Bytespider (TikTok/ByteDance)

**Recommendation:** Add explicit `User-agent` / `Disallow` blocks for any AI crawlers you do not wish to train on your content. If you want to allow all AI crawlers, document this as an intentional decision. Example to block training while allowing search:

```
User-agent: GPTBot
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: Google-Extended
Disallow: /
```

### 1.2 Sitemap -- PASS

**File:** https://maxgeo.com/sitemap.xml
- **Format:** Valid XML with `<urlset>` namespace
- **URL count:** 50
- **lastmod:** Present on all entries, dynamically generated (most dated 2026-03-13)
- **changefreq:** Present (weekly for pages, monthly for content)
- **priority:** Present (1.0 for homepage, 0.6-0.8 for subpages)

**Observations:**
- All 50 sitemap URLs use no-trailing-slash format (good internal consistency within the sitemap itself).
- The homepage entry is `https://maxgeo.com` (no trailing slash), but the canonical tag on the homepage is `https://maxgeo.com//` (double slash) -- this mismatch is detailed in Section 2.
- `/software/datashed` is NOT in the sitemap but returns HTTP 200 and has substantial content (~790 words). This page is linked from the homepage navigation.

### 1.3 Redirect Chains -- PASS (minor concern)

| Scenario | Behaviour | Status |
|----------|-----------|--------|
| `http://maxgeo.com/` | 301 -> `https://maxgeo.com/` | Correct |
| `https://www.maxgeo.com/` | 301 -> `https://maxgeo.com/` | Correct |
| `https://maxgeo.com/exploration/` (trailing slash) | 308 -> `/exploration` | Working but adds a hop |
| `https://maxgeo.com//exploration` (double slash) | 308 -> `/exploration` | Working but adds a hop |

**Issue [Medium]: Trailing-Slash 308 Redirects**
Next.js is configured with `trailingSlash: false` (default), which causes a 308 Permanent Redirect for any URL accessed with a trailing slash. While this is correct behaviour, it means:
- The canonical URLs (`https://maxgeo.com//exploration`) trigger a 308 redirect, which Googlebot must follow -- adding latency and an extra crawl step.
- This is compounded by the double-slash canonical issue (see Section 2).

---

## 2. Indexability

### 2.1 Canonical Tags -- CRITICAL FAIL

**Issue [Critical]: Double-Slash in ALL Canonical URLs**

Every page on the site has a canonical tag with a malformed URL containing a double forward slash between the domain and path:

| Page | Canonical Tag | Should Be |
|------|--------------|-----------|
| Homepage | `https://maxgeo.com//` | `https://maxgeo.com/` |
| /exploration | `https://maxgeo.com//exploration` | `https://maxgeo.com/exploration` |
| /mining | `https://maxgeo.com//mining` | `https://maxgeo.com/mining` |
| /grade-control | `https://maxgeo.com//grade-control` | `https://maxgeo.com/grade-control` |
| /training | `https://maxgeo.com//training` | `https://maxgeo.com/training` |
| /software/datashed | `https://maxgeo.com//software/datashed` | `https://maxgeo.com/software/datashed` |

**The same double-slash error appears in `og:url` meta tags on every page.**

**Impact:**
- Google may treat `https://maxgeo.com//exploration` and `https://maxgeo.com/exploration` as two separate URLs, splitting link equity and causing duplicate content signals.
- The double-slash canonical URL responds with a 308 redirect to the clean URL, meaning the canonical points to a URL that itself redirects -- a canonical loop/mismatch that directly conflicts with Google's canonicalization guidance.
- Social sharing platforms (LinkedIn, Facebook, Twitter) will use the malformed og:url, potentially creating broken share links or fractured engagement metrics.

**Root Cause:** This is almost certainly a Next.js App Router `metadataBase` or route configuration issue. The code likely constructs the canonical as `baseURL + "/" + path`, where `baseURL` already ends with `/`, producing `https://maxgeo.com/` + `/exploration` = `https://maxgeo.com//exploration`.

**Fix (Next.js App Router):**

In `app/layout.tsx` or the metadata generation function, ensure the base URL does NOT end with a trailing slash, or strip double slashes:

```typescript
// In next.config.js or app/layout.tsx metadata
export const metadata = {
  metadataBase: new URL('https://maxgeo.com'), // NO trailing slash
};
```

Or in dynamic metadata generation:

```typescript
// Ensure no double slashes
const canonical = `https://maxgeo.com${path}`.replace(/([^:])\/\//g, '$1/');
```

### 2.2 Sitemap vs. Canonical Mismatch -- MEDIUM

| Source | Homepage URL |
|--------|-------------|
| Sitemap `<loc>` | `https://maxgeo.com` (no trailing slash) |
| Canonical `<link>` | `https://maxgeo.com//` (double slash + trailing slash) |
| Actual served URL | `https://maxgeo.com/` (single trailing slash) |

Three different URL representations for the same page. This must be unified.

### 2.3 Orphaned Page: /software/datashed -- MEDIUM

- **Status:** HTTP 200, not a soft 404
- **Content:** ~790 words, has H1 ("Geological and Mining data software"), unique meta description
- **Canonical:** `https://maxgeo.com//software/datashed` (also has the double-slash bug)
- **In sitemap:** No
- **Linked from homepage navigation:** Yes

**Recommendation:** Add `https://maxgeo.com/software/datashed` to the sitemap. Also check whether other `/software/*` pages (logchief, logchief-lite, LeaseCTRL) exist but are similarly absent.

### 2.4 Meta Robots -- PASS

All checked pages have `<meta name="robots" content="index, follow"/>` and `<meta name="googlebot" content="index, follow"/>`. No noindex issues detected.

### 2.5 Thin Content -- MEDIUM

| Page | Word Count | Assessment |
|------|-----------|------------|
| Homepage | ~763 | Adequate |
| /software/datashed | ~790 | Adequate |
| /mining | ~452 | Borderline |
| /grade-control | ~361 | Borderline |
| /exploration | ~340 | Borderline |
| /training | ~247 | Thin |

**Issue [Medium]: /training has only ~247 words** (including navigation text). The visible content is primarily navigation links and section headers with minimal descriptive copy.

**Recommendation:** Expand the training page with course descriptions, outcomes, prerequisites, and testimonials. Aim for 500+ words of unique, substantive content.

---

## 3. Security Headers

### 3.1 HSTS -- CRITICAL FAIL

```
strict-transport-security: max-age=0; includeSubDomains; preload
```

**Issue [Critical]: HSTS max-age=0 Effectively Disables HSTS**

A `max-age=0` tells browsers "do not cache this HSTS policy," meaning:
- Every visit, the browser must re-check whether to use HTTPS
- Users are vulnerable to SSL stripping attacks on first visit
- The `preload` directive is meaningless with `max-age=0` because the HSTS preload list requires `max-age >= 31536000` (1 year)
- Google considers HSTS a positive security signal

**Current state:** The `preload` flag is present but non-functional. The site is almost certainly NOT on the HSTS preload list with this configuration.

**Fix (Cloudflare Dashboard):**

1. Go to Cloudflare Dashboard > SSL/TLS > Edge Certificates
2. Enable "HTTP Strict Transport Security (HSTS)"
3. Set max-age to `31536000` (1 year) minimum
4. Keep `includeSubDomains` enabled
5. Keep `preload` enabled
6. After confirming it works, submit to https://hstspreload.org/

Target header:
```
strict-transport-security: max-age=31536000; includeSubDomains; preload
```

### 3.2 Other Security Headers

| Header | Status | Value |
|--------|--------|-------|
| X-Content-Type-Options | PASS | `nosniff` |
| Content-Security-Policy | FAIL | Missing |
| X-Frame-Options | FAIL | Missing |
| Permissions-Policy | FAIL | Missing |
| Referrer-Policy | FAIL | Missing |
| X-XSS-Protection | N/A | Deprecated, not needed |

**Issue [High]: No Content-Security-Policy Header**

Without CSP, the site is vulnerable to XSS attacks and cannot control which resources browsers are allowed to load. This is especially important given the site loads scripts from multiple third-party origins (Google Tag Manager, LinkedIn Insight, HubSpot).

**Recommendation:** Start with a report-only CSP to identify issues, then enforce:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://snap.licdn.com https://js.hs-scripts.com https://cdn-cgi/; img-src 'self' https://cdn.sanity.io data:; style-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'self' https://71bjoiw9.api.sanity.io; frame-ancestors 'none';
```

**Issue [Low]: No X-Frame-Options Header**

The site can be embedded in iframes on other domains (clickjacking risk). Add:
```
X-Frame-Options: DENY
```
Or use the CSP `frame-ancestors 'none'` directive (preferred modern approach).

**Issue [Low]: No Permissions-Policy Header**

No restrictions on browser features (camera, microphone, geolocation, etc.). Add:
```
Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
```

All of these can be configured in Cloudflare Workers or Transform Rules without code changes.

---

## 4. URL Structure

### 4.1 Clean URLs -- PASS

All URLs use clean, lowercase, hyphenated slugs:
- `/exploration`
- `/grade-control`
- `/software/datashed`
- `/insights/streamlining-large-file-imports-in-datashed5`

No query parameters, session IDs, or file extensions observed.

### 4.2 www/non-www Handling -- PASS

`https://www.maxgeo.com/` correctly 301-redirects to `https://maxgeo.com/` (single hop).

### 4.3 HTTP to HTTPS -- PASS

`http://maxgeo.com/` correctly 301-redirects to `https://maxgeo.com/` (single hop).

### 4.4 Trailing Slash Behaviour -- PASS (with note)

Next.js is configured with `trailingSlash: false`. URLs with trailing slashes receive a 308 Permanent Redirect to the non-trailing-slash version. This is correct and consistent. The only issue is that internal links should never link to trailing-slash URLs to avoid unnecessary redirect hops -- and from the HTML analysis, they do not. All internal `<a href>` values use no-trailing-slash format.

---

## 5. Mobile Optimization

### 5.1 Viewport Meta -- PASS

```html
<meta name="viewport" content="width=device-width, initial-scale=1"/>
```

Correct implementation. The `width=device-width` and `initial-scale=1` values are the recommended configuration.

### 5.2 Responsive Design Signals -- PASS

- CSS is served via external Next.js chunk files (not inline), suggesting a proper build pipeline.
- Tailwind-style responsive classes observed in markup (e.g., `class="h-24 w-24 md:h-32 md:w-32 lg:h-44 lg:w-44"`), indicating breakpoint-based responsive design.
- No `<meta name="MobileOptimized">` or `<meta name="HandheldFriendly">` legacy tags needed (viewport meta is sufficient).

### 5.3 Touch Targets -- INFORMATIONAL

Cannot fully assess touch target sizing from HTML alone (requires rendered CSS analysis), but the use of responsive utility classes suggests adequate sizing at mobile breakpoints.

---

## 6. Core Web Vitals Signals

### 6.1 LCP (Largest Contentful Paint) -- MEDIUM RISK

**Positive signals:**
- Three custom fonts are preloaded with `<link rel="preload" as="font">` using woff2 format:
  - `TTHoves_DemiBold_subset-s.p.faf65f46.woff2`
  - `TTHoves_Medium_subset-s.p.10dd6624.woff2`
  - `TTHoves_Regular_subset-s.p.86ef6e34.woff2`
- Font files use subset naming (`_subset-s.p`), indicating font subsetting is in place (reduces file size).
- `font-display: swap` is used in all `@font-face` declarations (prevents invisible text during font load).
- Four hero/above-fold SVG images are preloaded via `<link rel="preload" as="image">`.
- Server-side rendering via Next.js App Router means initial HTML contains content (not a blank shell).
- Cloudflare CDN caching is active (`cf-cache-status: HIT`, `s-maxage=2592000`).

**Negative signals:**
- No `fetchpriority="high"` on any image. The LCP element (likely the hero image or H1 text) should have explicit priority.
- 18 Next.js JavaScript chunks are loaded, all rewritten by Rocket Loader (see Section 8).
- Third-party scripts (GTM, LinkedIn Insight, HubSpot) are preloaded in `<head>`, which competes with LCP resources for bandwidth.

**Recommendation:**
1. Add `fetchpriority="high"` to the above-fold hero image or LCP candidate element.
2. Remove `<link rel="preload">` for third-party tracking scripts (GTM, LinkedIn, HubSpot). These should load after LCP, not compete with it.
3. Verify Rocket Loader is not delaying initial paint (see Section 8).

### 6.2 INP (Interaction to Next Paint) -- MEDIUM RISK

**Positive signals:**
- Server-side rendered HTML means basic content is interactive without waiting for full JS hydration.
- No heavy inline JavaScript detected.

**Negative signals:**
- Rocket Loader defers ALL 34 script tags (including Next.js hydration scripts), which delays when the page becomes fully interactive. When users click on client-side navigation links before hydration completes, nothing happens.
- Cloudflare Speculation Rules are active (`/cdn-cgi/speculation`) with conservative prefetching, which is good for subsequent navigations but does not help initial interactivity.

### 6.3 CLS (Cumulative Layout Shift) -- MEDIUM RISK

**Positive signals:**
- Fonts use `font-display: swap` (prevents layout shift from font loading, though swap itself can cause a minor reflow when the web font replaces the fallback).
- 10 of 14 images on the homepage use `loading="lazy"`.
- No CSS animations detected that could cause layout shifts.

**Negative signals:**
- 4 images on the homepage lack explicit `width` and `height` attributes:

```html
<img src="https://cdn.sanity.io/images/.../90e22b4c...-309x309.svg"
     alt="Assay File Integration"
     class="h-24 w-24 md:h-32 md:w-32 lg:h-44 lg:w-44"/>
```

These rely entirely on CSS classes for sizing. While Tailwind utility classes do set dimensions, if CSS loads after the image, a layout shift occurs. Explicit `width`/`height` HTML attributes provide the browser with an intrinsic aspect ratio before CSS loads.

- `aspect-ratio` CSS property is used 0 times across the site.
- No `<noscript>` fallbacks exist. If JavaScript fails to load (possible with Rocket Loader interference), the page has no graceful degradation.

**Recommendation:**
1. Add explicit `width` and `height` attributes to all `<img>` elements.
2. Consider using CSS `aspect-ratio` for responsive containers.
3. Implement a `font-display: optional` strategy for non-critical font weights to eliminate swap-related CLS entirely.

---

## 7. Structured Data

### 7.1 JSON-LD Schema Markup -- FAIL

**Issue [High]: No JSON-LD Structured Data on Any Page**

Zero `<script type="application/ld+json">` blocks were found on any of the audited pages (homepage, /exploration, /mining, /grade-control, /training, /software/datashed).

**Impact:**
- No eligibility for rich results in Google Search (knowledge panels, FAQ accordions, breadcrumbs, etc.)
- Reduced semantic understanding of the business for search engines
- Missed opportunity for SoftwareApplication schema (for datashed, logchief products)
- Missed opportunity for Organization schema (for brand knowledge panel)

**Recommended Schema Types:**

1. **Organization** (homepage):
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Maxgeo",
  "url": "https://maxgeo.com",
  "logo": "https://maxgeo.com/logo.svg",
  "description": "Integrated data management for exploration, grade control & mining.",
  "sameAs": ["https://www.linkedin.com/company/maxgeo/"]
}
```

2. **SoftwareApplication** (product pages like /software/datashed):
```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "datashed",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Windows, Cloud",
  "description": "Complete geological and mining data management software."
}
```

3. **BreadcrumbList** (all pages):
```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {"@type": "ListItem", "position": 1, "name": "Home", "item": "https://maxgeo.com"},
    {"@type": "ListItem", "position": 2, "name": "Software", "item": "https://maxgeo.com/software"},
    {"@type": "ListItem", "position": 3, "name": "datashed"}
  ]
}
```

4. **Event** (for /events/* pages):
```json
{
  "@context": "https://schema.org",
  "@type": "Event",
  "name": "Mining Indaba 2026",
  "startDate": "2026-02-02",
  "location": {"@type": "Place", "name": "Cape Town"}
}
```

5. **Article** (for /insights/* blog posts)

---

## 8. JavaScript Rendering

### 8.1 Server-Side Rendering -- PASS

The site uses Next.js App Router with server-side rendering (SSR/SSG). Key indicators:
- `x-nextjs-prerender: 1` response header confirms static pre-rendering
- `x-nextjs-cache: HIT` confirms pages are cached at the edge
- Full HTML content is present in the initial response (not a blank `<div id="root"></div>`)
- No `__NEXT_DATA__` script tag (App Router uses React Server Components, not the Pages Router data pattern)
- Turbopack is in use (modern Next.js bundler)

This means search engine crawlers receive fully rendered HTML without needing JavaScript execution -- a strong positive for SEO.

### 8.2 Cloudflare Rocket Loader -- HIGH RISK

**Issue [High]: Rocket Loader Rewrites ALL 34 Script Tags**

Cloudflare Rocket Loader has rewritten every `<script>` tag on the page, changing their `type` attribute from `text/javascript` to a custom identifier:

```html
<!-- Original (expected): -->
<script src="/_next/static/chunks/d598f1f652e2d146.js" async="" type="text/javascript">

<!-- Rocket Loader rewrites to: -->
<script src="/_next/static/chunks/d598f1f652e2d146.js" async="" type="d8d9c16450030f79eb30c06e-text/javascript">
```

The Rocket Loader script itself loads at the bottom:
```html
<script src="/cdn-cgi/scripts/7d0fa10a/cloudflare-static/rocket-loader.min.js"
        data-cf-settings="d8d9c16450030f79eb30c06e-|49" defer>
```

**Count of rewritten scripts:** 34 out of 35 total (the Rocket Loader script itself is the 35th)

**Impact:**
- **Hydration failure risk:** React/Next.js hydration depends on scripts executing in a specific order. Rocket Loader defers ALL scripts and then re-executes them, which can break React's hydration matching between server-rendered HTML and client-side state.
- **INP degradation:** All interactivity is delayed until Rocket Loader decides to execute the deferred scripts.
- **Third-party script conflicts:** Google Tag Manager, LinkedIn Insight, and HubSpot scripts are also deferred, which may cause data loss in analytics (e.g., pageview events firing after user has already navigated away).
- **Googlebot interaction:** While Googlebot receives pre-rendered HTML (good), the JavaScript execution path is altered, which could affect how Google evaluates interactivity signals.

**Recommendation: DISABLE Cloudflare Rocket Loader**

Rocket Loader was designed for legacy sites with render-blocking scripts. Next.js already handles script optimization through:
- Code splitting (18 chunks)
- Async loading (`async` attribute)
- Strategic preloading (`<link rel="preload" as="script">`)
- React Server Components (reduced client JS)

Rocket Loader is redundant and counterproductive here.

**To disable:**
1. Cloudflare Dashboard > Speed > Optimization > Content Optimization
2. Toggle "Rocket Loader" to OFF

### 8.3 Third-Party Script Loading -- LOW

Three third-party tracking scripts are preloaded in `<head>`:

```html
<link rel="preload" href="https://www.googletagmanager.com/gtag/js?id=G-N3TVZENZR7" as="script"/>
<link rel="preload" href="https://snap.licdn.com/li.lms-analytics/insight.min.js" as="script"/>
<link rel="preload" href="//js.hs-scripts.com/8707562.js" as="script"/>
```

**Issue [Low]: Preloading tracking scripts competes with critical resources**

Preloading tells the browser "fetch this immediately, it's critical." Analytics scripts are not critical for initial render and should not compete with fonts, CSS, and hero images for bandwidth.

**Recommendation:** Remove `<link rel="preload">` for these tracking scripts. Instead, load them with `next/script` using `strategy="afterInteractive"` or `strategy="lazyOnload"`:

```tsx
import Script from 'next/script';

<Script
  src="https://www.googletagmanager.com/gtag/js?id=G-N3TVZENZR7"
  strategy="afterInteractive"
/>
```

---

## 9. HTTP Headers (Caching and Performance)

### 9.1 Cache-Control -- PASS

```
cache-control: public, s-maxage=2592000, stale-while-revalidate=2592000
```

- `s-maxage=2592000` = 30 days CDN cache (excellent)
- `stale-while-revalidate=2592000` = serve stale content while revalidating in background (excellent)
- No `max-age` for browser cache, which is fine for HTML (prevents stale content in user browsers)

### 9.2 Vary Header -- PASS

```
vary: RSC, Next-Router-State-Tree, Next-Router-Prefetch, accept-encoding
```

Correctly varies on Next.js-specific headers and encoding. This prevents CDN from serving RSC payloads as HTML or vice versa.

### 9.3 Content-Type -- PASS

```
content-type: text/html; charset=utf-8
```

Correct character encoding specified.

### 9.4 ETag -- NOT PRESENT

No `ETag` header is returned. This is acceptable because the `s-maxage` and `stale-while-revalidate` strategy handles cache freshness at the CDN level.

### 9.5 Cloudflare-Specific Headers -- INFORMATIONAL

| Header | Value | Note |
|--------|-------|------|
| `cf-cache-status` | HIT/MISS | CDN cache working |
| `x-nextjs-stale-time` | 300 | 5-minute ISR revalidation |
| `speculation-rules` | `/cdn-cgi/speculation` | Cloudflare speculation API active |
| `nel` / `report-to` | Cloudflare NEL | Network error logging enabled |
| `server` | cloudflare | Standard |

---

## 10. Additional Observations

### 10.1 Open Graph Tags -- PARTIAL PASS

All pages have comprehensive OG tags (title, description, image, type, site_name). However:
- `og:url` has the same double-slash bug as canonical tags (see Section 2.1)
- `og:image` uses a dynamic API route (`/api/og?slug=home&type=page`) -- ensure this returns proper dimensions (1200x630 confirmed via meta tags) and is not behind authentication

### 10.2 Twitter Cards -- PASS

```html
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="..."/>
<meta name="twitter:description" content="..."/>
<meta name="twitter:image" content="..."/>
```

Properly configured for large image cards.

### 10.3 HTML Language Attribute -- PASS

```html
<html lang="en">
```

Correctly declares English language content.

### 10.4 Image Alt Text -- PASS

All 14 images on the homepage have descriptive `alt` attributes. No empty or missing alt text detected.

### 10.5 Heading Structure -- PASS

The homepage has a single, well-formed `<h1>`:
```html
<h1>Collaborative Data Solutions for Geology and Mining</h1>
```

### 10.6 Preconnect to CMS -- PASS

```html
<link rel="preconnect" href="https://71bjoiw9.api.sanity.io"/>
<link href="https://71bjoiw9.api.sanity.io" rel="dns-prefetch"/>
```

Both `preconnect` and `dns-prefetch` (fallback) are set for the Sanity CMS API, reducing latency for CMS-served images.

### 10.7 Cloudflare Speculation Rules -- INFORMATIONAL

Active at `/cdn-cgi/speculation` with conservative prefetching:
```json
{"prefetch":[{"eagerness":"conservative","source":"document","where":{"and":[{"href_matches":"/*","relative_to":"document"}]}}]}
```

This prefetches internal links when users show strong intent to navigate (e.g., mousedown/touchstart), improving perceived navigation speed.

---

## Prioritised Remediation Plan

### Phase 1: Critical (Fix Immediately)

| # | Issue | Effort | Impact |
|---|-------|--------|--------|
| 1 | **Fix double-slash canonicals** -- Update `metadataBase` in Next.js config to remove trailing slash from base URL | 15 min | Fixes indexing signals on all 50+ pages |
| 2 | **Fix HSTS max-age** -- Set to 31536000 in Cloudflare dashboard | 5 min | Enables transport security, preload eligibility |

### Phase 2: High Priority (This Sprint)

| # | Issue | Effort | Impact |
|---|-------|--------|--------|
| 3 | **Disable Rocket Loader** -- Toggle off in Cloudflare Speed settings | 2 min | Prevents hydration failures, improves INP |
| 4 | **Add JSON-LD structured data** -- Organization + BreadcrumbList on all pages, SoftwareApplication on product pages | 2-4 hrs | Rich result eligibility |
| 5 | **Add Content-Security-Policy** -- Start with report-only mode via Cloudflare Transform Rules | 1-2 hrs | Security posture, trust signals |

### Phase 3: Medium Priority (Next Sprint)

| # | Issue | Effort | Impact |
|---|-------|--------|--------|
| 6 | **Add /software/datashed to sitemap** -- Also audit other /software/* pages | 30 min | Ensures crawl coverage |
| 7 | **Expand /training page content** -- Add 300+ words of course descriptions | 1-2 hrs | Avoids thin content flag |
| 8 | **Add AI crawler directives to robots.txt** | 15 min | Content protection |
| 9 | **Remove tracking script preloads** -- Use `next/script` with afterInteractive strategy | 30 min | LCP improvement |
| 10 | **Add fetchpriority="high" to LCP image** | 10 min | LCP improvement |

### Phase 4: Low Priority (Backlog)

| # | Issue | Effort | Impact |
|---|-------|--------|--------|
| 11 | Add explicit width/height to images | 30 min | CLS improvement |
| 12 | Add Permissions-Policy header | 15 min | Security hardening |
| 13 | Add X-Frame-Options / frame-ancestors CSP | 15 min | Clickjacking prevention |
| 14 | Add Event schema to /events/* pages | 2 hrs | Rich result eligibility |
| 15 | Add Article schema to /insights/* posts | 2 hrs | Rich result eligibility |

---

## Score Breakdown

| Category | Weight | Score | Weighted |
|----------|--------|-------|----------|
| Crawlability | 15% | 80/100 | 12.0 |
| Indexability | 20% | 20/100 | 4.0 |
| Security | 15% | 15/100 | 2.3 |
| URL Structure | 10% | 90/100 | 9.0 |
| Mobile | 10% | 90/100 | 9.0 |
| Core Web Vitals | 15% | 55/100 | 8.3 |
| Structured Data | 10% | 0/100 | 0.0 |
| JS Rendering | 5% | 60/100 | 3.0 |
| **Total** | **100%** | | **47.5/100** |

**Rounded Score: 48/100**

The low score is dominated by the critical canonical tag bug (devastating to indexability), missing security headers, and absent structured data. Fixing just the two critical issues (double-slash canonicals and HSTS) would immediately raise the score to approximately 68/100. Adding structured data and disabling Rocket Loader would push it to approximately 80/100.

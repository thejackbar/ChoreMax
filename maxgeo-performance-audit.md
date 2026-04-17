# maxgeo.com -- Comprehensive Performance & Core Web Vitals Audit

**Audit Date:** 13 March 2026
**URL:** https://maxgeo.com (homepage)
**Stack:** Next.js App Router (Turbopack), Cloudflare CDN, Sanity CMS
**Methodology:** Source HTML analysis, resource size measurement, header inspection, PageSpeed Insights API (rate-limited -- lab scores unavailable this run)

---

## Executive Summary

The site has severe performance problems driven by three root causes:

1. **Cloudflare Rocket Loader is rewriting all 34 script tags**, replacing `type="text/javascript"` with a custom type (`4804e47ca7f5fe6a6035d742-text/javascript`). This fundamentally breaks Next.js hydration timing and adds a serialized re-execution layer.
2. **Every hero/carousel image uses `loading="lazy"`** -- the LCP candidate image is lazy-loaded, meaning the browser will not request it until layout is computed, adding hundreds of milliseconds to LCP.
3. **JavaScript payload is 2.19 MB uncompressed (approx. 590 KB transferred)** -- dominated by an un-tree-shaken Lucide Icons bundle (469 KB / 114 KB transferred) and Framer Motion (120 KB / 40 KB transferred).

Total uncompressed page weight: **2.54 MB**, of which **84% is JavaScript**.

---

## 1. Core Web Vitals Assessment

### 1.1 LCP (Largest Contentful Paint) -- LIKELY FAILING

| Subpart | Finding | Impact |
|---------|---------|--------|
| **TTFB** | 106 ms measured, Cloudflare edge cache HIT (age: 133s). `s-maxage: 2592000`. | Good |
| **LCP Element** | Hero carousel image: `57c6b427043de5c484f3a32404713b50c02db711-1920x1080.jpg` (90 KB JPEG) | -- |
| **Resource Load Delay** | Image has `loading="lazy"` and NO `fetchPriority="high"`. Browser cannot discover this image from HTML scan alone because the `srcSet` URLs pass through `/_next/image` proxy. Image is not preloaded via `<link rel="preload">`. | CRITICAL |
| **Resource Load Time** | Image served as JPEG (89,892 bytes for 1920x1080). `/_next/image` returns `content-type: image/jpeg` even when the browser sends `Accept: image/avif,image/webp`. **No format conversion is happening** -- Next.js Image Optimization is broken on Cloudflare. `cf-polished: vary_header_present` confirms Cloudflare Polish is not converting either. | HIGH |
| **Element Render Delay** | Rocket Loader defers all 34 script tags, then re-executes them sequentially. Next.js hydration is delayed. The hero carousel is a client component (Framer Motion animated) so it may not render the image until JS executes. | HIGH |

**Estimated LCP impact:** The combination of `loading="lazy"` on the LCP image plus Rocket Loader's script deferral likely pushes LCP well past the 2.5s "good" threshold on mobile.

### 1.2 CLS (Cumulative Layout Shift) -- MODERATE RISK

| Factor | Finding | Impact |
|--------|---------|--------|
| **Font Loading** | 3 `@font-face` declarations with `font-display: swap`. Fallback font with `ascent-override`, `descent-override`, `line-gap-override`, `size-adjust` defined. Fonts preloaded. Each font ~10 KB woff2 (subset). | LOW -- well-handled |
| **Image Dimensions** | Hero images use `data-nimg="fill"` with CSS `position:absolute; width:100%; height:100%` inside `aspect-video` containers. No explicit `width`/`height` attributes. | LOW -- container-sized approach works |
| **SVG Icons** | 4 SVG icons are preloaded via `<link rel="preload" as="image">` (Sanity CDN SVGs for feature icons). | LOW |
| **Dynamic Content** | RSC payload is inlined (35.4 KB). No client-side data fetching visible for above-the-fold content. However, carousel images load lazily and may cause shift when they pop in. | MODERATE |
| **Inline SVGs** | 56 inline SVGs totaling 44.3 KB in HTML. These render immediately with no layout shift. | NONE |

**Estimated CLS:** Likely within the 0.1 "good" threshold due to proper font fallback metrics and container-based image sizing. Minor risk from lazy-loaded carousel images shifting when they load.

### 1.3 INP (Interaction to Next Paint) -- HIGH RISK

| Factor | Finding | Impact |
|--------|---------|--------|
| **Total JS (uncompressed)** | 2,241,933 bytes (2.19 MB) across first-party, preloaded, and third-party scripts | CRITICAL |
| **Rocket Loader** | All 34 scripts deferred and re-executed through Rocket Loader's queue. This serializes execution and can create long tasks on the main thread during hydration. | HIGH |
| **Framer Motion** | 120 KB (40 KB transferred). 80 occurrences of "motion" in this chunk. Used for carousel animations and page transitions. | HIGH |
| **Lucide Icons** | 469 KB (114 KB transferred). Contains 627 unique icon names and 5,384 SVG path definitions. This is the **full Lucide icon library**, not tree-shaken. | CRITICAL |
| **Third-party scripts** | Google Tag Manager (535 KB), LinkedIn Insight (54 KB), HubSpot loader (2.5 KB, loads additional banner.js + analytics.js). All preloaded. | HIGH |
| **DOM Size** | 56 inline SVGs, extensive Tailwind utility classes. Carousel with multiple full-viewport images. | MODERATE |

**Estimated INP impact:** The massive JS payload combined with Rocket Loader's re-execution strategy creates main thread contention. After hydration, Framer Motion event handlers on the carousel add input delay.

---

## 2. JavaScript Analysis

### 2.1 Bundle Inventory

#### Script-tag JS (18 files, loaded via Rocket Loader)

| File | Raw Size | Compressed | Likely Content |
|------|----------|------------|----------------|
| `4fa395d360c87cc3.js` | 197.2 KB | 62.2 KB | React DOM (scheduler, reconciler) |
| `a6dad97d9634a72d.js` | 109.9 KB | 39.7 KB | Polyfills (`noModule` attribute -- legacy browsers) |
| `358d823f908ccbc3.js` | 89.1 KB | 28.4 KB | Next.js runtime (byte handling, base64) |
| `0e2812aab5419e64.js` | 82.7 KB | -- | Next.js router (`createHrefFromUrl`, navigation) |
| `81ef603f7af2a2fb.js` | 62.2 KB | -- | Next.js internals + Sanity client (`uuid`) |
| `b0bbba2a681b8ade.js` | 55.8 KB | -- | App components (Lucide refs, Framer Motion refs) |
| `0ec9cbb546b34ac1.js` | 43.7 KB | -- | Next.js chunk |
| `cd688c07f5835965.js` | 36.9 KB | -- | Next.js chunk |
| `dc2d1dceec2b52df.js` | 34.9 KB | -- | React Flight/RSC client |
| `d598f1f652e2d146.js` | 32.5 KB | -- | Next.js chunk |
| `73e3194f06db260e.js` | 30.0 KB | -- | Next.js chunk |
| `85f93624506c7df7.js` | 23.7 KB | -- | Next.js chunk |
| `turbopack-*.js` | 10.0 KB | -- | Turbopack runtime |
| Other small chunks (5) | 29.4 KB | -- | Various |
| **Subtotal** | **947.7 KB** | -- | -- |

#### Preloaded JS (10 files, `fetchPriority="low"`)

| File | Raw Size | Compressed | Likely Content |
|------|----------|------------|----------------|
| `8ea59ff6188080ee.js` | **468.9 KB** | **113.9 KB** | **Lucide Icons (full bundle -- 627 icons, 5,384 SVG paths)** |
| `918b0de1a2ab41f0.js` | 120.1 KB | 40.1 KB | **Framer Motion** (80 "motion" occurrences) |
| `337a77514e9a4788.js` | 51.4 KB | -- | Sanity client/config |
| `dd023346b2e3536b.js` | 31.0 KB | -- | Sanity image builder, Next.js Image |
| `7bb1c6013737e3e4.js` | 28.9 KB | -- | Page components |
| `6f82c4852e6b1a8a.js` | 20.9 KB | -- | Page components |
| `d82383f3a7589868.js` | 16.6 KB | -- | Page components |
| `b63a7c601630f40d.js` | 14.9 KB | -- | Page components |
| `9ac3fb8a98e05c2d.js` | 14.8 KB | -- | Page components |
| Other small (2) | 5.0 KB | -- | Various |
| **Subtotal** | **652.7 KB** | -- | -- |

#### Third-party JS

| Script | Raw Size | Purpose |
|--------|----------|---------|
| Google Tag Manager (`gtag.js`) | 534.7 KB | Analytics |
| LinkedIn Insight (`insight.min.js`) | 53.6 KB | Conversion tracking |
| HubSpot loader (`8707562.js`) | 2.5 KB | Loads `banner.js` + `analytics.js` at runtime |
| Rocket Loader (`rocket-loader.min.js`) | 12.3 KB | Cloudflare script orchestration |
| **Subtotal** | **603.1 KB** | -- |

**Grand Total JS: 2,189 KB uncompressed (~590 KB transferred with Brotli)**

### 2.2 Tree-Shaking Failures

**Lucide Icons (468.9 KB):** The chunk contains 627 unique icon names and 5,384 SVG `<path>` element definitions. This is the entire Lucide icon set. The site likely uses only 10-20 icons. With proper tree-shaking via `lucide-react` named imports, this could be reduced to approximately 5-15 KB.

**Framer Motion (120.1 KB):** The entire Framer Motion library is bundled. For the carousel/page animations observed, CSS animations or the lightweight `motion` package (formerly `framer-motion/mini`, ~18 KB) would suffice.

### 2.3 Rocket Loader Impact

Cloudflare Rocket Loader has rewritten **34 out of 35 script tags** (all except itself) from `type="text/javascript"` to `type="4804e47ca7f5fe6a6035d742-text/javascript"`. This means:

- The browser's native preload scanner cannot discover these scripts
- All scripts are deferred until Rocket Loader itself loads and executes
- Rocket Loader then re-executes scripts sequentially through its own queue
- This fundamentally conflicts with Next.js's hydration strategy, which expects scripts to load in parallel via the browser's native mechanisms
- The `<link rel="preload" as="script">` hints are rendered partially useless because the scripts' type attribute prevents native execution

The `noModule` polyfill script (`a6dad97d9634a72d.js`, 110 KB) has also been rewritten, meaning it may execute in modern browsers when Rocket Loader processes it, adding unnecessary overhead.

---

## 3. CSS Analysis

| File | Raw Size | Compressed | Content |
|------|----------|------------|---------|
| `257aedc1f3d6ed64.css` | 0.8 KB | -- | Font `@font-face` declarations (3 weights + fallback) |
| `9bc99e4ba6f46daa.css` | 134.4 KB | 16.4 KB | Main stylesheet |
| **Total** | **135.2 KB** | **~17 KB** | -- |

### CSS Details

- **1,311 CSS rules** in the main stylesheet
- **209 Tailwind-like utility class patterns** detected (site uses Tailwind CSS)
- **536 CSS custom properties** (CSS variables) -- appears to include a full Tailwind/design-system variable set
- **28 media queries** for responsive design
- **1 `@keyframes` animation** (`pulse`)
- **No critical CSS inlining** -- both CSS files are external `<link>` tags with `data-precedence="next"` (Next.js CSS priority)
- **No inline `<style>` tags** in the document

The CSS is reasonably sized and compresses extremely well (88% reduction). However, there is no critical CSS inlining for above-the-fold content, which means first paint depends on these external CSS files loading.

---

## 4. Image Optimization

### 4.1 Hero Images

The homepage hero is a carousel with 4 slides, each containing a full-viewport background image:

| Image | Source Dimensions | Format | Size | Loading | fetchPriority |
|-------|-------------------|--------|------|---------|---------------|
| drilling programme | 1920x1080 | JPEG | 90 KB | **lazy** | NOT SET |
| Fast Analytics | 1920x1080 | JPEG | -- | **lazy** | NOT SET |
| Big Data. Any Data | 1456x818 | PNG | -- | **lazy** | NOT SET |
| Smart Dashboards | 1145x644 | PNG | -- | **lazy** | NOT SET |

### 4.2 Next.js Image Optimization -- BROKEN

Testing confirmed that `/_next/image` is **not performing format conversion**:

- **Request:** `Accept: image/avif,image/webp,image/*` header sent
- **Response:** `content-type: image/jpeg` -- the original format is returned unchanged
- **File sizes match exactly:** Direct Sanity CDN download = 89,892 bytes, `/_next/image` proxy = 89,892 bytes
- The `cf-polished: vary_header_present` header indicates Cloudflare Polish detected the `Vary: Accept` header but did not process the image

This means the `/_next/image` endpoint is acting as a **pure proxy** with no optimization. Images are served in their original format and size. The `?w=1920&q=75` parameters are being ignored.

**Root cause:** Next.js Image Optimization requires `sharp` or `squoosh` in the server runtime. On Cloudflare Workers/Pages, these native dependencies are not available. The image loader needs to be replaced with either Sanity's built-in image transformation API or Cloudflare Image Resizing.

### 4.3 Other Images

| Image | Type | Loading | Dimensions Set | Notes |
|-------|------|---------|----------------|-------|
| 4 feature SVG icons | Direct Sanity CDN | NOT SET (eager) | Class-based (`h-24 w-24`) | **Preloaded** via `<link rel="preload">` -- good |
| Software logo SVG | Direct Sanity CDN | lazy | width=176 height=40 | Fine |
| 4 blog post thumbnails | `/_next/image` proxy | lazy | `data-nimg="fill"` | Sizes attribute set to `64px` -- correctly sized for thumbnails |

### 4.4 Image Optimization Recommendations

The first carousel slide image should use `loading="eager"` and `fetchPriority="high"` since it is the LCP element. Additionally, this image should be preloaded:

```html
<link rel="preload" as="image" href="/_next/image?url=...hero.jpg&w=1920&q=75" fetchpriority="high">
```

For all images, Sanity's image transformation API should be used directly instead of `/_next/image`:

```
https://cdn.sanity.io/images/71bjoiw9/production/{id}-1920x1080.jpg?w=1920&q=75&fm=webp&auto=format
```

This gives WebP/AVIF support, proper resizing, and CDN caching -- all of which `/_next/image` on Cloudflare fails to provide.

---

## 5. Font Loading

| Font File | Weight | Size | Strategy |
|-----------|--------|------|----------|
| TTHoves_Regular_subset-s.p.86ef6e34.woff2 | 400 | 9.8 KB | Preloaded |
| TTHoves_Medium_subset-s.p.10dd6624.woff2 | 500 | 9.9 KB | Preloaded |
| TTHoves_DemiBold_subset-s.p.faf65f46.woff2 | 600 | 10.1 KB | Preloaded |
| **Total** | -- | **29.8 KB** | -- |

**Assessment: Well-optimized.**

- All 3 fonts are preloaded via `<link rel="preload" as="font" crossorigin>`
- Fonts are subsetted (indicated by `subset` in filename) -- ~10 KB each is excellent for woff2
- `font-display: swap` is set, preventing invisible text (FOIT)
- A fallback `@font-face` declaration uses `local(Arial)` with precise metric overrides (`ascent-override: 94.46%`, `descent-override: 21.1%`, `line-gap-override: 2.81%`, `size-adjust: 99.51%`) to minimize CLS from font swap

This is one of the best-implemented aspects of the site's performance.

---

## 6. Caching Strategy

### 6.1 Cache Headers

| Resource Type | Cache-Control | CF Cache Status | Effective TTL |
|---------------|---------------|-----------------|---------------|
| HTML (`/`) | `public, s-maxage=2592000, stale-while-revalidate=2592000` | HIT (age: 133-295s) | 30 days CDN + 30 days stale |
| JS chunks (`/_next/static/...`) | `public, max-age=0, must-revalidate` | REVALIDATED | **0 seconds** -- revalidates every request |
| CSS chunks | `public, max-age=0, must-revalidate` | REVALIDATED | **0 seconds** |
| Font files (woff2) | `public, max-age=0, must-revalidate` | REVALIDATED | **0 seconds** |
| Sanity CDN images | `public, max-age=31536000, s-maxage=2592000` | -- (Sanity CDN) | 1 year browser + 30 days CDN |

### 6.2 Critical Caching Problem

**All static assets under `/_next/static/` have `max-age=0, must-revalidate`.** This is a major performance problem for repeat visitors. These are content-hashed files (e.g., `8ea59ff6188080ee.js`) that will never change -- their hash IS their version. They should have immutable caching:

```
cache-control: public, max-age=31536000, immutable
```

The current configuration forces the browser to revalidate every static asset on every page load, even though the files are fingerprinted and will never change. This adds latency for every return visit and wastes CDN resources.

**Root cause:** This is likely a Cloudflare or Next.js deployment configuration issue. The default Next.js configuration does set long-lived caching for `/_next/static/` paths, but something in the Cloudflare deployment is overriding it.

### 6.3 Other Header Issues

- `strict-transport-security: max-age=0` -- HSTS is effectively **disabled**. The `max-age=0` means browsers will not enforce HTTPS on subsequent visits. This should be `max-age=31536000` (1 year) minimum.
- The HTML page uses `x-nextjs-stale-time: 300` (5 minutes) which is the client-side router cache TTL for Next.js prefetch.
- Cloudflare Speculation Rules are enabled with conservative prefetching (`"eagerness": "conservative"`), which is appropriate.

---

## 7. Resource Hints

### 7.1 Current Hints

| Hint Type | Target | Assessment |
|-----------|--------|------------|
| `preconnect` | `https://71bjoiw9.api.sanity.io` | Good -- establishes early connection to CMS API |
| `dns-prefetch` | `https://71bjoiw9.api.sanity.io` | Redundant with preconnect above (preconnect implies dns-prefetch) |
| `preload font` | 3 TTHoves woff2 files | Excellent |
| `preload image` | 4 SVG feature icons on Sanity CDN | Good for below-fold icons, but **missing preload for hero image** |
| `preload script` | 11 JS chunks (1 high priority + 10 low priority) | Counterproductive due to Rocket Loader |
| `preload script` | Google Tag Manager, LinkedIn, HubSpot | **Bad** -- preloading third-party analytics competes with critical resources |

### 7.2 Missing Hints

| Missing Hint | Recommendation |
|--------------|----------------|
| Hero image preload | `<link rel="preload" as="image" href="[hero-image-url]" fetchpriority="high">` |
| Preconnect to Google Tag Manager | `<link rel="preconnect" href="https://www.googletagmanager.com">` |
| Preconnect to Sanity CDN images | `<link rel="preconnect" href="https://cdn.sanity.io">` (images are fetched from here) |

---

## 8. Third-Party Script Impact

| Script | Size (raw) | Load Strategy | Impact |
|--------|-----------|---------------|--------|
| Google Tag Manager | 534.7 KB | **Preloaded** + Rocket Loader deferred | HIGH -- largest third-party script, preloaded which prioritizes it over page resources |
| LinkedIn Insight | 53.6 KB | **Preloaded** + Rocket Loader deferred | MODERATE |
| HubSpot | 2.5 KB loader -> loads `banner.js` + `analytics.js` | **Preloaded** + Rocket Loader deferred | MODERATE -- cascading loads (loader fetches 2 more scripts) |
| Rocket Loader | 12.3 KB | `defer` (native) | HIGH -- orchestrates all other scripts |
| Cloudflare NEL/reporting | Headers only | Passive | LOW |
| Cloudflare Speculation Rules | `/cdn-cgi/speculation` | Header-driven | LOW -- conservative prefetch is fine |
| Cloudflare hidden link | `cdn-cgi/content?id=...` | Hidden `<a>` tag (bot verification) | NONE |

**Total third-party JS: 603.1 KB uncompressed**

The `<link rel="preload">` hints for Google Tag Manager, LinkedIn, and HubSpot are **counterproductive**. They force the browser to prioritize downloading analytics scripts before the page's own resources are fully loaded. These should be loaded asynchronously after the page is interactive.

---

## 9. Additional Issues

### 9.1 Canonical URL

```html
<link rel="canonical" href="https://maxgeo.com//"/>
```

The canonical URL contains a **double trailing slash** (`//`). This is an SEO issue -- search engines may interpret this as a different URL from `https://maxgeo.com/`, leading to duplicate content signals.

### 9.2 HTML Document Size

The HTML document is **158.1 KB** (23.2 KB compressed), which is large for a homepage. Breakdown:

- RSC (React Server Component) payload: 35.4 KB
- Inline SVGs: 44.3 KB (56 SVGs)
- Inline script content: 35.8 KB
- Structural HTML: ~42.6 KB

The 56 inline SVGs (44.3 KB) are significant. For SVGs used across multiple pages, these could be moved to a shared sprite sheet or loaded as external files.

### 9.3 noModule Polyfill

The file `a6dad97d9634a72d.js` (110 KB) has the `noModule` attribute, meaning it is intended only for legacy browsers that do not support ES modules. However, Rocket Loader has rewritten its type attribute, which may cause it to execute in modern browsers as well, adding 110 KB of unnecessary JavaScript.

---

## 10. Prioritized Recommendations

### P0 -- Critical (estimated 1-3s LCP improvement)

#### 1. Disable Cloudflare Rocket Loader

**Expected impact: HIGH (LCP + INP)**

Rocket Loader is fundamentally incompatible with Next.js. It rewrites all 34 script tags, breaking the browser's native preload scanner and Next.js's hydration strategy. Disable it in:

Cloudflare Dashboard -> Speed -> Optimization -> Content Optimization -> Rocket Loader -> OFF

This single change will likely produce the largest performance improvement. Next.js already optimizes its own script loading with `async` attributes and `<link rel="preload">` hints.

#### 2. Fix Hero Image Loading Strategy

**Expected impact: HIGH (LCP -500ms to -2s)**

The first visible carousel slide must not be lazy-loaded. In the hero component:

```jsx
// For the FIRST slide only:
<Image
  src={heroSlides[0].image}
  loading="eager"
  priority={true}        // Next.js: adds fetchPriority="high" + preload hint
  sizes="100vw"
  alt={heroSlides[0].alt}
/>

// For slides 2, 3, 4:
<Image
  src={heroSlides[i].image}
  loading="lazy"
  sizes="100vw"
  alt={heroSlides[i].alt}
/>
```

The `priority` prop on Next.js `<Image>` sets `fetchPriority="high"` and generates a `<link rel="preload">` in the document head.

#### 3. Fix Next.js Image Optimization on Cloudflare

**Expected impact: HIGH (LCP + bandwidth)**

The `/_next/image` endpoint is acting as a pass-through proxy -- no format conversion, no resizing. Two options:

**Option A (recommended): Use Sanity's image CDN directly**

Replace the Next.js image loader with a custom Sanity loader in `next.config.js`:

```js
// next.config.js
module.exports = {
  images: {
    loader: 'custom',
    loaderFile: './lib/sanity-image-loader.js',
  },
};
```

```js
// lib/sanity-image-loader.js
export default function sanityImageLoader({ src, width, quality }) {
  const url = new URL(src);
  url.searchParams.set('w', width.toString());
  url.searchParams.set('q', (quality || 75).toString());
  url.searchParams.set('auto', 'format'); // Serves WebP/AVIF based on Accept header
  url.searchParams.set('fit', 'max');
  return url.toString();
}
```

This serves images directly from Sanity's CDN with automatic WebP/AVIF conversion, proper resizing, and 1-year browser caching.

**Option B: Use Cloudflare Image Resizing**

If Cloudflare Image Resizing is enabled on the plan, configure it as the image loader:

```js
// lib/cloudflare-image-loader.js
export default function cloudflareImageLoader({ src, width, quality }) {
  return `/cdn-cgi/image/width=${width},quality=${quality || 75},format=auto/${src}`;
}
```

### P1 -- High Priority (estimated 200-500ms improvement)

#### 4. Tree-Shake Lucide Icons

**Expected impact: -450 KB JS (-100 KB transferred)**

The current bundle ships all 627 Lucide icons (469 KB). Ensure imports use named imports:

```jsx
// BAD -- imports entire library
import { icons } from 'lucide-react';

// GOOD -- tree-shakeable
import { ArrowRight, Check, Menu, X } from 'lucide-react';
```

If using dynamic icon resolution from Sanity CMS data, consider a mapping approach:

```jsx
import { ArrowRight, Check, Menu, X, ChevronDown } from 'lucide-react';

const iconMap = {
  'arrow-right': ArrowRight,
  'check': Check,
  'menu': Menu,
  'x': X,
  'chevron-down': ChevronDown,
};
```

With Turbopack, verify that the `sideEffects: false` field in Lucide's `package.json` is being respected. If tree-shaking still fails, the `@lucide/lab` barrel-file issue may be at play -- try importing from `lucide-react/dist/esm/icons/[icon-name]`.

#### 5. Replace or Reduce Framer Motion

**Expected impact: -100 KB JS (-30 KB transferred)**

The site uses Framer Motion primarily for the hero carousel animation. Options:

- **Replace with CSS animations:** The carousel slide transitions and entrance animations can be pure CSS (`@keyframes`, `transition`, `animation`). This eliminates the 120 KB runtime entirely.
- **Use the `motion` package:** Framer Motion's lightweight subset (`motion`) is ~18 KB. It covers most animation use cases. Install `motion` and change imports:

```jsx
// Before
import { motion, AnimatePresence } from 'framer-motion';

// After
import { motion, AnimatePresence } from 'motion/react';
```

#### 6. Remove Third-Party Script Preloads

**Expected impact: MODERATE (LCP improvement)**

Remove preload hints for analytics scripts:

```html
<!-- REMOVE these -->
<link rel="preload" href="https://www.googletagmanager.com/gtag/js?id=G-N3TVZENZR7" as="script"/>
<link rel="preload" href="https://snap.licdn.com/li.lms-analytics/insight.min.js" as="script"/>
<link rel="preload" href="//js.hs-scripts.com/8707562.js" as="script"/>
```

Instead, load these scripts after the page is interactive using `next/script` with `strategy="afterInteractive"` or `strategy="lazyOnload"`:

```jsx
import Script from 'next/script';

<Script
  src="https://www.googletagmanager.com/gtag/js?id=G-N3TVZENZR7"
  strategy="afterInteractive"
/>
```

### P2 -- Medium Priority

#### 7. Fix Static Asset Caching

**Expected impact: Improved repeat-visit performance**

All `/_next/static/` assets currently have `max-age=0, must-revalidate`. These are content-hashed files. Configure immutable caching in your Cloudflare deployment:

**Option A: Cloudflare Page Rule or Cache Rule**

Create a cache rule for `maxgeo.com/_next/static/*`:
- Edge TTL: 1 year
- Browser TTL: 1 year
- Cache-Control header override: `public, max-age=31536000, immutable`

**Option B: In `next.config.js` headers**

```js
async headers() {
  return [
    {
      source: '/_next/static/:path*',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
      ],
    },
  ];
}
```

#### 8. Add Missing Preconnect Hints

```html
<link rel="preconnect" href="https://cdn.sanity.io" crossorigin>
```

This establishes an early connection to the Sanity image CDN, reducing connection setup time for hero and feature images.

#### 9. Fix HSTS Header

`strict-transport-security: max-age=0` effectively disables HSTS. Set it to:

```
strict-transport-security: max-age=31536000; includeSubDomains; preload
```

This is both a security improvement and a performance improvement (eliminates HTTP-to-HTTPS redirects on repeat visits).

#### 10. Fix Canonical URL

Change from `https://maxgeo.com//` (double slash) to `https://maxgeo.com/` in the Sanity CMS page configuration or the canonical URL generation logic.

### P3 -- Low Priority (nice-to-have)

#### 11. Reduce Inline SVG Count

56 inline SVGs (44.3 KB) in the HTML adds to document size. For common icons used across pages, consider an SVG sprite sheet loaded as an external cacheable file:

```html
<svg><use href="/sprites.svg#icon-name"/></svg>
```

#### 12. Remove the noModule Polyfill

The `a6dad97d9634a72d.js` polyfill (110 KB) targets legacy browsers. If your analytics confirm <1% IE11/legacy traffic, remove it by configuring the browserslist target to modern browsers only.

#### 13. Consider Reducing CSS Variable Count

536 CSS variables may indicate that the full Tailwind configuration is being compiled. Review whether all design tokens are used and prune unused ones.

---

## Appendix: Resource Inventory Summary

### Transfer Sizes (Brotli compressed)

| Category | Uncompressed | Compressed | Reduction |
|----------|-------------|------------|-----------|
| HTML | 158.1 KB | 23.2 KB | 85% |
| First-party JS (script tags) | 947.7 KB | ~280 KB est. | ~70% |
| First-party JS (preloaded) | 652.7 KB | ~200 KB est. | ~69% |
| Third-party JS | 603.1 KB | ~180 KB est. | ~70% |
| CSS | 135.2 KB | ~17 KB | 87% |
| Fonts (woff2) | 29.8 KB | 29.8 KB | 0% (already compressed) |
| Hero image | 87.8 KB | 87.8 KB | 0% (binary) |
| **Total** | **2,614 KB** | **~818 KB** | **~69%** |

### Key Compressed Measurements (verified)

| Resource | Compressed Size |
|----------|----------------|
| HTML document | 23.2 KB |
| Lucide Icons chunk | 113.9 KB |
| React DOM | 62.2 KB |
| Framer Motion | 40.1 KB |
| Polyfills (noModule) | 39.7 KB |
| Next.js runtime | 28.4 KB |
| Main CSS | 16.4 KB |

### Response Headers Snapshot

```
HTTP/2 200
cache-control: public, s-maxage=2592000, stale-while-revalidate=2592000
content-encoding: br
vary: RSC, Next-Router-State-Tree, Next-Router-Prefetch, accept-encoding
x-nextjs-cache: MISS
x-nextjs-prerender: 1
x-nextjs-stale-time: 300
cf-cache-status: HIT
strict-transport-security: max-age=0; includeSubDomains; preload
server: cloudflare
```

---

*Audit performed via source HTML analysis and resource measurement. CrUX field data and Lighthouse lab scores were unavailable due to PageSpeed Insights API rate limiting. Findings are based on direct resource inspection and established performance engineering principles.*

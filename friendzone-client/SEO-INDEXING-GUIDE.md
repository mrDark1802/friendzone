# Search Engine Indexing & SEO Setup Guide for FriendZone

This document outlines the SEO files created, their configuration, and step-by-step instructions for submitting your website to major search engines (Google, Bing, Yahoo, DuckDuckGo, Yandex).

---

## 📁 Created SEO Files & Accessible Endpoints

| File Path | Accessible URL Endpoint | Purpose |
| :--- | :--- | :--- |
| [`public/robots.txt`](file:///home/mr-dark/Disks/e/Projects/friendzone/friendzone-client/public/robots.txt) | `https://yourdomain.com/robots.txt` | Instructs search engine crawlers which public pages to index and disallows private dashboard routes. |
| [`public/sitemap.xml`](file:///home/mr-dark/Disks/e/Projects/friendzone/friendzone-client/public/sitemap.xml) | `https://yourdomain.com/sitemap.xml` | XML Sitemap containing all canonical public URLs with modification dates and priorities. |
| [`public/site.webmanifest`](file:///home/mr-dark/Disks/e/Projects/friendzone/friendzone-client/public/site.webmanifest) | `https://yourdomain.com/site.webmanifest` | Web App Manifest for mobile indexers, PWA discovery, theme colors, and icons. |
| [`index.html`](file:///home/mr-dark/Disks/e/Projects/friendzone/friendzone-client/index.html) | `https://yourdomain.com/` | Primary Meta Tags, Open Graph (Facebook/LinkedIn/Slack/Discord), Twitter Cards, and Schema.org JSON-LD structured data. |
| [`src/components/SEO.tsx`](file:///home/mr-dark/Disks/e/Projects/friendzone/friendzone-client/src/components/SEO.tsx) | Dynamic | React component updating page titles, canonical tags, and meta descriptions per route change. |

---

## 🔍 Step-by-Step Search Engine Submission & Verification

### 1. Submit to Google Search Console (GSC)
1. Go to [Google Search Console](https://search.google.com/search-console).
2. Add your domain property (`https://yourdomain.com`).
3. Verify domain ownership:
   - **DNS TXT Record method** (Recommended for custom domains), OR
   - **HTML Meta Tag method**: Copy the verification string from GSC and paste it into `index.html`:
     ```html
     <meta name="google-site-verification" content="YOUR_GOOGLE_CODE" />
     ```
4. Once verified, navigate to **Sitemaps** in the left menu.
5. Enter `sitemap.xml` in the "Add a new sitemap" input and click **Submit**.
6. Google will queue and index all listed public pages (`/`, `/features`, `/solutions`, `/community`, `/pricing`, `/security`, `/about`, `/privacy`, `/terms`, `/cookies`, `/signin`, `/signup`).

---

### 2. Submit to Bing Webmaster Tools
1. Go to [Bing Webmaster Tools](https://www.bing.com/webmasters).
2. Sign in and select **Import from Google Search Console** (fastest), or manually add `https://yourdomain.com`.
3. Go to **Sitemaps** -> **Submit Sitemap**.
4. Enter `https://yourdomain.com/sitemap.xml` and click **Submit**.
5. *Bonus*: Submitting to Bing also indexes your site on **Yahoo!** and **DuckDuckGo**.

---

### 3. Verify & Test Indexing Readiness

#### Test Robots.txt & Sitemap
Verify that your deployed site returns a `200 OK` status for the following URLs:
```bash
curl -I https://yourdomain.com/robots.txt
curl -I https://yourdomain.com/sitemap.xml
curl -I https://yourdomain.com/site.webmanifest
```

#### Test Structured Data (Rich Results)
Validate your Schema.org JSON-LD markup:
- Visit [Google Rich Results Test](https://search.google.com/test/rich-results) or [Schema Markup Validator](https://validator.schema.org/).
- Enter `https://yourdomain.com/` to verify that `WebSite`, `Organization`, and `SoftwareApplication` entities are detected without errors.

#### Test Open Graph & Social Cards
Verify social preview links:
- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- [Twitter / X Card Validator](https://cards-dev.twitter.com/validator)
- [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)

---

## 🛠 Disallowed Routes (Privacy & Security)

The following routes are explicitly set to `Disallow` in `robots.txt` and flagged with `noindex` so search engine crawlers will **not** attempt to index private or authenticated user data:
- `/dashboard*`
- `/chats*`
- `/contacts*`
- `/requests*`
- `/groups*`
- `/profile*`
- `/notifications*`
- `/settings*`
- `/verify-email*`
- `/reset-password*`

---

## ⚡ Troubleshooting: "URL not allowed (12 instances)"

If Google Search Console displays the error:
`This url is not allowed for a Sitemap at this location`

### Cause
Search Console requires the **exact base domain and protocol (https/http, www/non-www, custom domain)** in `sitemap.xml` to match your registered property URL. If your property is `https://www.friendzone.com/` or `https://friendzone-client.vercel.app/`, but your `sitemap.xml` contains `https://friendzone.com/`, Google will flag all 12 URLs as not allowed.

### Solution
1. Update the domain across all SEO files using the CLI helper:
   ```bash
   npm run update-domain -- https://YOUR-EXACT-DOMAIN.COM
   ```
   *(e.g., `npm run update-domain -- https://www.friendzone.com` or `npm run update-domain -- https://your-app.vercel.app`)*

2. Re-deploy your website (`npm run build`).

3. In Google Search Console -> **Sitemaps**, delete the old failed sitemap submission, re-enter `sitemap.xml`, and click **Submit**. Status will update to **Success**!


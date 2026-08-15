import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, "..")

// Get target domain from CLI arg or ENV variables
let targetDomain = process.argv[2] || process.env.SITE_URL || process.env.VITE_SITE_URL

if (process.env.VERCEL_URL && !targetDomain) {
  targetDomain = `https://${process.env.VERCEL_URL}`
}

if (!targetDomain) {
  console.log("Usage: node scripts/update-domain.js <https://your-domain.com>")
  console.log("Or set SITE_URL environment variable.")
  process.exit(1)
}

// Clean domain string
targetDomain = targetDomain.trim().replace(/\/+$/, "")
if (!/^https?:\/\//i.test(targetDomain)) {
  targetDomain = `https://${targetDomain}`
}

console.log(`Updating SEO files with target domain: ${targetDomain}`)

const routes = [
  { path: "", priority: "1.0", changefreq: "daily" },
  { path: "/features", priority: "0.9", changefreq: "weekly" },
  { path: "/solutions", priority: "0.9", changefreq: "weekly" },
  { path: "/community", priority: "0.8", changefreq: "weekly" },
  { path: "/pricing", priority: "0.8", changefreq: "weekly" },
  { path: "/security", priority: "0.7", changefreq: "monthly" },
  { path: "/about", priority: "0.7", changefreq: "monthly" },
  { path: "/signin", priority: "0.6", changefreq: "monthly" },
  { path: "/signup", priority: "0.6", changefreq: "monthly" },
  { path: "/privacy", priority: "0.5", changefreq: "monthly" },
  { path: "/terms", priority: "0.5", changefreq: "monthly" },
  { path: "/cookies", priority: "0.5", changefreq: "monthly" },
]

const today = new Date().toISOString().split("T")[0]

// 1. Update sitemap.xml
const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
                            http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${routes
  .map(
    (r) => `  <url>
    <loc>${targetDomain}${r.path}${r.path === "" ? "/" : ""}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`
  )
  .join("\n\n")}
</urlset>
`

const sitemapPath = path.join(rootDir, "public", "sitemap.xml")
fs.writeFileSync(sitemapPath, sitemapContent, "utf-8")
console.log(`Updated ${sitemapPath}`)

// 2. Update robots.txt
const robotsContent = `# FriendZone Robots.txt
User-agent: *
Allow: /
Allow: /features
Allow: /solutions
Allow: /community
Allow: /pricing
Allow: /security
Allow: /about
Allow: /privacy
Allow: /terms
Allow: /cookies
Allow: /signin
Allow: /signup

Disallow: /dashboard
Disallow: /dashboard/*
Disallow: /chats
Disallow: /chats/*
Disallow: /contacts
Disallow: /contacts/*
Disallow: /requests
Disallow: /requests/*
Disallow: /groups
Disallow: /groups/*
Disallow: /profile
Disallow: /profile/*
Disallow: /notifications
Disallow: /notifications/*
Disallow: /settings
Disallow: /settings/*
Disallow: /verify-email
Disallow: /verify-email/*
Disallow: /forgot-password
Disallow: /forgot-password/*
Disallow: /reset-password
Disallow: /reset-password/*

Host: ${targetDomain}
Sitemap: ${targetDomain}/sitemap.xml
`

const robotsPath = path.join(rootDir, "public", "robots.txt")
fs.writeFileSync(robotsPath, robotsContent, "utf-8")
console.log(`Updated ${robotsPath}`)

// 3. Update SEO.tsx BASE_URL
const seoComponentPath = path.join(rootDir, "src", "components", "SEO.tsx")
if (fs.existsSync(seoComponentPath)) {
  let seoCode = fs.readFileSync(seoComponentPath, "utf-8")
  seoCode = seoCode.replace(
    /const BASE_URL = ".*?"/,
    `const BASE_URL = "${targetDomain}"`
  )
  fs.writeFileSync(seoComponentPath, seoCode, "utf-8")
  console.log(`Updated ${seoComponentPath}`)
}

// 4. Update index.html
const indexHtmlPath = path.join(rootDir, "index.html")
if (fs.existsSync(indexHtmlPath)) {
  let html = fs.readFileSync(indexHtmlPath, "utf-8")
  html = html.replace(/https:\/\/friendzone\.com/g, targetDomain)
  fs.writeFileSync(indexHtmlPath, html, "utf-8")
  console.log(`Updated ${indexHtmlPath}`)
}

console.log("Domain update complete!")

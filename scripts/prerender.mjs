import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, 'public');
const SITEMAP = path.join(PUBLIC_DIR, 'sitemap.xml');
const DIST = path.join(ROOT, 'dist');
const CLIENT_INDEX = path.join(DIST, 'index.html');
const BLOG_DIR = path.join(ROOT, 'src', 'landing page', 'components', 'blog', 'blogs');
const ROUTE_META_PATH = path.join(ROOT, 'src', 'landing page', 'route-meta.js');
const BASE_URL = 'https://inzighted.com';

function toAbsolute(u) {
  if (!u) return u;
  try {
    if (/^https?:\/\//i.test(u)) return u;
    // preserve leading slash and encode the path portion
    return BASE_URL + encodeURI(u);
  } catch (e) {
    return BASE_URL + u;
  }
}

function parseSitemap(xml) {
  // very small xml parser to extract <loc> values
  const matches = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)];
  return matches.map((m) => {
    const url = m[1].trim();
    try {
      const u = new URL(url);
      return u.pathname.replace(/\/$/, '') || '/';
    } catch (e) {
      return null;
    }
  }).filter(Boolean);
}

async function ensureDist() {
  try {
    await fs.access(DIST);
  } catch (e) {
    throw new Error('Build output `dist` not found. Run `npm run build` first.');
  }
}

async function loadServerRenderer() {
  // Vite SSR build will emit an SSR entry in dist/server/entry-server.js or similar.
  // We'll try common locations used by Vite: dist/server/entry-server.js or dist/entry-server.js
  const candidates = [
    path.join(DIST, 'server', 'entry-server.js'),
    path.join(DIST, 'entry-server.js'),
  ];

  for (const c of candidates) {
    try {
      await fs.access(c);
      // import via file:// URL
      const mod = await import(pathToFileURL(c).href);
      if (mod && (mod.render || mod.default)) return mod;
    } catch (e) {
      // continue
    }
  }
  throw new Error('Could not find SSR entry in `dist`. Ensure you ran `vite build --ssr src/entry-server.jsx` and the SSR bundle was emitted to `dist`.');
}

async function readTemplate() {
  // Try reading the Vite-generated template in dist. This may occasionally
  // race with other operations on some filesystems, so retry briefly.
  const attempts = 20;
  const delay = (ms) => new Promise((res) => setTimeout(res, ms));
  for (let i = 0; i < attempts; i++) {
    try {
      const raw = await fs.readFile(CLIENT_INDEX, 'utf8');
      return raw;
    } catch (err) {
      // If not found, wait a bit and retry; otherwise rethrow on unexpected errors
      if (err && err.code === 'ENOENT') {
        if (i < attempts - 1) await delay(250);
        else break;
      } else {
        throw err;
      }
    }
  }

  // Fallback: if dist/index.html is not present, try the project root index.html
  const fallback = path.join(ROOT, 'index.html');
  // Before falling back, show the contents of the dist directory to help debugging
  try {
    const children = await fs.readdir(DIST);
    console.warn(`Warning: ${CLIENT_INDEX} not found. dist contains: ${children.join(', ')}`);
  } catch (e) {
    console.warn(`Warning: failed to list dist directory: ${e && e.message}`);
  }

  try {
    const raw = await fs.readFile(fallback, 'utf8');
    console.warn('Warning: `dist/index.html` not found, using project root `index.html` as fallback for prerendering. This may produce incorrect script tags.');
    return raw;
  } catch (err) {
    // rethrow a clearer error
    throw new Error(`Could not read template. Tried ${CLIENT_INDEX} and ${fallback}. Original error: ${err && err.message}`);
  }
}

function emitHtmlForRoute(route, template, renderedHtml) {
  // Inject rendered HTML into the template's #root div
  // naive injection: replace <div id="root"></div> with rendered markup
  const placeholder = '<div id="root"></div>';
  if (template.includes(placeholder)) {
    return template.replace(placeholder, `<div id="root">${renderedHtml}</div>`);
  }
  // fallback: inject before closing body
  return template.replace(/<\/body>/i, `\n<div id="root">${renderedHtml}</div>\n</body>`);
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function loadBlogMeta() {
  const map = new Map();
  // try to import index.js like generate-sitemap
  try {
    const indexPath = path.join(BLOG_DIR, 'index.js');
    await fs.access(indexPath);
    const mod = await import(pathToFileURL(indexPath).href);
    const list = mod.default || mod.blogIndex || [];
    if (Array.isArray(list)) {
      for (const entry of list) {
        const meta = entry.meta || {};
        const slugFromPath = (entry.path || '').replace(/.*[\\/]/, '').replace(/\.(js|jsx|md|mdx)$/i, '');
        const slug = meta.slug || slugFromPath;
        if (slug) map.set(slug, meta);
      }
      return map;
    }
  } catch (e) {
    // fallback to scanning files
  }

  try {
    const files = await fs.readdir(BLOG_DIR);
    for (const f of files) {
      if (/^index\.(js|jsx|md|mdx)$/i.test(f)) continue;
      if (!/\.(js|jsx|md|mdx)$/i.test(f)) continue;
      const full = path.join(BLOG_DIR, f);
      const content = await fs.readFile(full, 'utf8');
      const metaMatch = content.match(/export\s+const\s+meta\s*=\s*\{([\s\S]*?)\}\s*;/m);
      let slug = f.replace(/\.(js|jsx|md|mdx)$/i, '');
      let meta = {};
      if (metaMatch) {
        const body = metaMatch[1];
        const pick = (key) => {
          const re = new RegExp(key + '\\s*:\\s*(?:`([^`]*)`|"([^\"]*)"|\'([^\']*)\')');
          const m = body.match(re);
          return m ? (m[1] || m[2] || m[3]) : undefined;
        };
        const slugVal = pick('slug');
        const titleVal = pick('title');
        const descVal = pick('description');
        const imgVal = pick('image');
        const dateVal = pick('date');
        if (slugVal) slug = slugVal;
        meta = { slug, title: titleVal, description: descVal, image: imgVal, date: dateVal };
      }
      map.set(slug, meta);
    }
  } catch (e) {
    // ignore
  }
  return map;
}

function buildMetaTags(route, meta) {
  const tags = [];
  const url = route === '/' ? `${BASE_URL}/` : `${BASE_URL}${route}`;
  // Avoid appending the brand when the title already contains it (prevents duplication)
  const BRAND = 'InzightEd';
  const defaultHomeTitle = 'InzightEd — AI-powered evaluation for modern education';
  const defaultOtherTitle = 'InzightEd';
  const rawTitle = meta && meta.title ? meta.title : (route === '/' ? defaultHomeTitle : defaultOtherTitle);
  const brandRegex = new RegExp('\\b' + BRAND.replace(/["'\\/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\b', 'i');
  const title = brandRegex.test(rawTitle) ? rawTitle : `${rawTitle} — ${BRAND}`;
  const description = meta && meta.description ? meta.description : (route === '/' ? 'InzightEd provides AI-powered evaluation and insights for institutions and students.' : 'InzightEd');
  // remove any existing description/title tags later by regex
  tags.push(`<title>${escapeHtml(title)}</title>`);
  tags.push(`<meta name="description" content="${escapeHtml(description)}" />`);
  tags.push(`<link rel="canonical" href="${escapeHtml(url)}" />`);
  tags.push(`<meta name="robots" content="index, follow" />`);
  // Open Graph
  tags.push(`<meta property="og:type" content="${meta && meta.date ? 'article' : 'website'}" />`);
  tags.push(`<meta property="og:title" content="${escapeHtml(title)}" />`);
  tags.push(`<meta property="og:description" content="${escapeHtml(description)}" />`);
  tags.push(`<meta property="og:url" content="${escapeHtml(url)}" />`);
  tags.push(`<meta property="og:site_name" content="${escapeHtml(BRAND)}" />`);
  if (meta && meta.image) tags.push(`<meta property="og:image" content="${escapeHtml(toAbsolute(meta.image))}" />`);
  // Twitter Cards (add full set for SSR parity; many scrapers do not execute JS)
  tags.push(`<meta name="twitter:card" content="summary_large_image" />`);
  tags.push(`<meta name="twitter:title" content="${escapeHtml(title)}" />`);
  tags.push(`<meta name="twitter:description" content="${escapeHtml(description)}" />`);
  if (meta && meta.image) tags.push(`<meta name="twitter:image" content="${escapeHtml(toAbsolute(meta.image))}" />`);

  // JSON-LD for article if date exists
  if (meta && meta.date) {
    const ld = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": meta.title || title,
      "description": meta.description || description,
      "datePublished": meta.date,
      "mainEntityOfPage": url
    };
  if (meta.image) ld.image = toAbsolute(meta.image);
    tags.push(`<script type="application/ld+json">${JSON.stringify(ld)}</script>`);
  }

  return tags.join('\n  ');
}

function buildExtraJsonLd(meta) {
  const blocks = [];
  if (!meta) return '';
  if (meta.organization) {
    const org = {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: meta.organization.name,
      url: meta.organization.url,
      logo: meta.organization.logo ? toAbsolute(meta.organization.logo) : undefined,
      sameAs: meta.organization.sameAs || undefined
    };
    blocks.push(`<script type="application/ld+json">${JSON.stringify(org)}</script>`);
  }
  if (meta.video) {
    const v = {
      "@context": "https://schema.org",
      "@type": "VideoObject",
      name: meta.video.name,
      description: meta.video.description,
      thumbnailUrl: meta.video.thumbnailUrl ? toAbsolute(meta.video.thumbnailUrl) : undefined,
      uploadDate: meta.video.uploadDate,
      duration: meta.video.duration,
      contentUrl: meta.video.contentUrl,
      embedUrl: meta.video.embedUrl
    };
    blocks.push(`<script type="application/ld+json">${JSON.stringify(v)}</script>`);
  }
  // FAQPage
  if (meta.faq && Array.isArray(meta.faq) && meta.faq.length > 0) {
    const faqLd = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: meta.faq.map((q) => ({
        "@type": "Question",
        name: q.question || q.q || q.title || '',
        acceptedAnswer: {
          "@type": "Answer",
          text: q.answer || q.a || q.answerText || ''
        }
      }))
    };
    blocks.push(`<script type="application/ld+json">${JSON.stringify(faqLd)}</script>`);
  }

  // ItemList for features
  if (meta.features && Array.isArray(meta.features) && meta.features.length > 0) {
    const itemList = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: meta.features.map((f, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: typeof f === 'string' ? f : (f.name || f.title || f.text || '')
      }))
    };
    blocks.push(`<script type="application/ld+json">${JSON.stringify(itemList)}</script>`);
  }

  // HowTo
  if (meta.howTo && (meta.howTo.name || Array.isArray(meta.howTo.steps))) {
    const steps = Array.isArray(meta.howTo.steps)
      ? meta.howTo.steps.map((s, idx) => ({
        "@type": "HowToStep",
        name: s.title || s.name || `Step ${idx + 1}`,
        text: s.text || s.description || s.summary || ''
      }))
      : [];
    const howToLd = {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: meta.howTo.name || '',
      description: meta.howTo.description || undefined,
      step: steps
    };
    blocks.push(`<script type="application/ld+json">${JSON.stringify(howToLd)}</script>`);
  }

  // Reviews / AggregateRating
  if (meta.reviews && (meta.reviews.ratingValue || meta.reviews.reviewCount || Array.isArray(meta.reviews.sampleReviews))) {
    const agg = {};
    if (meta.reviews.ratingValue) agg.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: String(meta.reviews.ratingValue),
      reviewCount: meta.reviews.reviewCount ? Number(meta.reviews.reviewCount) : undefined
    };

    const baseReviewLd = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: meta.title || meta.reviews.productName || undefined,
      ...agg
    };

    blocks.push(`<script type="application/ld+json">${JSON.stringify(baseReviewLd)}</script>`);

    if (Array.isArray(meta.reviews.sampleReviews) && meta.reviews.sampleReviews.length > 0) {
      const reviewsLd = {
        "@context": "https://schema.org",
        "@type": "Review",
        itemReviewed: { "@type": "Product", name: meta.title || meta.reviews.productName || undefined },
        reviewBody: meta.reviews.sampleReviews[0].reviewBody || meta.reviews.sampleReviews[0].body || undefined,
        author: meta.reviews.sampleReviews[0].author || meta.reviews.sampleReviews[0].name || undefined,
        reviewRating: meta.reviews.sampleReviews[0].rating ? { "@type": "Rating", ratingValue: String(meta.reviews.sampleReviews[0].rating) } : undefined,
        datePublished: meta.reviews.sampleReviews[0].datePublished || undefined
      };
      blocks.push(`<script type="application/ld+json">${JSON.stringify(reviewsLd)}</script>`);
    }
  }

  return blocks.join('\n  ');
}

function injectMetaIntoTemplate(template, route, meta) {
  // remove existing <title> and meta description if present
  let t = template.replace(/<title>[\s\S]*?<\/title>/i, '');
  t = t.replace(/<meta\s+name=["']description["'][^>]*>?/i, '');
  const metaBlock = buildMetaTags(route, meta);
  return t.replace(/<\/head>/i, `  ${metaBlock}\n</head>`);
}

async function writeRouteFile(routePath, content) {
  // routePath is a path like '/' or '/blog/post-1'
  const outDir = routePath === '/' ? DIST : path.join(DIST, routePath.replace(/^\//, ''));
  const outFile = routePath === '/' ? path.join(DIST, 'index.html') : path.join(outDir, 'index.html');
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outFile, content, 'utf8');
  console.log(`Wrote prerendered ${outFile}`);
}

async function main() {
  console.log('Prerender: reading sitemap...');
  const xml = await fs.readFile(SITEMAP, 'utf8');
  const routes = parseSitemap(xml).filter((r) => {
    // filter out external or admin routes. Keep only public routes.
    // don't prerender any path that starts with /auth, /educator, /student, /report
    if (/^\/auth|^\/educator|^\/student|^\/report|^\/wait|^\/csverror/.test(r)) return false;
    return true;
  });

  if (routes.length === 0) {
    console.warn('No routes found to prerender. Check your sitemap.xml');
    return;
  }

  await ensureDist();

  console.log('Loading server renderer from dist...');
  const mod = await loadServerRenderer();
  const renderer = mod.render || mod.default;
  if (!renderer) throw new Error('Renderer did not export a render function');

  const template = await readTemplate();
  const blogMetaMap = await loadBlogMeta();
  let routeMetaMap = new Map();
  try {
    // prefer explicit route-meta file when present
    await fs.access(ROUTE_META_PATH);
    const rm = await import(pathToFileURL(ROUTE_META_PATH).href);
    const obj = rm && rm.default ? rm.default : rm;
    routeMetaMap = new Map(Object.entries(obj).map(([k, v]) => [k, v]));
  } catch (e) {
    // ignore - optional file
  }

  for (const r of routes) {
    try {
      console.log('Rendering', r);
      // call renderer; renderer may be sync or async
      const result = await renderer(r);
      const html = result && result.html ? result.html : (typeof result === 'string' ? result : '');
      // choose meta for this route: prefer explicit route-meta, then blog meta, then defaults
      let metaForRoute = null;
      if (routeMetaMap.has(r)) {
        metaForRoute = routeMetaMap.get(r);
      } else if (r.startsWith('/blog/')) {
        const slug = r.replace('/blog/', '');
        metaForRoute = blogMetaMap.get(slug) || { title: null, description: null };
      } else if (r === '/' || r === '/blog') {
        metaForRoute = r === '/' ? { title: 'InzightEd', description: 'InzightEd provides AI-powered evaluation and insights for institutions and students.' } : { title: 'Blog — InzightEd', description: 'Tips, guides and updates from InzightEd.' };
      }

      const templateWithMeta = injectMetaIntoTemplate(template, r, metaForRoute);
      // inject extra JSON-LD blocks if available
      const extra = buildExtraJsonLd(metaForRoute);
      const final = extra ? templateWithMeta.replace(/<\/head>/i, `  ${extra}\n</head>`) : emitHtmlForRoute(r, templateWithMeta, html);
      // if final not already set by extra replacement, ensure HTML is injected
      const out = final.includes('<div id="root">') ? final : emitHtmlForRoute(r, templateWithMeta, html);
      await writeRouteFile(r, out);
    } catch (e) {
      console.error('Failed to prerender', r, e);
    }
  }

  console.log('Prerender complete');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

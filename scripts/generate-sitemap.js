import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, 'public');
const OUT_FILE = path.join(PUBLIC_DIR, 'sitemap.xml');
const BLOG_DIR = path.join(ROOT, 'src', 'landing page', 'components', 'blog', 'blogs');
const BASE = 'https://inzighted.com';

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch (e) {
    return false;
  }
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function tryImportIndex() {
  try {
    const indexPath = path.join(BLOG_DIR, 'index.js');
    if (!(await fileExists(indexPath))) return null;
    const mod = await import(pathToFileURL(indexPath).href);
    // default export is the blogIndex in this project
    return mod.default || mod.blogIndex || null;
  } catch (e) {
    // fall through to file scan fallback
    return null;
  }
}

async function scanBlogFiles() {
  const list = [];
  try {
    const files = await fs.readdir(BLOG_DIR);
    for (const f of files) {
    // ignore index files (these are module index files, not blog posts)
    if (/^index\.(js|jsx|md|mdx)$/i.test(f)) continue;
    if (!/\.(js|jsx|md|mdx)$/i.test(f)) continue;
      const full = path.join(BLOG_DIR, f);
      const content = await fs.readFile(full, 'utf8');
      // try to locate `export const meta = { ... }`
      const metaMatch = content.match(/export\s+const\s+meta\s*=\s*\{([\s\S]*?)\}\s*;/m);
      let slug = f.replace(/\.(js|jsx|md|mdx)$/i, '');
      let date = null;
      if (metaMatch) {
        const body = metaMatch[1];
        const slugMatch = body.match(/slug\s*:\s*['"]([^'"]+)['"]/);
        const dateMatch = body.match(/date\s*:\s*['"]([^'"]+)['"]/);
        if (slugMatch) slug = slugMatch[1];
        if (dateMatch) date = dateMatch[1];
      }
      list.push({ slug, date });
    }
  } catch (e) {
    // ignore
  }
  return list;
}

function buildXml(urls) {
  const lines = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<!-- Generated sitemap -->');
  lines.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');

  for (const u of urls) {
    lines.push('  <url>');
    lines.push(`    <loc>${escapeXml(u.loc)}</loc>`);
    if (u.lastmod) lines.push(`    <lastmod>${escapeXml(u.lastmod)}</lastmod>`);
    lines.push('  </url>');
  }

  lines.push('</urlset>');
  return lines.join('\n') + '\n';
}

(async function main() {
  // base static routes
  const urls = [
    { loc: `${BASE}/` },
    { loc: `${BASE}/contact` },
    { loc: `${BASE}/pricing` },
    { loc: `${BASE}/blog` },
  ];

  // try to read explicit index export first
  const index = await tryImportIndex();
  if (index && Array.isArray(index) && index.length > 0) {
    for (const entry of index) {
      const meta = entry.meta || {};
      const slugFromPath = (entry.path || '').replace(/.*[\\/]/, '').replace(/\.(js|jsx|md|mdx)$/i, '');
      const slug = meta.slug || slugFromPath;
      const date = meta.date || null;
      // skip index files exported in the index (they are not posts)
      if (!slug || /^index$/i.test(slug)) continue;
      urls.push({ loc: `${BASE}/blog/${slug}`, lastmod: date });
    }
  } else {
    // fallback: scan files
    const posts = await scanBlogFiles();
    for (const p of posts) {
      urls.push({ loc: `${BASE}/blog/${p.slug}`, lastmod: p.date });
    }
  }

  // ensure public dir exists
  await fs.mkdir(PUBLIC_DIR, { recursive: true });
  const xml = buildXml(urls);
  await fs.writeFile(OUT_FILE, xml, 'utf8');
  console.log(`Wrote sitemap with ${urls.length} urls to ${OUT_FILE}`);
})().catch((err) => {
  console.error('Failed to generate sitemap:', err);
  process.exitCode = 1;
});

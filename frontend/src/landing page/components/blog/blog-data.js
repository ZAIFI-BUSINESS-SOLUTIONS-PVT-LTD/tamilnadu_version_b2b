// Adapter to provide a small programmatic API around the existing explicit blog index.
// Exports helpers: getAllPosts, getPostMetaBySlug, getFeaturedPost, getComponentBySlug
import blogIndex from './blogs/index.js';

// Vite dynamic import map for blog modules in this folder. Keys look like './blogs/blog1.jsx'
// Prefer eager imports so modules are embedded in the build and available at runtime.
// We rely on the explicit static `blogIndex` (imported above) so bundling is
// deterministic and avoids mixing static and dynamic imports which confuses
// chunking. The `entries` variable (derived from `blogIndex`) contains the
// component references for lookup.

function normalizeEntry(entry) {
  const meta = entry.meta || {};
  const path = entry.path || '';
  const slugFromPath = path.replace(/.*[\\/]/, '').replace(/\.(js|jsx|md|mdx)$/i, '');
  const slug = meta.slug || slugFromPath;
  return {
    slug,
    meta: {
      title: meta.title || '',
      date: meta.date || null,
      excerpt: meta.excerpt || meta.description || '',
      image: meta.image || null,
      tags: meta.tags || [],
      author: meta.author || null,
      canonical: meta.canonical || null,
      raw: meta
    },
    path: path.replace(/^\.\/?/, '') // plain filename like 'blog1.jsx' or 'some.md'
  };
}

// Build maps from the explicit index
const entries = Array.isArray(blogIndex) ? blogIndex : (blogIndex.default || blogIndex.blogIndex || []);
const slugMap = new Map();
for (const e of entries) {
  const n = normalizeEntry(e);
  if (n.slug) {
    if (slugMap.has(n.slug)) {
      // warn in dev when duplicate slugs exist
      try {
        // eslint-disable-next-line no-console
        console.warn(`[blog-data] duplicate blog slug detected: ${n.slug}`);
      } catch (err) {}
    }
    slugMap.set(n.slug, { meta: n.meta, path: n.path });
  }
}

export function getAllPosts() {
  return Array.from(slugMap.entries()).map(([slug, v]) => ({
    slug,
    title: v.meta.title,
    date: v.meta.date,
    excerpt: v.meta.excerpt,
    image: v.meta.image,
    tags: v.meta.tags,
    author: v.meta.author,
    canonical: v.meta.canonical,
    href: `/blog/${slug}`
  })).sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date) - new Date(a.date);
  });
}

export function getPostMetaBySlug(slug) {
  if (!slug) return null;
  const e = slugMap.get(slug);
  return e ? e.meta : null;
}

export function getFeaturedPost() {
  const all = getAllPosts();
  return all.find((p) => p.image) || all[0] || null;
}

export async function getComponentBySlug(slug) {
  if (!slug) return null;
  const entry = slugMap.get(slug);
  if (!entry) return null;
  const file = entry.path || `${slug}.jsx`;
  // First try to return the explicit component imported via the static index.
  // This avoids relying on import.meta.glob at runtime which may omit
  // modules that were also statically imported elsewhere in the build.
  try {
    const explicit = entries.find((e) => {
      const p = (e && e.path) || '';
      const slugFromP = (e && e.meta && e.meta.slug) || p.replace(/^\.\/?/, '').replace(/\.(js|jsx|md|mdx)$/i, '');
      return slugFromP === slug;
    });
    if (explicit && explicit.component) return explicit.component;
  } catch (err) {
    // ignore and fall back to loaders
  }
  // Lookup component directly from the explicit entries we imported.
  // entries is an array of objects { component, meta, path }
  try {
    const explicit = entries.find((e) => {
      const p = (e && e.path) || '';
      const slugFromP = (e && e.meta && e.meta.slug) || p.replace(/^\.\/?/, '').replace(/\.(js|jsx|md|mdx)$/i, '');
      return slugFromP === slug;
    });
    if (explicit && explicit.component) return explicit.component;
  } catch (err) {
    // fall through to returning null
  }

  // If we reach here no explicit component was found.
  return null;
}

// sanity check exported for CI/dev use
export function validateUniqueSlugs() {
  const seen = new Set();
  const duplicates = [];
  for (const [slug] of slugMap) {
    if (seen.has(slug)) duplicates.push(slug);
    seen.add(slug);
  }
  return duplicates;
}

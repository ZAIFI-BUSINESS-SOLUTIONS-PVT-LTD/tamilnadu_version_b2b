import fs from 'fs/promises';
import path from 'path';

const BLOG_DIR = path.join(process.cwd(), 'src', 'landing page', 'components', 'blog', 'blogs');

async function scan() {
  try {
    const files = await fs.readdir(BLOG_DIR);
    const slugs = [];
    for (const f of files) {
      if (!/\.(js|jsx|md|mdx)$/i.test(f)) continue;
      if (/^index\.(js|jsx|md|mdx)$/i.test(f)) continue;
      const full = path.join(BLOG_DIR, f);
      const content = await fs.readFile(full, 'utf8');
      const metaMatch = content.match(/export\s+const\s+meta\s*=\s*\{([\s\S]*?)\}\s*;/m);
      let slug = f.replace(/\.(js|jsx|md|mdx)$/i, '');
      if (metaMatch) {
        const body = metaMatch[1];
        const re = /slug\s*:\s*(?:`([^`]*)`|"([^"]*)"|'([^']*)')/;
        const m = body.match(re);
        if (m) slug = m[1] || m[2] || m[3] || slug;
      }
      slugs.push(slug);
    }
    const dupes = slugs.filter((s, i) => slugs.indexOf(s) !== i);
    const uniqueDupes = Array.from(new Set(dupes));
    if (uniqueDupes.length > 0) {
      console.error('Duplicate blog slugs found:', uniqueDupes.join(', '));
      process.exitCode = 2;
    } else {
      console.log('No duplicate blog slugs detected. Scanned', slugs.length, 'files.');
    }
  } catch (err) {
    console.error('Validation failed:', err && err.message ? err.message : err);
    process.exitCode = 1;
  }
}

scan();

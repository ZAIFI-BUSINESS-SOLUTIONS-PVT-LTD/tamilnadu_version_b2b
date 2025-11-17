import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../SEO';
import blogIndex from './blogs/index.js';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';

// BlogHome: lists blog posts defined in separate files under ./blogs/*.jsx
// Assumptions:
// - Each blog file may export a `meta` object: { title, date, excerpt, slug, image, tags }
// - Each blog file also exports a default React component (the full post).
// - When `meta.slug` is missing we derive a slug from the filename.

const slugFromPath = (p) => {
    const parts = p.split('/');
    const file = parts[parts.length - 1] || '';
    return file.replace(/\.(mdx?|jsx?)$/i, '');
};

const formatDate = (d) => {
    if (!d) return '';
    const dt = typeof d === 'string' ? new Date(d) : d;
    try {
        return dt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
        return String(d);
    }
};

function BlogHome() {
    // Prefer an explicit index file if present — static import above guarantees
    // the index is bundled and avoids runtime require errors.
    const explicitIndex = blogIndex || [];

    let modules = {};
    if (explicitIndex && explicitIndex.length > 0) {
        const mapped = {};
        explicitIndex.forEach((entry) => {
            const key = entry.path || `./blogs/${(entry.meta && entry.meta.slug) || entry.meta?.title || Math.random()}.jsx`;
            mapped[key] = { default: entry.component, meta: entry.meta };
        });
        modules = mapped;
    } else {
        // If no explicit index is present, fall back to an empty map.
        // We purposely avoid runtime globbing to keep bundling deterministic
        // and to prevent mixed static/dynamic imports which affect chunking.
        modules = {};
    }

    const moduleKeys = Object.keys(modules || {});
    useEffect(() => {
        if (typeof window !== 'undefined' && window.console && window.console.debug) {
            console.debug('Discovered blog modules:', moduleKeys);
        }
    }, [moduleKeys]);

    // Build canonical posts array
    const allPosts = useMemo(() => {
        const arr = Object.keys(modules).map((p) => {
            const mod = modules[p];
            const fileSlug = slugFromPath(p);
            const meta = (mod && (mod.meta || mod.default?.meta)) || {};
            const title = meta.title || (mod.default && mod.default.displayName) || fileSlug;
            const date = meta.date || null;
            const excerpt = meta.excerpt || meta.summary || '';
            const image = meta.image || null;
            const tags = meta.tags || [];
            const slug = meta.slug || fileSlug;
            const href = `/blog/${slug}`;
            return { title, date, excerpt, image, tags, href };
        });
        // sort by date desc when available
        arr.sort((a, b) => {
            if (!a.date && !b.date) return 0;
            if (!a.date) return 1;
            if (!b.date) return -1;
            return new Date(b.date) - new Date(a.date);
        });
        return arr;
    }, [modules]);

    // UI state: search, selected tags, pagination (load more)
    const [query, setQuery] = useState('');
    const [selectedTags, setSelectedTags] = useState([]);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [tempSelectedTags, setTempSelectedTags] = useState([]);
    const [tagSearch, setTagSearch] = useState('');
    // Responsive initial visible count: prefer a few more posts on larger screens
    const initialVisible = (typeof window !== 'undefined' && window.innerWidth < 640) ? 4 : 6;
    const [visibleCount, setVisibleCount] = useState(initialVisible);

    // derive tag list
    const tagList = useMemo(() => {
        const s = new Set();
        allPosts.forEach((p) => (p.tags || []).forEach((t) => s.add(t)));
        return Array.from(s).sort();
    }, [allPosts]);

    // filter posts using query and selected tags
    const posts = useMemo(() => {
        const q = (query || '').trim().toLowerCase();
        return allPosts.filter((p) => {
            if (q) {
                const inText = `${p.title} ${p.excerpt}`.toLowerCase().includes(q);
                if (!inText) return false;
            }
            if (selectedTags.length > 0) {
                const has = selectedTags.every((t) => (p.tags || []).includes(t));
                if (!has) return false;
            }
            return true;
        });
    }, [allPosts, query, selectedTags]);

    // Featured post (first post with image) for emphasis
    const featured = posts.find((p) => p.image) || posts[0] || null;

    // Toggle inside drawer (works on tempSelectedTags)
    const toggleTempTag = (t) => {
        setTempSelectedTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
    };

    // When drawer opens, seed temp selection
    useEffect(() => {
        if (isFilterOpen) setTempSelectedTags(selectedTags.slice());
    }, [isFilterOpen]);

    // Close drawer on Escape
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') setIsFilterOpen(false);
        };
        if (isFilterOpen) window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isFilterOpen]);

    // Handlers extracted for clarity
    const applyFilters = () => {
        setSelectedTags(tempSelectedTags);
        setIsFilterOpen(false);
    };

    const cancelFilters = () => {
        setTempSelectedTags(selectedTags.slice());
        setIsFilterOpen(false);
    };

    const clearFilters = () => {
        setTempSelectedTags([]);
        setSelectedTags([]);
    };

    const handleGo = () => {
        const q = (query || '').trim();
        if (!q) {
            const el = document.getElementById('blog-search');
            el && el.focus();
            return;
        }
        const target = document.getElementById('blog-results');
        target && target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const loadMore = () => setVisibleCount((v) => v + 6);

    return (
        <main className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20 overflow-x-hidden">
            <SEO title="Blog — InzightEd" description="Insights, product updates and education research from InzightEd." />

            <header className="mb-8">
                <p className="text-sm text-blue-600 font-semibold">From us</p>
                <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold text-gray-900">Tips & Tricks</h1>
                <p className="mt-3 text-base text-gray-600 max-w-2xl">Short articles about inzighted updates, learning smart, and tips for your exam preparation.</p>
                <div className="mt-4 text-sm text-gray-600" aria-live="polite">Showing <span className="font-medium text-gray-900">{posts.length}</span> {posts.length === 1 ? 'post' : 'posts'}</div>
            </header>

            <section aria-labelledby="blog-controls" className="mb-8">
                <div id="blog-controls" className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <label htmlFor="blog-search" className="sr-only">Search blog posts</label>
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                type="button"
                                onClick={() => setIsFilterOpen(true)}
                                className="mr-2 rounded-lg text-sm px-3 py-1"
                                aria-controls="blog-filter-drawer"
                            >
                                Filter
                            </Button>

                            <Input
                                id="blog-search"
                                type="search"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search posts, e.g. 'Crack NEET with AI', or 'Study Tips'"
                                className="flex-1 rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                                aria-label="Search blog posts"
                            />

                            <Button size="sm" variant="default" type="button" onClick={handleGo} className="whitespace-nowrap">Go</Button>


                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Filter button moved next to the search input above */}

                        {/* Clear filters button - appears when any tag is selected (keeps visible on the right) */}
                        {selectedTags.length > 0 && (
                            <div className="ml-2 flex-shrink-0">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setSelectedTags([])}
                                    className="rounded-lg text-sm px-3 py-1 border-red-600 text-red-600 bg-white hover:bg-red-50 hover:text-red-700"
                                    aria-label="Clear filters"
                                >
                                    Clear
                                </Button>
                            </div>
                        )}
                    </div>
                    {/* selected tags summary */}
                    {selectedTags.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap mt-2 sm:mt-0 w-full sm:w-auto">
                            {selectedTags.map((t) => (
                                <Badge key={t} className="flex items-center gap-2 px-2 py-0.5 bg-gray-100 text-gray-700 text-sm">
                                    <span>{t}</span>
                                    <button
                                        type="button"
                                        aria-label={`Remove tag ${t}`}
                                        onClick={() => setSelectedTags((prev) => prev.filter((x) => x !== t))}
                                        className="ml-2 text-xs text-gray-500 hover:text-gray-700"
                                    >
                                        ✕
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* Filter drawer (overlay). Right-side on desktop, bottom sheet on mobile. */}
            {isFilterOpen && (
                <div className="fixed inset-0 z-50">
                    {/* backdrop */}
                    <div className="absolute inset-0 bg-black/40" onClick={() => setIsFilterOpen(false)} />

                    {/* panel: bottom-sheet on mobile (half height), right-side drawer on sm+ */}
                    <div
                        id="blog-filter-drawer"
                        className="absolute bottom-0 left-0 w-full h-1/2 rounded-t-2xl bg-white shadow-xl border-t border-gray-200 overflow-auto transform transition-transform sm:top-0 sm:right-0 sm:left-auto sm:h-full sm:w-96 sm:rounded-none sm:border-t-0 sm:border-l"
                    >
                        <div className="p-4 flex items-center justify-between border-b">
                            <h3 className="text-lg font-medium">Filters</h3>
                            <button onClick={() => setIsFilterOpen(false)} aria-label="Close filter" className="text-gray-500 hover:text-gray-700">✕</button>
                        </div>

                        <div className="p-4 pb-20">
                            <label className="text-sm text-gray-600 mb-2 block">Tags</label>
                            <Input
                                type="search"
                                value={tagSearch}
                                onChange={(e) => setTagSearch(e.target.value)}
                                placeholder="Search tags"
                                className="mb-3"
                            />

                            <div className="grid grid-cols-2 gap-2 max-h-72 overflow-auto">
                                {tagList.filter((t) => t.toLowerCase().includes((tagSearch || '').toLowerCase())).map((t) => {
                                    const isSelected = tempSelectedTags.includes(t);
                                    return (
                                        <Button
                                            key={t}
                                            size="sm"
                                            variant="outline"
                                            onClick={() => toggleTempTag(t)}
                                            className={`w-full text-left rounded-lg text-sm px-3 py-1 transition-colors ${isSelected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200'}`}
                                            aria-pressed={isSelected ? 'true' : 'false'}
                                        >
                                            {t}
                                        </Button>
                                    );
                                })}
                            </div>

                            {/* spacer for sticky footer */}
                            <div aria-hidden="true" className="h-16" />
                        </div>

                        {/* Footer: fixed to bottom of drawer */}
                        <div className="absolute left-0 right-0 bottom-0 p-4 bg-white border-t flex items-center justify-between">
                            <div className="flex gap-2">
                                <Button size="sm" variant="default" onClick={applyFilters}>Apply</Button>
                                <Button size="sm" variant="outline" onClick={cancelFilters}>Cancel</Button>
                            </div>
                            <Button size="sm" variant="outline" onClick={clearFilters} className="text-red-600 border-red-600">Clear</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Anchor for search Go button to scroll to */}
            <div id="blog-results" />

            {posts.length === 0 ? (
                <section className="rounded-lg border border-dashed border-gray-200 p-12 text-center">
                    <h2 className="text-xl font-semibold text-gray-900">No posts found</h2>
                    <p className="mt-2 text-gray-600">Try adjusting your search or tag filters, or check back later for new content.</p>
                    <div className="mt-4 text-left text-sm text-gray-700">
                        <details className="bg-gray-50 p-3 rounded">
                            <summary className="cursor-pointer font-medium">Debug: discovered module keys (click to expand)</summary>
                            <pre className="mt-2 text-xs text-gray-600 overflow-auto max-h-40">{moduleKeys.length ? moduleKeys.join('\n') : '<none>'}</pre>
                            <p className="mt-2 text-xs text-gray-500">If this shows &lt;none&gt; but files exist, restart the dev server so Vite picks up new files.</p>
                        </details>
                    </div>
                </section>
            ) : (
                <>
                    {/* Featured post */}
                    {featured && (
                        <article className="mb-8 group bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 md:h-80">
                            <Link to={featured.href} className="block lg:flex h-full">
                                <div className="h-56 sm:h-64 md:h-full md:w-1/2 bg-gray-50 flex items-center justify-center overflow-hidden relative">
                                    {featured.image ? (
                                        // eslint-disable-next-line jsx-a11y/img-redundant-alt
                                        <img src={featured.image} alt={featured.title} className="w-full h-full object-cover" loading="lazy" />
                                    ) : (
                                        <div className="text-sm text-gray-400">No image</div>
                                    )}
                                </div>

                                <div className="p-6 lg:p-8 md:w-1/2 flex flex-col justify-center md:h-full">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-gray-500 gap-2 sm:gap-0">
                                        <time dateTime={featured.date || undefined}>{formatDate(featured.date)}</time>
                                        {featured.tags && featured.tags.length > 0 && (
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {featured.tags.slice(0, 3).map((t) => (
                                                    <Badge key={t} variant="secondary" className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs">{t}</Badge>
                                                ))}
                                                {featured.tags.length > 3 && (
                                                    <Badge variant="secondary" className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs">+{featured.tags.length - 3}</Badge>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <h2 className="mt-3 text-2xl font-extrabold text-gray-900">{featured.title}</h2>
                                    <p className="mt-3 text-gray-600">{featured.excerpt}</p>
                                    <div className="mt-6">
                                        <span className="inline-flex items-center gap-2 text-blue-600 font-medium">Read article →</span>
                                    </div>
                                </div>
                            </Link>
                        </article>
                    )}

                    {/* Grid of other posts (exclude featured) */}
                    <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {posts.filter((p) => p.href !== (featured && featured.href)).slice(0, visibleCount).map((post) => (
                            <article key={post.href} className="group bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
                                <Link to={post.href} className="block h-full">
                                    <div className="h-48 sm:h-56 md:h-40 w-full bg-gray-50 flex items-center justify-center overflow-hidden">
                                        {post.image ? (
                                            // eslint-disable-next-line jsx-a11y/img-redundant-alt
                                            <img src={post.image} alt={post.title} className="w-full h-full object-cover" loading="lazy" />
                                        ) : (
                                            <div className="text-sm text-gray-400">No image</div>
                                        )}
                                    </div>

                                    <div className="p-4 sm:p-5 flex flex-col md:h-1/2">
                                        <div className="flex items-center justify-between text-xs text-gray-500">
                                            <time dateTime={post.date || undefined}>{formatDate(post.date)}</time>
                                            {post.tags && post.tags.length > 0 && (
                                                <span className="ml-2 inline-flex items-center gap-2">
                                                    {post.tags.slice(0, 2).map((t) => (
                                                        <Badge key={t} variant="secondary" className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs">{t}</Badge>
                                                    ))}
                                                </span>
                                            )}
                                        </div>

                                        <h3 className="mt-3 text-lg font-semibold text-gray-900 leading-snug flex-1">{post.title}</h3>
                                        <p className="mt-2 text-sm text-gray-600 line-clamp-3">{post.excerpt || 'Read more on this topic...'}</p>

                                        <div className="mt-auto">
                                            <span className="text-blue-600 text-sm font-medium">Read article →</span>
                                        </div>
                                    </div>
                                </Link>
                            </article>
                        ))}
                    </section>

                    {/* Load more / pagination */}
                    {visibleCount < posts.filter((p) => p.href !== (featured && featured.href)).length && (
                        <div className="mt-8 text-center">
                            <Button onClick={loadMore} className="inline-flex items-center px-5 py-2 rounded-lg bg-primary text-white font-medium">Load more</Button>
                        </div>
                    )}
                </>
            )}
        </main>
    );
}

// Provide both named and default exports
export { BlogHome };
export default BlogHome;

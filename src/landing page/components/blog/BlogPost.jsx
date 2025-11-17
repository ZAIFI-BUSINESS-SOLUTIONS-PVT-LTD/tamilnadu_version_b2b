import React, { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { getPostMetaBySlug, getComponentBySlug } from './blog-data';

// BlogPost: lazy-load the matched blog component by slug using the adapter.
export default function BlogPost() {
  const { slug } = useParams();
  const [Component, setComponent] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setNotFound(false);
      const postMeta = getPostMetaBySlug(slug);
      if (!postMeta) {
        if (mounted) {
          setNotFound(true);
          setLoading(false);
        }
        return;
      }
      setMeta(postMeta);
      const comp = await getComponentBySlug(slug);
      if (mounted) {
        if (comp) setComponent(() => comp);
        else setNotFound(true);
        setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [slug]);

  // Inject BlogPosting schema
  useEffect(() => {
    if (!meta) return;
    const schema = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: meta.title || "Blog Post",
      image: meta.image || "https://inzighted.com/assets/logo.svg",
      datePublished: meta.datePublished || "2025-01-01",
      author: {
        "@type": "Person",
        name: meta.author || "InzightEd Team"
      },
      publisher: {
        "@type": "Organization",
        name: "InzightEd",
        logo: {
          "@type": "ImageObject",
          url: "https://inzighted.com/assets/logo.svg"
        }
      }
    };
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schema);
    document.head.appendChild(script);
    return () => script.remove();
  }, [meta]);

  if (loading) return <div className="p-8 text-center">Loading post…</div>;
  if (notFound) return <Navigate to="/blog" replace />;
  if (!Component) return <Navigate to="/blog" replace />;

  const Post = Component;
  return (
    <article>
      {meta && meta.summary && (
        <section className="tldr mb-8 p-4 bg-gray-100 rounded">
          <h2 className="text-xl font-bold mb-2">TL;DR</h2>
          <p className="text-gray-700">{meta.summary}</p>
        </section>
      )}
      <Post />
    </article>
  );
}

// Copilot: Extend this SEO component API to accept the following props:
// organization, faqStructured, reviews, contactPoint, productOffers, breadcrumbs.
// For each, generate valid JSON-LD and inject <script type="application/ld+json"> blocks.
// Also ensure canonical, og:site_name, absolute og:image, twitter card, meta robots.
// Keep existing props intact (title, description, canonical, video).

import React, { useEffect } from 'react';

// Lightweight SEO helper that does not require external dependencies.
// It sets document title/meta tags and injects JSON-LD for Organization/FAQ/Video.
export default function SEO({
  title,
  description,
  url,
  image,
  organization = {
    name: 'InzightEd',
    url: 'https://inzighted.com/',
    logo: '/assets/logo.svg',
    sameAs: [
      'https://www.linkedin.com/company/inzighted',
      'https://twitter.com/inzighted'
    ]
  },
  faq = [],
  faqStructured = null, // backward/forward compat
  reviews = [],
  contactPoint = null,
  productOffers = [],
  breadcrumbs = [],
  video = null
}) {
  useEffect(() => {
    const prevTitle = document.title;
    if (title) document.title = title;

    const createdMeta = [];
    const createdScripts = [];
    let canonicalEl = null;
    let canonicalCreated = false;

  const upsertMeta = (attrName, attrValue, content) => {
      if (!content) return null;
      let el = document.head.querySelector(`[${attrName}='${attrValue}']`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attrName, attrValue);
        document.head.appendChild(el);
        createdMeta.push(el);
      }
      el.setAttribute('content', content);
      return el;
    };

    upsertMeta('name', 'description', description);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    // ensure og:site_name and absolute og:image
    upsertMeta('property', 'og:site_name', (organization && organization.name) || 'InzightEd');
    let absoluteImage = null;
    try {
      if (image) {
  if (/^https?:\/\//i.test(image)) absoluteImage = image;
  else if (url) absoluteImage = new URL(encodeURI(image), url).href;
  else absoluteImage = window.location.origin + (image.startsWith('/') ? encodeURI(image) : '/' + encodeURI(image));
        upsertMeta('property', 'og:image', absoluteImage);
      }
    } catch (e) {
      // fallback to provided image if URL construction fails
      if (image) upsertMeta('property', 'og:image', image);
    }
    if (url) upsertMeta('property', 'og:url', url);
    upsertMeta('property', 'og:locale', 'en_IN');
    upsertMeta('name', 'twitter:card', image ? 'summary_large_image' : 'summary');
    if (absoluteImage) upsertMeta('name', 'twitter:image', absoluteImage);
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);

    // default robots meta
    upsertMeta('name', 'robots', 'index,follow');

    if (url) {
      canonicalEl = document.head.querySelector("link[rel='canonical']");
      if (!canonicalEl) {
        canonicalEl = document.createElement('link');
        canonicalEl.setAttribute('rel', 'canonical');
        canonicalEl.setAttribute('href', url);
        document.head.appendChild(canonicalEl);
        canonicalCreated = true;
      } else {
        canonicalEl.setAttribute('href', url);
      }
    }

    // Organization schema
    const buildOrganizationSchema = (org) => {
      if (!org || Object.keys(org).length === 0) return null;
      return {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: org.name || "InzightEd",
    url: org.url || url || window.location.origin,
    logo: org.logo ? (/^https?:\/\//i.test(org.logo) ? org.logo : (url ? new URL(encodeURI(org.logo), url).href : (window.location.origin + (org.logo.startsWith('/') ? encodeURI(org.logo) : '/' + encodeURI(org.logo))))) : (absoluteImage || ""),
        sameAs: Array.isArray(org.sameAs) ? org.sameAs : []
      };
    };
    const orgSchema = buildOrganizationSchema(organization);
    if (orgSchema) {
      const orgScript = document.createElement('script');
      orgScript.type = 'application/ld+json';
      orgScript.text = JSON.stringify(orgSchema);
      document.head.appendChild(orgScript);
      createdScripts.push(orgScript);
    }

    const buildFAQSchema = (faqArr) => {
      const list = Array.isArray(faqArr) && faqArr.length ? faqArr : (Array.isArray(faq) && faq.length ? faq : []);
      if (!list || !list.length) return null;
      return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: list.map(q => ({
          "@type": "Question",
          name: q.question || q.name || "",
          acceptedAnswer: { "@type": "Answer", text: q.answer || q.acceptedAnswer || "" }
        }))
      };
    };
    const faqSchema = buildFAQSchema(faqStructured || faq);
    if (faqSchema) {
      const faqScript = document.createElement('script');
      faqScript.type = 'application/ld+json';
      faqScript.text = JSON.stringify(faqSchema);
      document.head.appendChild(faqScript);
      createdScripts.push(faqScript);
    }

    if (video) {
      const videoSchema = {
        "@context": "https://schema.org",
        "@type": "VideoObject",
        name: video.name,
        description: video.description,
        thumbnailUrl: video.thumbnailUrl,
        uploadDate: video.uploadDate,
        duration: video.duration,
        contentUrl: video.contentUrl,
        embedUrl: video.embedUrl
      };
      const vScript = document.createElement('script');
      vScript.type = 'application/ld+json';
      vScript.text = JSON.stringify(videoSchema);
      document.head.appendChild(vScript);
      createdScripts.push(vScript);
    }

    // BreadcrumbList schema
    const buildBreadcrumbSchema = (items) => {
      if (!Array.isArray(items) || items.length === 0) return null;
      const itemList = items.map((it, idx) => ({
        "@type": "ListItem",
        position: idx + 1,
        name: it.name || it.title || `Step ${idx + 1}`,
        item: it.url || (it.path ? (url ? new URL(it.path, url).href : (window.location.origin + it.path)) : url)
      }));
      return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: itemList
      };
    };
    const breadcrumbSchema = buildBreadcrumbSchema(breadcrumbs);
    if (breadcrumbSchema) {
      const bcScript = document.createElement('script');
      bcScript.type = 'application/ld+json';
      bcScript.text = JSON.stringify(breadcrumbSchema);
      document.head.appendChild(bcScript);
      createdScripts.push(bcScript);
    }

    // Reviews / AggregateRating
    const buildReviewsSchema = (revs) => {
      if (!Array.isArray(revs) || revs.length === 0) return null;
      // individual reviews
      const reviewItems = revs.map(r => ({
        "@type": "Review",
        author: r.author || r.reviewer || "",
        datePublished: r.datePublished || r.date || undefined,
        reviewBody: r.body || r.reviewBody || r.text || "",
        reviewRating: r.rating ? { "@type": "Rating", ratingValue: r.rating, bestRating: r.bestRating || 5 } : undefined
      }));
      // aggregate
      const ratings = revs.map(r => Number(r.rating || 0)).filter(n => !Number.isNaN(n) && n > 0);
      const aggregate = ratings.length ? {
        "@type": "AggregateRating",
        ratingValue: (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1),
        reviewCount: ratings.length
      } : null;
      const out = {
        "@context": "https://schema.org",
        "@type": "Product",
        name: (organization && organization.name) || document.title || "InzightEd",
        review: reviewItems
      };
      if (aggregate) out.aggregateRating = aggregate;
      return out;
    };
    const reviewsSchema = buildReviewsSchema(reviews);
    if (reviewsSchema) {
      const rScript = document.createElement('script');
      rScript.type = 'application/ld+json';
      rScript.text = JSON.stringify(reviewsSchema);
      document.head.appendChild(rScript);
      createdScripts.push(rScript);
    }

    // Product / Service offers
    const buildServiceSchema = (offers) => {
      if (!Array.isArray(offers) || offers.length === 0) return null;
      // Represent as Service with offers
      const service = {
        "@context": "https://schema.org",
        "@type": "Service",
        name: offers[0].serviceName || offers[0].name || ((organization && organization.name) || document.title),
        description: offers[0].description || description || "",
        provider: orgSchema ? { "@type": "Organization", name: orgSchema.name, url: orgSchema.url } : undefined,
        offers: offers.map(o => ({
          "@type": "Offer",
          price: o.price != null ? String(o.price) : undefined,
          priceCurrency: o.priceCurrency || 'INR',
          url: o.url || url,
          availability: o.availability || 'https://schema.org/InStock'
        }))
      };
      return service;
    };
    const serviceSchema = buildServiceSchema(productOffers);
    if (serviceSchema) {
      const sScript = document.createElement('script');
      sScript.type = 'application/ld+json';
      sScript.text = JSON.stringify(serviceSchema);
      document.head.appendChild(sScript);
      createdScripts.push(sScript);
    }

    // ContactPoint
    const buildContactPointSchema = (cp) => {
      if (!cp || Object.keys(cp).length === 0) return null;
      return {
        "@context": "https://schema.org",
        "@type": "ContactPoint",
        telephone: cp.telephone || cp.phone || undefined,
        contactType: cp.contactType || cp.type || 'customer service',
        areaServed: cp.areaServed || undefined,
        availableLanguage: cp.availableLanguage || undefined,
        email: cp.email || undefined
      };
    };
    const contactSchema = buildContactPointSchema(contactPoint);
    if (contactSchema) {
      const cScript = document.createElement('script');
      cScript.type = 'application/ld+json';
      cScript.text = JSON.stringify(contactSchema);
      document.head.appendChild(cScript);
      createdScripts.push(cScript);
    }

    return () => {
      document.title = prevTitle;
      createdMeta.forEach(m => m.remove());
      createdScripts.forEach(s => s.remove());
      if (canonicalCreated && canonicalEl) canonicalEl.remove();
    };
  }, [title, description, url, image, JSON.stringify(faq), JSON.stringify(video), JSON.stringify(organization)]);

  return null;
}

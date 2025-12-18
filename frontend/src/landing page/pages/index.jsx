// This file exports two landing page components: Index and Contact
import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import HeroSection from "../components/Hero";
import SEO from "../components/SEO";
import ContactUs from "../components/Contact";
import Pricing from "../components/Pricing";
import BlogHome from "../components/blog/bloghome.jsx";
import BlogPost from '../components/blog/BlogPost.jsx';

// Lazy load below-the-fold components
const Features = React.lazy(() => import("../components/Features"));
const WhyInzighted = React.lazy(() => import("../components/usp"));
const Testimonials = React.lazy(() => import("../components/whyinzighted"));
const Process = React.lazy(() => import("../components/Process"));
const Institutes = React.lazy(() => import("../components/Institutes"));
const FAQ = React.lazy(() => import("../components/FAQ"));
const Recognitions = React.lazy(() => import("../components/Recognitions"));

// Main landing page: header, hero, all except contact, footer
export function Index() {
  const location = useLocation();

  useEffect(() => {
    // Detect if this navigation was a reload. If so, force scroll to top to
    // ensure the user sees the top section after a page refresh.
    const isReload = (() => {
      try {
        if (performance && performance.getEntriesByType) {
          const nav = performance.getEntriesByType('navigation')[0];
          if (nav) return nav.type === 'reload';
        }
        if (performance && performance.navigation) {
          return performance.navigation.type === 1; // deprecated fallback
        }
      } catch (e) {
        // ignore
      }
      return false;
    })();

    if (isReload) {
      // Force immediate scroll to top on reload
      window.scrollTo(0, 0);
      return;
    }

    if (location.hash) {
      const id = location.hash.replace("#", "");
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [location]);

  return (
    <>
      <SEO
        title="InzightEd: AI Evaluation System for All Exam Prep"
        description="Prepare smarter for NEET with AI-evaluated mock tests, instant insights and personalized study plans."
        url="https://inzighted.com/"
        image="https://inzighted.com/assets/landingpage%20images/demo-screenshot.webp"
        video={{
          name: "InzightEd Product Demo",
          description: "Short demo of InzightEd features",
          thumbnailUrl: "https://inzighted.com/assets/landingpage%20images/demo-thumbnail.webp",
          uploadDate: "2025-01-01",
          duration: "PT0M57S",
          embedUrl: "https://www.youtube.com/embed/ipF351hwBgs",
          contentUrl: "https://youtu.be/ipF351hwBgs"
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "InzightEd",
              "url": "https://inzighted.com/",
              "logo": "https://inzighted.com/assets/logo.svg",
              "sameAs": [
                "https://www.linkedin.com/company/inzighted",
                "https://twitter.com/inzighted"
              ]
            },
            {
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "InzightEd",
              "url": "https://inzighted.com/",
              "inLanguage": "en",
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://inzighted.com/search?q={search_term_string}",
                "query-input": "required name=search_term_string"
              }
            }
          ])
        }}
      />
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1" id="main-content">
          <a href="#main-content" className="skip-link">Skip to main content</a>
          <HeroSection />
          {/* Lazy sections are now handled by the route-level Suspense in App.jsx
              which shows a full-page PageLoader. Removing the inner Suspense
              prevents the footer from rendering below the hero briefly. */}
          <Features />
          <Testimonials />
          <Recognitions />
          <WhyInzighted />
          <Process />
          <Institutes />
          <FAQ />
        </main>
        <Footer />
      </div>
    </>
  );
}

// Contact page: header, contact, footer
export function Contact() {
  return (
    <>
      <SEO
        title="Contact — InzightEd"
        description="Get in touch with InzightEd for demos, partnerships and support."
        url="https://inzighted.com/contact"
      />
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1" id="main-content">
          <a href="#main-content" className="skip-link">Skip to main content</a>
          <ContactUs />
        </main>
        <Footer />
      </div>
    </>
  );
}


// Pricing page: header, pricing, footer
export function PricingPage() {
  return (
    <>
      <SEO
        title="Pricing — InzightEd: Plans for AI-Powered Exam Preparation"
        description="Explore InzightEd pricing plans for AI-powered evaluation, covering NEET, JEE, and various other exam preparation needs."
        url="https://inzighted.com/pricing"
      />
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1" id="main-content">
          <a href="#main-content" className="skip-link">Skip to main content</a>
          <Pricing />
        </main>
        <Footer />
      </div>
    </>
  );
}

// Blog page: header, blog list, footer
export function BlogPage() {
  return (
    <>
      <SEO
        title="Blog — InzightEd"
        description="Insights, product updates and education research from InzightEd."
        url="https://inzighted.com/blog"
      />
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1" id="main-content">
          <a href="#main-content" className="skip-link">Skip to main content</a>
          <BlogHome />
        </main>
        <Footer />
      </div>
    </>
  );
}

export function BlogPostPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1" id="main-content">
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <BlogPost />
      </main>
      <Footer />
    </div>
  );
}
export default Index;

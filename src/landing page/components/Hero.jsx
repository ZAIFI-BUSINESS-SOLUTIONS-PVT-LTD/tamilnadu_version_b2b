// Hero section (accessible & SEO-friendly)
import React, { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useAnimation, AnimatePresence } from "framer-motion";
import BG_FOREGROUND from "../../assets/landingpage-images/bg_001.webp";
import DEMO_SCREEN from "../../assets/landingpage-images/demo-screenshot.webp";
import { Play, X, Loader2, BadgeCheck } from "lucide-react";
import RotatingText from './animations/RotatingText.jsx';
import ShinyButton from './animations/ShinyButton.jsx';

// Hook to detect if an element is visible on screen
const useOnScreen = (ref, threshold = 0.1) => {
  const [isIntersecting, setIntersecting] = useState(false);
  useEffect(() => {
    // Guard for SSR and missing IntersectionObserver implementations
    if (typeof window === "undefined" || typeof window.IntersectionObserver === "undefined") {
      // If we can't observe, assume not intersecting on server; client will re-run effect
      setIntersecting(false);
      return;
    }

    const observer = new window.IntersectionObserver(
      ([entry]) => setIntersecting(entry.isIntersecting),
      { threshold }
    );

    // Ensure we only call observe with a Node/Element
    const node = ref && ref.current;
    if (node instanceof Node) {
      observer.observe(node);
    }

    return () => {
      try {
        if (node instanceof Node && observer) observer.unobserve(node);
      } catch (e) {
        // swallow exceptions from unobserve in odd environments
      }
    };
  }, [ref, threshold]);
  return isIntersecting;
};

// Component to render background layers
const BackgroundLayers = () => {
  useEffect(() => {
    const img = new window.Image();
    img.src = BG_FOREGROUND;
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none z-0">
      <motion.div
        className="absolute inset-0 flex items-center justify-center z-10"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.1, scale: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      >
        <img
          src={BG_FOREGROUND}
          alt=""
          role="presentation"
          aria-hidden="true"
          width="1920"
          height="1080"
          className="w-full h-full object-cover"
          loading="lazy"
          style={{ mixBlendMode: "normal" }}
        />
      </motion.div>
    </div>
  );
};

// Component for the hero section content
const HeroContent = () => {
  const containerVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 1,
        ease: "easeOut",
        staggerChildren: 0.2,
      },
    },
  };

  const childVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: "easeOut" },
    },
  };


  return (
    <motion.div
      className="flex flex-col items-center md:items-start justify-center text-center md:text-left w-full text-gray-700"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >

      {/* Main heading (H1) - includes broad keyword phrase for SEO */}
      <motion.h1
        className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight mb-4"
        variants={childVariants}
      >
        <br />
        <span className="inline-block mt-3">
          Prepare{" "}
          <span className="inline">
            <RotatingText
              texts={["Smarter", "Clearer", "Quicker"]}
              mainClassName="inline-flex px-2 sm:px-2 md:px-3 bg-gradient-to-r from-blue-400 to-blue-600 text-white overflow-hidden rounded-lg pt-1"
              staggerFrom={"last"}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "-120%" }}
              staggerDuration={0.025}
              splitLevelClassName="overflow-hidden"
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
              rotationInterval={4000}
            />
          </span>
          <br /><span className="text-blue-500">Free</span> mock tests,
        </span>
        <br /><span className="text-blue-500">AI</span> powered evaluation for all your exam prep.
      </motion.h1>

      {/* Subheading */}
      <motion.p
        className="text-lg md:text-xl text-gray-700 max-w-3xl mb-6"
        variants={childVariants}
      >
        <span className="text-gray-600">Elevate your exam preparations with AI that helps you learn, not just score.</span>
      </motion.p>

      {/* Call-to-action buttons */}
      <motion.div
        className="flex flex-col sm:flex-row gap-4 mb-6"
        variants={childVariants}
      >
        <a href="https://app.inzighted.com/" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
          <ShinyButton
            className="px-7 py-3 font-semibold rounded-lg shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 transition-transform duration-200 bg-gradient-to-r from-blue-400 to-blue-600 text-white"
          >
            InzightEd
          </ShinyButton>
        </a>
        <a href="https://neet.inzighted.com/" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
          <ShinyButton
            className="px-7 py-3 font-semibold rounded-lg shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 transition-transform duration-200 bg-gradient-to-r from-blue-400 to-blue-600 text-white"
          >
            InzightEd - NEET
          </ShinyButton>
        </a>
        <Link to="/contact" style={{ textDecoration: 'none' }}>
          <span
            className="inline-flex items-center justify-center px-7 py-3 font-semibold text-gray-700 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
          >
            For Institutes: Book a Demo
          </span>
        </Link>
      </motion.div>

      {/* Badges */}
      <motion.div
        className="flex flex-wrap items-center justify-center md:justify-start gap-6 text-sm text-gray-500 mt-2"
        variants={childVariants}
      >
        <div className="flex items-center gap-2">
          <BadgeCheck className="w-5 h-5 text-white fill-blue-500" />
          Tested with Top Institutes
        </div>
        <div className="flex items-center gap-2">
          <BadgeCheck className="w-5 h-5 text-white fill-blue-500" />
          85% improved scores
        </div>
      </motion.div>
    </motion.div>
  );
};

// Component for the demo graphic and video modal
const DemoGraphic = () => {
  const [showVideo, setShowVideo] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const modalRef = useRef(null);
  const playButtonRef = useRef(null);

  // Inject VideoObject JSON-LD for SEO (ensures crawlers pick up the demo video)
  useEffect(() => {
    const videoSchema = {
      "@context": "https://schema.org",
      "@type": "VideoObject",
      name: "InzightEd Product Demo",
      description:
        "Short demo of InzightEd showing AI evaluation, mock-test flow, and personalized recommendations for NEET preparation.",
      thumbnailUrl: window.location.origin + "/assets/landingpage-images/demo-screenshot.webp",
      uploadDate: "2025-01-01",
      duration: "PT0M57S",
      contentUrl: "https://youtu.be/ipF351hwBgs",
      embedUrl: "https://www.youtube.com/embed/ipF351hwBgs"
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(videoSchema);
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setShowVideo(false);
      }
      if (e.key === "Tab" && !showVideo && playButtonRef.current) {
        playButtonRef.current.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showVideo]);

  useEffect(() => {
    if (showVideo && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      const handleTabKey = (e) => {
        if (e.key === "Tab") {
          if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      };

      firstElement?.focus();
      modalRef.current.addEventListener("keydown", handleTabKey);

      return () => {
        modalRef.current?.removeEventListener("keydown", handleTabKey);
      };
    }
  }, [showVideo]);

  const handleVideoLoad = () => {
    setIsLoading(false);
  };

  return (
    <>
      <div className="relative w-full max-w-lg mx-auto aspect-[1/1] rounded-2xl overflow-hidden border border-gray-200/80 bg-white shadow-[0_8px_24px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_28px_rgba(0,0,0,0.1)] transition-all duration-300 hover:-translate-y-0.5">
        <div
          className="relative w-full h-full flex items-center justify-center cursor-pointer group"
          onClick={() => setShowVideo(true)}
          role="button"
          aria-label="Watch product demo video"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && setShowVideo(true)}
        >
          <div className="relative w-[92%] h-[92%] rounded-xl overflow-hidden border border-gray-100/80 bg-gray-50">
            <img
              src={DEMO_SCREEN}
              alt="InzightEd product demo screenshot showing test results, AI recommendations, and report overview"
              width="1200"
              height="1200"
              className="absolute inset-0 w-full h-full object-cover transition-all duration-500 group-hover:scale-105 group-hover:opacity-90"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>

          <button
            ref={playButtonRef}
            className="absolute flex items-center gap-2 px-3.5 py-1.5 bg-gray-900/95 hover:bg-gray-900 text-white text-sm font-medium rounded-full backdrop-blur transition-all duration-200 transform hover:scale-[1.02] focus:outline-none focus:ring-1 focus:ring-white/30 z-10 m-4"
            style={{ bottom: "1.25rem", right: "1.25rem" }}
            onClick={(e) => {
              e.stopPropagation();
              setShowVideo(true);
            }}
            aria-label="Play demo video"
          >
            <span>Demo</span>
            <span className="text-xs opacity-75 ml-0.5">0:57s</span>
          </button>

          <div className="absolute inset-0 flex items-center justify-center">
            <div className="p-3 bg-gray-900/30 rounded-full backdrop-blur-lg shadow-lg">
              <div className="relative flex items-center justify-center w-12 h-12">
                <Play className="w-7 h-7 text-white relative" strokeWidth={3} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
            role="dialog"
            aria-modal="true"
            aria-labelledby="video-modal-title"
          >
            <motion.div
              ref={modalRef}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="relative w-full max-w-4xl mx-4 aspect-video bg-black rounded-xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="absolute top-4 right-4 z-20 bg-white/90 hover:bg-white text-black rounded-full p-2 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                onClick={() => setShowVideo(false)}
                aria-label="Close video"
              >
                <X className="w-5 h-5" />
              </button>

              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
              )}

              <iframe
                width="100%"
                height="100%"
                src="https://www.youtube.com/embed/ipF351hwBgs?si=cds3Abh3oIN6xbAs"
                title="Product demo video"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
                onLoad={handleVideoLoad}
                loading="eager"
                id="video-iframe"
                aria-labelledby="video-modal-title"
              />

              <h2 id="video-modal-title" className="sr-only">
                Product Demonstration Video
              </h2>
              {/* Crawlable transcript/short description for SEO & accessibility */}
              <div className="sr-only" id="demo-video-description">
                InzightEd product demo (0:57) — shows the student workflow: taking a mock test, AI evaluation of answers, section-wise insights, personalized study plan suggestions, and reporting for educators. The demo highlights speed, clarity and actionable feedback to help NEET aspirants improve their scores.
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// Main Hero section component
export default function HeroSection() {
  const sectionRef = useRef(null);
  const isHeroVisible = useOnScreen(sectionRef, 0.1);
  const controls = useAnimation();

  useEffect(() => {
    if (isHeroVisible) {
      controls.start("visible");
    }
  }, [isHeroVisible, controls]);

  const introAnimation = {
    initial: { opacity: 0, y: 50 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 1, ease: "easeOut" },
  };

  return (
    <motion.section
      id="home"
      ref={sectionRef}
      className="relative flex flex-col items-center justify-center w-full overflow-hidden pt-36 pb-2 sm:pb-6 text-center bg-white"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, ease: "easeOut" }}
      {...introAnimation}
    >
      <BackgroundLayers />
      <div className="relative w-full max-w-screen-2xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 px-3 sm:px-4 md:px-8">
        <div className="w-full md:w-1/2">
          <HeroContent />
        </div>
        <div className="w-full md:w-1/2">
          <DemoGraphic />
        </div>
      </div>
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.6 }}
      />
    </motion.section>
  );
}
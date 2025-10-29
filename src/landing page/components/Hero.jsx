import React, { useRef, useEffect, useState } from "react";
import { motion, useAnimation, AnimatePresence } from "framer-motion";
import BG_FOREGROUND from "../../assets/landingpage images/bg_001.webp";
import DEMO_SCREEN from "../../assets/landingpage images/demo-screenshot.webp";
import { Play, X, Loader2 } from "lucide-react";

// Intersection observer hook
const useOnScreen = (ref, threshold = 0.1) => {
  const [isIntersecting, setIntersecting] = useState(false);
  useEffect(() => {
    const observer = new window.IntersectionObserver(
      ([entry]) => setIntersecting(entry.isIntersecting),
      { threshold }
    );
    if (ref.current) observer.observe(ref.current);
    return () => ref.current && observer.unobserve(ref.current);
  }, [ref, threshold]);
  return isIntersecting;
};

// Background layers: foreground only (grid removed)
const BackgroundLayers = () => {
  useEffect(() => {
    // Only preload the foreground image now
    const img = new window.Image();
    img.src = BG_FOREGROUND;
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none z-0">
      <motion.div
        className="absolute inset-0 flex items-center justify-center z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.1 }}
        transition={{ duration: 1.2, delay: 0.3 }}
      >
        <img
          src={BG_FOREGROUND}
          alt="Foreground element"
          className="w-full h-full object-cover"
          loading="lazy"
          style={{ mixBlendMode: "normal" }}
        />
      </motion.div>
    </div>
  );
};

// DemoButton: request-a-demo CTA
const DemoButton = () => {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.a
      href="/auth"
      aria-label="Go To Dashboard"
      className={`relative inline-flex items-center gap-x-3 px-7 py-3 font-semibold text-white rounded-lg shadow-xl mt-6 bg-gradient-to-br from-blue-600 to-blue-400 transition-transform duration-200 ${hovered ? "scale-105" : "scale-100"
        }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ letterSpacing: "0.02em" }}
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.6, duration: 0.5, ease: "easeOut" }}
    >
      Go To Dashboard
    </motion.a>
  );
};

// HeroContent: headings, text, and CTA
const HeroContent = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.2,
      },
    },
  };

  const childVariants = {
    hidden: { y: 10, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.5, ease: "easeOut" },
    },
  };

  return (
    <motion.div
      className="flex flex-col items-start justify-center text-left w-full text-gray-700"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.h1
        className="font-semibold leading-tight text-gray-700 text-4xl md:text-5xl"
        variants={childVariants}
      >
        <motion.span
          className="text-transparent bg-clip-text bg-gradient-to-br from-blue-600 to-blue-400 animate-gradient-x"
          variants={childVariants}
        >
          AI‑Powered
        </motion.span>
        <br />
        Evaluation for
        <br />
        <motion.span
          className="relative inline-block pb-4"
          variants={childVariants}
        >
          Smarter Learning
        </motion.span>
      </motion.h1>

      <motion.p
        className="max-w-3xl text-gray-700 leading-normal text-sm sm:text-sm md:text-md lg:text-lg xl:text-xl"
        variants={childVariants}
      >
        Automate assessments, deliver real‑time feedback, and gain AI‑driven insights to enhance education. Empower educators, streamline grading, and make data‑driven decisions effortlessly.
      </motion.p>

      <DemoButton />
    </motion.div>
  );
};

// DemoGraphic: screenshot + play pill (show YouTube video in modal on click)
const DemoGraphic = () => {
  const [showVideo, setShowVideo] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const modalRef = useRef(null);
  const playButtonRef = useRef(null);

  // Close modal on ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setShowVideo(false);
      }
      // Return focus to play button when modal closes
      if (e.key === "Tab" && !showVideo && playButtonRef.current) {
        playButtonRef.current.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showVideo]);

  // Trap focus inside modal when open
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
          {/* Image with modern frame */}
          <div className="relative w-[92%] h-[92%] rounded-xl overflow-hidden border border-gray-100/80 bg-gray-50">
            <img
              src={DEMO_SCREEN}
              alt="Product demo screenshot"
              className="absolute inset-0 w-full h-full object-cover transition-all duration-500 group-hover:scale-105 group-hover:opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>

          {/* Floating play button - minimalist style */}
          <button
            ref={playButtonRef}
            className="absolute flex items-center gap-2 px-3.5 py-1.5 bg-gray-900/95 hover:bg-gray-900 text-white text-sm font-medium rounded-full backdrop-blur transition-all duration-200 transform hover:scale-[1.02] focus:outline-none focus:ring-1 focus:ring-white/30 z-10"
            style={{
              top: '1.25rem',
              left: '1.25rem',
            }}
            onClick={(e) => {
              e.stopPropagation();
              setShowVideo(true);
            }}
            aria-label="Play demo video"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Demo</span>
            <span className="text-xs opacity-75 ml-0.5">0:57s</span>
          </button>

          {/* Animated center play button - premium style */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="p-3 bg-white/95 rounded-full backdrop-blur shadow-[0_4px_20px_rgba(0,0,0,0.15)] transform transition-all duration-300 scale-90 group-hover:scale-100">
              <div className="relative flex items-center justify-center w-12 h-12">
                <div className="absolute inset-0 rounded-full bg-gray-900/5 animate-ping opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <Play className="w-5 h-5 text-gray-900 relative" strokeWidth={2.5} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Video Modal */}
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
              {/* Close button */}
              <button
                className="absolute top-4 right-4 z-20 bg-white/90 hover:bg-white text-black rounded-full p-2 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                onClick={() => setShowVideo(false)}
                aria-label="Close video"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Loading indicator */}
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
              )}

              {/* YouTube iframe */}
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/ipF351hwBgs?si=cds3Abh3oIN6xbAs`}
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

              {/* Video title for screen readers */}
              <h2 id="video-modal-title" className="sr-only">
                Product Demonstration Video
              </h2>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// HeroSection: composes everything
export default function HeroSection() {
  const sectionRef = useRef(null);
  const isHeroVisible = useOnScreen(sectionRef, 0.1);
  const controls = useAnimation();

  useEffect(() => {
    if (isHeroVisible) {
      controls.start("visible");
    }
  }, [isHeroVisible, controls]);

  return (
    <motion.section
      id="home"
      ref={sectionRef}
      className="relative flex flex-col items-center justify-center w-full overflow-hidden py-20 pt-32 text-center min-h-[80vh] bg-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <BackgroundLayers />
      <div className="relative z-10 w-full max-w-screen-xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 px-4 sm:px-8 md:px-16 min-h-[60vh]">
        <div className="w-full md:w-1/2">
          <HeroContent />
        </div>
        <div className="w-full md:w-1/2">
          <DemoGraphic />
        </div>
      </div>
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.6 }}
      />
    </motion.section>
  );
}

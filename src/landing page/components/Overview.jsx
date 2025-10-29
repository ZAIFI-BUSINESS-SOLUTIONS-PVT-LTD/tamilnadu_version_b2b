import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import Overview_001 from '../../assets/landingpage images/Overview_001.webp';
import Overview_002 from '../../assets/landingpage images/Overview_002.webp';
import Overview_003 from '../../assets/landingpage images/Overview_003.webp';
import Overview_004 from '../../assets/landingpage images/Overview_004.webp';

const features = [
  {
    title: "Save 90% of institution's evaluation Time",
    desc: "Evaluation, analysis, and reporting — all done in minutes, not hours.",
    stat: "90%",
    color: "from-blue-600 to-blue-400"
  },
  {
    title: "Hours Saved Weekly for Every Teacher",
    desc: "No chasing errors. No manual reviews. Teachers get time to focus on real teaching — not tracking.",
    stat: "15+",
    color: "from-blue-600 to-blue-400"
  },
  {
    title: "of Students Improved in Just 2 Tests",
    desc: "Real progress, driven by real insights — not guesswork.",
    stat: "70%",
    color: "from-blue-600 to-blue-400"
  },
  {
    title: <span>One Repeated Mistake = <span className="font-bold">40,000 Ranks Lost</span></span>,
    desc: "A single repeated error can ruin a student's NEET rank. We detect it before it happens again.",
    stat: "40K",
    color: "from-blue-600 to-blue-400"
  },
];

const OverviewSection = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [direction, setDirection] = useState(1); // 1 for forward, -1 for backward

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setDirection(1);
      setActiveIndex((prev) => (prev + 1) % features.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isPaused]);

  const handlePrev = () => {
    setDirection(-1);
    setActiveIndex((prev) => (prev - 1 + features.length) % features.length);
    setIsPaused(true);
  };

  const handleNext = () => {
    setDirection(1);
    setActiveIndex((prev) => (prev + 1) % features.length);
    setIsPaused(true);
  };

  const goToSlide = (index) => {
    setDirection(index > activeIndex ? 1 : -1);
    setActiveIndex(index);
    setIsPaused(true);
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const childVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.6,
        ease: [0.16, 1, 0.3, 1]
      }
    }
  };

  const statVariants = {
    hidden: { opacity: 0, scale: 0.98, x: direction > 0 ? 40 : -40, filter: 'blur(4px)' },
    visible: {
      opacity: 1,
      scale: 1,
      x: 0,
      filter: 'blur(0px)',
      transition: {
        duration: 0.6,
        ease: [0.4, 0, 0.2, 1]
      }
    },
    exit: {
      opacity: 0,
      scale: 0.98,
      x: direction > 0 ? -40 : 40,
      filter: 'blur(4px)',
      transition: {
        duration: 0.5,
        ease: [0.4, 0, 0.2, 1]
      }
    }
  };

  const contentVariants = {
    hidden: { opacity: 0, x: direction > 0 ? 60 : -60, filter: 'blur(6px)' },
    visible: {
      opacity: 1,
      x: 0,
      filter: 'blur(0px)',
      transition: {
        duration: 0.7,
        ease: [0.4, 0, 0.2, 1]
      }
    },
    exit: {
      opacity: 0,
      x: direction > 0 ? -60 : 60,
      filter: 'blur(6px)',
      transition: {
        duration: 0.5,
        ease: [0.4, 0, 0.2, 1]
      }
    }
  };

  const mobileCardVariants = {
    hidden: { opacity: 0, y: 40, scale: 0.98, filter: 'blur(4px)' },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: 'blur(0px)',
      transition: {
        duration: 0.7,
        ease: [0.4, 0, 0.2, 1]
      }
    },
    exit: {
      opacity: 0,
      y: -40,
      scale: 0.98,
      filter: 'blur(4px)',
      transition: {
        duration: 0.5,
        ease: [0.4, 0, 0.2, 1]
      }
    }
  };

  return (
    <motion.section
      id="solution"
      className="py-20 md:py-28 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={containerVariants}
    >
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-20 -left-20 w-96 h-96 rounded-full bg-blue-100 opacity-20 blur-3xl"></div>
        <div className="absolute bottom-10 -right-20 w-96 h-96 rounded-full bg-purple-100 opacity-20 blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ">
        <motion.div
          className="flex flex-col items-center justify-center text-center w-full max-w-4xl mx-auto"
          variants={containerVariants}
        >
          <motion.h2
            className="text-4xl md:text-5xl font-bold mb-6 text-gray-700 leading-tight"
            variants={childVariants}
          >
            Why Coaching Institutes <span className="text-gray-700">Trust Inzight</span><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400">Ed</span><span className="text-gray-700"> ?</span>
          </motion.h2>
          <motion.p
            className="text-lg md:text-xl text-gray-600"
            variants={childVariants}
          >
            Empowering educators and students with actionable insights, automation, and real results.
          </motion.p>
        </motion.div>

        {/* Desktop version */}
        <div className="hidden lg:block mt-16">
          {/* Slide container */}
          <div className="relative flex flex-col lg:flex-row items-center gap-8 border border-gray-200 rounded-2xl px-12 min-h-[520px]" style={{ minHeight: '540px' }}>
            {/* Stat panel */}
            <div className="w-full lg:w-2/5 flex flex-col items-start justify-center min-h-[420px]" style={{ minHeight: '420px', position: 'relative' }}>
              <div style={{ minHeight: '440px', height: '440px', width: '100%', position: 'relative' }}>
                <AnimatePresence mode="popLayout" custom={direction}>
                  {features.map((feature, idx) => (
                    idx === activeIndex && (
                      <motion.div
                        key={idx}
                        className="text-left h-full flex flex-col justify-center absolute top-0 left-0 w-full"
                        variants={statVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        custom={direction}
                        style={{ minHeight: '340px', height: '340px' }}
                      >
                        <div className={`text-6xl md:text-7xl font-bold mb-4 bg-gradient-to-r ${feature.color} bg-clip-text text-transparent`}>
                          {feature.stat}
                        </div>
                        <h3 className="text-2xl md:text-3xl font-semibold text-gray-800 mb-4 leading-tight">
                          {feature.title}
                        </h3>
                        <p className="text-lg text-gray-600 mb-6">
                          {feature.desc}
                        </p>
                      </motion.div>
                    )
                  ))}
                </AnimatePresence>
              </div>
              {/* Indicators */}
              <div className="flex gap-2 mt-4">
                {features.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => goToSlide(idx)}
                    className={`h-2 rounded-full transition-all duration-300 ${idx === activeIndex ? 'bg-gradient-to-r from-blue-600 to-blue-400 w-8' : 'bg-gray-200 w-4'}`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* Image panel */}
            <div className="w-full lg:w-3/5 relative min-h-[520px] flex items-center" style={{ minHeight: '520px', position: 'relative' }}>
              <div style={{ minHeight: '440px', height: '440px', width: '100%', position: 'relative' }}>
                <AnimatePresence mode="popLayout" custom={direction}>
                  {features.map((feature, idx) => (
                    idx === activeIndex && (
                      <motion.div
                        key={idx}
                        className="relative overflow-hidden rounded-2xl shadow-sm border border-gray-100 w-full h-full flex items-center absolute top-0 left-0"
                        variants={contentVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        custom={direction}
                        style={{ minHeight: '440px', height: '440px' }}
                      >
                        <div className="aspect-w-16 aspect-h-9 w-full h-full min-h-[360px]">
                          <img
                            src={[Overview_001, Overview_002, Overview_003, Overview_004][idx]}
                            alt={`Feature ${idx + 1}`}
                            className="object-cover w-full h-full rounded-2xl min-h-[360px]"
                          />
                        </div>
                      </motion.div>
                    )
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>
          {/* Controls below content for desktop */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              onClick={handlePrev}
              className="flex items-center justify-center w-12 h-12 rounded-full bg-white hover:bg-gray-100 text-gray-700 shadow-lg border border-gray-200 transition-all hover:scale-110"
              aria-label="Previous slide"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="flex items-center justify-center w-12 h-12 rounded-full bg-white/90 hover:bg-gray-100 text-gray-700 shadow-lg border border-gray-200 transition-all hover:scale-110 backdrop-blur-sm"
              aria-label={isPaused ? 'Play slideshow' : 'Pause slideshow'}
            >
              {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
            </button>
            <button
              onClick={handleNext}
              className="flex items-center justify-center w-12 h-12 rounded-full bg-white hover:bg-gray-100 text-gray-700 shadow-lg border border-gray-200 transition-all hover:scale-110"
              aria-label="Next slide"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Mobile version */}
        <div className="block lg:hidden mt-12">
          <div className="relative min-h-[640px]" style={{ minHeight: '640px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ minHeight: '560px', height: '560px', width: '100%', position: 'relative', overflow: 'hidden' }}>
              <AnimatePresence mode="popLayout" custom={direction}>
                {features.map((feature, idx) => (
                  idx === activeIndex && (
                    <motion.div
                      key={idx}
                      className="bg-white p-6 rounded-2xl border border-gray-100 flex flex-col min-h-[540px] absolute top-0 left-0 w-full h-full"
                      variants={mobileCardVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      custom={direction}
                      style={{ minHeight: '560px', height: '560px', maxHeight: '560px', overflow: 'hidden' }}
                    >
                      {/* Image */}
                      <div className="relative w-full h-80 rounded-xl overflow-hidden mb-6 min-h-[320px]">
                        <img
                          src={[Overview_001, Overview_002, Overview_003, Overview_004][idx]}
                          alt={`Feature ${idx + 1}`}
                          className="object-cover w-full h-full min-h-[320px]"
                        />
                      </div>
                      {/* Content */}
                      <div className={`text-5xl font-bold mb-3 bg-gradient-to-r ${feature.color} bg-clip-text text-transparent`}>
                        {feature.stat}
                      </div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-3 leading-tight">
                        {feature.title}
                      </h3>
                      <p className="text-gray-600 mb-10">
                        {feature.desc}
                      </p>
                    </motion.div>
                  )
                ))}
              </AnimatePresence>
            </div>
            {/* Controls below content for mobile */}
            <div className="flex items-center justify-center gap-4 mt-8">
              <button
                onClick={handlePrev}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-white hover:bg-gray-100 text-gray-700 shadow border border-gray-200 transition-all"
                aria-label="Previous slide"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => setIsPaused(!isPaused)}
                className="flex items-center justify-center px-4 py-2 rounded-full bg-white hover:bg-gray-100 text-gray-700 shadow border border-gray-200 transition-all text-sm"
                aria-label={isPaused ? 'Play slideshow' : 'Pause slideshow'}
              >
                {isPaused ? <><Play className="h-4 w-4 mr-1" />Play</> : <><Pause className="h-4 w-4 mr-1" />Pause</>}
              </button>
              <button
                onClick={handleNext}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-white hover:bg-gray-100 text-gray-700 shadow border border-gray-200 transition-all"
                aria-label="Next slide"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            {/* Indicators below controls for mobile */}
            <div className="flex gap-2 mt-4 justify-center">
              {features.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => goToSlide(idx)}
                  className={`h-2 rounded-full transition-all duration-300 ${idx === activeIndex ? 'bg-gradient-to-r from-blue-600 to-blue-400 w-6' : 'bg-gray-200 w-3'}`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
};

export default OverviewSection;
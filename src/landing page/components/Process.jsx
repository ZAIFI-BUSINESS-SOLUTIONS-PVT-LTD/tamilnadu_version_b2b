import React, { useState, useRef, useEffect } from 'react';
import BookDemoModal from './Book_Demo.jsx';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import process001 from '../../assets/landingpage-images/process_001.svg';
import process002 from '../../assets/landingpage-images/process_002.svg';
import process003 from '../../assets/landingpage-images/process_003.svg';
import process004 from '../../assets/landingpage-images/process_004.svg';
import { DotBackground } from "./animations/DotBackground";

const steps = [
    {
        title: 'Upload',
        description: 'Question paper, Answer key and Student responses',
    },
    {
        title: 'Instant Analysis',
        description:
            'Receive analytics on strengths, weaknesses, and personalized action steps',
    },
    {
        title: 'Improve Smarter',
        description:
            'Follow AI-guided study tips and revisit weaker topics to boost performance',
    },
];

// Shifted icons to match the new 3-step process (removed Sign Up)
const svgIcons = [process002, process003, process004];

// helper to create safe ids from titles for deep-linking
const slugify = (s) =>
    String(s)
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9\-]/g, "");

// Build a minimal HowTo schema for the process steps
const buildHowToSchema = (steps) => {
    const origin = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';
    return {
        "@context": "https://schema.org",
        "@type": "HowTo",
        name: "How to get started with InzightEd",
        step: steps.map((s, i) => ({
            "@type": "HowToStep",
            position: i + 1,
            name: s.title,
            text: s.description,
            url: origin + `#process-step-${slugify(s.title)}`
        }))
    };
};


const introAnimation = {
    initial: { opacity: 0, y: 50 },
    whileInView: { opacity: 1, y: 0 },
    transition: { duration: 1, ease: 'easeOut' },
    viewport: { once: true },
};


// Four unique SVG blob paths
const blobPaths = [
    // Blob 1
    "M 78.67562167870172,0 C 78.52109419213453,12.207238578588811 62.26424018232183,34.0343658298836 53.645652360121616,45.014047109642625 C 45.027064537921405,55.99372838940165 26.33481542160347,79.73073240541352 14.431345753771996,81.84422880598432 C 2.527876085940523,83.95772520655511 -23.493682479325642,68.23394393994232 -35.08463682186772,60.76837354057678 C -46.675591164409795,53.30280314121124 -65.23691097635665,38.510540387340725 -71.96940624615777,26.19472165141355 C -78.7019015159589,13.87890291548637 -89.50178088870044,-18.12886817269955 -85.26968948934402,-31.035628859242866 C -81.0375980899876,-43.942389545786185 -53.80687486591174,-63.14766210346312 -40.42274765094882,-70.01425271297876 C -27.038620435985905,-76.8808433224944 1.723525364259972,-85.4444473007578 14.497648217371987,-82.22024876239503 C 27.271771070484,-78.99605022403226 46.187830831708396,-57.01070777264463 54.79752395321913,-45.98058213857437 C 63.40721707472986,-34.95045650450411 78.8301491652689,-12.207238578588811 78.67562167870172,0 Z",
    // Blob 2
    "M 81.69969917632476,0 C 81.6917788367024,16.689070744256448 40.44544803039036,66.39164812506212 23.368787181652674,71.92173159272451 C 6.2921263329149895,77.4518150603869 -55.4783523915904,61.525224346686976 -65.6997052457009,47.733629938418616 C -75.9210580998114,33.94203553015026 -75.18491155004227,-33.235390428282145 -64.85814057832741,-47.122197417505056 C -54.53136960661254,-61.00900440672797 6.457989545656044,-77.59138595136677 23.437152616411726,-72.13213876579434 C 40.41631568716741,-66.6728915802219 81.70761951594712,-16.689070744256448 81.69969917632476,0 Z",
    // Blob 3
    "M 75.03789528190777,0 C 75.37359358968463,11.638186133290022 60.03255281531589,57.359216135967614 51.39442531336478,64.4465709199275 C 42.75629781141367,71.53392570388738 -5.676997860551927,78.50526245449979 -17.290042874525554,75.75262741124715 C -28.90308788849918,72.99999236799451 -67.16200753343465,45.57335294209343 -72.73068184855791,35.02525038683093 C -78.29935616368117,24.477147831568438 -81.85044008014944,-25.98195516258931 -76.81037499093479,-36.98992705672274 C -71.77030990172014,-47.997898950856175 -30.519386872162464,-80.48471178757214 -18.860347362721487,-82.6325809012282 C -7.201307853280511,-84.78045001488425 39.021296749729935,-67.6782927834752 47.80634067434544,-59.947255094420484 C 56.59138459896095,-52.21621740536576 74.7021969741309,-11.638186133290022 75.03789528190777,0 Z",
    // Blob 4
    "M 86.0929343872736,0 C 85.63849181338685,24.550003604461796 47.17027718793581,62.29879258856226 22.655216103500347,69.7255856328907 C -1.8598449809351116,77.15237867721913 -46.2215731938238,64.73095301250999 -61.57234472404645,44.73492699102627 C -76.9231162542691,24.73890096954255 -84.24712504174076,-30.31839532250947 -69.80941022466341,-50.719505383190224 C -55.37169540758606,-71.12061544387097 -0.4900315081935709,-86.57050748311998 25.39252886327395,-78.15016804974574 C 51.27508923474147,-69.7298286163715 86.54737696116035,-24.550003604461796 86.0929343872736,0 Z",
];

const Process = () => {
    // For mobile: array of open indices (only first step open by default, others collapsed)
    const [openIndex, setOpenIndex] = useState([0]);
    const [openDemoModal, setOpenDemoModal] = useState(false);
    // Refs for the desktop grid and each icon
    const gridContainerRef = useRef(null);
    const iconRefs = [useRef(null), useRef(null), useRef(null)];

    // Animation sequence state
    const [activeStep, setActiveStep] = useState(0);
    const [beamStep, setBeamStep] = useState(0); // which beam to show
    const [isAnimating, setIsAnimating] = useState(true);

    // Animation sequence effect
    useEffect(() => {
        if (!isAnimating) return;
        const timer = setTimeout(() => {
            if (beamStep < 3) {
                setActiveStep((prev) => prev + 1);
                setBeamStep((prev) => prev + 1);
            } else {
                // Reset to loop
                setActiveStep(0);
                setBeamStep(0);
            }
        }, 2200); // 2.2s per step for slower animation
        return () => clearTimeout(timer);
    }, [beamStep, isAnimating]);

    // Inject HowTo JSON-LD for the process steps to improve search result appearance
    useEffect(() => {
        const payload = buildHowToSchema(steps);
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.text = JSON.stringify(payload);
        document.head.appendChild(script);
        return () => script.remove();
    }, []);

    // Reset animation if needed (optional, e.g. on mouse hover)
    // React.useEffect(() => {
    //     setActiveStep(0);
    //     setBeamStep(0);
    //     setIsAnimating(true);
    // }, []);

    return (
        <motion.section
            className="pt-20 pb-20 bg-white relative overflow-hidden"
            aria-labelledby="process-heading"
            {...introAnimation}
        >
            {/* Decorative background elements (aria-hidden) */}
            <div aria-hidden="true" role="presentation" className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-l from-blue-200/40 to-transparent rounded-full blur-3xl"></div>
            <div aria-hidden="true" role="presentation" className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-r from-indigo-200/40 to-transparent rounded-full blur-3xl"></div>
            <div aria-hidden="true" role="presentation">
                <DotBackground />
            </div>
            <div className="relative z-10 w-full max-w-screen-2xl mx-auto items-center px-3 sm:px-4 md:px-8">
                {/* Header */}
                <div className="text-center mb-12 md:mb-20">
                    <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-extrabold mb-4 sm:mb-6 bg-white shadow-md">
                        <span className="bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-pink-400 via-indigo-600 to-sky-400 bg-clip-text text-transparent animate-gradient-x">
                            So, what you need to do?
                        </span>
                    </div>
                    <h2 id="process-heading" className="text-3xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
                        Your Path to Success
                        <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">
                            Starts Here
                        </span>
                    </h2>
                    <p className="text-lg md:text-xl text-gray-600 mt-4 max-w-3xl mx-auto">
                        Follow our straightforward four-step process to transform your
                        learning experience and unlock actionable insights.
                    </p>
                </div>

                {/* Steps Grid with connecting dotted line */}
                {/* Mobile Accordion */}
                <div className="block md:hidden px-4">
                    {steps.map((step, idx) => {
                        const isOpen = openIndex.includes(idx);
                        return (
                            <div key={idx} className="border-b border-gray-200 py-4">
                                <button
                                    className="w-full flex items-center justify-between"
                                    aria-expanded={isOpen}
                                    aria-controls={`process-panel-${idx}`}
                                    onClick={() => {
                                        if (isOpen) {
                                            setOpenIndex(openIndex.filter(i => i !== idx));
                                        } else {
                                            setOpenIndex([...openIndex, idx]);
                                        }
                                    }}
                                >
                                    <div className="flex items-center">
                                        <div className="bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full w-10 h-10 flex items-center justify-center mr-4">
                                            <img src={svgIcons[idx]} alt={`Icon for ${step.title}`} width={20} height={20} loading="lazy" className="w-5 h-5" />
                                        </div>
                                        <span id={`process-step-${slugify(step.title)}`} className="text-xl md:text-2xl font-semibold text-gray-900 text-start" >{step.title}</span>
                                    </div>
                                    {isOpen ? <ChevronUp className="text-gray-600" /> : <ChevronDown className="text-gray-600" />}
                                </button>
                                <div id={`process-panel-${idx}`} role="region" aria-labelledby={`process-step-${slugify(step.title)}`}>
                                    {isOpen && (
                                        <>
                                            <p className="mt-2 text-base md:text-lg text-gray-700 ml-14 leading-relaxed">{step.description}</p>
                                            {idx === 0 && (
                                                    <button
                                                        onClick={() => setOpenDemoModal(true)}
                                                        className="ml-14 mt-4 px-6 py-2 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 text-white font-semibold shadow-md hover:from-blue-500 hover:to-blue-600 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
                                                        type="button"
                                                    >
                                                        Get Started
                                                    </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
                {/* Desktop Grid */}
                <div className="hidden md:block relative w-full">
                    <div
                        className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-x-8 gap-y-20 relative z-20 justify-center justify-items-center"
                        ref={gridContainerRef}
                    >
                        {steps.map((step, idx) => (
                            <div
                                    key={idx}
                                    className="relative flex flex-col items-center text-center group p-4"
                                >
                                {/* Illustration */}
                                <motion.div
                                    className="relative flex items-center justify-center w-44 h-44 mb-8 bg-transparent"
                                    ref={iconRefs[idx]}
                                    animate={{ scale: activeStep === idx ? 1.30 : 1 }}
                                    transition={{ type: 'spring', stiffness: 70, damping: 16, mass: 0.8, duration: 1.1 }}
                                >
                                    {/* Unique SVG blob background for each step */}
                                    <svg
                                        className="absolute inset-0 w-full h-full transition-colors duration-1000"
                                        aria-hidden="true"
                                        focusable="false"
                                        viewBox="-120 -120 240 240"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                        style={{ zIndex: 0 }}
                                    >
                                        <path
                                            d={blobPaths[idx]}
                                            fill={activeStep === idx ? `url(#blobGradientActive${idx})` : 'url(#blobGradient)'}
                                        />
                                        <defs>
                                            <linearGradient id="blobGradient" x1="0" y1="0" x2="1" y2="1">
                                                <stop offset="0%" stopColor="#bae6fd" />
                                                <stop offset="100%" stopColor="#c7d2fe" />
                                            </linearGradient>
                                            {/* Four unique gradients for active blobs */}
                                            <linearGradient id="blobGradientActive0" x1="0" y1="0" x2="1" y2="1">
                                                <stop offset="0%" stopColor="#fbbf24" />
                                                <stop offset="100%" stopColor="#f59e42" />
                                            </linearGradient>
                                            <linearGradient id="blobGradientActive1" x1="0" y1="0" x2="1" y2="1">
                                                <stop offset="0%" stopColor="#34d399" />
                                                <stop offset="100%" stopColor="#06b6d4" />
                                            </linearGradient>
                                            <linearGradient id="blobGradientActive2" x1="0" y1="0" x2="1" y2="1">
                                                <stop offset="0%" stopColor="#a3e635" />
                                                <stop offset="100%" stopColor="#fde047" />
                                            </linearGradient>
                                            <linearGradient id="blobGradientActive3" x1="0" y1="0" x2="1" y2="1">
                                                <stop offset="0%" stopColor="#f472b6" />
                                                <stop offset="100%" stopColor="#f87171" />
                                            </linearGradient>
                                        </defs>
                                    </svg>
                                    <img
                                        src={svgIcons[idx]}
                                        alt={`Illustration for ${step.title}`}
                                        width={80}
                                        height={80}
                                        loading="lazy"
                                        className="w-20 h-20 relative z-10"
                                    />
                                </motion.div>

                                {/* Title */}
                                <h3 id={`process-step-${slugify(step.title)}`} className="text-xl md:text-2xl font-semibold text-gray-900 mb-3">
                                    {step.title}
                                </h3>

                                {/* Description */}
                                <p className="text-base md:text-lg text-gray-700 leading-relaxed max-w-xs">
                                    {step.description}
                                </p>
                                {/* CTA Button for first step */}
                                {idx === 0 && (
                                    <button
                                        onClick={() => setOpenDemoModal(true)}
                                        className="mt-4 px-6 py-2 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 text-white font-semibold shadow-md hover:from-blue-500 hover:to-blue-600 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
                                        type="button"
                                    >
                                        Get Started
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <BookDemoModal open={openDemoModal} onClose={() => setOpenDemoModal(false)} />
        </motion.section>
    );
};

export default Process;

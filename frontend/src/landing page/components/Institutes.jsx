import React, { useEffect, useState } from 'react';
import BookDemoModal from './Book_Demo.jsx';
import { Users, BarChart, UploadCloud, FileText, LayoutDashboard } from 'lucide-react';
import { motion } from 'framer-motion';
import SampleReport from '../../assets/landingpage-images/sample-report1.webp';
import { WobbleCard } from "../../components/ui/wobble-card";

// helper to create safe ids from titles for deep-linking
const slugify = (s) =>
  String(s)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "");

// Exported features so SEO or pages can consume them
export const instituteFeatures = [
  {
    icon: <LayoutDashboard className="w-8 h-8 text-white" aria-hidden="true" focusable="false" />,
    title: "AI generated offline report",
    description: "See exactly how InzightEd transforms raw data into actionable educational insights."
  },
  {
    icon: <BarChart className="w-8 h-8 text-blue-600" aria-hidden="true" focusable="false" />,
    title: "Batch Analytics",
    description: "Identify learning trends, weak spots, and optimize your teaching approach"
  },
  {
    icon: <UploadCloud className="w-8 h-8 text-blue-600" aria-hidden="true" focusable="false" />,
    title: "Offline + Online Handling",
    description: "Upload scanned answer sheets from paper-based tests for automatic AI evaluation and reporting"
  },
  {
    icon: <FileText className="w-8 h-8 text-blue-600" aria-hidden="true" focusable="false" />,
    title: "Instant Student Reports",
    description: "Share personalized performance reports with students and parents"
  },
  {
    icon: <Users className="w-8 h-8 text-blue-600" aria-hidden="true" focusable="false" />,
    title: "Centralized Student Management",
    description: "Enroll batches, manage classrooms, and track each student’s journey in one place"
  }
];

// Institutes/Value Section
const Value = () => {
  const features = instituteFeatures;

  const [openDemoModal, setOpenDemoModal] = useState(false);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 1,
        ease: 'easeOut',
        staggerChildren: 0.2,
        delayChildren: 0.2,
      },
    },
  };
  const childVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 1, ease: 'easeOut' } },
  };

  return (
    <motion.section
      id="value"
      aria-labelledby="institutes-heading"
      className="bg-white pb-4 sm:pb-24 pt-16 overflow-hidden w-full"
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
    >
      <div className="w-full max-w-screen-2xl mx-auto px-3 sm:px-4 md:px-8">
        <motion.div className="text-center mb-16" variants={childVariants}>
          <div className="inline-flex items-center gap-2 bg-white px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium mb-4 sm:mb-6 shadow-lg">
            <span className="bg-gradient-to-tr from-blue-600 via-fuchsia-500 to-orange-400 bg-clip-text text-transparent font-bold ">Curated options for Institutions</span>
          </div>
          <h2 id="institutes-heading" className="justify-center text-3xl md:text-6xl font-bold mb-6 text-gray-800">
            <span className="text-blue-500">What more </span> do you get?
          </h2>
          <p className="text-center text-xl text-gray-600 mt-4">
            Our solution is built on solid educational foundations and cutting-edge technology
          </p>
        </motion.div>
        {/* Inject structured data for institute features (defensive) */}
        <ScriptInjector features={features} />

  <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 lg:grid-rows-4 gap-3 sm:gap-4"
          variants={containerVariants}
        >
          {/* Report Card using WobbleCard */}
          <motion.div
            className="col-span-1 sm:col-span-2 md:col-span-2 lg:col-span-2 lg:row-span-4 h-full w-full"
            variants={childVariants}
          >
            <WobbleCard
              containerClassName="h-full bg-gradient-to-br from-blue-500 to-blue-600 min-h-[320px] md:min-h-[500px] lg:min-h-[300px] relative"
              className="flex flex-col items-center justify-start relative z-10 px-0 py-4 sm:py-6">
              <div className="max-w-xs md:max-w-lg w-full flex flex-col gap-4">
        {/* Image row: visible only on mobile */}
                <div className="md:hidden w-full flex justify-center mb-2">
                  <img
                    src={SampleReport}
                    width={320}
                    height={256}
          alt="Sample AI-generated student performance report"
          loading="lazy"
                    className="object-contain rounded-2xl shadow-xl mx-auto"
                    style={{ maxWidth: '100%', zIndex: 20 }}
                  />
                </div>
                {/* Content row */}
                <div className="w-full flex flex-col items-center">
                  <h3 className="text-center text-balance text-sm md:text-lg lg:text-3xl font-semibold tracking-[-0.015em] text-white mb-4">
                      Have a look at InzightEd's AI generated report
                    </h3>
                  <ul className="mb-2 flex flex-col items-center justify-center text-start">
                    {[
                      "Student performance trends",
                      "Personalized recommendations",
                      "Actionable teaching strategies"
                    ].map((text, idx) => (
                      <li key={idx} className="flex items-center text-white text-sm font-medium mb-2 justify-start">
                        <span className="inline-block w-2 h-2 bg-white rounded-full mr-3"></span>
                        <span>{text}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => {
                      const githubPdfUrl = 'https://github.com/ZAIFI-BUSINESS-SOLUTIONS-PVT-LTD/inzighted-public-files/raw/main/sample%20report.pdf';
                      try {
                        const link = document.createElement('a');
                        link.href = githubPdfUrl;
                        link.download = 'InzightEd_Sample_Report.pdf';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        if (window.gtag) {
                          window.gtag('event', 'conversion', {
                            send_to: 'AW-123456789/AbC-D_efGhIJKLmnopQr',
                            event_callback: () => { }
                          });
                        }
                      } catch (error) {
                        console.error('Download failed:', error);
                        window.open(githubPdfUrl, '_blank');
                      }
                    }}
                    className="w-full sm:w-auto bg-white text-blue-600 hover:bg-white/80 font-semibold py-2 px-6 sm:py-3 sm:px-8 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 max-w-md mx-auto shadow-lg backdrop-blur"
                  >
                    <span>Download Sample Report</span>
                  </button>
                </div>
                {/* Image: visible only on md+ (desktop/tablet), hidden on mobile */}
                <img
                  src={SampleReport}
                  width={600}
                  height={480}
                  alt="Sample AI-generated student performance report"
                  loading="lazy"
                  className="hidden md:block absolute left-1/2 -translate-x-1/2 md:-bottom-[38rem] object-contain rounded-2xl shadow-xl pointer-events-none"
                  style={{ maxWidth: '120%', zIndex: 20 }}
                />
              </div>
            </WobbleCard>
          </motion.div>
          {[1, 2, 3, 4].map((idx) => (
            <motion.div
              key={features[idx].title}
              className={`col-span-1 h-full bg-white min-h-[200px] sm:min-h-[260px] border flex flex-col items-center justify-start px-6 py-6 sm:px-8 sm:py-8 text-center text-sm sm:text-base ${idx === 1 ? 'lg:col-start-3 lg:row-span-2' : ''}${idx === 2 ? 'lg:col-start-4 lg:row-span-2' : ''}${idx === 3 ? 'lg:col-start-3 lg:row-start-3 lg:row-span-2' : ''}${idx === 4 ? 'lg:col-start-4 lg:row-start-3 lg:row-span-2' : ''} rounded-2xl`}
              variants={childVariants}
            >
              <div className="bg-blue-50 p-3 rounded-full mb-3" aria-hidden="true">
                {features[idx].icon}
              </div>
              <h3 id={`institute-feature-${slugify(features[idx].title)}`} className="text-lg font-semibold mb-2 text-blue-800">
                {features[idx].title}
              </h3>
              <p className="text-gray-500 text-sm">
                {features[idx].description}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Book a demo CTA - placed below the features grid */}
        <motion.div className="mt-16 flex justify-center" variants={childVariants}>
          <button
            id="book-demo"
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setOpenDemoModal(true);
            }}
            className="inline-flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold py-3 px-6 rounded-full shadow-xl transition-all duration-200"
          >
            <span>Book a demo</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M10.293 15.707a1 1 0 010-1.414L13.586 11H3a1 1 0 110-2h10.586l-3.293-3.293a1 1 0 111.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        </motion.div>
        <BookDemoModal open={openDemoModal} onClose={() => setOpenDemoModal(false)} />
      </div>
    </motion.section>
  );
}
export default Value;

function ScriptInjector({ features }) {
  useEffect(() => {
    if (!features || features.length === 0) return;
    const origin = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';

    const itemList = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: features.map((f, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: { "@type": "Service", name: f.title, description: f.description, url: origin }
      }))
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(itemList);
    document.head.appendChild(script);

    return () => script.remove();
  }, [features]);

  return (
    <div className="sr-only" aria-hidden="true">
      <h3 id="institutes-features-visually-hidden">Institutes features</h3>
      <ul>
        {features.map((f, i) => (
          <li key={i} id={`institute-feature-text-${i}`}>{f.title}: {f.description}</li>
        ))}
      </ul>
      <p>Sample report: This sample report demonstrates student performance trends, personalized recommendations and actionable teaching strategies provided by InzightEd.</p>
    </div>
  );
}


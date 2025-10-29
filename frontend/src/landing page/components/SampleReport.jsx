import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, X, Badge, Check } from 'lucide-react';
import SampleReport from '../../assets/landingpage images/sample report1.webp';

const MagnetSection = () => {
  const [showNotification, setShowNotification] = useState(false);

  const handleDownload = () => {
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
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 4000);
  };

  const features = [
    {
      icon: (
        <div className="flex-shrink-0 rounded-full mr-3 relative w-5 h-5 flex items-center justify-center">
          <Badge className="w-5 h-5 text-transparent absolute inset-0" fill="#3b82f6" />
          <Check className="w-3 h-3 text-white z-10" strokeWidth={4} />
        </div>
      ),
      text: "Student performance trends"
    },
    {
      icon: (
        <div className="flex-shrink-0 rounded-full mr-3 relative w-5 h-5 flex items-center justify-center">
          <Badge className="w-5 h-5 text-transparent absolute inset-0" fill="#3b82f6" />
          <Check className="w-3 h-3 text-white z-10" strokeWidth={4} />
        </div>
      ),
      text: "Personalized learning recommendations"
    },
    {
      icon: (
        <div className="flex-shrink-0 rounded-full mr-3 relative w-5 h-5 flex items-center justify-center">
          <Badge className="w-5 h-5 text-transparent absolute inset-0" fill="#3b82f6" />
          <Check className="w-3 h-3 text-white z-10" strokeWidth={4} />
        </div>
      ),
      text: "Benchmark comparisons"
    },
    {
      icon: (
        <div className="flex-shrink-0 rounded-full mr-3 relative w-5 h-5 flex items-center justify-center">
          <Badge className="w-5 h-5 text-transparent absolute inset-0" fill="#3b82f6" />
          <Check className="w-3 h-3 text-white z-10" strokeWidth={4} />
        </div>
      ),
      text: "Actionable teaching strategies"
    }
  ];

  return (
    <section
      className="px-4 py-12 sm:px-6 lg:px-8 text-gray-700  bg-blue-50 relative overflow-hidden"
      aria-labelledby="magnet-heading"
    >
      {/* Background image with rotation and scale */}
      <div
        className="absolute top-1/2 left-1/2 w-[60vw] max-w-xl aspect-[16/9] pointer-events-none select-none"
        style={{
          backgroundImage: `url(${SampleReport})`,
          backgroundSize: 'contain', // maintain aspect ratio
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          transform: 'translate(60%, 0%) scale(4) rotate(35deg)', // scale 1x
          transformOrigin: 'center',
          zIndex: 1,
        }}
      ></div>


      {/* Notification Popup */}
      {showNotification && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 bg-blue-600 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in max-w-[90vw]">
          <span className="text-sm sm:text-base">Thank you! Your download should begin shortly.</span>
          <button onClick={() => setShowNotification(false)} className="ml-2">
            <X size={18} />
          </button>
        </div>
      )}

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-16">
          {/* Content Side */}
          <div className="flex-1 flex flex-col justify-center text-center lg:text-left bg-white/50 lg:bg-transparent p-6 lg:p-0 rounded-lg lg:rounded-none backdrop-blur-sm lg:backdrop-blur-none">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              {/* Tagline */}
              {/* Content*/}
              <h2 id="magnet-heading" className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                Have a look at InzightEd's AI generated report
              </h2>
              <p className="text-gray-600 text-base sm:text-lg mb-6">
                See exactly how InzightEd transforms raw data into actionable educational insights.
              </p>

              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-3 mb-6 lg:mb-8">
                {features.map((feature, index) => (
                  <motion.li
                    key={index}
                    className="flex items-start gap-2 text-gray-700 text-sm sm:text-base"
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    viewport={{ once: true }}
                  >
                    {feature.icon}
                    <span className="whitespace-normal max-w-full leading-snug">{feature.text}</span>
                  </motion.li>
                ))}
              </ul>

              <button
                type="button"
                onClick={handleDownload}
                className="w-full sm:w-auto bg-blue-600 text-white hover:bg-blue-700 font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 max-w-md mx-auto lg:mx-0"
              >
                <Download className="w-5 h-5" />
                <span>Download Sample Report</span>
              </button>
            </motion.div>
          </div>

          {/* Empty div to balance the flex layout */}
          <div className="flex-1 hidden lg:block"></div>
        </div>
      </div>
    </section>
  );
};

export default MagnetSection;
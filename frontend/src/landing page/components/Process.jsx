import React from 'react';
import { motion } from 'framer-motion';
import { UploadCloud, Settings, Cloud, Timer, Badge, Check } from 'lucide-react';
import Process from '../../assets/landingpage images/Process.png';

const SimpleEvaluation = () => {
  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const staggerContainer = {
    visible: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const featureItem = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <section className="bg-white py-16 lg:py-24 px-4 sm:px-6 lg:px-8 text-gray-700">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <motion.h2
            variants={fadeInUp}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-5xl font-bold mb-4 leading-tight"
          >
            Streamline Your Evaluation Process
          </motion.h2>

          <motion.div
            variants={fadeInUp}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-500 text-3xl md:text-4xl font-bold mb-6"
          >
            Set It. Forget It. Get Results.
          </motion.div>

          <motion.p
            variants={fadeInUp}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-gray-600 max-w-3xl mx-auto"
          >
            Upload your test paper, answer key, and student responses - InzightEd handle the rest, delivering comprehensive insights in minutes.
          </motion.p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column: Feature highlight card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col h-full"
          >
            {/* Gradient header */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-500 px-8 py-10 text-white">
              <h3 className="text-2xl font-bold mb-3">Built for Educators</h3>
              <p className="text-blue-100 text-lg">Intuitive interface designed specifically for teachers, no training needed.</p>

              <div className="mt-6 space-y-3">
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <div className="flex-shrink-0 rounded-full mr-3 relative w-5 h-5 flex items-center justify-center">
                      <Badge className="w-5 h-5 text-transparent absolute inset-0" fill="#ffffff" />
                      <Check className="w-3 h-3 text-blue-500 z-10" strokeWidth={4} />
                    </div>
                  </div>
                  <p className="ml-3 text-blue-50">No technical expertise required</p>
                </div>

                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <div className="flex-shrink-0 rounded-full mr-3 relative w-5 h-5 flex items-center justify-center">
                      <Badge className="w-5 h-5 text-transparent absolute inset-0" fill="#ffffff" />
                      <Check className="w-3 h-3 text-blue-500 z-10" strokeWidth={4} />
                    </div>
                  </div>
                  <p className="ml-3 text-blue-50">Works with your existing materials</p>
                </div>
              </div>
            </div>

            {/* Process image */}
            <div className="p-8 bg-gray-50 flex-1 flex flex-col">
              <div className="rounded-lg overflow-hidden border border-gray-200 border-dashed flex-1 flex items-center justify-center">
                <img
                  src={Process}
                  alt="Evaluation process workflow"
                  className="w-[30%] h-auto object-cover p-4"
                />
              </div>
              <p className="mt-4 text-sm text-gray-500 text-center">
                Automated evaluation workflow saves you hours
              </p>
            </div>
          </motion.div>

          {/* Right column: Features grid */}
          <div className="flex flex-col h-full">
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="flex flex-col gap-6 flex-1"
            >
              {[
                {
                  icon: <UploadCloud className="w-6 h-6 text-blue-600" />,
                  title: "Simple File Upload",
                  description: "Drag-and-drop interface for your test materials"
                },
                {
                  icon: <Settings className="w-6 h-6 text-blue-600" />,
                  title: "Zero Configuration",
                  description: "Works instantly with no setup required"
                },
                {
                  icon: <Cloud className="w-6 h-6 text-blue-600" />,
                  title: "Cloud-Based Platform",
                  description: "Access from anywhere, on any device"
                },
                {
                  icon: <Timer className="w-6 h-6 text-blue-600" />,
                  title: "Rapid Analysis",
                  description: "Detailed insights in under 60 minutes"
                }
              ].map((feature, index) => (
                <motion.div
                  key={index}
                  variants={featureItem}
                  transition={{ duration: 0.4, delay: 0.1 * index }}
                  className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all h-full"
                >
                  <div className="flex items-start h-full">
                    <div className="bg-blue-50 p-3 rounded-lg mr-4 flex-shrink-0">
                      {feature.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                      <p className="text-gray-600">{feature.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SimpleEvaluation;
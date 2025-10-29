import React from 'react';
import { BookOpenText, Users, ShieldCheck, FileText, BrainCircuit, Rocket } from 'lucide-react';

const Value = () => {
  const features = [
    {
      icon: <Users className="w-8 h-8 text-blue-600" />,
      title: "Co-Created with NEET Educators",
      description: "Built with insights from 15+ NEET faculty across Tamil Nadu and Karnataka."
    },
    {
      icon: <FileText className="w-8 h-8 text-blue-600" />,
      title: "Aligned with SARAS 5.0 & 6.0",
      description: "Supports CBSE mandates on outcome tracking and academic documentation."
    },
    {
      icon: <BookOpenText className="w-8 h-8 text-blue-600" />,
      title: "NEP 2020 Compliant",
      description: "Implements competency-based, formative assessments through AI-led diagnostics."
    },
    {
      icon: <ShieldCheck className="w-8 h-8 text-blue-600" />,
      title: "EdTech Policy Ready",
      description: "Ensures full data ownership, encrypted access, and role-based control."
    },
    {
      icon: <BrainCircuit className="w-8 h-8 text-blue-600" />,
      title: "Curriculum-Aware Testing Logic",
      description: "Understands NEET blueprint patterns and delivers mapped insights across Physics, Chemistry, and Biology — down to the chapter and topic level."
    },
    {
      icon: <Rocket className="w-8 h-8 text-blue-600" />,
      title: "Powered by Proprietary AI-Tech",
      description: "Delivers hyper-personalized, ultra-precise insights with high operational efficiency."
    }
  ];

  return (
    <section
      id="value"
      aria-label="Proof of Value"
      className="bg-white py-24 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-800">
            Proof of Value
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Our solution is built on solid educational foundations and cutting-edge technology
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col items-center text-center">
                <div className="bg-blue-50 p-4 rounded-full mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3 text-gray-800">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Value;
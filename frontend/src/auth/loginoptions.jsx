import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, ChalkboardTeacher, ArrowLeft, Sparkle, Question, Lifebuoy } from '@phosphor-icons/react';
import { motion } from 'framer-motion';

const LoginOptions = () => {
  const navigate = useNavigate();

  // Simplified animations
  const container = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { y: 10, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "easeOut",
        duration: 0.3
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      {/* Main Card - More minimalist like Google/Cursor */}
      <motion.div
        className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
        initial="hidden"
        animate="visible"
        variants={container}
      >
        {/* Cleaner Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-6 relative">
          <motion.button
            onClick={() => navigate('..')}
            className="absolute top-4 left-4 text-white hover:bg-white/10 p-2 rounded-full transition-colors"
            aria-label="Go back"
            variants={item}
          >
            <ArrowLeft size={20} weight="bold" />
          </motion.button>
          
          <motion.div className="flex flex-col items-center" variants={item}>
            <div className="flex items-center mb-3">
              <Sparkle weight="fill" size={24} className="text-yellow-300 mr-2" />
              <h1 className="text-2xl font-medium text-white">Welcome Back</h1>
            </div>
            <p className="text-blue-100 text-center text-sm max-w-md">
              Continue your learning journey or manage your classroom
            </p>
          </motion.div>
        </div>

        {/* Content Area - More spacious like modern apps */}
        <div className="p-6">
          <motion.div variants={item}>
            <h2 className="text-base font-medium text-gray-600 mb-6 text-center">
              Select your role to continue
            </h2>
          </motion.div>

          <div className="space-y-4">
            {/* Student Option - More button-like */}
            <motion.div variants={item}>
              <Link
                to="./student/login"
                className="group flex items-center p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 w-full"
              >
                <div className="bg-blue-100 p-3 rounded-lg mr-4 group-hover:bg-blue-200 transition-colors">
                  <GraduationCap weight="fill" size={20} className="text-blue-600" />
                </div>
                <div className="text-left">
                  <h3 className="text-base font-medium text-gray-800">Student</h3>
                  <p className="text-gray-500 text-sm">
                    Access courses and continue learning
                  </p>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-auto text-gray-400 group-hover:text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </motion.div>

            {/* Educator Option - More button-like */}
            <motion.div variants={item}>
              <Link
                to="./Educator/login"
                className="group flex items-center p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 w-full"
              >
                <div className="bg-blue-100 p-3 rounded-lg mr-4 group-hover:bg-blue-200 transition-colors">
                  <ChalkboardTeacher weight="fill" size={20} className="text-blue-600" />
                </div>
                <div className="text-left">
                  <h3 className="text-base font-medium text-gray-800">Educator</h3>
                  <p className="text-gray-500 text-sm">
                    Manage courses and students
                  </p>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-auto text-gray-400 group-hover:text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </motion.div>
          </div>

          {/* Help Section - More subtle */}
          <motion.div 
            className="mt-8 pt-6 border-t border-gray-100 flex flex-col space-y-3 text-sm"
            variants={item}
          >
            <a 
              href="#" 
              className="flex items-center justify-center text-gray-500 hover:text-blue-600 transition-colors"
            >
              <Question size={16} className="mr-2" />
              <span>Need help choosing?</span>
            </a>
            <a 
              href="#" 
              className="flex items-center justify-center text-gray-500 hover:text-blue-600 transition-colors"
            >
              <Lifebuoy size={16} className="mr-2" />
              <span>Contact Support</span>
            </a>
          </motion.div>
        </div>

        {/* Minimal Footer */}
        <div className="bg-gray-50 px-6 py-3 text-center border-t border-gray-100">
          <p className="text-xs text-gray-500">
            © 2025 Learning Platform
            <span className="mx-1">•</span>
            <a href="#" className="hover:text-blue-600 transition-colors">Privacy</a>
            <span className="mx-1">•</span>
            <a href="#" className="hover:text-blue-600 transition-colors">Terms</a>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginOptions;
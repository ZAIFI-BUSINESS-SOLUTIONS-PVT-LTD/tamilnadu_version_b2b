import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, ChalkboardTeacher, ArrowLeft } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import logo from '../assets/images/logo.svg';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '../components/ui/card.jsx';

const LoginOptions = () => {
  const navigate = useNavigate();

  const container = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.08 } },
  };

  const item = {
    hidden: { y: 8, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.28, ease: 'easeOut' } },
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white p-6">
      <motion.div
        className="w-full max-w-md"
        initial="hidden"
        animate="visible"
        variants={container}
      >
        <motion.div className="flex flex-col items-center mb-4" variants={item}>
          <img src={logo} alt="Inzighted" className="w-24 h-auto" />
          <p className="text-sm text-slate-600 mt-2">An AI Powered Learning Journey</p>
        </motion.div>
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-5 relative">
            <motion.button
              onClick={() => navigate('..')}
              className="absolute top-4 left-4 text-white hover:bg-white/10 p-2 rounded-full transition-colors"
              aria-label="Go back"
              variants={item}
            >
              <ArrowLeft size={18} weight="bold" />
            </motion.button>

            <CardHeader className="p-0">
              <motion.div className="flex flex-col items-center text-center" variants={item}>
                <div className="flex items-center mb-2">
                  <CardTitle className="text-white text-lg">Welcome back</CardTitle>
                </div>
                <CardDescription className="text-blue-100 text-sm max-w-xs">
                  Choose how you'd like to continue.
                </CardDescription>
              </motion.div>
            </CardHeader>
          </div>

          <CardContent className="p-6">
            <motion.div className="grid gap-3" variants={item}>
              <Link to="./student/login" className="group block">
                <div className="flex items-center gap-4 p-3 rounded-lg border border-slate-100 hover:border-blue-300 hover:bg-blue-50 transition-colors">
                  <div className="bg-blue-100 p-3 rounded-md">
                    <GraduationCap weight="fill" size={20} className="text-blue-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-slate-800">Student</p>
                    <p className="text-sm text-slate-500">Access your evaluated reports</p>
                  </div>
                </div>
              </Link>

              <Link to="./educator/login" className="group block">
                <div className="flex items-center gap-4 p-3 rounded-lg border border-slate-100 hover:border-blue-300 hover:bg-blue-50 transition-colors">
                  <div className="bg-blue-100 p-3 rounded-md">
                    <ChalkboardTeacher weight="fill" size={20} className="text-blue-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-slate-800">Educator</p>
                    <p className="text-sm text-slate-500">Access reports and manage students</p>
                  </div>
                </div>
              </Link>
            </motion.div>

          </CardContent>

          <div className="bg-slate-50 px-6 py-3 text-center border-t border-slate-100">
            <p className="text-xs text-gray-500">Need help? <a href="/contact" className="text-blue-600 hover:underline">Contact support</a></p>
          </div>
        </Card>

        <motion.div className="mt-4 text-center text-xs text-slate-500" variants={item}>
          By continuing, you agree to our <a href="#" className="underline">Terms</a> and <a href="#" className="underline">Privacy</a>.
        </motion.div>
      </motion.div>
    </div>
  );
};

export default LoginOptions;
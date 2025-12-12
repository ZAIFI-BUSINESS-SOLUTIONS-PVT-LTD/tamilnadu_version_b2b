import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { educatorLogin } from '../../utils/api';
import { motion } from 'framer-motion';
import { ArrowLeft, Eye, EyeOff, Lock, Mail, Sparkles } from 'lucide-react';
import educatorLoginImg from '../../assets/auth images/educatorlogin.svg';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '../../components/ui/card.jsx';
import logo from '../../assets/images/logo.svg';

const EducatorLogin = () => {
  const navigate = useNavigate();
  const [educatorId, setEducatorId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    document.title = 'Educator Login | Learning Platform';
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await educatorLogin(educatorId, password);
      if (response.error) {
        setError(response.error);
        setIsLoading(false);
        return;
      }

      localStorage.setItem('token', response.token);
      localStorage.setItem('csv_status', response.csv_status);
      localStorage.setItem('educator_email', educatorId);

      switch (response.csv_status) {
        case 'pending':
          navigate('/register');
          break;
        case 'started':
          navigate('/wait');
          break;
        case 'completed':
          navigate('/educator/dashboard');
          break;
        case 'failed':
          navigate('/csverror');
          break;
        default:
          setError('Unexpected status received.');
      }
    } catch {
      setError('Invalid credentials or network issue.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
      >
        <motion.div className="flex flex-col items-center mb-4">
          <img src={logo} alt="Inzighted" className="w-24 h-auto" />
          <p className="text-sm text-slate-600 mt-2">An AI Powered Learning Journey</p>
        </motion.div>
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-5 relative">
            <motion.button
              onClick={() => navigate('/auth')}
              className="absolute top-4 left-4 text-white hover:bg-white/10 p-2 rounded-full transition-colors"
              aria-label="Go back"
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeft size={18} />
            </motion.button>

            <CardHeader className="p-0">
              <motion.div className="flex flex-col items-center text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.06 }}>
                <div className="flex items-center mb-2">
                  <CardTitle className="text-white text-lg">Educator Portal</CardTitle>
                </div>
                <CardDescription className="text-blue-100 text-sm">Sign in to manage your courses and students</CardDescription>
              </motion.div>
            </CardHeader>
          </div>

          <CardContent className="p-6">
            <motion.div className="flex justify-center mb-4" initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.12 }}>
              <img src={educatorLoginImg} alt="Educator Login" className="h-28 object-contain" />
            </motion.div>

            {error && (
              <motion.div
                className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-center border border-red-100"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                  Educator Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail size={16} className="text-gray-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={educatorId}
                    onChange={(e) => setEducatorId(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm bg-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock size={16} className="text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-10 py-2.5 border border-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm bg-white"
                    required
                  />
                  <motion.button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {showPassword ? (
                      <EyeOff size={18} className="text-gray-500 hover:text-blue-600 transition-colors" />
                    ) : (
                      <Eye size={18} className="text-gray-500 hover:text-blue-600 transition-colors" />
                    )}
                  </motion.button>
                </div>
              </div>

              <div className="flex justify-end">
                <button type="button" onClick={() => navigate('/auth/forgot-password?role=educator')} className="text-sm text-blue-600 hover:underline">
                  Forgot password?
                </button>
              </div>

              <motion.button
                type="submit"
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 transition-colors text-sm font-medium"
                whileTap={{ scale: 0.98 }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} className="mr-2" />
                    Access Dashboard
                  </>
                )}
              </motion.button>
            </form>


          </CardContent>
          <div className="bg-slate-50 px-6 py-3 text-center border-t border-slate-100">
            <p className="text-xs text-gray-500">Need help? <a href="/contact" className="text-blue-600 hover:underline">Contact support</a></p>
          </div>
        </Card>
        <motion.div className="mt-4 text-center text-xs text-slate-500">
          By continuing, you agree to our <a href="#" className="underline">Terms</a> and <a href="#" className="underline">Privacy</a>.
        </motion.div>
      </motion.div>
    </div>
  );
};

export default EducatorLogin;
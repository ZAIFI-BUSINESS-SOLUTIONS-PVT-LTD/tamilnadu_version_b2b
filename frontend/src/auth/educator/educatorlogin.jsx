import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { educatorLogin } from '../../utils/api';
import { motion } from 'framer-motion';
import { ChalkboardTeacher, ArrowLeft, Eye, EyeSlash, LockKey, Envelope, Sparkle, BookOpen, UserCirclePlus } from '@phosphor-icons/react';
import educatorLoginImg from '../../assets/auth images/educatorlogin.svg';

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      {/* Main Card */}
      <motion.div
        className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-6 relative">
          <button
            onClick={() => navigate('/auth')}
            className="absolute top-4 left-4 text-white hover:bg-white/10 p-2 rounded-full transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft size={20} weight="bold" />
          </button>

          <div className="flex flex-col items-center">
            <div className="flex items-center mb-3">
              <ChalkboardTeacher weight="fill" size={24} className="text-white mr-2" />
              <h1 className="text-2xl font-medium text-white">Educator Portal</h1>
            </div>
            <p className="text-blue-100 text-center text-sm">
              Sign in to manage your courses and students
            </p>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6">
          {/* Illustration */}
          <motion.div 
            className="flex justify-center mb-6"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <img 
              src={educatorLoginImg} 
              alt="Educator Login" 
              className="h-32 object-contain" 
            />
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
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Educator Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Envelope size={16} className="text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={educatorId}
                  onChange={(e) => setEducatorId(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LockKey size={16} className="text-gray-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                  required
                />
                <motion.button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {showPassword ? (
                    <EyeSlash size={18} className="text-gray-500 hover:text-blue-600 transition-colors" />
                  ) : (
                    <Eye size={18} className="text-gray-500 hover:text-blue-600 transition-colors" />
                  )}
                </motion.button>
              </div>
              <div className="mt-1 text-right">
                <a href="#" className="text-xs text-blue-600 hover:text-blue-500 hover:underline">
                  Forgot password?
                </a>
              </div>
            </div>

            {/* Submit Button */}
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
                  <Sparkle weight="fill" size={16} className="mr-2" />
                  Access Dashboard
                </>
              )}
            </motion.button>
          </form>

          {/* Help Section */}
          <div className="mt-6 pt-5 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500">
              Need help? <a href="#" className="text-blue-600 hover:text-blue-500 hover:underline">Contact educator support</a>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-3 text-center border-t border-gray-100">
          <p className="text-xs text-gray-500">
            © 2025 Learning Platform
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default EducatorLogin;
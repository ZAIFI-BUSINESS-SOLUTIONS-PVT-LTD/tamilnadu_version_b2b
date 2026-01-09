import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentLogin } from '../../utils/api';
import { motion } from 'framer-motion';
import { ArrowLeft, Eye, EyeOff, GraduationCap, Sparkles } from 'lucide-react';
import studentLoginImg from '../../assets/auth images/studentlogin.svg';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '../../components/ui/card.jsx';
import { Input } from '../../components/ui/input.jsx';
import { Button } from '../../components/ui/button.jsx';
import logo from '../../assets/images/logo.svg';
import logoInverted from '../../assets/images/logo-inverted.svg';

const StudentLogin = () => {
  const navigate = useNavigate();
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    document.title = 'Student Login | Learning Platform';
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await studentLogin(studentId, password);
      if (response.error) {
        setError(response.error);
        setIsLoading(false);
        return;
      }

      localStorage.setItem('token', response.token);
      localStorage.setItem('student_id', studentId);
      navigate('/student/dashboard');
    } catch {
      setError('Invalid credentials or network issue.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
      >
        <motion.div className="flex flex-col items-center mb-4">
          <img src={logo} alt="Inzighted" className="w-24 h-auto dark:hidden" />
          <img src={logoInverted} alt="Inzighted" className="w-24 h-auto hidden dark:block" />
          <p className="text-sm text-muted-foreground mt-2">An AI Powered Learning Journey</p>
        </motion.div>

        <Card className="overflow-hidden">
          <div className="bg-primary p-5 relative">
            <motion.button
              onClick={() => navigate('/auth')}
              className="absolute top-4 left-4 text-primary-foreground hover:bg-white/10 p-2 rounded-full transition-colors"
              aria-label="Go back"
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeft size={18} />
            </motion.button>

            <CardHeader className="p-0">
              <motion.div className="flex flex-col items-center text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.06 }}>
                <div className="flex items-center mb-2">
                  <CardTitle className="text-primary-foreground text-lg">Student Portal</CardTitle>
                </div>
                <CardDescription className="text-primary-foreground/80 text-sm">Sign in to continue your learning journey</CardDescription>
              </motion.div>
            </CardHeader>
          </div>

          <CardContent className="p-6">
            <motion.div className="flex justify-center mb-4" initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.12 }}>
              <img src={studentLoginImg} alt="Student Login" className="h-28 object-contain" />
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
                <label htmlFor="studentId" className="block text-sm font-medium text-foreground mb-1">
                  Student ID
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <GraduationCap size={16} className="text-muted-foreground" />
                  </div>
                  <Input
                    id="studentId"
                    type="text"
                    placeholder="student@school.edu or S12345"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
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
                      <EyeOff size={18} className="text-muted-foreground hover:text-primary transition-colors" />
                    ) : (
                      <Eye size={18} className="text-muted-foreground hover:text-primary transition-colors" />
                    )}
                  </motion.button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} className="mr-2" />
                    Continue
                  </>
                )}
              </Button>
            </form>
          </CardContent>
          <div className="bg-muted px-6 py-3 text-center border-t border-border">
            <p className="text-xs text-muted-foreground">Need help? <a href="https://inzighted.com/contact" className="text-primary hover:underline">Contact support</a></p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default StudentLogin;
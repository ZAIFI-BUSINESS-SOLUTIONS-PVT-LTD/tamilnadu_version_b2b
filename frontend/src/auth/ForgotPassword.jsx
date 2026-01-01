import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { forgotPassword } from '../utils/api';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft } from 'lucide-react';
import logo from '../assets/images/logo.svg';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card.jsx';
import { Input } from '../components/ui/input.jsx';
import { Button } from '../components/ui/button.jsx';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const preRole = params.get('role') || '';

  const [email, setEmail] = useState('');
  const [role] = useState(preRole);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { document.title = 'Forgot Password'; }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      const res = await forgotPassword(email);
      if (res && res.detail) setStatus({ ok: true, message: res.detail });
      else if (res && res.error) setStatus({ ok: false, message: res.error });
      else setStatus({ ok: true, message: 'If that account exists, reset instructions have been sent.' });
    } catch (err) {
      setStatus({ ok: false, message: 'Network error. Try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <motion.div className="w-full max-w-md" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col items-center mb-4">
          <img src={logo} alt="Inzighted" className="w-24 h-auto dark:hidden" />
          <img src={logoInverted} alt="Inzighted" className="w-24 h-auto hidden dark:block" />
          <p className="text-sm text-muted-foreground mt-2">An AI Powered Learning Journey</p>
        </div>

        <Card className="overflow-hidden">
          <div className="bg-primary p-5 relative">
            <motion.button
              onClick={() => navigate(-1)}
              className="absolute top-4 left-4 text-primary-foreground hover:bg-white/10 p-2 rounded-full transition-colors"
              aria-label="Go back"
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeft size={18} />
            </motion.button>

            <CardHeader className="p-0">
              <div className="flex flex-col items-center text-center">
                <CardTitle className="text-primary-foreground text-lg">Forgot Password</CardTitle>
                <CardDescription className="text-primary-foreground/80 text-sm">Enter your account email to receive reset instructions</CardDescription>
              </div>
            </CardHeader>
          </div>

          <CardContent className="p-6">
            {status && (
              <div className={`mb-4 p-3 rounded ${status.ok ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-200' : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-200'}`}>
                {status.message}
              </div>
            )}

            {!status?.ok && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail size={16} className="text-muted-foreground" />
                    </div>
                    <Input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@school.edu"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Sending…' : 'Send reset email'}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { resetPassword } from '../utils/api';
import { motion } from 'framer-motion';
import { Mail, Eye, EyeOff } from 'lucide-react';
import logo from '../assets/images/logo.svg';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card.jsx';
import { Input } from '../components/ui/input.jsx';
import { Button } from '../components/ui/button.jsx';

const ResetPassword = () => {
  const navigate = useNavigate();
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const token = params.get('token') || '';
  const emailParam = params.get('email') || '';
  const roleParam = params.get('role') || '';

  const [email, setEmail] = useState(emailParam);
  const [tokenState] = useState(token);
  const [role] = useState(roleParam);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => { document.title = 'Reset Password'; }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tokenState) {
      setStatus({ ok: false, message: 'Missing token' });
      return;
    }
    if (password !== confirm) {
      setStatus({ ok: false, message: 'Passwords do not match' });
      return;
    }
    setLoading(true);
    try {
      const res = await resetPassword(email, tokenState, password, role);
      if (res && res.detail) {
        setStatus({ ok: true, message: res.detail });
        setTimeout(() => navigate('/auth'), 1800);
      } else {
        setStatus({ ok: false, message: res.error || 'Failed to reset password' });
      }
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
          <div className="bg-primary p-5">
            <CardHeader className="p-0">
              <div className="flex flex-col items-center text-center">
                <CardTitle className="text-primary-foreground text-lg">Reset Password</CardTitle>
                <CardDescription className="text-primary-foreground/80 text-sm">Choose a new password for your account</CardDescription>
              </div>
            </CardHeader>
          </div>

          <CardContent className="p-6">
            {status && (
              <div className={`mb-4 p-3 rounded ${status.ok ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-200' : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-200'}`}>
                {status.message}
              </div>
            )}

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
                    className="pl-10 bg-card border-border"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">New Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10 bg-card border-border"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    {showPassword ? <EyeOff size={18} className="text-muted-foreground hover:text-primary" /> : <Eye size={18} className="text-muted-foreground hover:text-primary" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Confirm Password</label>
                <div className="relative">
                  <Input
                    type={showConfirm ? 'text' : 'password'}
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="pr-10 bg-card border-border"
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    {showConfirm ? <EyeOff size={18} className="text-muted-foreground hover:text-primary" /> : <Eye size={18} className="text-muted-foreground hover:text-primary" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Button type="submit" disabled={loading}>{loading ? 'Updating…' : 'Reset Password'}</Button>
                <Button type="button" variant="link" onClick={() => navigate('/auth')}>Back to login</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default ResetPassword;

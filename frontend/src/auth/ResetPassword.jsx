import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { resetPassword } from '../utils/api';
import { motion } from 'framer-motion';
import { Mail, Eye, EyeOff } from 'lucide-react';
import logo from '../assets/images/logo.svg';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card.jsx';

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <motion.div className="w-full max-w-md" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col items-center mb-4">
          <img src={logo} alt="Inzighted" className="w-24 h-auto" />
          <p className="text-sm text-slate-600 mt-2">An AI Powered Learning Journey</p>
        </div>

        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-5">
            <CardHeader className="p-0">
              <div className="flex flex-col items-center text-center">
                <CardTitle className="text-white text-lg">Reset Password</CardTitle>
                <CardDescription className="text-blue-100 text-sm">Choose a new password for your account</CardDescription>
              </div>
            </CardHeader>
          </div>

          <CardContent className="p-6">
            {status && (
              <div className={`mb-4 p-3 rounded ${status.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {status.message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <div className="relative mt-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail size={16} className="text-gray-400" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">New Password</label>
                <div className="relative mt-1">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pr-10 pl-3 py-2.5 border border-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm bg-white"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    {showPassword ? <EyeOff size={18} className="text-gray-500" /> : <Eye size={18} className="text-gray-500" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
                <div className="relative mt-1">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="block w-full pr-10 pl-3 py-2.5 border border-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm bg-white"
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    {showConfirm ? <EyeOff size={18} className="text-gray-500" /> : <Eye size={18} className="text-gray-500" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded" disabled={loading}>{loading ? 'Updating…' : 'Reset Password'}</button>
                <button type="button" className="text-sm text-gray-600 underline" onClick={() => navigate('/auth')}>Back to login</button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default ResetPassword;

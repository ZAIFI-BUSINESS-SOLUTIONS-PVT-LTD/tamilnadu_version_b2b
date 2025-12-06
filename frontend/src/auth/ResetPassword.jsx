import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { resetPassword } from '../utils/api';

const ResetPassword = () => {
  const navigate = useNavigate();
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const token = params.get('token') || '';
  const emailParam = params.get('email') || '';
  const roleParam = params.get('role') || '';

  const [email, setEmail] = useState(emailParam);
  const [tokenState, setTokenState] = useState(token);
  const [role] = useState(roleParam);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = 'Reset Password';
  }, []);

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
    const res = await resetPassword(email, tokenState, password, role);
    setLoading(false);
    if (res && res.detail) {
      setStatus({ ok: true, message: res.detail });
      setTimeout(() => navigate('/auth'), 2000);
    } else {
      setStatus({ ok: false, message: res.error || 'Failed to reset password' });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium mb-2">Reset Password</h2>
        <p className="text-sm text-gray-500 mb-4">Enter a new password for your account.</p>

        {status && (
          <div className={`mb-4 p-3 rounded ${status.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {status.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 block w-full border rounded p-2 text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">New Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 block w-full border rounded p-2 text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
            <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-1 block w-full border rounded p-2 text-sm" />
          </div>

          <div className="flex items-center justify-between">
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded" disabled={loading}>{loading ? 'Updating…' : 'Reset Password'}</button>
            <button type="button" className="text-sm text-gray-600 underline" onClick={() => navigate('/auth')}>Back to login</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
